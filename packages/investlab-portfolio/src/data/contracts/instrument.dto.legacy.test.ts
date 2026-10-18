import { describe, expect, it } from "vitest";
import {
    createInstrumentDtoSchema,
    instrumentDtoSchema,
    updateInstrumentDtoSchema,
} from "./instrument.dto.ts";

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

describe("createInstrumentDtoSchema", () => {
    const minimal = {
        symbol: "VWCE",
        name: "Vanguard FTSE All-World",
        type: "etf",
        assetClass: "equity",
    };

    it("accepts minimal input", () => {
        expect(createInstrumentDtoSchema.safeParse(minimal).success).toBe(true);
    });

    it.each([
        { symbol: "   " },
        { symbol: "S".repeat(21) },
        { name: "" },
        { name: "n".repeat(201) },
        { type: "warrant" },
        { sector: "gambling" },
        { exchange: "E".repeat(21) },
    ])("rejects %o", (override) => {
        expect(createInstrumentDtoSchema.safeParse({ ...minimal, ...override }).success).toBe(
            false,
        );
    });
});

describe("updateInstrumentDtoSchema", () => {
    it("accepts an empty patch", () => {
        expect(updateInstrumentDtoSchema.safeParse({}).success).toBe(true);
    });

    it("accepts null for the optional fields as an explicit clear", () => {
        const patch = { exchange: null, sector: null, replicates: null };

        const result = updateInstrumentDtoSchema.safeParse(patch);

        expect(result.data).toEqual(patch);
    });

    it.each([{ name: null }, { symbol: "" }, { type: "warrant" }])("rejects %o", (patch) => {
        expect(updateInstrumentDtoSchema.safeParse(patch).success).toBe(false);
    });
});
