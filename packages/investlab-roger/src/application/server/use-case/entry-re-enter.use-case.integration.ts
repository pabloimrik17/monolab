import { beforeEach, describe, expect, it } from "vitest";
import { ROGER } from "#application/server/tokens.ts";
import { EntryNotFoundError, InvalidTransitionError } from "#domain/error/entry.error.ts";
import { RogerState } from "#domain/value-object/roger-state.value-object.ts";
import { entries, givenEntry, givenInstrument, listed, UNKNOWN_ID } from "#testing/server/given.ts";
import { container } from "#testing/server/vitest-integration-setup.ts";
import type { EntryReEnterUseCase } from "./entry-re-enter.use-case.ts";

describe("EntryReEnterUseCase", () => {
    let reEnter: EntryReEnterUseCase;
    beforeEach(() => {
        reEnter = container.get(ROGER.EntryReEnter);
    });

    describe("re-entering after a sale", () => {
        it("opens a buy order on the same instrument and keeps the sold entry", async () => {
            const aapl = await givenInstrument("AAPL");
            const sold = await givenEntry(aapl, {
                state: RogerState.Sold,
                entryPrice: 150,
                quantity: 10,
            });

            const entry = (await reEnter.execute(sold.id, { entryPrice: 145 }))._unsafeUnwrap();

            expect(entry).toMatchObject({
                instrumentId: aapl.id,
                state: RogerState.BuyOrder,
                entryPrice: 145,
                quantity: 10,
            });
            expect(entry.id).not.toBe(sold.id);
            expect(await entries()).toEqual([
                { entry, instrument: listed(aapl) },
                { entry: sold, instrument: listed(aapl) },
            ]);
        });

        it("refuses an entry that is not sold and creates nothing", async () => {
            const aapl = await givenInstrument("AAPL");
            const invested = await givenEntry(aapl, { state: RogerState.Invested });

            const error = (await reEnter.execute(invested.id, {}))._unsafeUnwrapErr();

            expect(error).toBeInstanceOf(InvalidTransitionError);
            expect(await entries()).toEqual([{ entry: invested, instrument: listed(aapl) }]);
        });

        it("refuses an entry that does not exist", async () => {
            const error = (await reEnter.execute(UNKNOWN_ID, {}))._unsafeUnwrapErr();

            expect(error).toBeInstanceOf(EntryNotFoundError);
        });
    });
});
