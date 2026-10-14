import { beforeEach, describe, expect, it } from "vitest";
import { givenMarketDataUnavailable, givenQuotesFor } from "./given.ts";
import { QUOTES } from "./tokens.ts";
import { container, containerWithCacheDown } from "./vitest-integration-setup.ts";
import type { QuoteListUseCase } from "./quote-list.use-case.ts";

const APPLE = { price: 190.5, change: 1.5, changePercent: 0.79 };
const MICROSOFT = { price: 410.25, change: -2.1, changePercent: -0.51 };

let list: QuoteListUseCase;
beforeEach(() => {
    list = container.get(QUOTES.List);
});

describe("listing quotes", () => {
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
