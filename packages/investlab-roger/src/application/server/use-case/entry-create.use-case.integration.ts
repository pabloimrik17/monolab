import { beforeEach, describe, expect, it } from "vitest";
import { ROGER } from "#application/server/tokens.ts";
import { MissingRequiredFieldError } from "#domain/error/entry.error.ts";
import { fieldsOf, RogerState } from "#domain/value-object/roger-state.value-object.ts";
import {
    catalog,
    entries,
    givenEntry,
    givenInstrument,
    listed,
    UNKNOWN_ID,
    writeStateToRow,
} from "#testing/server/given.ts";
import { container, containerWithDatabaseDown } from "#testing/server/vitest-integration-setup.ts";
import {
    AssetClass,
    InstrumentAlreadyExistsError,
    InstrumentNotFoundError,
    InstrumentType,
    Sector,
} from "@m0n0lab/investlab-catalog";
import { PersistenceError, ValidationError } from "@m0n0lab/investlab-core";
import type { EntryField } from "#domain/value-object/roger-state.value-object.ts";
import type { EntryCreateUseCase } from "./entry-create.use-case.ts";

/** Every field at a value that fills its column: full scale, last decimal, zero commission. */
const EVERY_VALUE = {
    entryPrice: 1234.5678,
    quantity: 2_147_483_647,
    buyCommission: 0,
    buyDate: "2026-10-01",
    exitPrice: 9_999_999_999.9999,
    sellCommission: 99_999_999.99,
    sellDate: "2026-11-01",
} as const;

describe("EntryCreateUseCase", () => {
    let create: EntryCreateUseCase;
    beforeEach(() => {
        create = container.get(ROGER.EntryCreate);
    });

    describe("creating an entry for a catalog instrument", () => {
        it.each(Object.values(RogerState))(
            "stores a %s entry with exactly the fields that state carries",
            async (state) => {
                const aapl = await givenInstrument("AAPL");

                const entry = (
                    await create.execute({ instrumentId: aapl.id, state, ...EVERY_VALUE })
                )._unsafeUnwrap();

                const carried: readonly EntryField[] = fieldsOf(state);
                expect(entry).toMatchObject({
                    instrumentId: aapl.id,
                    state,
                    ...Object.fromEntries(
                        Object.entries(EVERY_VALUE).map(([field, value]) => [
                            field,
                            carried.includes(field as EntryField) ? value : undefined,
                        ]),
                    ),
                });
                expect(entry.stateSince).toEqual(entry.createdAt);
                expect(await entries()).toEqual([{ entry, instrument: listed(aapl) }]);
            },
        );

        it("keeps several entries for one instrument", async () => {
            const aapl = await givenInstrument("AAPL");
            const first = await givenEntry(aapl, { entryPrice: 150 });

            const second = (
                await create.execute({
                    instrumentId: aapl.id,
                    state: RogerState.Watching,
                    entryPrice: 140,
                })
            )._unsafeUnwrap();

            expect((await entries()).map(({ entry }) => entry.id).sort()).toEqual(
                [first.id, second.id].sort(),
            );
        });

        it("refuses an entry missing a field of its state and stores nothing", async () => {
            const aapl = await givenInstrument("AAPL");

            const error = (
                await create.execute({
                    instrumentId: aapl.id,
                    state: RogerState.BuyOrder,
                    entryPrice: 150,
                })
            )._unsafeUnwrapErr();

            expect(error).toBeInstanceOf(MissingRequiredFieldError);
            expect(await entries()).toEqual([]);
        });

        it("refuses an instrument that is not in the catalog and stores nothing", async () => {
            const error = (
                await create.execute({
                    instrumentId: UNKNOWN_ID,
                    state: RogerState.Watching,
                    entryPrice: 150,
                })
            )._unsafeUnwrapErr();

            expect(error).toBeInstanceOf(InstrumentNotFoundError);
            expect(await entries()).toEqual([]);
        });
    });

    describe("creating an entry with a new stock", () => {
        it("adds it to the catalog as an equity stock and references it", async () => {
            const entry = (
                await create.execute({
                    state: RogerState.Watching,
                    entryPrice: 30,
                    newInstrument: {
                        symbol: "asts",
                        name: "AST SpaceMobile",
                        sector: Sector.Technology,
                    },
                })
            )._unsafeUnwrap();

            const asts = (await catalog()).find((instrument) => instrument.symbol === "ASTS");
            expect(asts).toMatchObject({
                id: entry.instrumentId,
                name: "AST SpaceMobile",
                type: InstrumentType.Stock,
                assetClass: AssetClass.Equity,
                sector: Sector.Technology,
            });
            expect(await entries()).toEqual([{ entry, instrument: listed(asts!) }]);
        });

        it("refuses a symbol already in the catalog and creates nothing", async () => {
            const before = await catalog();

            const error = (
                await create.execute({
                    state: RogerState.Watching,
                    entryPrice: 30,
                    newInstrument: { symbol: "AAPL", name: "Apple again" },
                })
            )._unsafeUnwrapErr();

            expect(error).toBeInstanceOf(InstrumentAlreadyExistsError);
            expect(await catalog()).toEqual(before);
            expect(await entries()).toEqual([]);
        });

        it("refuses an invalid entry before adding the stock", async () => {
            const before = await catalog();

            const error = (
                await create.execute({
                    state: RogerState.Watching,
                    entryPrice: 0,
                    newInstrument: { symbol: "ASTS", name: "AST SpaceMobile" },
                })
            )._unsafeUnwrapErr();

            expect(error).toBeInstanceOf(ValidationError);
            expect(await catalog()).toEqual(before);
        });
    });

    describe("the stored state", () => {
        it("cannot be anything but the seven states", async () => {
            const aapl = await givenInstrument("AAPL");
            const entry = await givenEntry(aapl);

            await expect(writeStateToRow(entry.id, "HOLDING")).rejects.toMatchObject({
                constraint: "roger_entries_state_check",
            });
        });
    });

    describe("creating an entry while the database is unreachable", () => {
        beforeEach(() => {
            create = containerWithDatabaseDown.get(ROGER.EntryCreate);
        });

        it("fails as a persistence error", async () => {
            const error = (
                await create.execute({
                    instrumentId: UNKNOWN_ID,
                    state: RogerState.Watching,
                    entryPrice: 150,
                })
            )._unsafeUnwrapErr();

            expect(error).toBeInstanceOf(PersistenceError);
        });
    });
});
