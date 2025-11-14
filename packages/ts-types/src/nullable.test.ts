import { describe, expect, it } from "vitest";
import { isNonNullable, isNullable } from "./nullable.ts";

describe("isNullable", () => {
    it("should return true for null", () => {
        expect(isNullable(null)).toBe(true);
    });

    it("should return false for defined values", () => {
        expect(isNullable("hello")).toBe(false);
        expect(isNullable(0)).toBe(false);
        expect(isNullable(false)).toBe(false);
        expect(isNullable("")).toBe(false);
    });

    it("should return false for undefined", () => {
        expect(isNullable(undefined)).toBe(false);
    });

    it("should return false for objects", () => {
        expect(isNullable({})).toBe(false);
        expect(isNullable([])).toBe(false);
    });
});

describe("isNonNullable", () => {
    it("should return false for null", () => {
        expect(isNonNullable(null)).toBe(false);
    });

    it("should return true for defined values", () => {
        expect(isNonNullable("hello")).toBe(true);
        expect(isNonNullable(0)).toBe(true);
        expect(isNonNullable(false)).toBe(true);
        expect(isNonNullable("")).toBe(true);
    });

    it("should return true for undefined", () => {
        expect(isNonNullable(undefined)).toBe(true);
    });

    it("should return true for objects", () => {
        expect(isNonNullable({})).toBe(true);
        expect(isNonNullable([])).toBe(true);
    });

    it("should work with array filter", () => {
        const values: (string | null)[] = ["hello", null, "world", null, "!"];
        const filtered = values.filter(isNonNullable);

        expect(filtered).toEqual(["hello", "world", "!"]);
        expect(filtered).toHaveLength(3);
    });
});
