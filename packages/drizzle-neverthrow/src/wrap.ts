import { ResultAsync } from "neverthrow";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

/** Any Drizzle Postgres database (node-postgres, postgres-js, PGlite, ...). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- schema generics vary per consumer
export type DrizzlePgDatabase = PgDatabase<PgQueryResultHKT, any, any>;

export interface WrapOptions<TError> {
    /** Turns whatever Drizzle (or the driver) threw into the caller's domain error. */
    toError: (cause: unknown) => TError;
}

/**
 * Builds a Drizzle query from the slice of the database that matches the operation.
 * Drizzle query builders are thenable, so the callback returns the builder itself,
 * never `await`ed.
 */
type Query<TDb, TKey extends keyof TDb, TValue> = (db: Pick<TDb, TKey>) => PromiseLike<TValue>;

export interface WrappedClient<TDb extends DrizzlePgDatabase, TError> {
    select: <TValue>(
        build: Query<TDb, "select" | "selectDistinct" | "selectDistinctOn", TValue>,
    ) => ResultAsync<TValue, TError>;
    insert: <TValue>(build: Query<TDb, "insert", TValue>) => ResultAsync<TValue, TError>;
    update: <TValue>(build: Query<TDb, "update", TValue>) => ResultAsync<TValue, TError>;
    delete: <TValue>(build: Query<TDb, "delete", TValue>) => ResultAsync<TValue, TError>;
}

/**
 * Wraps a Drizzle Postgres database so queries resolve to `ResultAsync<T, E>`
 * instead of a promise. Rejections and synchronous throws from building the
 * query both end up in `Err`, mapped by `options.toError`.
 *
 * Operations are added on demand: if a consumer needs one that is missing
 * (for example transactions), add it here with a test.
 */
export function wrap<TDb extends DrizzlePgDatabase, TError>(
    db: TDb,
    options: WrapOptions<TError>,
): WrappedClient<TDb, TError> {
    const run = <TValue>(build: (db: TDb) => PromiseLike<TValue>): ResultAsync<TValue, TError> =>
        ResultAsync.fromPromise(
            new Promise<TValue>((resolve) => {
                resolve(build(db));
            }),
            options.toError,
        );

    return { select: run, insert: run, update: run, delete: run };
}
