import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest } from "next/server";
import { appRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";

const handler = async (req: NextRequest) => {
  let cookies: string[] = [];
  const res = await fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: async () => {
      const ctx = await createTRPCContext({ headers: req.headers });
      cookies = ctx.setCookies; // procedures (e.g. moderator login) push onto this same array
      return ctx;
    },
  });
  cookies.forEach((c) => res.headers.append("Set-Cookie", c));
  return res;
};
export { handler as GET, handler as POST };
