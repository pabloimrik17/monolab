import { beforeEach, describe, expect, it } from "vitest";
import { PORTFOLIO } from "#application/server/tokens.ts";
import { givenInstrument, portfolio, UNKNOWN_ID } from "#testing/server/given.ts";
import { container, containerWithDatabaseDown } from "#testing/server/vitest-integration-setup.ts";
import { InstrumentNotFoundError } from "@m0n0lab/investlab-catalog";
import { PersistenceError, ValidationError } from "@m0n0lab/investlab-core";
import type { PortfolioItemCreateUseCase } from "./portfolio-item-create.use-case.ts";

describe("PortfolioItemCreateUseCase", () => {
    let create: PortfolioItemCreateUseCase;
    beforeEach(() => {
        create = container.get(PORTFOLIO.ItemCreate);
    });

    describe("adding a holding", () => {
        it("records it at the broker with its target weight, value and notes", async () => {
            const spy = await givenInstrument("SPY");

            const item = (
                await create.execute({
                    instrumentId: spy.id,
                    broker: "  MyInvestor  ",
                    targetWeight: 15.5,
                    currentValue: 1234.56,
                    notes: "core holding",
                })
            )._unsafeUnwrap();

            expect(item).toMatchObject({
                instrumentId: spy.id,
                broker: "MyInvestor",
                targetWeight: 15.5,
                currentValue: 1234.56,
                notes: "core holding",
            });
            expect(await portfolio()).toEqual([{ item, instrument: spy }]);
        });

        it("starts a holding with no current value at zero", async () => {
            const spy = await givenInstrument("SPY");

            const item = (
                await create.execute({
                    instrumentId: spy.id,
                    broker: "MyInvestor",
                    targetWeight: 15,
                })
            )._unsafeUnwrap();

            expect(item.currentValue).toBe(0);
        });

        it("refuses an instrument that is not in the catalog", async () => {
            const error = (
                await create.execute({
                    instrumentId: UNKNOWN_ID,
                    broker: "MyInvestor",
                    targetWeight: 15,
                })
            )._unsafeUnwrapErr();

            expect(error).toBeInstanceOf(InstrumentNotFoundError);
            expect(await portfolio()).toEqual([]);
        });

        it("refuses a target weight above 100", async () => {
            const spy = await givenInstrument("SPY");

            const error = (
                await create.execute({
                    instrumentId: spy.id,
                    broker: "MyInvestor",
                    targetWeight: 150,
                })
            )._unsafeUnwrapErr();

            expect(error).toBeInstanceOf(ValidationError);
            expect(await portfolio()).toEqual([]);
        });
    });

    describe("adding a holding while the database is unreachable", () => {
        beforeEach(() => {
            create = containerWithDatabaseDown.get(PORTFOLIO.ItemCreate);
        });

        it("fails as a persistence error", async () => {
            const error = (
                await create.execute({
                    instrumentId: UNKNOWN_ID,
                    broker: "MyInvestor",
                    targetWeight: 10,
                })
            )._unsafeUnwrapErr();

            expect(error).toBeInstanceOf(PersistenceError);
        });
    });
});
