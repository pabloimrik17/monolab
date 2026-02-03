import { describe, expect, it, vi } from "vitest";
import { batchExecute } from "./batch.js";

describe("batchExecute", () => {
    it("throws if concurrency is zero", async () => {
        const fn = vi.fn(async (n: number) => n);
        await expect(batchExecute([1], fn, { concurrency: 0 })).rejects.toThrow(
            "concurrency must be a positive integer"
        );
    });

    it("throws if concurrency is negative", async () => {
        const fn = vi.fn(async (n: number) => n);
        await expect(
            batchExecute([1], fn, { concurrency: -1 })
        ).rejects.toThrow("concurrency must be a positive integer");
    });

    it("throws if concurrency is not an integer", async () => {
        const fn = vi.fn(async (n: number) => n);
        await expect(
            batchExecute([1], fn, { concurrency: 1.5 })
        ).rejects.toThrow("concurrency must be a positive integer");
    });

    it("executes all items and returns results", async () => {
        const items = [1, 2, 3];
        const fn = vi.fn(async (n: number) => n * 2);

        const results = await batchExecute(items, fn, { concurrency: 10 });

        expect(results.size).toBe(3);
        expect(results.get(1)).toBe(2);
        expect(results.get(2)).toBe(4);
        expect(results.get(3)).toBe(6);
    });

    it("respects concurrency limit", async () => {
        const items = [1, 2, 3, 4, 5];
        let concurrent = 0;
        let maxConcurrent = 0;

        const fn = vi.fn(async (n: number) => {
            concurrent++;
            maxConcurrent = Math.max(maxConcurrent, concurrent);
            await new Promise((r) => setTimeout(r, 10));
            concurrent--;
            return n * 2;
        });

        await batchExecute(items, fn, { concurrency: 2 });

        expect(maxConcurrent).toBeLessThanOrEqual(2);
    });

    it("handles partial failures gracefully", async () => {
        const items = ["a", "b", "c"];
        const fn = vi.fn(async (s: string) => {
            if (s === "b") throw new Error("failed");
            return s.toUpperCase();
        });

        const results = await batchExecute(items, fn, { concurrency: 10 });

        expect(results.size).toBe(2);
        expect(results.get("a")).toBe("A");
        expect(results.get("c")).toBe("C");
        expect(results.has("b")).toBe(false);
    });

    it("handles empty array", async () => {
        const fn = vi.fn(async (n: number) => n);

        const results = await batchExecute([], fn, { concurrency: 10 });

        expect(results.size).toBe(0);
        expect(fn).not.toHaveBeenCalled();
    });

    it("processes batches sequentially", async () => {
        const items = [1, 2, 3, 4];
        const order: number[] = [];

        const fn = vi.fn(async (n: number) => {
            order.push(n);
            await new Promise((r) => setTimeout(r, 5));
            return n;
        });

        await batchExecute(items, fn, { concurrency: 2 });

        // First batch [1,2] starts, then second batch [3,4]
        // Within a batch, order may vary, but batches are sequential
        expect(order.slice(0, 2).sort()).toEqual([1, 2]);
        expect(order.slice(2, 4).sort()).toEqual([3, 4]);
    });
});
