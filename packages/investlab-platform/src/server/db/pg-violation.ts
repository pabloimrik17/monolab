import type { PersistenceError } from "@m0n0lab/investlab-core";

/** Postgres SQLSTATE codes of the constraints a repository turns into domain errors. */
export const UNIQUE_VIOLATION = "23505";
export const FOREIGN_KEY_VIOLATION = "23503";

/** Whether the driver error behind `error` (Drizzle wraps it) carries `sqlState`. */
export function violates(error: PersistenceError, sqlState: string): boolean {
    let cause: unknown = error.cause;
    while (cause instanceof Error) {
        if ("code" in cause && cause.code === sqlState) {
            return true;
        }
        cause = cause.cause;
    }
    return false;
}
