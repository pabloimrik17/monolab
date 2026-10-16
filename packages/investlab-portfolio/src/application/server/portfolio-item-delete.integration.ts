import { beforeEach, describe, expect, it } from "vitest";
import { PortfolioItemNotFoundError } from "../../domain/errors.ts";
import { givenHolding, givenInstrument, portfolio, UNKNOWN_ID } from "./given.ts";
import { PORTFOLIO } from "./tokens.ts";
import { container } from "./vitest-integration-setup.ts";
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
