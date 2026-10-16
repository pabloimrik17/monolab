import { describe, expect, it } from "vitest";
import { instrumentDtoSchema } from "./instrument.dto.ts";

const ID = "6b3389b3-bff8-416e-93ad-e6d411808d95";

describe("instrumentDtoSchema", () => {
    it("accepts a minimal instrument", () => {
        const result = instrumentDtoSchema.safeParse({
            id: ID,
            symbol: "SPY",
            name: "SPDR S&P 500",
            type: "etf",
            assetClass: "equity",
            quotable: true,
        });
        expect(result.success).toBe(true);
    });

    it("accepts the optional fields", () => {
        const result = instrumentDtoSchema.safeParse({
            id: ID,
            symbol: "SPY",
            name: "SPDR S&P 500",
            type: "etf",
            assetClass: "equity",
            exchange: "NYSE",
            sector: "technology",
            replicates: "S&P 500",
            quotable: false,
        });
        expect(result.success).toBe(true);
    });

    it("rejects an unknown type", () => {
        const result = instrumentDtoSchema.safeParse({
            id: ID,
            symbol: "SPY",
            name: "SPDR",
            type: "warrant",
            assetClass: "equity",
            quotable: true,
        });
        expect(result.success).toBe(false);
    });
});
