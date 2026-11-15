import { beforeEach, describe, expect, it } from "vitest";
import { ROGER } from "#application/client/tokens.ts";
import {
    EntryConflictError,
    EntryNotFoundError,
    InvalidTransitionError,
    MissingRequiredFieldError,
} from "#domain/error/entry.error.ts";
import { RogerState } from "#domain/value-object/roger-state.value-object.ts";
import { AAPL, entryOf, givenRogerWith, readEntry } from "#testing/client/given.ts";
import { container } from "#testing/client/vitest-integration-setup.ts";
import type { EntryTransitionUseCase } from "./entry-transition.use-case.ts";

describe("EntryTransitionUseCase", () => {
    let transition: EntryTransitionUseCase;
    beforeEach(() => {
        transition = container.get(ROGER.EntryTransition);
    });

    it("returns the entry in the new state with the values given", async () => {
        const row = entryOf(AAPL);
        givenRogerWith(row);

        const moved = (
            await transition.execute(readEntry(row), RogerState.BuyOrder, {
                quantity: 10,
            })
        )._unsafeUnwrap();

        expect(moved).toMatchObject({ id: row.entry.id, state: RogerState.BuyOrder, quantity: 10 });
    });

    it("refuses a move the state table does not allow", async () => {
        const row = entryOf(AAPL, { state: RogerState.Invested });
        givenRogerWith(row);

        const error = (
            await transition.execute(readEntry(row), RogerState.BuyOrder)
        )._unsafeUnwrapErr();

        expect(error).toBeInstanceOf(InvalidTransitionError);
    });

    it("names the field the new state needs and the entry lacks", async () => {
        const row = entryOf(AAPL);
        givenRogerWith(row);

        const error = (
            await transition.execute(readEntry(row), RogerState.BuyOrder)
        )._unsafeUnwrapErr();

        expect(error).toBeInstanceOf(MissingRequiredFieldError);
        expect(error).toMatchObject({ field: "quantity" });
    });

    it("refuses an entry the service does not have", async () => {
        const row = entryOf(AAPL);
        givenRogerWith();

        const error = (
            await transition.execute(readEntry(row), RogerState.Shortlisted)
        )._unsafeUnwrapErr();

        expect(error).toBeInstanceOf(EntryNotFoundError);
    });

    it("refuses a move made from a stale read", async () => {
        const row = entryOf(AAPL);
        givenRogerWith(row);
        const stale = readEntry(row, { updatedAt: "2026-01-01T00:00:00.000Z" });

        const error = (await transition.execute(stale, RogerState.Shortlisted))._unsafeUnwrapErr();

        expect(error).toBeInstanceOf(EntryConflictError);
    });
});
