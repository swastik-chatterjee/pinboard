import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { buckets, checkText, gridKey, hasBadWord, newSecret, sha, snap } from "~/lib/safety";

const MAX_SPAN = 0.6; // degrees; stops "give me the whole world" requests
const err = (code: "BAD_REQUEST" | "TOO_MANY_REQUESTS" | "NOT_FOUND" | "FORBIDDEN", message: string) => new TRPCError({ code, message });
const PUBLIC = { id: true, message: true, firstName: true, lat: true, lng: true, hearts: true, createdAt: true } as const;

export const kindnessRouter = createTRPCRouter({
  getNearby: publicProcedure
    .input(z.object({ north: z.number(), south: z.number(), east: z.number(), west: z.number() }))
    .query(async ({ ctx, input }) => {
      if (input.north - input.south > MAX_SPAN || input.east - input.west > MAX_SPAN) return { posts: [], tooWide: true };
      const posts = await ctx.db.kindnessPost.findMany({
        where: { status: "LIVE", lat: { gte: input.south, lte: input.north }, lng: { gte: input.west, lte: input.east } },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: PUBLIC,
      });
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
      const hourly = await ctx.db.rateBus.upsert({ where: { key: hk }, create: { key: hk, count: 1 }, update: { count: { increment: 1 } } });
      if (hourly.count > 3) throw err("TOO_MANY_REQUESTS", "That's 3 posts this hour. Come back a little later.");
      const ck = `cell:${key}:${ctx.dev}:${day}`;
      const cell = await ctx.db.rateBus.upsert({ where: { key: ck }, create: { key: ck, count: 1 }, update: { count: { increment: 1 } } });
      if (cell.count > 1) throw err("TOO_MANY_REQUESTS", "You already posted on this block today. Try another spot.");

      const secret = newSecret();
      const post = await ctx.db.kindnessPost.create({
        data: { message: input.message, firstName, lat, lng, gridKey: key, deviceFp: ctx.dev, secretHash: sha("edit:" + secret) },
        select: PUBLIC,
      });
      return { post, secret }; // the secret is returned exactly once
    }),

  heart: publicProcedure.input(z.object({ postId: z.string() })).mutation(async ({ ctx, input }) => {
    try {
      await ctx.db.$transaction([
        ctx.db.heart.create({ data: { postId: input.postId, deviceId: ctx.dev } }),
        ctx.db.kindnessPost.update({ where: { id: input.postId }, data: { hearts: { increment: 1 } } }),
      ]);
      return { added: true };
    } catch {
      return { added: false }; // already warmed (unique constraint) or post missing
    }
  }),

  report: publicProcedure
    .input(z.object({ postId: z.string(), reason: z.string().min(1).max(60), note: z.string().max(200).optional() }))
    .mutation(async ({ ctx, input }) => {
      const post = await ctx.db.kindnessPost.findUnique({ where: { id: input.postId } });
      if (!post) throw err("NOT_FOUND", "That post is gone.");
      await ctx.db.report.upsert({
        where: { postId_reporterD: { postId: input.postId, reporterD: ctx.dev } },
        create: { postId: input.postId, reason: input.reason, note: input.note ?? "", reporterD: ctx.dev },
        update: {},
      });
      const since = new Date(Date.now() - 7 * 864e5);
      const devices = await ctx.db.report.count({ where: { postId: input.postId, createdAt: { gte: since } } }); // one row per device by constraint
      if (devices >= Number(process.env.REPORT_THRESHOLD ?? 3) && hasBadWord(post.message)) {
        await ctx.db.kindnessPost.update({ where: { id: post.id }, data: { status: "HIDDEN" } });
      }
      return { ok: true };
    }),

  editByToken: publicProcedure
    .input(z.object({ postId: z.string(), token: z.string().length(32), action: z.enum(["edit", "delete"]), message: z.string().trim().min(10).max(280).optional() }))
    .mutation(async ({ ctx, input }) => {
      const post = await ctx.db.kindnessPost.findUnique({ where: { id: input.postId } });
      if (!post || post.secretHash !== sha("edit:" + input.token)) throw err("FORBIDDEN", "That secret doesn't match this post.");
      if (input.action === "delete") {
        await ctx.db.kindnessPost.update({ where: { id: post.id }, data: { status: "DELETED" } });
        return { ok: true };
      }
      if (!input.message) throw err("BAD_REQUEST", "Write the new message.");
      const bad = checkText(input.message, post.firstName);
      if (bad) throw err("BAD_REQUEST", bad);
      await ctx.db.kindnessPost.update({ where: { id: post.id }, data: { message: input.message } });
      return { ok: true };
    }),
});
