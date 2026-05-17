import { describe, expect, it } from "vitest";
import { exponentialBackoff, jitterBackoff, linearBackoff } from "../index.js";

/**
 * Unit tests for HTTP retry backoff strategies.
 * @vitest-environment node
 */

describe("exponentialBackoff", () => {
    it("should double delay with each attempt", () => {
        const delay = exponentialBackoff(1000);

        expect(delay(1, {} as never)).toBe(1000); // 1000 * 2^0
        expect(delay(2, {} as never)).toBe(2000); // 1000 * 2^1
        expect(delay(3, {} as never)).toBe(4000); // 1000 * 2^2
        expect(delay(4, {} as never)).toBe(8000); // 1000 * 2^3
    });

    it("should cap at maxDelay", () => {
        const delay = exponentialBackoff(1000, 5000);

        expect(delay(1, {} as never)).toBe(1000);
        expect(delay(2, {} as never)).toBe(2000);
        expect(delay(3, {} as never)).toBe(4000);
        expect(delay(4, {} as never)).toBe(5000); // capped, not 8000
        expect(delay(10, {} as never)).toBe(5000); // still capped
    });

    it("should grow unbounded without maxDelay", () => {
        const delay = exponentialBackoff(100);

        expect(delay(10, {} as never)).toBe(100 * Math.pow(2, 9)); // 51200
    });
});

describe("linearBackoff", () => {
    it("should increase linearly with each attempt", () => {
        const delay = linearBackoff(500);

        expect(delay(1, {} as never)).toBe(500); // 500 * 1
        expect(delay(2, {} as never)).toBe(1000); // 500 * 2
        expect(delay(3, {} as never)).toBe(1500); // 500 * 3
    });
});

describe("jitterBackoff", () => {
    it("should return delay within expected range", () => {
        const delay = jitterBackoff(1000);

        for (let i = 0; i < 20; i++) {
            const value = delay(1, {} as never);
            // attempt 1 → cap = 1000 * 2^0 = 1000, jitter ∈ [0, 1000)
            expect(value).toBeGreaterThanOrEqual(0);
            expect(value).toBeLessThan(1000);
        }
    });

    it("should respect maxDelay cap before applying jitter", () => {
        const delay = jitterBackoff(1000, 3000);

        for (let i = 0; i < 20; i++) {
            const value = delay(5, {} as never);
            // attempt 5 → exponential = 1000 * 2^4 = 16000, capped to 3000
            // jitter ∈ [0, 3000)
            expect(value).toBeGreaterThanOrEqual(0);
            expect(value).toBeLessThan(3000);
        }
    });

    it("should scale jitter range with attempt number", () => {
        const delay = jitterBackoff(100);

        // Collect many samples for attempt 1 (max 100) and attempt 4 (max 800)
        const samples1 = Array.from({ length: 100 }, () => delay(1, {} as never));
        const samples4 = Array.from({ length: 100 }, () => delay(4, {} as never));

        const max1 = Math.max(...samples1);
        const max4 = Math.max(...samples4);

        // attempt 4 range is 8x attempt 1, so max should be meaningfully larger
        expect(max4).toBeGreaterThan(max1);
    });
});
