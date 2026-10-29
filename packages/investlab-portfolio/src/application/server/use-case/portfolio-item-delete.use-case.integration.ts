import { beforeEach, describe, expect, it } from "vitest";
import { PORTFOLIO } from "#application/server/tokens.ts";
import { PortfolioItemNotFoundError } from "#domain/error/portfolio-item.error.ts";
import { givenHolding, givenInstrument, portfolio, UNKNOWN_ID } from "#testing/server/given.ts";
import { container } from "#testing/server/vitest-integration-setup.ts";
import type { PortfolioItemDeleteUseCase } from "./portfolio-item-delete.use-case.ts";

let remove: PortfolioItemDeleteUseCase;
beforeEach(() => {
    remove = container.get(PORTFOLIO.ItemDelete);
});

describe("removing a holding", () => {
    it("removes only that holding from the portfolio", async () => {
        const spy = await givenInstrument("SPY");
        const sold = await givenHolding(spy, { broker: "MyInvestor" });
        const kept = await givenHolding(spy, { broker: "Degiro" });

        (await remove.execute(sold.id))._unsafeUnwrap();

        expect(await portfolio()).toEqual([{ item: kept, instrument: spy }]);
    });

    it("refuses a holding that is not in the portfolio", async () => {
        const error = (await remove.execute(UNKNOWN_ID))._unsafeUnwrapErr();

        expect(error).toBeInstanceOf(PortfolioItemNotFoundError);
    });
});
