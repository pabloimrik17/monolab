import { beforeEach, describe, expect, it } from "vitest";
import { PORTFOLIO } from "#application/client/tokens.ts";
import { PortfolioItemNotFoundError } from "#domain/error/portfolio-item.error.ts";
import {
    givenApiUnavailable,
    givenPortfolioWith,
    givenStorageUnavailable,
    holdingOf,
    UNKNOWN_ID,
    VWCE,
} from "#testing/client/given.ts";
import { container } from "#testing/client/vitest-integration-setup.ts";
import { NetworkError, PersistenceError } from "@m0n0lab/investlab-core";
import type { PortfolioItemDeleteUseCase } from "./portfolio-item-delete.use-case.ts";

let remove: PortfolioItemDeleteUseCase;
beforeEach(() => {
    remove = container.get(PORTFOLIO.ItemDelete);
});

describe("removing a holding", () => {
    it("succeeds for a holding in the portfolio", async () => {
        const holding = holdingOf(VWCE);
        givenPortfolioWith(holding);

        const result = await remove.execute(holding.item.id);

        expect(result.isOk()).toBe(true);
    });

    it("refuses a holding that is not in the portfolio", async () => {
        givenPortfolioWith();

        const error = (await remove.execute(UNKNOWN_ID))._unsafeUnwrapErr();

        expect(error).toBeInstanceOf(PortfolioItemNotFoundError);
    });

    it("fails as a persistence error when the service cannot reach its storage", async () => {
        givenStorageUnavailable();

        const error = (await remove.execute(UNKNOWN_ID))._unsafeUnwrapErr();

        expect(error).toBeInstanceOf(PersistenceError);
    });

    it("fails as unavailable while the service cannot be reached", async () => {
        givenApiUnavailable();

        const error = (await remove.execute(UNKNOWN_ID))._unsafeUnwrapErr();

        expect(error).toBeInstanceOf(NetworkError);
    });
});
