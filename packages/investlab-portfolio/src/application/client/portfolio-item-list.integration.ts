import { beforeEach, describe, expect, it } from "vitest";
import { NetworkError, PersistenceError } from "@m0n0lab/investlab-core";
import {
    BITCOIN,
    givenApiUnavailable,
    givenCatalog,
    givenPortfolioWith,
    givenStorageUnavailable,
    holdingOf,
    VWCE,
} from "./given.ts";
import { PORTFOLIO } from "./tokens.ts";
import { container } from "./vitest-integration-setup.ts";
import type { PortfolioItemListUseCase } from "./portfolio-item-list.use-case.ts";

let list: PortfolioItemListUseCase;
beforeEach(() => {
    list = container.get(PORTFOLIO.ItemList);
});

describe("listing the portfolio", () => {
    it("pairs each holding with its instrument, next to the whole catalog", async () => {
        const holding = holdingOf(VWCE, { broker: "Degiro", targetWeight: 60, notes: "core" });
        givenCatalog(VWCE, BITCOIN);
        givenPortfolioWith(holding);

        const { items, instruments } = (await list.execute())._unsafeUnwrap();

        expect(items).toMatchObject([
            {
                item: {
                    ...holding.item,
                    createdAt: new Date(holding.item.createdAt),
                    updatedAt: new Date(holding.item.updatedAt),
                },
                instrument: VWCE,
            },
        ]);
        expect(instruments).toMatchObject([VWCE, BITCOIN]);
    });

    it("holds nothing when the portfolio is empty", async () => {
        givenCatalog(VWCE);
        givenPortfolioWith();

        const { items, instruments } = (await list.execute())._unsafeUnwrap();

        expect(items).toEqual([]);
        expect(instruments).toMatchObject([VWCE]);
    });

    it("fails as a persistence error when the service cannot reach its storage", async () => {
        givenStorageUnavailable();

        const error = (await list.execute())._unsafeUnwrapErr();

        expect(error).toBeInstanceOf(PersistenceError);
    });

    it("fails as unavailable while the service cannot be reached", async () => {
        givenApiUnavailable();

        const error = (await list.execute())._unsafeUnwrapErr();

        expect(error).toBeInstanceOf(NetworkError);
    });
});
