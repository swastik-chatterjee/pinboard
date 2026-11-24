import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { bumpRate, isUniqueViolation } from "~/server/db";
import { buckets, checkText, gridKey, hasBadWord, newSecret, sha, snap } from "~/lib/safety";

const MAX_SPAN = 0.6; // degrees; stops "give me the whole world" requests
const err = (code: "BAD_REQUEST" | "TOO_MANY_REQUESTS" | "NOT_FOUND" | "FORBIDDEN", message: string) => new TRPCError({ code, message });
const PUBLIC = ["id", "message", "firstName", "lat", "lng", "hearts", "createdAt"] as const;

export const kindnessRouter = createTRPCRouter({
  getNearby: publicProcedure
    .input(z.object({ north: z.number(), south: z.number(), east: z.number(), west: z.number() }))
    .query(async ({ ctx, input }) => {
      if (input.north - input.south > MAX_SPAN || input.east - input.west > MAX_SPAN) return { posts: [], tooWide: true };
      const posts = await ctx.db.orm.public.KindnessPost
        .where({ status: "LIVE" })
        .where((p) => p.lat.gte(input.south))
        .where((p) => p.lat.lte(input.north))
        .where((p) => p.lng.gte(input.west))
        .where((p) => p.lng.lte(input.east))
        .orderBy((p) => p.createdAt.desc())
        .limit(100)
        .select(...PUBLIC)
        .all();
      return { posts, tooWide: false };
    }),

  create: publicProcedure
    .input(z.object({
      message: z.string().trim().min(10, "Write at least 10 characters.").max(280, "Keep it under 280 characters."),
      firstName: z.string().trim().max(24, "Names can be up to 24 characters.").optional(),
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    }))
    .mutation(async ({ ctx, input }) => {
      const firstName = input.firstName ?? "";
      const bad = checkText(input.message, firstName);
      if (bad) throw err("BAD_REQUEST", bad);

      const lat = snap(input.lat), lng = snap(input.lng); // raw coordinates are never stored or logged
      const key = gridKey(lat, lng);
      const { hour, day } = buckets();

      const hk = `dev:${ctx.dev}:${hour}`;
      if (await bumpRate(ctx.db, hk) > 3) throw err("TOO_MANY_REQUESTS", "That's 3 posts this hour. Come back a little later.");
      const ck = `cell:${key}:${ctx.dev}:${day}`;
      if (await bumpRate(ctx.db, ck) > 1) throw err("TOO_MANY_REQUESTS", "You already posted on this block today. Try another spot.");

      const secret = newSecret();
      const post = await ctx.db.orm.public.KindnessPost
        .select(...PUBLIC)
        .create({
          message: input.message,
          firstName,
          lat,
          lng,
          gridKey: key,
          deviceFp: ctx.dev,
          secretHash: sha("edit:" + secret, ctx.tokenPepper),
        });
      return { post, secret }; // the secret is returned exactly once
    }),

  heart: publicProcedure.input(z.object({ postId: z.string() })).mutation(async ({ ctx, input }) => {
    try {
      await ctx.db.transaction(async (tx) => {
        await tx.orm.public.Heart.create({ postId: input.postId, deviceId: ctx.dev });
        // The ORM has no increment, so bump hearts in SQL, atomically.
        await tx.execute(
          tx.raw.sql`UPDATE "KindnessPost" SET "hearts" = "hearts" + 1 WHERE "id" = ${input.postId}`.affectedCount().build(),
        );
      });
      return { added: true };
    } catch {
      return { added: false }; // already warmed (unique constraint) or post missing
    }
  }),

  report: publicProcedure
    .input(z.object({ postId: z.string(), reason: z.string().min(1).max(60), note: z.string().max(200).optional() }))
    .mutation(async ({ ctx, input }) => {
      const post = await ctx.db.orm.public.KindnessPost.first({ id: input.postId });
      if (!post) throw err("NOT_FOUND", "That post is gone.");
      try {
        // One row per reporting device (unique index); a repeat is a no-op, as the old empty-update upsert was.
        await ctx.db.orm.public.Report.create({ postId: input.postId, reason: input.reason, note: input.note ?? "", reporterD: ctx.dev });
      } catch (e) {
        if (!isUniqueViolation(e)) throw e;
      }
      const since = new Date(Date.now() - 7 * 864e5);
      const { total } = await ctx.db.orm.public.Report
        .where((r) => r.postId.eq(input.postId))
        .where((r) => r.createdAt.gte(since))
        .aggregate((a) => ({ total: a.count() })); // one row per device by constraint
      if (total >= Number(process.env.REPORT_THRESHOLD ?? 3) && hasBadWord(post.message)) {
        await ctx.db.orm.public.KindnessPost.where({ id: post.id }).update({ status: "HIDDEN" });
      }
      return { ok: true };
    }),

  editByToken: publicProcedure
    .input(z.object({ postId: z.string(), token: z.string().length(32), action: z.enum(["edit", "delete"]), message: z.string().trim().min(10).max(280).optional() }))
    .mutation(async ({ ctx, input }) => {
      const post = await ctx.db.orm.public.KindnessPost.first({ id: input.postId });
      if (!post || post.secretHash !== sha("edit:" + input.token, ctx.tokenPepper)) throw err("FORBIDDEN", "That secret doesn't match this post.");
      if (input.action === "delete") {
        await ctx.db.orm.public.KindnessPost.where({ id: post.id }).update({ status: "DELETED" });
        return { ok: true };
      }
      if (!input.message) throw err("BAD_REQUEST", "Write the new message.");
      const bad = checkText(input.message, post.firstName);
      if (bad) throw err("BAD_REQUEST", bad);
      await ctx.db.orm.public.KindnessPost.where({ id: post.id }).update({ message: input.message });
      return { ok: true };
    }),
});
