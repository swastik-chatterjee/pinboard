import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { db } from "~/server/db";
import { sha, validModSession } from "~/lib/safety";

const parse = (h: string | null) =>
  Object.fromEntries(
    (h ?? "").split(";").map((c) => c.trim().split("=")).filter((p) => p[0]).map(([k, v]) => [k, decodeURIComponent(v ?? "")]),
  ) as Record<string, string>;

export const createTRPCContext = async (opts: { headers: Headers }) => {
  const jar = parse(opts.headers.get("cookie"));
  const setCookies: string[] = [];
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  let token = jar.pb_dev;
  if (!token || !/^[0-9a-f]{32}$/.test(token)) {
    const b = new Uint8Array(16);
    crypto.getRandomValues(b);
    token = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
    setCookies.push(`pb_dev=${token}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax${secure}`);
  }
  return { db, dev: sha("dev:" + token), modOk: validModSession(jar.pb_mod), setCookies, secure };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter: ({ shape, error }) => ({
    ...shape,
    data: { ...shape.data, zodError: error.cause instanceof ZodError ? error.cause.flatten() : null },
  }),
});
export const createCallerFactory = t.createCallerFactory;
export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
export const modProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.modOk) throw new TRPCError({ code: "UNAUTHORIZED", message: "Moderator login required." });
  return next();
});
