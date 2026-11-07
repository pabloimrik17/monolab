import { inspect } from "node:util";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QUOTES } from "#application/server/tokens.ts";
import {
    givenAnUnreadableCachedQuoteFor,
    givenMarketDataFailing,
    givenMarketDataRateLimitReached,
    givenMarketDataRejectsTheKey,
    givenMarketDataUnavailable,
    givenQuotesFor,
    givenUnreadableMarketDataFor,
} from "#testing/server/given.ts";
import {
    container,
    containerWithCacheDown,
    FINNHUB_API_KEY,
} from "#testing/server/vitest-integration-setup.ts";
import type { QuoteListUseCase } from "./quote-list.use-case.ts";

const APPLE = { price: 190.5, change: 1.5, changePercent: 0.79 };
const MICROSOFT = { price: 410.25, change: -2.1, changePercent: -0.51 };

describe("QuoteListUseCase", () => {
    let list: QuoteListUseCase;
    beforeEach(() => {
        list = container.get(QUOTES.List);
    });

    it("fetches market data for symbols not seen recently", async () => {
        givenQuotesFor({ AAPL: APPLE, MSFT: MICROSOFT });

        const quotes = (await list.execute(["AAPL", "MSFT"]))._unsafeUnwrap();

        expect(quotes).toEqual([
            { symbol: "AAPL", ...APPLE, updatedAt: expect.any(Date) },
            { symbol: "MSFT", ...MICROSOFT, updatedAt: expect.any(Date) },
        ]);
    });

    it("answers a recently fetched quote again while market data is unreachable", async () => {
        givenQuotesFor({ AAPL: APPLE });
        const [fetched] = (await list.execute(["AAPL"]))._unsafeUnwrap();
        givenMarketDataUnavailable();

        const quotes = (await list.execute(["AAPL"]))._unsafeUnwrap();

        expect(quotes).toEqual([fetched]);
    });

    it("leaves out symbols the market has no data for", async () => {
        givenQuotesFor({ AAPL: APPLE });

        const quotes = (await list.execute(["AAPL", "NOPE"]))._unsafeUnwrap();

        expect(quotes.map((quote) => quote.symbol)).toEqual(["AAPL"]);
    });

    it("answers no quotes, not an error, for symbols the market has no data for", async () => {
        givenQuotesFor({});

        const quotes = (await list.execute(["NOPE"]))._unsafeUnwrap();

        expect(quotes).toEqual([]);
    });

    it("answers the cached quotes while market data is unreachable for the others", async () => {
        givenQuotesFor({ AAPL: APPLE });
        const [fetched] = (await list.execute(["AAPL"]))._unsafeUnwrap();
        givenMarketDataUnavailable();

        const quotes = (await list.execute(["AAPL", "MSFT"]))._unsafeUnwrap();

        expect(quotes).toEqual([fetched]);
    });

    it.each([
        ["unreachable", givenMarketDataUnavailable],
        ["failing", givenMarketDataFailing],
        ["refusing requests over its limit", givenMarketDataRateLimitReached],
    ])(
        "fails as market data unavailable while market data is %s and nothing is cached",
        async (_, givenMarketData) => {
            givenMarketData();

            const error = (await list.execute(["AAPL", "MSFT"]))._unsafeUnwrapErr();

            expect(error.code).toBe("MARKET_DATA_UNAVAILABLE");
            expect(inspect(error, { depth: null })).not.toContain(FINNHUB_API_KEY);
        },
    );

    it("asks the market again for a symbol it had no data for", async () => {
        givenQuotesFor({});
        await list.execute(["AAPL"]);
        givenQuotesFor({ AAPL: APPLE });

        const quotes = (await list.execute(["AAPL"]))._unsafeUnwrap();

        expect(quotes).toEqual([{ symbol: "AAPL", ...APPLE, updatedAt: expect.any(Date) }]);
    });

    it("leaves out a symbol whose market data it cannot read", async () => {
        givenQuotesFor({ AAPL: APPLE, MSFT: MICROSOFT });
        givenUnreadableMarketDataFor("MSFT");

        const quotes = (await list.execute(["AAPL", "MSFT"]))._unsafeUnwrap();

        expect(quotes.map((quote) => quote.symbol)).toEqual(["AAPL"]);
    });

    it("fetches market data again for a cached quote it cannot read", async () => {
        await givenAnUnreadableCachedQuoteFor("AAPL");
        givenQuotesFor({ AAPL: APPLE });

        const quotes = (await list.execute(["AAPL"]))._unsafeUnwrap();

        expect(quotes).toEqual([{ symbol: "AAPL", ...APPLE, updatedAt: expect.any(Date) }]);
    });

    it("fails, pointing at the market data key without revealing it, while market data rejects the key", async () => {
        const logs = (["debug", "info", "log", "warn", "error"] as const).map((level) =>
            vi.spyOn(console, level).mockImplementation(() => {}),
        );
        givenMarketDataRejectsTheKey();

        const error = (await list.execute(["AAPL"]))._unsafeUnwrapErr();

        // inspect() prints the whole cause chain and every property of each error.
        const reported = inspect(error, { depth: null });
        const logged = logs
            .flatMap((log) => log.mock.calls.flat())
            .map((arg) => inspect(arg, { depth: null }))
            .join("\n");
        expect(error.code).toBe("PERSISTENCE_ERROR");
        expect(reported).toContain("check FINNHUB_API_KEY");
        expect(reported).not.toContain(FINNHUB_API_KEY);
        expect(logged).not.toContain(FINNHUB_API_KEY);
    });

    it("fetches more symbols than one batch of requests holds", async () => {
        const symbols = Array.from({ length: 25 }, (_, i) => `S${i}`);
        givenQuotesFor(Object.fromEntries(symbols.map((symbol) => [symbol, APPLE])));

        const quotes = (await list.execute(symbols))._unsafeUnwrap();

        expect(quotes.map((quote) => quote.symbol).sort()).toEqual([...symbols].sort());
    });

    it("sends no further batch of requests once market data rejects the key", async () => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        const symbols = Array.from({ length: 25 }, (_, i) => `S${i}`);
        const marketData = givenMarketDataRejectsTheKey();

        const error = (await list.execute(symbols))._unsafeUnwrapErr();

        expect(error.code).toBe("PERSISTENCE_ERROR");
        expect(marketData.requests).toBeLessThanOrEqual(10);
    });

    it("lists each symbol once, whatever its case or padding", async () => {
        givenQuotesFor({ AAPL: APPLE });

        const quotes = (await list.execute([" aapl ", "AAPL", ""]))._unsafeUnwrap();

        expect(quotes).toEqual([{ symbol: "AAPL", ...APPLE, updatedAt: expect.any(Date) }]);
    });

    describe("while the quote cache is down", () => {
        beforeEach(() => {
            list = containerWithCacheDown.get(QUOTES.List);
        });

        it("still answers with market data", async () => {
            givenQuotesFor({ AAPL: APPLE });

            const quotes = (await list.execute(["AAPL"]))._unsafeUnwrap();

            expect(quotes).toEqual([{ symbol: "AAPL", ...APPLE, updatedAt: expect.any(Date) }]);
        });
    });
});
