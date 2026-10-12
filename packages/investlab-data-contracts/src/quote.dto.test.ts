import { describe, expect, it } from "vitest";
import { quoteDtoSchema, quoteListQueryDtoSchema } from "./quote.dto.ts";

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
});
