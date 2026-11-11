import { describe, expect, it } from "vitest";
import { portfolioItemListDtoSchema } from "./portfolio-item-list.dto.ts";

const ID = "6b3389b3-bff8-416e-93ad-e6d411808d95";
const instrument = {
    id: ID,
    symbol: "SPY",
    name: "SPDR",
    type: "etf",
    assetClass: "equity",
    quotable: true,
};
const item = {
    id: ID,
    instrumentId: ID,
    broker: "MyInvestor",
    targetWeight: 15,
    currentValue: 1000,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("portfolioItemListDtoSchema", () => {
    it("accepts items paired with their instrument plus the catalog", () => {
        const result = portfolioItemListDtoSchema.safeParse({
            items: [{ item, instrument }],
            instruments: [instrument],
        });
        expect(result.success).toBe(true);
    });

    it("accepts an empty portfolio", () => {
        const result = portfolioItemListDtoSchema.safeParse({ items: [], instruments: [] });
        expect(result.success).toBe(true);
    });

    it("rejects an item without its instrument", () => {
        const result = portfolioItemListDtoSchema.safeParse({ items: [{ item }], instruments: [] });
        expect(result.success).toBe(false);
    });
});
