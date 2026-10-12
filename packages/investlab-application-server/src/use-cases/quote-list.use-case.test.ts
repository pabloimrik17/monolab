import { errAsync, okAsync } from "neverthrow";
import { describe, expect, it, vi } from "vitest";
import { PersistenceError, type Quote, type QuoteRepository } from "@m0n0lab/investlab-domain";
import { QuoteListUseCase } from "./quote-list.use-case.ts";

function makeQuote(symbol: string): Quote {
    return { symbol, price: 100, change: 1, changePercent: 1, updatedAt: new Date(0) };
}

function makeQuoteRepo(getQuotes: QuoteRepository["getQuotes"]): QuoteRepository {
    return { getQuote: vi.fn(), getQuotes };
}

describe("QuoteListUseCase", () => {
    it("returns the quotes found, omitting symbols without data", async () => {
        const aapl = makeQuote("AAPL");
        const getQuotes = vi.fn(() => okAsync(new Map([["AAPL", aapl]])));

        const result = await new QuoteListUseCase(makeQuoteRepo(getQuotes)).execute([
            "AAPL",
            "MSFT",
        ]);

        expect(getQuotes).toHaveBeenCalledWith(["AAPL", "MSFT"]);
        expect(result._unsafeUnwrap()).toEqual([aapl]);
    });

    it("propagates a persistence failure", async () => {
        const failure = new PersistenceError(new Error("finnhub down"));
        const repo = makeQuoteRepo(vi.fn(() => errAsync(failure)));

        const result = await new QuoteListUseCase(repo).execute(["AAPL"]);

        expect(result._unsafeUnwrapErr()).toBe(failure);
    });
});
