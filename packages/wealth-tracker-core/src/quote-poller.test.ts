import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
    type Mock,
} from "vitest";
import type { FinnhubClient } from "./finnhub-client.js";
import { createQuotePoller } from "./quote-poller.js";
import type { Quote } from "./types.js";

function createMockClient(): FinnhubClient & { getQuotes: Mock } {
    return {
        getQuote: vi.fn(),
        getQuotes: vi.fn().mockResolvedValue(new Map()),
    };
}

function createMockQuote(symbol: string): Quote {
    return {
        symbol,
        price: 100,
        change: 1,
        changePercent: 1,
        updatedAt: new Date("2024-01-01T00:00:00Z"),
    };
}

describe("createQuotePoller", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe("start", () => {
        it("immediately fetches quotes on start", async () => {
            const client = createMockClient();
            const onUpdate = vi.fn();
            const poller = createQuotePoller(client, { onUpdate });

            poller.start(["AAPL", "MSFT"]);
            await vi.advanceTimersByTimeAsync(0);

            expect(client.getQuotes).toHaveBeenCalledWith(["AAPL", "MSFT"]);
            poller.stop();
        });

        it("calls onUpdate with fetched quotes", async () => {
            const client = createMockClient();
            const quotes = new Map([
                ["AAPL", createMockQuote("AAPL")],
                ["MSFT", createMockQuote("MSFT")],
            ]);
            client.getQuotes.mockResolvedValue(quotes);

            const onUpdate = vi.fn();
            const poller = createQuotePoller(client, { onUpdate });

            poller.start(["AAPL", "MSFT"]);
            await vi.advanceTimersByTimeAsync(0);

            expect(onUpdate).toHaveBeenCalledWith(quotes);
            poller.stop();
        });

        it("does not fetch if ticker list is empty", async () => {
            const client = createMockClient();
            const onUpdate = vi.fn();
            const poller = createQuotePoller(client, { onUpdate });

            poller.start([]);
            await vi.advanceTimersByTimeAsync(0);

            expect(client.getQuotes).not.toHaveBeenCalled();
            expect(onUpdate).not.toHaveBeenCalled();
            poller.stop();
        });

        it("normalizes tickers to uppercase", async () => {
            const client = createMockClient();
            const onUpdate = vi.fn();
            const poller = createQuotePoller(client, { onUpdate });

            poller.start(["aapl", "msft"]);
            await vi.advanceTimersByTimeAsync(0);

            expect(client.getQuotes).toHaveBeenCalledWith(["AAPL", "MSFT"]);
            poller.stop();
        });

        it("does nothing if already polling", async () => {
            const client = createMockClient();
            const onUpdate = vi.fn();
            const poller = createQuotePoller(client, { onUpdate });

            poller.start(["AAPL"]);
            poller.start(["MSFT"]);
            await vi.advanceTimersByTimeAsync(0);

            expect(client.getQuotes).toHaveBeenCalledTimes(1);
            expect(client.getQuotes).toHaveBeenCalledWith(["AAPL"]);
            poller.stop();
        });
    });

    describe("stop", () => {
        it("stops polling", async () => {
            const client = createMockClient();
            const onUpdate = vi.fn();
            const poller = createQuotePoller(client, { onUpdate });

            poller.start(["AAPL"]);
            await vi.advanceTimersByTimeAsync(0);
            poller.stop();

            expect(poller.isPolling()).toBe(false);
        });

        it("does not error if not polling", () => {
            const client = createMockClient();
            const onUpdate = vi.fn();
            const poller = createQuotePoller(client, { onUpdate });

            expect(() => poller.stop()).not.toThrow();
        });

        it("prevents subsequent fetches", async () => {
            const client = createMockClient();
            const onUpdate = vi.fn();
            const poller = createQuotePoller(client, {
                onUpdate,
                interval: 15000,
            });

            poller.start(["AAPL"]);
            await vi.advanceTimersByTimeAsync(0);
            poller.stop();

            client.getQuotes.mockClear();
            await vi.advanceTimersByTimeAsync(30000);

            expect(client.getQuotes).not.toHaveBeenCalled();
        });

        it("invalidates in-flight poll when stop then start is called", async () => {
            const client = createMockClient();
            let resolveFirst: (value: Map<string, Quote>) => void;
            const firstCallPromise = new Promise<Map<string, Quote>>((r) => {
                resolveFirst = r;
            });

            const msftQuotes = new Map([["MSFT", createMockQuote("MSFT")]]);
            client.getQuotes
                .mockReturnValueOnce(firstCallPromise)
                .mockResolvedValue(msftQuotes);

            const onUpdate = vi.fn();
            const poller = createQuotePoller(client, {
                onUpdate,
                interval: 15000,
            });

            // Start first poll (will hang on firstCallPromise)
            poller.start(["AAPL"]);

            // Stop and start again while first poll is in-flight
            poller.stop();
            poller.start(["MSFT"]);
            await vi.advanceTimersByTimeAsync(0);

            // Resolve the stale first poll
            resolveFirst!(new Map([["AAPL", createMockQuote("AAPL")]]));
            await vi.advanceTimersByTimeAsync(0);

            // onUpdate should only be called with MSFT (new poll), not AAPL (stale)
            expect(onUpdate).toHaveBeenCalledTimes(1);
            expect(onUpdate).toHaveBeenCalledWith(msftQuotes);
            poller.stop();
        });
    });

    describe("setInterval", () => {
        it("changes polling interval", async () => {
            const client = createMockClient();
            const onUpdate = vi.fn();
            const poller = createQuotePoller(client, {
                onUpdate,
                interval: 30000,
            });

            poller.start(["AAPL"]);
            await vi.advanceTimersByTimeAsync(0);
            client.getQuotes.mockClear();

            poller.setInterval(20000);
            // First poll was scheduled with 30s, need to wait for that
            await vi.advanceTimersByTimeAsync(30000);
            expect(client.getQuotes).toHaveBeenCalledTimes(1);

            client.getQuotes.mockClear();
            // Now next poll should be at 20s interval
            await vi.advanceTimersByTimeAsync(20000);
            expect(client.getQuotes).toHaveBeenCalledTimes(1);
            poller.stop();
        });

        it("clamps interval to minimum 15s", async () => {
            const client = createMockClient();
            const onUpdate = vi.fn();
            const poller = createQuotePoller(client, { onUpdate });

            poller.setInterval(5000);
            poller.start(["AAPL"]);
            await vi.advanceTimersByTimeAsync(0);
            client.getQuotes.mockClear();

            await vi.advanceTimersByTimeAsync(14999);
            expect(client.getQuotes).not.toHaveBeenCalled();

            await vi.advanceTimersByTimeAsync(1);
            expect(client.getQuotes).toHaveBeenCalledTimes(1);
            poller.stop();
        });

        it("clamps interval to maximum 60s", async () => {
            const client = createMockClient();
            const onUpdate = vi.fn();
            const poller = createQuotePoller(client, { onUpdate });

            poller.setInterval(120000);
            poller.start(["AAPL"]);
            await vi.advanceTimersByTimeAsync(0);
            client.getQuotes.mockClear();

            // After 60s should have polled (clamped to max)
            await vi.advanceTimersByTimeAsync(60000);
            expect(client.getQuotes).toHaveBeenCalledTimes(1);

            // After another 60s should have polled again
            await vi.advanceTimersByTimeAsync(60000);
            expect(client.getQuotes).toHaveBeenCalledTimes(2);
        });
    });

    describe("setTickers", () => {
        it("updates ticker list for next poll", async () => {
            const client = createMockClient();
            const onUpdate = vi.fn();
            const poller = createQuotePoller(client, {
                onUpdate,
                interval: 15000,
            });

            poller.start(["AAPL"]);
            await vi.advanceTimersByTimeAsync(0);

            poller.setTickers(["GOOGL", "TSLA"]);
            await vi.advanceTimersByTimeAsync(15000);

            expect(client.getQuotes).toHaveBeenLastCalledWith([
                "GOOGL",
                "TSLA",
            ]);
        });

        it("normalizes new tickers to uppercase", async () => {
            const client = createMockClient();
            const onUpdate = vi.fn();
            const poller = createQuotePoller(client, {
                onUpdate,
                interval: 15000,
            });

            poller.start(["AAPL"]);
            await vi.advanceTimersByTimeAsync(0);

            poller.setTickers(["googl", "tsla"]);
            await vi.advanceTimersByTimeAsync(15000);

            expect(client.getQuotes).toHaveBeenLastCalledWith([
                "GOOGL",
                "TSLA",
            ]);
        });

        it("continues polling when tickers become empty and resumes when re-added", async () => {
            const client = createMockClient();
            const onUpdate = vi.fn();
            const poller = createQuotePoller(client, {
                onUpdate,
                interval: 15000,
            });

            poller.start(["AAPL"]);
            await vi.advanceTimersByTimeAsync(0);
            expect(client.getQuotes).toHaveBeenCalledTimes(1);

            // Set tickers to empty - should not stop polling loop
            poller.setTickers([]);
            client.getQuotes.mockClear();
            await vi.advanceTimersByTimeAsync(15000);

            // Should not have called getQuotes (no tickers)
            expect(client.getQuotes).not.toHaveBeenCalled();
            expect(poller.isPolling()).toBe(true);

            // Re-add tickers - should resume fetching
            poller.setTickers(["MSFT"]);
            await vi.advanceTimersByTimeAsync(15000);

            expect(client.getQuotes).toHaveBeenCalledWith(["MSFT"]);
            poller.stop();
        });
    });

    describe("error handling", () => {
        it("calls onError on fetch failure", async () => {
            const client = createMockClient();
            const error = new Error("Network error");
            client.getQuotes.mockRejectedValue(error);

            const onUpdate = vi.fn();
            const onError = vi.fn();
            const poller = createQuotePoller(client, { onUpdate, onError });

            poller.start(["AAPL"]);
            await vi.advanceTimersByTimeAsync(0);

            expect(onError).toHaveBeenCalledWith(error);
            poller.stop();
        });

        it("continues polling after error", async () => {
            const client = createMockClient();
            client.getQuotes
                .mockRejectedValueOnce(new Error("Network error"))
                .mockResolvedValue(
                    new Map([["AAPL", createMockQuote("AAPL")]])
                );

            const onUpdate = vi.fn();
            const onError = vi.fn();
            const poller = createQuotePoller(client, {
                onUpdate,
                onError,
                interval: 15000,
            });

            poller.start(["AAPL"]);
            await vi.advanceTimersByTimeAsync(0);

            expect(onError).toHaveBeenCalledTimes(1);
            expect(poller.isPolling()).toBe(true);

            await vi.advanceTimersByTimeAsync(15000);
            expect(onUpdate).toHaveBeenCalled();
        });

        it("handles non-Error thrown values", async () => {
            const client = createMockClient();
            client.getQuotes.mockRejectedValue("string error");

            const onError = vi.fn();
            const poller = createQuotePoller(client, {
                onUpdate: vi.fn(),
                onError,
            });

            poller.start(["AAPL"]);
            await vi.advanceTimersByTimeAsync(0);

            expect(onError).toHaveBeenCalledWith(expect.any(Error));
            poller.stop();
        });
    });

    describe("isPolling", () => {
        it("returns false initially", () => {
            const client = createMockClient();
            const poller = createQuotePoller(client, { onUpdate: vi.fn() });

            expect(poller.isPolling()).toBe(false);
        });

        it("returns true after start", () => {
            const client = createMockClient();
            const poller = createQuotePoller(client, { onUpdate: vi.fn() });

            poller.start(["AAPL"]);

            expect(poller.isPolling()).toBe(true);
        });

        it("returns false after stop", async () => {
            const client = createMockClient();
            const poller = createQuotePoller(client, { onUpdate: vi.fn() });

            poller.start(["AAPL"]);
            await vi.advanceTimersByTimeAsync(0);
            poller.stop();

            expect(poller.isPolling()).toBe(false);
        });
    });

    describe("polling loop", () => {
        it("polls at configured interval", async () => {
            const client = createMockClient();
            const onUpdate = vi.fn();
            const poller = createQuotePoller(client, {
                onUpdate,
                interval: 20000,
            });

            poller.start(["AAPL"]);
            await vi.advanceTimersByTimeAsync(0);
            expect(client.getQuotes).toHaveBeenCalledTimes(1);

            await vi.advanceTimersByTimeAsync(20000);
            expect(client.getQuotes).toHaveBeenCalledTimes(2);

            await vi.advanceTimersByTimeAsync(20000);
            expect(client.getQuotes).toHaveBeenCalledTimes(3);
        });

        it("uses default interval of 30s", async () => {
            const client = createMockClient();
            const onUpdate = vi.fn();
            const poller = createQuotePoller(client, { onUpdate });

            poller.start(["AAPL"]);
            await vi.advanceTimersByTimeAsync(0);
            client.getQuotes.mockClear();

            await vi.advanceTimersByTimeAsync(29999);
            expect(client.getQuotes).not.toHaveBeenCalled();

            await vi.advanceTimersByTimeAsync(1);
            expect(client.getQuotes).toHaveBeenCalledTimes(1);
        });
    });
});
