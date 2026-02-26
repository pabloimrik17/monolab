import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTickerStore } from "./ticker-store.js";
import type { Storage } from "./types.js";

function createMockStorage(): Storage & { data: Map<string, string> } {
    const data = new Map<string, string>();
    return {
        data,
        getItem: vi.fn((key: string) => data.get(key) ?? null),
        setItem: vi.fn((key: string, value: string) => {
            data.set(key, value);
        }),
        removeItem: vi.fn((key: string) => {
            data.delete(key);
        }),
    };
}

describe("createTickerStore", () => {
    let storage: ReturnType<typeof createMockStorage>;

    beforeEach(() => {
        storage = createMockStorage();
    });

    describe("add", () => {
        it("adds ticker with uppercase normalization", () => {
            const store = createTickerStore(storage);
            const ticker = store.add("aapl");

            expect(ticker.symbol).toBe("AAPL");
            expect(ticker.addedAt).toBeInstanceOf(Date);
        });

        it("returns existing ticker if duplicate", () => {
            const store = createTickerStore(storage);
            const first = store.add("AAPL");
            const second = store.add("aapl");

            expect(second).toBe(first);
            expect(store.getTickers()).toHaveLength(1);
        });

        it("persists to storage on add", () => {
            const store = createTickerStore(storage);
            store.add("AAPL");

            expect(storage.setItem).toHaveBeenCalled();
            const stored = JSON.parse(
                storage.data.get("wealth-tracker-tickers") ?? "[]"
            );
            expect(stored).toHaveLength(1);
            expect(stored[0].symbol).toBe("AAPL");
        });
    });

    describe("remove", () => {
        it("removes existing ticker", () => {
            const store = createTickerStore(storage);
            store.add("AAPL");
            store.remove("AAPL");

            expect(store.getTickers()).toHaveLength(0);
        });

        it("handles non-existent ticker without error", () => {
            const store = createTickerStore(storage);
            store.remove("XYZ");

            expect(store.getTickers()).toHaveLength(0);
        });

        it("persists to storage on remove", () => {
            const store = createTickerStore(storage);
            store.add("AAPL");
            vi.clearAllMocks();

            store.remove("AAPL");

            expect(storage.setItem).toHaveBeenCalled();
        });

        it("normalizes symbol to uppercase when removing", () => {
            const store = createTickerStore(storage);
            store.add("AAPL");
            store.remove("aapl");

            expect(store.getTickers()).toHaveLength(0);
        });
    });

    describe("getTickers", () => {
        it("returns tickers sorted alphabetically", () => {
            const store = createTickerStore(storage);
            store.add("MSFT");
            store.add("AAPL");
            store.add("GOOGL");

            const tickers = store.getTickers();

            expect(tickers.map((t) => t.symbol)).toEqual([
                "AAPL",
                "GOOGL",
                "MSFT",
            ]);
        });

        it("returns empty array when no tickers", () => {
            const store = createTickerStore(storage);

            expect(store.getTickers()).toEqual([]);
        });
    });

    describe("persistence", () => {
        it("loads tickers from storage on init", () => {
            storage.data.set(
                "wealth-tracker-tickers",
                JSON.stringify([
                    { symbol: "AAPL", addedAt: "2024-01-01T00:00:00.000Z" },
                    { symbol: "MSFT", addedAt: "2024-01-02T00:00:00.000Z" },
                ])
            );

            const store = createTickerStore(storage);
            const tickers = store.getTickers();

            expect(tickers).toHaveLength(2);
            expect(tickers[0].symbol).toBe("AAPL");
            expect(tickers[0].addedAt).toEqual(
                new Date("2024-01-01T00:00:00.000Z")
            );
        });

        it("handles corrupted storage gracefully", () => {
            storage.data.set("wealth-tracker-tickers", "invalid json");

            const store = createTickerStore(storage);

            expect(store.getTickers()).toEqual([]);
        });

        it("handles empty storage", () => {
            const store = createTickerStore(storage);

            expect(store.getTickers()).toEqual([]);
        });
    });
});
