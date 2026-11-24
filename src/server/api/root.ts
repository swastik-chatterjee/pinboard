import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { kindnessRouter } from "./routers/kindness";
import { moderateRouter } from "./routers/moderate";

export const appRouter = createTRPCRouter({ kindness: kindnessRouter, moderate: moderateRouter });
export type AppRouter = typeof appRouter;
export const createCaller = createCallerFactory(appRouter);
