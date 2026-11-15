import { beforeEach, describe, expect, it } from "vitest";
import { ROGER } from "#application/server/tokens.ts";
import { EntryNotFoundError } from "#domain/error/entry.error.ts";
import { RogerState } from "#domain/value-object/roger-state.value-object.ts";
import {
    catalog,
    entries,
    givenEntry,
    givenInstrument,
    listed,
    UNKNOWN_ID,
} from "#testing/server/given.ts";
import { container } from "#testing/server/vitest-integration-setup.ts";
import { InstrumentInUseError } from "@m0n0lab/investlab-catalog";
import { CATALOG } from "@m0n0lab/investlab-catalog/server";
import type { EntryDeleteUseCase } from "./entry-delete.use-case.ts";

describe("EntryDeleteUseCase", () => {
    let remove: EntryDeleteUseCase;
    beforeEach(() => {
        remove = container.get(ROGER.EntryDelete);
    });

    describe("deleting an entry", () => {
        it("removes only that entry and leaves its instrument in the catalog", async () => {
            const aapl = await givenInstrument("AAPL");
            const sold = await givenEntry(aapl, { state: RogerState.Sold });
            const kept = await givenEntry(aapl);

            (await remove.execute(sold.id))._unsafeUnwrap();

            expect(await entries()).toEqual([{ entry: kept, instrument: listed(aapl) }]);
            expect(await catalog()).toContainEqual(aapl);
        });

        it("refuses an entry that does not exist", async () => {
            const error = (await remove.execute(UNKNOWN_ID))._unsafeUnwrapErr();

            expect(error).toBeInstanceOf(EntryNotFoundError);
        });
    });

    describe("an instrument an entry references", () => {
        it("stays in the catalog until its last entry is deleted", async () => {
            const aapl = await givenInstrument("AAPL");
            const entry = await givenEntry(aapl);
            const removeInstrument = container.get(CATALOG.InstrumentDelete);

            const error = (await removeInstrument.execute(aapl.id))._unsafeUnwrapErr();

            expect(error).toBeInstanceOf(InstrumentInUseError);
            expect(await catalog()).toContainEqual(aapl);

            (await remove.execute(entry.id))._unsafeUnwrap();
            (await removeInstrument.execute(aapl.id))._unsafeUnwrap();

            expect(await catalog()).not.toContainEqual(aapl);
        });
    });
});
