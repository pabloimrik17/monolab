import { beforeEach, describe, expect, it } from "vitest";
import { ROGER } from "#application/server/tokens.ts";
import {
    EntryConflictError,
    EntryNotFoundError,
    FieldNotInStateError,
} from "#domain/error/entry.error.ts";
import { RogerState } from "#domain/value-object/roger-state.value-object.ts";
import { entries, givenEntry, givenInstrument, listed, UNKNOWN_ID } from "#testing/server/given.ts";
import { container } from "#testing/server/vitest-integration-setup.ts";
import type { EntryEditUseCase } from "./entry-edit.use-case.ts";

describe("EntryEditUseCase", () => {
    let edit: EntryEditUseCase;
    beforeEach(() => {
        edit = container.get(ROGER.EntryEdit);
    });

    describe("editing an entry", () => {
        it("changes the field and keeps the state and the time in state", async () => {
            const aapl = await givenInstrument("AAPL");
            const watching = await givenEntry(aapl, { entryPrice: 150 });

            const edited = (
                await edit.execute(watching.id, { entryPrice: 145 }, watching.updatedAt)
            )._unsafeUnwrap();

            expect(edited).toMatchObject({
                id: watching.id,
                entryPrice: 145,
                state: RogerState.Watching,
                stateSince: watching.stateSince,
            });
            expect(await entries()).toEqual([{ entry: edited, instrument: listed(aapl) }]);
        });

        it("refuses a field the state does not carry and keeps the entry", async () => {
            const aapl = await givenInstrument("AAPL");
            const watching = await givenEntry(aapl);

            const error = (
                await edit.execute(watching.id, { quantity: 10 }, watching.updatedAt)
            )._unsafeUnwrapErr();

            expect(error).toBeInstanceOf(FieldNotInStateError);
            expect(await entries()).toEqual([{ entry: watching, instrument: listed(aapl) }]);
        });

        it("refuses an entry that does not exist", async () => {
            const error = (
                await edit.execute(UNKNOWN_ID, { entryPrice: 145 }, new Date())
            )._unsafeUnwrapErr();

            expect(error).toBeInstanceOf(EntryNotFoundError);
        });

        it("refuses an edit made from a stale read and keeps the entry", async () => {
            const aapl = await givenInstrument("AAPL");
            const watching = await givenEntry(aapl);
            const staleRead = new Date(watching.updatedAt.getTime() - 1);

            const error = (
                await edit.execute(watching.id, { entryPrice: 145 }, staleRead)
            )._unsafeUnwrapErr();

            expect(error).toBeInstanceOf(EntryConflictError);
            expect(await entries()).toEqual([{ entry: watching, instrument: listed(aapl) }]);
        });

        it("lets exactly one of two edits made from the same read win", async () => {
            const aapl = await givenInstrument("AAPL");
            const watching = await givenEntry(aapl);
            // Two open connections, so both reads run before either write and only the write can tell.
            await Promise.all([entries(), entries()]);

            const results = await Promise.all([
                edit.execute(watching.id, { entryPrice: 145 }, watching.updatedAt),
                edit.execute(watching.id, { entryPrice: 155 }, watching.updatedAt),
            ]);

            const winners = results.filter((result) => result.isOk());
            const losers = results.filter((result) => result.isErr());
            expect(winners).toHaveLength(1);
            expect(losers.map((result) => result._unsafeUnwrapErr())).toEqual([
                expect.any(EntryConflictError),
            ]);
            expect(await entries()).toEqual([
                { entry: winners[0]!._unsafeUnwrap(), instrument: listed(aapl) },
            ]);
        });
    });
});
