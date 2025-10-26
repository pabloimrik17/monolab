import { describe, expect, it } from "vitest";
import { isOdd } from "./index.js";

describe("isOdd", () => {
    it("should return true for odd numbers", () => {
        expect(isOdd(1)).toBe(true);
        expect(isOdd(3)).toBe(true);
        expect(isOdd(5)).toBe(true);
        expect(isOdd(-1)).toBe(true);
        expect(isOdd(-3)).toBe(true);
    });

    it("should return false for even numbers", () => {
        expect(isOdd(0)).toBe(false);
        expect(isOdd(2)).toBe(false);
        expect(isOdd(4)).toBe(false);
        expect(isOdd(-2)).toBe(false);
    });
});
