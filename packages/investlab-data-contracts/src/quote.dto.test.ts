import { describe, expect, it } from "vitest";
import {
    QUOTE_LIST_MAX_SYMBOLS,
    quoteDtoSchema,
    quoteListQueryDtoSchema,
    quoteSymbolSchema,
} from "./quote.dto.ts";

const symbolsOf = (count: number) =>
    Array.from({ length: count }, (_, index) => `S${index}`).join(",");

describe("quoteDtoSchema", () => {
    it("accepts a quote with an ISO timestamp", () => {
        const result = quoteDtoSchema.safeParse({
            symbol: "AAPL",
            price: 190.5,
            change: -1.2,
            changePercent: -0.63,
            updatedAt: "2026-10-12T14:30:00.000Z",
        });
        expect(result.success).toBe(true);
    });

    it("rejects a non-ISO timestamp", () => {
        const result = quoteDtoSchema.safeParse({
            symbol: "AAPL",
            price: 190.5,
            change: 0,
            changePercent: 0,
            updatedAt: "yesterday",
        });
        expect(result.success).toBe(false);
    });
});

describe("quoteListQueryDtoSchema", () => {
    it("splits comma-separated symbols, trimming blanks", () => {
        const result = quoteListQueryDtoSchema.parse({ symbols: "AAPL, MSFT,," });
        expect(result).toEqual({ symbols: ["AAPL", "MSFT"] });
    });

    it("rejects a missing symbols parameter", () => {
        const result = quoteListQueryDtoSchema.safeParse({});
        expect(result.success).toBe(false);
        expect(result.error?.issues[0]?.path).toEqual(["symbols"]);
    });

    it("rejects a symbols parameter with no symbol", () => {
        const result = quoteListQueryDtoSchema.safeParse({ symbols: " , " });
        expect(result.success).toBe(false);
    });

    it("upper-cases symbols and drops duplicates", () => {
        const result = quoteListQueryDtoSchema.parse({ symbols: "aapl,AAPL,msft,Aapl" });
        expect(result.symbols).toEqual(["AAPL", "MSFT"]);
    });

    it("accepts exactly the maximum number of symbols", () => {
        const result = quoteListQueryDtoSchema.safeParse({
            symbols: symbolsOf(QUOTE_LIST_MAX_SYMBOLS),
        });
        expect(result.success).toBe(true);
    });

    it("rejects more than the maximum number of distinct symbols", () => {
        const result = quoteListQueryDtoSchema.safeParse({
            symbols: symbolsOf(QUOTE_LIST_MAX_SYMBOLS + 1),
        });
        expect(result.success).toBe(false);
        expect(result.error?.issues[0]?.path).toEqual(["symbols"]);
    });

    it("counts duplicates once towards the maximum", () => {
        const result = quoteListQueryDtoSchema.safeParse({
            symbols: `${symbolsOf(QUOTE_LIST_MAX_SYMBOLS)},s0,S1`,
        });
        expect(result.success).toBe(true);
    });

    it.each(["AAPL;DROP", "BAD SYMBOL", "../etc", "A".repeat(16), "caf\u00e9"])(
        "rejects the malformed symbol %j",
        (symbol) => {
            const result = quoteListQueryDtoSchema.safeParse({ symbols: `AAPL,${symbol}` });
            expect(result.success).toBe(false);
            expect(result.error?.issues[0]?.path).toEqual(["symbols", 1]);
        },
    );

    it.each(["AAPL", "BRK.B", "BTC-USD", "7203.T", "A".repeat(15)])(
        "accepts the symbol %j",
        (symbol) => {
            expect(quoteSymbolSchema.safeParse(symbol).success).toBe(true);
        },
    );
});
