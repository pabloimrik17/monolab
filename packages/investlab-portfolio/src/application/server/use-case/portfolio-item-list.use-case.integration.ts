import { beforeEach, describe, expect, it } from "vitest";
import { PORTFOLIO } from "#application/server/tokens.ts";
import { givenHolding, givenInstrument } from "#testing/server/given.ts";
import { container, containerWithDatabaseDown } from "#testing/server/vitest-integration-setup.ts";
import { PersistenceError } from "@m0n0lab/investlab-core";
import type { PortfolioItemListUseCase } from "./portfolio-item-list.use-case.ts";

let list: PortfolioItemListUseCase;
beforeEach(() => {
    list = container.get(PORTFOLIO.ItemList);
});

describe("listing the portfolio", () => {
    it("holds nothing yet still offers the catalog when the portfolio is empty", async () => {
        const spy = await givenInstrument("SPY");

        const { items, instruments } = (await list.execute())._unsafeUnwrap();

        expect(items).toEqual([]);
        expect(instruments).toContainEqual(spy);
    });

    it("pairs each holding with its instrument, oldest first, next to the whole catalog", async () => {
        const spy = await givenInstrument("SPY");
        const qqq = await givenInstrument("QQQ");
        const unheld = await givenInstrument("VWO");
        const first = await givenHolding(qqq, { targetWeight: 40 });
        const second = await givenHolding(spy, { targetWeight: 60 });

        const { items, instruments } = (await list.execute())._unsafeUnwrap();

        expect(items).toEqual([
            { item: first, instrument: qqq },
            { item: second, instrument: spy },
        ]);
        expect(instruments).toEqual(expect.arrayContaining([spy, qqq, unheld]));
    });

    describe("while the database is unreachable", () => {
        beforeEach(() => {
            list = containerWithDatabaseDown.get(PORTFOLIO.ItemList);
        });

        it("fails as a persistence error", async () => {
            const error = (await list.execute())._unsafeUnwrapErr();

            expect(error).toBeInstanceOf(PersistenceError);
        });
    });
});
