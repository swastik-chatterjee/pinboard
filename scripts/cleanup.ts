// Nightly: bun run cleanup
import { db } from "../src/server/db";

const cutoff = new Date(Date.now() - 864e5);

try {
  // Hearts are a daily gesture: the per-device row expires after 24h so people can warm a post again.
  // The post keeps the hearts it already earned.
  const hearts = await db.heart.deleteMany({ where: { createdAt: { lt: cutoff } } });
  const rateRows = await db.rateBus.deleteMany({ where: { updatedAt: { lt: cutoff } } });
  console.log(`removed ${hearts.count} hearts and ${rateRows.count} stale rate rows`);
} finally {
  await db.$disconnect();
}
