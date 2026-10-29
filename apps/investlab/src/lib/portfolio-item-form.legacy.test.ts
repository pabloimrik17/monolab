import { describe, expect, it } from "vitest";
import {
    createPortfolioItemFormSchema,
    portfolioItemIdFormSchema,
    updatePortfolioItemFormSchema,
} from "./portfolio-item-form";

const ID = "6b3389b3-bff8-416e-93ad-e6d411808d95";

function formData(fields: Record<string, string>): Record<string, FormDataEntryValue> {
    const data = new FormData();
    for (const [key, value] of Object.entries(fields)) data.append(key, value);
    return Object.fromEntries(data);
}

const validCreate = {
    instrumentId: ID,
    broker: " MyInvestor ",
    targetWeight: "12.5",
    currentValue: "1000",
    notes: "",
};

describe("createPortfolioItemFormSchema", () => {
    it("coerces numeric strings, trims broker and drops blank notes", () => {
        const result = createPortfolioItemFormSchema.safeParse(formData(validCreate));
        expect(result.success).toBe(true);
        expect(result.data).toEqual({
            instrumentId: ID,
            broker: "MyInvestor",
            targetWeight: 12.5,
            currentValue: 1000,
            notes: undefined,
        });
    });

    it("treats a blank current value as not provided", () => {
        const result = createPortfolioItemFormSchema.safeParse(
            formData({ ...validCreate, currentValue: "" }),
        );
        expect(result.success).toBe(true);
        expect(result.data?.currentValue).toBeUndefined();
    });

    it.each([
        ["targetWeight", { targetWeight: "abc" }],
        ["targetWeight", { targetWeight: "" }],
        ["targetWeight", { targetWeight: "101" }],
        ["currentValue", { currentValue: "abc" }],
        ["currentValue", { currentValue: "10000000000" }],
        ["broker", { broker: "   " }],
        ["broker", { broker: "b".repeat(101) }],
        ["instrumentId", { instrumentId: "" }],
    ])("reports a field error on %s for %o", (field, override) => {
        const result = createPortfolioItemFormSchema.safeParse(
            formData({ ...validCreate, ...override }),
        );
        expect(result.success).toBe(false);
        expect(Object.keys(result.error?.flatten().fieldErrors ?? {})).toEqual([field]);
    });
});

describe("updatePortfolioItemFormSchema", () => {
    const validUpdate = {
        id: ID,
        broker: "Binance",
        targetWeight: "20",
        currentValue: "500",
        notes: "",
        expectedUpdatedAt: "2026-10-02T11:30:00.123Z",
    };

    it("parses the expected version into a Date", () => {
        const result = updatePortfolioItemFormSchema.safeParse(formData(validUpdate));
        expect(result.data?.expectedUpdatedAt).toEqual(new Date("2026-10-02T11:30:00.123Z"));
    });

    it("keeps a blank notes field as an explicit clear", () => {
        const result = updatePortfolioItemFormSchema.safeParse(formData(validUpdate));
        expect(result.success).toBe(true);
        expect(result.data).toHaveProperty("notes", undefined);
    });

    it.each([
        ["broker", { broker: "" }],
        ["targetWeight", { targetWeight: "" }],
        ["currentValue", { currentValue: "abc" }],
        ["currentValue", { currentValue: "" }],
        ["id", { id: "not-a-uuid" }],
        ["expectedUpdatedAt", { expectedUpdatedAt: "" }],
        ["expectedUpdatedAt", { expectedUpdatedAt: "yesterday" }],
    ])("reports a field error on %s for %o", (field, override) => {
        const result = updatePortfolioItemFormSchema.safeParse(
            formData({ ...validUpdate, ...override }),
        );
        expect(result.success).toBe(false);
        expect(Object.keys(result.error?.flatten().fieldErrors ?? {})).toEqual([field]);
    });
});

describe("portfolioItemIdFormSchema", () => {
    it("requires a uuid id", () => {
        expect(portfolioItemIdFormSchema.safeParse(formData({ id: ID })).success).toBe(true);
        expect(portfolioItemIdFormSchema.safeParse(formData({ id: "" })).success).toBe(false);
    });
});
