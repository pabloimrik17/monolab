import { describe, expect, it } from "vitest";
import { isEven, isNotEven } from "./index.ts";

describe("isEven", () => {
    it("should return true for even numbers", () => {
        expect(isEven(0)).toBe(true);
        expect(isEven(2)).toBe(true);
        expect(isEven(4)).toBe(true);
        expect(isEven(-2)).toBe(true);
    });

    it("should return false for odd numbers", () => {
        expect(isEven(1)).toBe(false);
        expect(isEven(3)).toBe(false);
        expect(isEven(-1)).toBe(false);
    });
});

describe("isNotEven", () => {
    it("should return false for even numbers", () => {
        expect(isNotEven(0)).toBe(false);
        expect(isNotEven(2)).toBe(false);
        expect(isNotEven(4)).toBe(false);
    });

    it("should return true for odd numbers", () => {
        expect(isNotEven(1)).toBe(true);
        expect(isNotEven(3)).toBe(true);
        expect(isNotEven(-1)).toBe(true);
    });
});
