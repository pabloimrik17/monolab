import { describe, expect, it } from "vitest";
import { wrap } from "./wrap.ts";

class FakeError extends Error {
    constructor(readonly original: unknown) {
        super("fake");
    }
}

const toError = (cause: unknown) => new FakeError(cause);

const fakeDb = {
    select: () => Promise.resolve([{ id: 1 }, { id: 2 }]),
    insert: () => Promise.resolve([{ id: 3 }]),
    update: () => Promise.resolve([{ id: 4 }]),
    delete: () => Promise.resolve([{ id: 5 }]),
} as never;

describe("wrap", () => {
    it("resolves a select to Ok with the rows", async () => {
        const client = wrap(fakeDb, { toError });

        const result = await client.select((db) => db.select());

        expect(result._unsafeUnwrap()).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it.each([
        ["insert", [{ id: 3 }]],
        ["update", [{ id: 4 }]],
        ["delete", [{ id: 5 }]],
    ] as const)("resolves %s to Ok with the returned rows", async (operation, rows) => {
        const client = wrap(fakeDb, { toError });

        const result = await client[operation]((db) => db[operation]());

        expect(result._unsafeUnwrap()).toEqual(rows);
    });

    it("maps a rejected query through the error factory", async () => {
        const driverError = new Error("connection refused");
        const failingDb = { select: () => Promise.reject(driverError) } as never;
        const client = wrap(failingDb, { toError });

        const result = await client.select((db) => db.select());

        const error = result._unsafeUnwrapErr();
        expect(error).toBeInstanceOf(FakeError);
        expect(error.original).toBe(driverError);
    });

    it("maps a callback that throws synchronously through the error factory", async () => {
        const client = wrap(fakeDb, { toError });
        const buildError = new Error("bad builder");

        const result = await client.select(() => {
            throw buildError;
        });

        expect(result._unsafeUnwrapErr().original).toBe(buildError);
    });

    it("runs nothing until an operation is called", () => {
        let calls = 0;
        const countingDb = {
            select: () => {
                calls += 1;
                return Promise.resolve([]);
            },
        } as never;

        wrap(countingDb, { toError });

        expect(calls).toBe(0);
    });
});
