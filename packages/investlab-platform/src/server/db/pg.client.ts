import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import { wrap, type WrappedClient } from "@m0n0lab/drizzle-neverthrow";
import { PersistenceError } from "@m0n0lab/investlab-core";

/** Drizzle over a `pg.Pool`; every query resolves to `ResultAsync<T, PersistenceError>`. */
export type Db = WrappedClient<NodePgDatabase, PersistenceError>;

const pools = new WeakMap<Db, pg.Pool>();

/** The pool connects on the first query, not here. */
export function createDb(url: string): Db {
    const pool = new pg.Pool({ connectionString: url });
    const db = wrap(drizzle(pool), { toError: (cause) => new PersistenceError(cause) });
    pools.set(db, pool);
    return db;
}

export async function closeDb(db: Db): Promise<void> {
    await pools.get(db)?.end();
}
