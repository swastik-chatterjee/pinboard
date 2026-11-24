import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, modProcedure, publicProcedure } from "~/server/api/trpc";
import { makeModSession, verifyPassphrase } from "~/lib/safety";

export const moderateRouter = createTRPCRouter({
  login: publicProcedure.input(z.object({ passphrase: z.string().min(1).max(200) })).mutation(async ({ ctx, input }) => {
    const key = `modlogin:${ctx.dev}:${Math.floor(Date.now() / (15 * 60 * 1000))}`; // 5 tries / 15 min
    const row = await ctx.db.rateBus.upsert({ where: { key }, create: { key, count: 1 }, update: { count: { increment: 1 } } });
    if (row.count > 5) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many tries. Wait 15 minutes." });
    if (!verifyPassphrase(input.passphrase)) throw new TRPCError({ code: "UNAUTHORIZED", message: "Wrong passphrase." });
    ctx.setCookies.push(`pb_mod=${makeModSession()}; Path=/; Max-Age=3600; HttpOnly; SameSite=Strict${ctx.secure}`);
    return { ok: true };
  }),

  list: modProcedure.query(async ({ ctx }) => {
    const reports = await ctx.db.report.findMany({ where: { resolved: false }, orderBy: { createdAt: "desc" }, take: 200 });
    const ids = [...new Set(reports.map((r) => r.postId))];
    const posts = await ctx.db.kindnessPost.findMany({ where: { id: { in: ids } }, select: { id: true, message: true, firstName: true, status: true } });
    return posts.map((p) => ({ ...p, reports: reports.filter((r) => r.postId === p.id).map((r) => ({ reason: r.reason, note: r.note })) }));
  }),

  resolve: modProcedure
    .input(z.object({ postId: z.string(), status: z.enum(["LIVE", "HIDDEN", "DELETED"]) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.$transaction([
        ctx.db.kindnessPost.update({ where: { id: input.postId }, data: { status: input.status } }),
        ctx.db.report.updateMany({ where: { postId: input.postId }, data: { resolved: true } }),
      ]);
      return { ok: true };
    }),
});
