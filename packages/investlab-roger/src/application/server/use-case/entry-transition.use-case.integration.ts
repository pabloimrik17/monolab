import { beforeEach, describe, expect, it } from "vitest";
import { ROGER } from "#application/server/tokens.ts";
import {
    EntryConflictError,
    EntryNotFoundError,
    InvalidTransitionError,
} from "#domain/error/entry.error.ts";
import { RogerState } from "#domain/value-object/roger-state.value-object.ts";
import { entries, givenEntry, givenInstrument, listed, UNKNOWN_ID } from "#testing/server/given.ts";
import { container } from "#testing/server/vitest-integration-setup.ts";
import type { EntryTransitionUseCase } from "./entry-transition.use-case.ts";

describe("EntryTransitionUseCase", () => {
    let transition: EntryTransitionUseCase;
    beforeEach(() => {
        transition = container.get(ROGER.EntryTransition);
    });

    describe("moving an entry", () => {
        it("persists the new state and the supplied values", async () => {
            const aapl = await givenInstrument("AAPL");
            const watching = await givenEntry(aapl, { entryPrice: 150 });

            const moved = (
                await transition.execute(
                    watching.id,
                    RogerState.BuyOrder,
                    { quantity: 10 },
                    watching.updatedAt,
                )
            )._unsafeUnwrap();

            expect(moved).toMatchObject({
                id: watching.id,
                state: RogerState.BuyOrder,
                entryPrice: 150,
                quantity: 10,
            });
            expect(await entries()).toEqual([{ entry: moved, instrument: listed(aapl) }]);
        });

        it("clears the columns of the fields the new state does not carry", async () => {
            const aapl = await givenInstrument("AAPL");
            const order = await givenEntry(aapl, { state: RogerState.BuyOrder, quantity: 10 });

            (
                await transition.execute(order.id, RogerState.Watching, {}, order.updatedAt)
            )._unsafeUnwrap();

            expect((await entries())[0]?.entry).toMatchObject({
                state: RogerState.Watching,
                quantity: undefined,
            });
        });

        it("refuses a move the state does not allow and keeps the entry", async () => {
            const aapl = await givenInstrument("AAPL");
            const watching = await givenEntry(aapl);

            const error = (
                await transition.execute(watching.id, RogerState.Sold, {}, watching.updatedAt)
            )._unsafeUnwrapErr();

            expect(error).toBeInstanceOf(InvalidTransitionError);
            expect(await entries()).toEqual([{ entry: watching, instrument: listed(aapl) }]);
        });

        it("refuses an entry that does not exist", async () => {
            const error = (
                await transition.execute(UNKNOWN_ID, RogerState.Shortlisted, {}, new Date())
            )._unsafeUnwrapErr();

            expect(error).toBeInstanceOf(EntryNotFoundError);
        });

        it("refuses a move made from a stale read and keeps the entry", async () => {
            const aapl = await givenInstrument("AAPL");
            const watching = await givenEntry(aapl);
            const staleRead = new Date(watching.updatedAt.getTime() - 1);

            const error = (
                await transition.execute(watching.id, RogerState.Shortlisted, {}, staleRead)
            )._unsafeUnwrapErr();

            expect(error).toBeInstanceOf(EntryConflictError);
            expect(await entries()).toEqual([{ entry: watching, instrument: listed(aapl) }]);
        });
    });
});
