import service from "~/service.mjs";
import type { Contract } from "~/prisma/contract";
import type { PostgresClient } from "@prisma/orm-postgres/runtime";

/** The app's typed Prisma ORM 8 client, hydrated from the service's database dependency. */
export type Db = PostgresClient<Contract>;

/** One request's runtime: the database client and the secrets the deployment passes in. */
export function appRuntime() {
  const { db } = service.load();
  const input = service.input();
  return {
    client: db.client satisfies Db,
    tokenPepper: input.tokenPepper.expose(),
    modPassphraseHash: input.modPassphraseHash.expose(),
  };
}

/** The runtime normalizes driver errors onto `SqlQueryError` with the SQLSTATE; unique violations are `23505`. */
export const isUniqueViolation = (e: unknown) =>
  typeof e === "object" && e !== null && (e as { kind?: string }).kind === "sql_query" && (e as { sqlState?: string }).sqlState === "23505";

/**
 * Bump a RateBus counter by one and return the new count, atomically.
 * The ORM has no increment, so: one UPDATE when the row exists; otherwise an
 * ORM create (which fills the cuid id and timestamps), and if that races a
 * concurrent insert, its unique violation is caught and the UPDATE reruns.
 */
export async function bumpRate(db: Db, key: string): Promise<number> {
  const bump = () =>
    db
      .raw.sql`UPDATE "RateBus" SET "count" = "count" + 1, "updatedAt" = now() WHERE "key" = ${key} RETURNING "count"`
      .returnsRow({ count: "pg/int4@1" })
      .build();
  const [row] = await db.query(bump());
  if (row) return row.count;
  try {
    await db.orm.public.RateBus.create({ key, count: 1 });
    return 1;
  } catch (e) {
    if (!isUniqueViolation(e)) throw e;
    const [row] = await db.query(bump());
    return row.count;
  }
}
