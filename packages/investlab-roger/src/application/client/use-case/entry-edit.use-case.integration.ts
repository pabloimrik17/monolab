import { beforeEach, describe, expect, it } from "vitest";
import { ROGER } from "#application/client/tokens.ts";
import {
    EntryConflictError,
    EntryNotFoundError,
    FieldNotInStateError,
} from "#domain/error/entry.error.ts";
import { RogerState } from "#domain/value-object/roger-state.value-object.ts";
import { AAPL, entryOf, givenRogerWith, readEntry } from "#testing/client/given.ts";
import { container } from "#testing/client/vitest-integration-setup.ts";
import type { EntryEditUseCase } from "./entry-edit.use-case.ts";

describe("EntryEditUseCase", () => {
    let edit: EntryEditUseCase;
    beforeEach(() => {
        edit = container.get(ROGER.EntryEdit);
    });

    it("returns the entry with the change and the same state", async () => {
        const row = entryOf(AAPL, { entryPrice: 150 });
        givenRogerWith(row);

        const edited = (await edit.execute(readEntry(row), { entryPrice: 145 }))._unsafeUnwrap();

        expect(edited).toMatchObject({
            id: row.entry.id,
            state: RogerState.Watching,
            entryPrice: 145,
        });
    });

    it("names the field the state does not carry", async () => {
        const row = entryOf(AAPL);
        givenRogerWith(row);

        const error = (await edit.execute(readEntry(row), { quantity: 10 }))._unsafeUnwrapErr();

        expect(error).toBeInstanceOf(FieldNotInStateError);
        expect(error).toMatchObject({ field: "quantity" });
    });

    it("refuses an entry the service does not have", async () => {
        const row = entryOf(AAPL);
        givenRogerWith();

        const error = (await edit.execute(readEntry(row), { entryPrice: 1 }))._unsafeUnwrapErr();

        expect(error).toBeInstanceOf(EntryNotFoundError);
    });

    it("refuses a change made from a stale read", async () => {
        const row = entryOf(AAPL);
        givenRogerWith(row);
        const stale = readEntry(row, { updatedAt: "2026-01-01T00:00:00.000Z" });

        const error = (await edit.execute(stale, { entryPrice: 1 }))._unsafeUnwrapErr();

        expect(error).toBeInstanceOf(EntryConflictError);
    });
});
