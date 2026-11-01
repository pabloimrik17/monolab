import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import { wrap, type WrappedClient } from "@m0n0lab/drizzle-neverthrow";
import { PersistenceError } from "@m0n0lab/investlab-core";

/** Drizzle over a `pg.Pool`; every query resolves to `ResultAsync<T, PersistenceError>`. */
export type Db = WrappedClient<NodePgDatabase, PersistenceError>;

const closers = new WeakMap<Db, () => Promise<void>>();

/** The pool connects on the first query, not here. */
export function createDb(url: string): Db {
    const pool = new pg.Pool({ connectionString: url });
    const db = wrap(drizzle(pool), { toError: (cause) => new PersistenceError(cause) });
    closers.set(db, closer(pool));

    return db;
}

/** Resolves once every connection is closed. */
export async function closeDb(db: Db): Promise<void> {
    await closers.get(db)?.();
}

/**
 * `pool.end()` resolves as soon as it has asked each connection to close. A database dropped or
 * stopped before they have closed terminates them with 57P01, which the ended pool emits as an
 * unhandled `error`. The pool emits `remove` once a connection is closed.
 */
function closer(pool: pg.Pool): () => Promise<void> {
    const open = new Set<pg.PoolClient>();
    pool.on("connect", (client) => open.add(client));
    pool.on("remove", (client) => open.delete(client));

    return async () => {
        const closed = new Promise<void>((resolve) => {
            const resolveWhenNoneOpen = () => {
                if (open.size === 0) {
                    resolve();
                }
            };
            pool.on("remove", resolveWhenNoneOpen);
            resolveWhenNoneOpen();
        });

        await pool.end();
        await closed;
    };
}
