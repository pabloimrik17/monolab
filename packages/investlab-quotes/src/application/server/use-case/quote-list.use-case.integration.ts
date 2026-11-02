import { beforeEach, describe, expect, it, vi } from "vitest";
import { QUOTES } from "#application/server/tokens.ts";
import {
    givenMarketDataRejectsTheKey,
    givenMarketDataUnavailable,
    givenQuotesFor,
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

    it("answers no quotes, not an error, while market data is unreachable and nothing is cached", async () => {
        givenMarketDataUnavailable();

        const quotes = (await list.execute(["AAPL"]))._unsafeUnwrap();

        expect(quotes).toEqual([]);
    });

    it("asks the market again for a symbol it had no data for", async () => {
        givenQuotesFor({});
        await list.execute(["AAPL"]);
        givenQuotesFor({ AAPL: APPLE });

        const quotes = (await list.execute(["AAPL"]))._unsafeUnwrap();

        expect(quotes).toEqual([{ symbol: "AAPL", ...APPLE, updatedAt: expect.any(Date) }]);
    });

    it("reports a rejected market data key without revealing it", async () => {
        const log = vi.spyOn(console, "error").mockImplementation(() => {});
        givenMarketDataRejectsTheKey();

        const quotes = (await list.execute(["AAPL"]))._unsafeUnwrap();

        expect(quotes).toEqual([]);
        const logged = log.mock.calls.flat().map(String).join("\n");
        expect(logged).toContain("check FINNHUB_API_KEY");
        expect(logged).not.toContain(FINNHUB_API_KEY);
        log.mockRestore();
    });

    it("fetches more symbols than one batch of requests holds", async () => {
        const symbols = Array.from({ length: 25 }, (_, i) => `S${i}`);
        givenQuotesFor(Object.fromEntries(symbols.map((symbol) => [symbol, APPLE])));

        const quotes = (await list.execute(symbols))._unsafeUnwrap();

        expect(quotes.map((quote) => quote.symbol).sort()).toEqual([...symbols].sort());
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
