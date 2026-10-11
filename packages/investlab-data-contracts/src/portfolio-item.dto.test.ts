import { describe, expect, it } from "vitest";
import {
    createPortfolioItemDtoSchema,
    portfolioItemDtoSchema,
    updatePortfolioItemDtoSchema,
} from "./portfolio-item.dto.ts";

const ID = "6b3389b3-bff8-416e-93ad-e6d411808d95";

describe("portfolioItemDtoSchema", () => {
    it("accepts a full DTO", () => {
        const result = portfolioItemDtoSchema.safeParse({
            id: ID,
            instrumentId: ID,
            broker: "MyInvestor",
            targetWeight: 15,
            currentValue: 1000,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
        });
        expect(result.success).toBe(true);
    });

    it("rejects non-ISO dates", () => {
        const result = portfolioItemDtoSchema.safeParse({
            id: ID,
            instrumentId: ID,
            broker: "MyInvestor",
            targetWeight: 15,
            currentValue: 1000,
            createdAt: "yesterday",
            updatedAt: "2026-01-01T00:00:00.000Z",
        });
        expect(result.success).toBe(false);
    });
});

describe("createPortfolioItemDtoSchema", () => {
    it("accepts minimal input", () => {
        expect(
            createPortfolioItemDtoSchema.safeParse({
                instrumentId: ID,
                broker: "MyInvestor",
                targetWeight: 0,
            }).success,
        ).toBe(true);
    });

    it.each([
        { targetWeight: 101 },
        { targetWeight: -1 },
        { broker: "" },
        { instrumentId: "not-a-uuid" },
        { currentValue: -5 },
    ])("rejects %o", (override) => {
        expect(
            createPortfolioItemDtoSchema.safeParse({
                instrumentId: ID,
                broker: "MyInvestor",
                targetWeight: 10,
                ...override,
            }).success,
        ).toBe(false);
    });
});

describe("updatePortfolioItemDtoSchema", () => {
    it("accepts an empty patch", () => {
        expect(updatePortfolioItemDtoSchema.safeParse({}).success).toBe(true);
    });

    it("rejects out-of-range weight", () => {
        expect(updatePortfolioItemDtoSchema.safeParse({ targetWeight: 200 }).success).toBe(false);
    });
});
