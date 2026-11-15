import { beforeEach, describe, expect, it } from "vitest";
import { ROGER } from "#application/client/tokens.ts";
import { MissingRequiredFieldError } from "#domain/error/entry.error.ts";
import { RogerState } from "#domain/value-object/roger-state.value-object.ts";
import {
    AAPL,
    entryOf,
    givenApiUnavailable,
    givenRogerWith,
    UNKNOWN_ID,
} from "#testing/client/given.ts";
import { container } from "#testing/client/vitest-integration-setup.ts";
import { InstrumentAlreadyExistsError, InstrumentNotFoundError } from "@m0n0lab/investlab-catalog";
import { NetworkError, ValidationError } from "@m0n0lab/investlab-core";
import type { EntryCreateUseCase } from "./entry-create.use-case.ts";

describe("EntryCreateUseCase", () => {
    let create: EntryCreateUseCase;
    beforeEach(() => {
        create = container.get(ROGER.EntryCreate);
    });

    it("returns the entry as the service recorded it, for an instrument it knows", async () => {
        givenRogerWith(entryOf(AAPL));

        const entry = (
            await create.execute({
                instrumentId: AAPL.id,
                state: RogerState.BuyOrder,
                entryPrice: 150,
                quantity: 10,
            })
        )._unsafeUnwrap();

        expect(entry).toMatchObject({
            instrumentId: AAPL.id,
            state: RogerState.BuyOrder,
            entryPrice: 150,
            quantity: 10,
        });
    });

    it("creates an entry together with a new stock", async () => {
        givenRogerWith();

        const entry = (
            await create.execute({
                newInstrument: { symbol: "ASTS", name: "AST SpaceMobile" },
                state: RogerState.Watching,
                entryPrice: 30,
            })
        )._unsafeUnwrap();

        expect(entry).toMatchObject({ state: RogerState.Watching, entryPrice: 30 });
    });

    it("refuses an instrument the catalog does not have", async () => {
        givenRogerWith();

        const error = (
            await create.execute({
                instrumentId: UNKNOWN_ID,
                state: RogerState.Watching,
                entryPrice: 150,
            })
        )._unsafeUnwrapErr();

        expect(error).toBeInstanceOf(InstrumentNotFoundError);
    });

    it("refuses a new stock whose symbol is already in the catalog", async () => {
        givenRogerWith(entryOf(AAPL));

        const error = (
            await create.execute({
                newInstrument: { symbol: "AAPL", name: "Apple" },
                state: RogerState.Watching,
                entryPrice: 150,
            })
        )._unsafeUnwrapErr();

        expect(error).toBeInstanceOf(InstrumentAlreadyExistsError);
    });

    it("names the field the state needs and the entry lacks", async () => {
        givenRogerWith(entryOf(AAPL));

        const error = (
            await create.execute({
                instrumentId: AAPL.id,
                state: RogerState.BuyOrder,
                entryPrice: 150,
            })
        )._unsafeUnwrapErr();

        expect(error).toBeInstanceOf(MissingRequiredFieldError);
        expect(error).toMatchObject({ field: "quantity" });
    });

    it("refuses an entry price of zero", async () => {
        givenRogerWith(entryOf(AAPL));

        const error = (
            await create.execute({
                instrumentId: AAPL.id,
                state: RogerState.Watching,
                entryPrice: 0,
            })
        )._unsafeUnwrapErr();

        expect(error).toBeInstanceOf(ValidationError);
    });

    it("fails as unavailable while the service cannot be reached", async () => {
        givenApiUnavailable();

        const error = (
            await create.execute({
                instrumentId: AAPL.id,
                state: RogerState.Watching,
                entryPrice: 150,
            })
        )._unsafeUnwrapErr();

        expect(error).toBeInstanceOf(NetworkError);
    });
});
