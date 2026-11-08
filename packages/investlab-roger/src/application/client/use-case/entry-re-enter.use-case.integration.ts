import { beforeEach, describe, expect, it } from "vitest";
import { ROGER } from "#application/client/tokens.ts";
import { InvalidTransitionError } from "#domain/error/entry.error.ts";
import { RogerState } from "#domain/value-object/roger-state.value-object.ts";
import { AAPL, entryOf, givenRogerWith, readEntry } from "#testing/client/given.ts";
import { container } from "#testing/client/vitest-integration-setup.ts";
import type { EntryReEnterUseCase } from "./entry-re-enter.use-case.ts";

describe("EntryReEnterUseCase", () => {
    let reEnter: EntryReEnterUseCase;
    beforeEach(() => {
        reEnter = container.get(ROGER.EntryReEnter);
    });

    it("returns a new buy order for the same instrument", async () => {
        const row = entryOf(AAPL, { state: RogerState.Sold });
        givenRogerWith(row);

        const again = (await reEnter.execute(readEntry(row), { entryPrice: 140 }))._unsafeUnwrap();

        expect(again).toMatchObject({
            instrumentId: AAPL.id,
            state: RogerState.BuyOrder,
            entryPrice: 140,
        });
        expect(again.id).not.toBe(row.entry.id);
    });

    it("refuses an entry that is not sold", async () => {
        const row = entryOf(AAPL, { state: RogerState.Invested });
        givenRogerWith(row);

        const error = (await reEnter.execute(readEntry(row)))._unsafeUnwrapErr();

        expect(error).toBeInstanceOf(InvalidTransitionError);
    });
});
