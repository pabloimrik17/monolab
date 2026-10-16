import { beforeEach, describe, expect, it } from "vitest";
import { ValidationError } from "@m0n0lab/investlab-core";
import { PortfolioItemConflictError, PortfolioItemNotFoundError } from "../../domain/errors.ts";
import {
    givenHolding,
    givenInstrument,
    givenStampedByDatabase,
    portfolio,
    UNKNOWN_ID,
} from "./given.ts";
import { PORTFOLIO } from "./tokens.ts";
import { container } from "./vitest-integration-setup.ts";
import type { PortfolioItemUpdateUseCase } from "./portfolio-item-update.use-case.ts";

let update: PortfolioItemUpdateUseCase;
beforeEach(() => {
    update = container.get(PORTFOLIO.ItemUpdate);
});

describe("changing a holding", () => {
    it("records the new broker, target weight and current value", async () => {
        const spy = await givenInstrument("SPY");
        const holding = await givenHolding(spy);

        const changed = (
            await update.execute(
                holding.id,
                { broker: "Interactive Brokers", targetWeight: 25, currentValue: 500.25 },
                holding.updatedAt,
            )
        )._unsafeUnwrap();

        expect(changed).toMatchObject({
            id: holding.id,
            broker: "Interactive Brokers",
            targetWeight: 25,
            currentValue: 500.25,
        });
        expect(await portfolio()).toEqual([{ item: changed, instrument: spy }]);
    });

    it("clears the notes when asked to", async () => {
        const spy = await givenInstrument("SPY");
        const holding = await givenHolding(spy, { notes: "rebalance yearly" });

        const changed = (
            await update.execute(holding.id, { notes: undefined }, holding.updatedAt)
        )._unsafeUnwrap();

        expect(changed.notes).toBeUndefined();
        expect((await portfolio())[0]?.item.notes).toBeUndefined();
    });

    it("refuses a holding that is not in the portfolio", async () => {
        const error = (
            await update.execute(UNKNOWN_ID, { targetWeight: 10 }, new Date())
        )._unsafeUnwrapErr();

        expect(error).toBeInstanceOf(PortfolioItemNotFoundError);
    });

    it("refuses a target weight above 100 and keeps the holding as it was", async () => {
        const spy = await givenInstrument("SPY");
        const holding = await givenHolding(spy);

        const error = (
            await update.execute(holding.id, { targetWeight: 500 }, holding.updatedAt)
        )._unsafeUnwrapErr();

        expect(error).toBeInstanceOf(ValidationError);
        expect(await portfolio()).toEqual([{ item: holding, instrument: spy }]);
    });

    it("refuses a change made from a stale read and keeps the holding as it was", async () => {
        const spy = await givenInstrument("SPY");
        const holding = await givenHolding(spy);
        const staleRead = new Date(holding.updatedAt.getTime() - 1);

        const error = (
            await update.execute(holding.id, { targetWeight: 40 }, staleRead)
        )._unsafeUnwrapErr();

        expect(error).toBeInstanceOf(PortfolioItemConflictError);
        expect(await portfolio()).toEqual([{ item: holding, instrument: spy }]);
    });

    it("lets exactly one of two changes made from the same read win", async () => {
        const spy = await givenInstrument("SPY");
        const holding = await givenHolding(spy);

        const results = await Promise.all([
            update.execute(holding.id, { broker: "Broker A", targetWeight: 20 }, holding.updatedAt),
            update.execute(holding.id, { broker: "Broker B", targetWeight: 30 }, holding.updatedAt),
        ]);

        const winners = results.filter((result) => result.isOk());
        const losers = results.filter((result) => result.isErr());
        expect(winners).toHaveLength(1);
        expect(losers.map((result) => result._unsafeUnwrapErr())).toEqual([
            expect.any(PortfolioItemConflictError),
        ]);
        expect(await portfolio()).toEqual([{ item: winners[0]!._unsafeUnwrap(), instrument: spy }]);
    });

    it("accepts a change made from a read of a database-stamped holding", async () => {
        const spy = await givenInstrument("SPY");
        const holding = await givenStampedByDatabase(await givenHolding(spy));

        const changed = (
            await update.execute(holding.id, { targetWeight: 35 }, holding.updatedAt)
        )._unsafeUnwrap();

        expect(changed.targetWeight).toBe(35);
    });
});
