import { describe, expect, it } from "vitest";
import { isNonUndefinable, isUndefinable } from "./undefinable.ts";

describe("isUndefinable", () => {
    it("should return true for undefined", () => {
        expect(isUndefinable(undefined)).toBe(true);
    });

    it("should return false for defined values", () => {
        expect(isUndefinable("hello")).toBe(false);
        expect(isUndefinable(0)).toBe(false);
        expect(isUndefinable(false)).toBe(false);
        expect(isUndefinable("")).toBe(false);
    });

    it("should return false for null", () => {
        expect(isUndefinable(null)).toBe(false);
    });

    it("should return false for objects", () => {
        expect(isUndefinable({})).toBe(false);
        expect(isUndefinable([])).toBe(false);
    });
});

describe("isNonUndefinable", () => {
    it("should return false for undefined", () => {
        expect(isNonUndefinable(undefined)).toBe(false);
    });

    it("should return true for defined values", () => {
        expect(isNonUndefinable("hello")).toBe(true);
        expect(isNonUndefinable(0)).toBe(true);
        expect(isNonUndefinable(false)).toBe(true);
        expect(isNonUndefinable("")).toBe(true);
    });

    it("should return true for null", () => {
        expect(isNonUndefinable(null)).toBe(true);
    });

    it("should return true for objects", () => {
        expect(isNonUndefinable({})).toBe(true);
        expect(isNonUndefinable([])).toBe(true);
    });

    it("should work with array filter", () => {
        const values: (string | undefined)[] = [
            "hello",
            undefined,
            "world",
            undefined,
            "!",
        ];
        const filtered = values.filter(isNonUndefinable);

        expect(filtered).toEqual(["hello", "world", "!"]);
        expect(filtered).toHaveLength(3);
    });
});
