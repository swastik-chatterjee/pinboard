// Nightly: bun run scripts/cleanup.ts
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const cutoff = new Date(Date.now() - 864e5);
// Hearts are a daily gesture: the per-device row expires after 24h so people can warm a post again.
// The post keeps the hearts it already earned.
const h = await db.heart.deleteMany({ where: { createdAt: { lt: cutoff } } });
const r = await db.rateBus.deleteMany({ where: { updatedAt: { lt: cutoff } } });
console.log(`removed ${h.count} hearts and ${r.count} stale rate rows`);
await db.$disconnect();
