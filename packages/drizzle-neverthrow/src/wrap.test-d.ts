import { describe, expectTypeOf, it } from "vitest";
import { wrap } from "./wrap.ts";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { ResultAsync } from "neverthrow";

declare const db: NodePgDatabase;

describe("wrap types", () => {
    it("types the result by the callback's resolved value and the factory's error", () => {
        class DomainError extends Error {}
        const client = wrap(db, { toError: () => new DomainError() });

        const result = client.select(() => Promise.resolve([{ id: 1 }]));

        expectTypeOf(result).toEqualTypeOf<ResultAsync<{ id: number }[], DomainError>>();
    });

    it("hands each operation only its own slice of the database", () => {
        const client = wrap(db, { toError: (cause) => cause });

        client.select((tx) => {
            // @ts-expect-error select must not expose insert
            void tx.insert;
            return Promise.resolve([]);
        });
        client.insert((tx) => {
            // @ts-expect-error insert must not expose select
            void tx.select;
            return Promise.resolve([]);
        });
    });
});
