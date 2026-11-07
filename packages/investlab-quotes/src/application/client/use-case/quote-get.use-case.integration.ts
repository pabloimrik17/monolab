import { beforeEach, describe, expect, it } from "vitest";
import { QUOTES } from "#application/client/tokens.ts";
import { MarketDataUnavailableError } from "#domain/error/market-data-unavailable.error.ts";
import { givenMarketDataUnavailable, givenQuotesFor } from "#testing/client/given.ts";
import { container } from "#testing/client/vitest-integration-setup.ts";
import type { QuoteGetUseCase } from "./quote-get.use-case.ts";

const SPY = {
    price: 512.3,
    change: 1.2,
    changePercent: 0.23,
    updatedAt: "2026-10-12T15:30:00.000Z",
};

describe("QuoteGetUseCase", () => {
    let get: QuoteGetUseCase;
    beforeEach(() => {
        get = container.get(QUOTES.Get);
    });

    it("returns the quote the service knows for the symbol", async () => {
        givenQuotesFor({ SPY });

        const quote = (await get.execute("SPY"))._unsafeUnwrap();

        expect(quote).toEqual({ symbol: "SPY", ...SPY, updatedAt: new Date(SPY.updatedAt) });
    });

    it("returns no quote, not an error, when the service omits the symbol", async () => {
        givenQuotesFor({ SPY });

        const quote = (await get.execute("NOPE"))._unsafeUnwrap();

        expect(quote).toBeUndefined();
    });

    it("fails as market data unavailable when the service says it has none to give", async () => {
        givenMarketDataUnavailable();

        const error = (await get.execute("SPY"))._unsafeUnwrapErr();

        expect(error).toBeInstanceOf(MarketDataUnavailableError);
        expect(error.code).toBe("MARKET_DATA_UNAVAILABLE");
    });
});
