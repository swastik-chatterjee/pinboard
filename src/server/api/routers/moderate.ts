import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, modProcedure, publicProcedure } from "~/server/api/trpc";
import { bumpRate } from "~/server/db";
import { makeModSession, verifyPassphrase } from "~/lib/safety";

export const moderateRouter = createTRPCRouter({
  login: publicProcedure.input(z.object({ passphrase: z.string().min(1).max(200) })).mutation(async ({ ctx, input }) => {
    const key = `modlogin:${ctx.dev}:${Math.floor(Date.now() / (15 * 60 * 1000))}`; // 5 tries / 15 min
    if (await bumpRate(ctx.db, key) > 5) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many tries. Wait 15 minutes." });
    if (!verifyPassphrase(input.passphrase, ctx.modPassphraseHash)) throw new TRPCError({ code: "UNAUTHORIZED", message: "Wrong passphrase." });
    ctx.setCookies.push(`pb_mod=${makeModSession(ctx.tokenPepper)}; Path=/; Max-Age=3600; HttpOnly; SameSite=Strict${ctx.secure}`);
    return { ok: true };
  }),

  list: modProcedure.query(async ({ ctx }) => {
    const reports = await ctx.db.orm.public.Report
      .where({ resolved: false })
      .orderBy((r) => r.createdAt.desc())
      .limit(200)
      .all();
    const ids = [...new Set(reports.map((r) => r.postId))];
    const posts = ids.length
      ? await ctx.db.orm.public.KindnessPost.where((p) => p.id.in(ids)).select("id", "message", "firstName", "status").all()
      : [];
    return posts.map((p) => ({ ...p, reports: reports.filter((r) => r.postId === p.id).map((r) => ({ reason: r.reason, note: r.note })) }));
  }),

  resolve: modProcedure
    .input(z.object({ postId: z.string(), status: z.enum(["LIVE", "HIDDEN", "DELETED"]) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        await tx.orm.public.KindnessPost.where({ id: input.postId }).update({ status: input.status });
        await tx.orm.public.Report.where({ postId: input.postId }).updateAll({ resolved: true });
      });
      return { ok: true };
    }),
});
