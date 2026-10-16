import { wrap } from "@m0n0lab/drizzle-neverthrow";
import { PersistenceError } from "@m0n0lab/investlab-core";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

export function wrapDb(db: NodePgDatabase) {
    return wrap(db, { toError: (cause) => new PersistenceError(cause) });
}
