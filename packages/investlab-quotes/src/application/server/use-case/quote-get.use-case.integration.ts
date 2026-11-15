import { inspect } from "node:util";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QUOTES } from "#application/server/tokens.ts";
import {
    givenMarketDataFailing,
    givenMarketDataRejectsTheKey,
    givenMarketDataUnavailable,
    givenQuotesFor,
} from "#testing/server/given.ts";
import { container, FINNHUB_API_KEY } from "#testing/server/vitest-integration-setup.ts";
import type { QuoteGetUseCase } from "./quote-get.use-case.ts";

const APPLE = { price: 190.5, change: 1.5, changePercent: 0.79 };

describe("QuoteGetUseCase", () => {
    let get: QuoteGetUseCase;
    beforeEach(() => {
        get = container.get(QUOTES.Get);
    });

    it("fetches market data for a symbol not seen recently", async () => {
        givenQuotesFor({ AAPL: APPLE });

        const quote = (await get.execute("AAPL"))._unsafeUnwrap();

        expect(quote).toEqual({ symbol: "AAPL", ...APPLE, updatedAt: expect.any(Date) });
    });

    it("answers a recently fetched quote again while market data is unreachable", async () => {
        givenQuotesFor({ AAPL: APPLE });
        const fetched = (await get.execute("AAPL"))._unsafeUnwrap();
        givenMarketDataUnavailable();

        const quote = (await get.execute("AAPL"))._unsafeUnwrap();

        expect(quote).toEqual(fetched);
    });

    it("answers no quote, not an error, for a symbol the market has no data for", async () => {
        givenQuotesFor({});

        const quote = (await get.execute("NOPE"))._unsafeUnwrap();

        expect(quote).toBeUndefined();
    });

    it("answers no quote for a blank symbol", async () => {
        givenQuotesFor({ AAPL: APPLE });

        const quote = (await get.execute("  "))._unsafeUnwrap();

        expect(quote).toBeUndefined();
    });

    it("answers the quote of a symbol whatever its case or padding", async () => {
        givenQuotesFor({ AAPL: APPLE });

        const quote = (await get.execute(" aapl "))._unsafeUnwrap();

        expect(quote).toEqual({ symbol: "AAPL", ...APPLE, updatedAt: expect.any(Date) });
    });

    it.each([
        ["unreachable", givenMarketDataUnavailable],
        ["failing", givenMarketDataFailing],
    ])(
        "fails as market data unavailable while market data is %s and nothing is cached",
        async (_, givenMarketData) => {
            givenMarketData();

            const error = (await get.execute("AAPL"))._unsafeUnwrapErr();

            expect(error.code).toBe("MARKET_DATA_UNAVAILABLE");
        },
    );

    it("fails, pointing at the market data key without revealing it, while market data rejects the key", async () => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        givenMarketDataRejectsTheKey();

        const error = (await get.execute("AAPL"))._unsafeUnwrapErr();

        const reported = inspect(error, { depth: null });
        expect(error.code).toBe("PERSISTENCE_ERROR");
        expect(reported).toContain("check FINNHUB_API_KEY");
        expect(reported).not.toContain(FINNHUB_API_KEY);
    });
});
