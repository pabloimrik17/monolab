import { describe, expect, it } from "vitest";
import { exponentialBackoff, jitterBackoff, linearBackoff } from "../index.js";

/**
 * Unit tests for HTTP retry backoff strategies.
 * @vitest-environment node
 */

describe("retry", () => {
    describe("exponentialBackoff", () => {
        it("should double delay with each attempt", () => {
            const delay = exponentialBackoff(1000);

            expect(delay(1, {} as never)).toBe(1000);
            expect(delay(2, {} as never)).toBe(2000);
            expect(delay(3, {} as never)).toBe(4000);
            expect(delay(4, {} as never)).toBe(8000);
        });

        it("should cap at maxDelay", () => {
            const delay = exponentialBackoff(1000, 5000);

            expect(delay(1, {} as never)).toBe(1000);
            expect(delay(2, {} as never)).toBe(2000);
            expect(delay(3, {} as never)).toBe(4000);
            expect(delay(4, {} as never)).toBe(5000);
            expect(delay(10, {} as never)).toBe(5000);
        });

        it("should grow unbounded without maxDelay", () => {
            const delay = exponentialBackoff(100);

            expect(delay(10, {} as never)).toBe(100 * Math.pow(2, 9));
        });
    });

    describe("linearBackoff", () => {
        it("should increase linearly with each attempt", () => {
            const delay = linearBackoff(500);

            expect(delay(1, {} as never)).toBe(500);
            expect(delay(2, {} as never)).toBe(1000);
            expect(delay(3, {} as never)).toBe(1500);
        });
    });

    describe("jitterBackoff", () => {
        it("should return delay within expected range", () => {
            const delay = jitterBackoff(1000);

            for (let i = 0; i < 20; i++) {
                const value = delay(1, {} as never);
                expect(value).toBeGreaterThanOrEqual(0);
                expect(value).toBeLessThan(1000);
            }
        });

        it("should respect maxDelay cap before applying jitter", () => {
            const delay = jitterBackoff(1000, 3000);

            for (let i = 0; i < 20; i++) {
                const value = delay(5, {} as never);
                expect(value).toBeGreaterThanOrEqual(0);
                expect(value).toBeLessThan(3000);
            }
        });

        it("should scale jitter range with attempt number", () => {
            const delay = jitterBackoff(100);

            const samples1 = Array.from({ length: 100 }, () => delay(1, {} as never));
            const samples4 = Array.from({ length: 100 }, () => delay(4, {} as never));

            const max1 = Math.max(...samples1);
            const max4 = Math.max(...samples4);

            // attempt 4 range is 8x attempt 1, so max should be meaningfully larger
            expect(max4).toBeGreaterThan(max1);
        });
    });
});
