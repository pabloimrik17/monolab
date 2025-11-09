import { describe, expect, it } from "vitest";
import { isNonNullish, isNullish } from "./nullish.ts";

describe("isNullish", () => {
    it("should return true for null", () => {
        expect(isNullish(null)).toBe(true);
    });

    it("should return true for undefined", () => {
        expect(isNullish(undefined)).toBe(true);
    });

    it("should return false for defined values", () => {
        expect(isNullish("hello")).toBe(false);
        expect(isNullish(0)).toBe(false);
        expect(isNullish(false)).toBe(false);
        expect(isNullish("")).toBe(false);
    });

    it("should return false for objects", () => {
        expect(isNullish({})).toBe(false);
        expect(isNullish([])).toBe(false);
    });
});

describe("isNonNullish", () => {
    it("should return false for null", () => {
        expect(isNonNullish(null)).toBe(false);
    });

    it("should return false for undefined", () => {
        expect(isNonNullish(undefined)).toBe(false);
    });

    it("should return true for defined values", () => {
        expect(isNonNullish("hello")).toBe(true);
        expect(isNonNullish(0)).toBe(true);
        expect(isNonNullish(false)).toBe(true);
        expect(isNonNullish("")).toBe(true);
    });

    it("should return true for objects", () => {
        expect(isNonNullish({})).toBe(true);
        expect(isNonNullish([])).toBe(true);
    });

    it("should work with array filter", () => {
        const values: (string | null | undefined)[] = [
            "hello",
            null,
            undefined,
            "world",
            null,
            "!",
        ];
        const filtered = values.filter(isNonNullish);

        expect(filtered).toEqual(["hello", "world", "!"]);
        expect(filtered).toHaveLength(3);
    });
});
