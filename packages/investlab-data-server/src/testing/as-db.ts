import { wrap } from "@m0n0lab/drizzle-neverthrow";
import { PersistenceError } from "@m0n0lab/investlab-core";
import type { Db } from "@m0n0lab/investlab-platform/server";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

/** Wraps a fake Drizzle client the way `PLATFORM.Db` wraps the real one. */
export function asDb(fake: NodePgDatabase): Db {
    return wrap(fake, { toError: (cause) => new PersistenceError(cause) });
}
