// Nightly: bun run cleanup
import postgres from "@prisma/orm-postgres/runtime";
import { contractFromJson } from "@prisma/orm-postgres/static";
import type { Contract } from "../src/prisma/contract";
import contractJson from "../src/prisma/contract.json" with { type: "json" };

const db = postgres({ contract: contractFromJson<Contract>(contractJson), url: process.env.DATABASE_URL! });
const cutoff = new Date(Date.now() - 864e5);
// Hearts are a daily gesture: the per-device row expires after 24h so people can warm a post again.
// The post keeps the hearts it already earned.
const hearts = await db.orm.public.Heart.where((row) => row.createdAt.lt(cutoff)).deleteAndCount();
const rateRows = await db.orm.public.RateBus.where((row) => row.updatedAt.lt(cutoff)).deleteAndCount();
console.log(`removed ${hearts} hearts and ${rateRows} stale rate rows`);
await db.runtime().close();
