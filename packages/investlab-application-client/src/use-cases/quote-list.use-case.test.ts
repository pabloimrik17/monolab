import { describe, expect, it } from "vitest";
import { inMemoryQuoteRepo } from "../testing/in-memory-ports.ts";
import { QuoteListUseCase } from "./quote-list.use-case.ts";
import type { Quote } from "@m0n0lab/investlab-domain";

const quote = (symbol: string): Quote => ({
    symbol,
    price: 100,
    change: 1,
    changePercent: 1,
    updatedAt: new Date(0),
});

describe("QuoteListUseCase", () => {
    it("returns quotes for requested symbols as an array", async () => {
        const repo = inMemoryQuoteRepo([quote("SPY"), quote("QQQ")]);

        const result = await new QuoteListUseCase(repo).execute(["SPY"]);

        expect(result._unsafeUnwrap()).toEqual([quote("SPY")]);
    });
});
