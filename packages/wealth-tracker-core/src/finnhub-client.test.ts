import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFinnhubClient } from "./finnhub-client.js";

const mockFinnhubResponse = (data: object) =>
    new Response(JSON.stringify(data), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    });

describe("createFinnhubClient", () => {
    beforeEach(() => {
        vi.stubGlobal("fetch", vi.fn());
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("throws if API key is empty", () => {
        expect(() => createFinnhubClient("")).toThrow("API key is required");
    });

    it("throws if concurrency is zero", () => {
        expect(() => createFinnhubClient("test-key", { concurrency: 0 })).toThrow(
            "Concurrency must be a positive integer",
        );
    });

    it("throws if concurrency is negative", () => {
        expect(() => createFinnhubClient("test-key", { concurrency: -1 })).toThrow(
            "Concurrency must be a positive integer",
        );
    });

    it("throws if concurrency is not an integer", () => {
        expect(() => createFinnhubClient("test-key", { concurrency: 1.5 })).toThrow(
            "Concurrency must be a positive integer",
        );
    });

    it("creates client with API key", () => {
        const client = createFinnhubClient("test-key");
        expect(client).toBeDefined();
        expect(client.getQuote).toBeTypeOf("function");
        expect(client.getQuotes).toBeTypeOf("function");
    });

    describe("getQuote", () => {
        it("fetches quote for single ticker", async () => {
            vi.mocked(fetch).mockResolvedValueOnce(
                mockFinnhubResponse({
                    c: 150.0,
                    d: 2.5,
                    dp: 1.69,
                    h: 151.0,
                    l: 148.0,
                    o: 149.0,
                    pc: 147.5,
                    t: 1234567890,
                }),
            );

            const client = createFinnhubClient("test-key");
            const quote = await client.getQuote("AAPL");

            expect(quote.symbol).toBe("AAPL");
            expect(quote.price).toBe(150.0);
            expect(quote.change).toBe(2.5);
            expect(quote.changePercent).toBe(1.69);
            expect(quote.updatedAt).toBeInstanceOf(Date);
        });

        it("normalizes symbol to uppercase", async () => {
            vi.mocked(fetch).mockResolvedValueOnce(
                mockFinnhubResponse({
                    c: 100,
                    d: 1,
                    dp: 1,
                    h: 0,
                    l: 0,
                    o: 0,
                    pc: 0,
                    t: 0,
                }),
            );

            const client = createFinnhubClient("test-key");
            const quote = await client.getQuote("aapl");

            expect(quote.symbol).toBe("AAPL");
            expect(fetch).toHaveBeenCalledWith(expect.stringContaining("symbol=AAPL"));
        });

        it("throws on invalid symbol (zero data)", async () => {
            vi.mocked(fetch).mockResolvedValueOnce(
                mockFinnhubResponse({
                    c: 0,
                    d: 0,
                    dp: 0,
                    h: 0,
                    l: 0,
                    o: 0,
                    pc: 0,
                    t: 0,
                }),
            );

            const client = createFinnhubClient("test-key");

            await expect(client.getQuote("INVALID123")).rejects.toThrow(
                "No data for symbol: INVALID123",
            );
        });

        it("throws on HTTP error", async () => {
            vi.mocked(fetch).mockResolvedValueOnce(
                new Response(null, { status: 401, statusText: "Unauthorized" }),
            );

            const client = createFinnhubClient("test-key");

            await expect(client.getQuote("AAPL")).rejects.toThrow("Failed to fetch quote for AAPL");
        });

        it("includes API key in request", async () => {
            vi.mocked(fetch).mockResolvedValueOnce(
                mockFinnhubResponse({
                    c: 100,
                    d: 1,
                    dp: 1,
                    h: 0,
                    l: 0,
                    o: 0,
                    pc: 0,
                    t: 0,
                }),
            );

            const client = createFinnhubClient("my-secret-key");
            await client.getQuote("AAPL");

            expect(fetch).toHaveBeenCalledWith(expect.stringContaining("token=my-secret-key"));
        });
    });

    describe("getQuotes", () => {
        it("fetches quotes for multiple tickers", async () => {
            vi.mocked(fetch)
                .mockResolvedValueOnce(
                    mockFinnhubResponse({
                        c: 150,
                        d: 2,
                        dp: 1.5,
                        h: 0,
                        l: 0,
                        o: 0,
                        pc: 0,
                        t: 0,
                    }),
                )
                .mockResolvedValueOnce(
                    mockFinnhubResponse({
                        c: 300,
                        d: -5,
                        dp: -1.6,
                        h: 0,
                        l: 0,
                        o: 0,
                        pc: 0,
                        t: 0,
                    }),
                );

            const client = createFinnhubClient("test-key");
            const quotes = await client.getQuotes(["AAPL", "MSFT"]);

            expect(quotes.size).toBe(2);
            expect(quotes.get("AAPL")?.price).toBe(150);
            expect(quotes.get("MSFT")?.price).toBe(300);
        });

        it("handles partial failures", async () => {
            vi.mocked(fetch)
                .mockResolvedValueOnce(
                    mockFinnhubResponse({
                        c: 150,
                        d: 2,
                        dp: 1.5,
                        h: 0,
                        l: 0,
                        o: 0,
                        pc: 0,
                        t: 0,
                    }),
                )
                .mockResolvedValueOnce(
                    mockFinnhubResponse({
                        c: 0,
                        d: 0,
                        dp: 0,
                        h: 0,
                        l: 0,
                        o: 0,
                        pc: 0,
                        t: 0,
                    }),
                )
                .mockResolvedValueOnce(
                    mockFinnhubResponse({
                        c: 300,
                        d: -5,
                        dp: -1.6,
                        h: 0,
                        l: 0,
                        o: 0,
                        pc: 0,
                        t: 0,
                    }),
                );

            const client = createFinnhubClient("test-key");
            const quotes = await client.getQuotes(["AAPL", "INVALID", "MSFT"]);

            expect(quotes.size).toBe(2);
            expect(quotes.has("AAPL")).toBe(true);
            expect(quotes.has("INVALID")).toBe(false);
            expect(quotes.has("MSFT")).toBe(true);
        });

        it("respects concurrency option", async () => {
            let concurrent = 0;
            let maxConcurrent = 0;

            vi.mocked(fetch).mockImplementation(async () => {
                concurrent++;
                maxConcurrent = Math.max(maxConcurrent, concurrent);
                await new Promise((r) => setTimeout(r, 10));
                concurrent--;
                return mockFinnhubResponse({
                    c: 100,
                    d: 1,
                    dp: 1,
                    h: 0,
                    l: 0,
                    o: 0,
                    pc: 0,
                    t: 0,
                });
            });

            const client = createFinnhubClient("test-key", { concurrency: 2 });
            await client.getQuotes(["A", "B", "C", "D", "E"]);

            expect(maxConcurrent).toBeLessThanOrEqual(2);
        });

        it("uses default concurrency of 10", async () => {
            let concurrent = 0;
            let maxConcurrent = 0;

            vi.mocked(fetch).mockImplementation(async () => {
                concurrent++;
                maxConcurrent = Math.max(maxConcurrent, concurrent);
                await new Promise((r) => setTimeout(r, 5));
                concurrent--;
                return mockFinnhubResponse({
                    c: 100,
                    d: 1,
                    dp: 1,
                    h: 0,
                    l: 0,
                    o: 0,
                    pc: 0,
                    t: 0,
                });
            });

            const client = createFinnhubClient("test-key");
            const symbols = Array.from({ length: 15 }, (_, i) => `SYM${i}`);
            await client.getQuotes(symbols);

            expect(maxConcurrent).toBeLessThanOrEqual(10);
        });

        it("handles empty array", async () => {
            const client = createFinnhubClient("test-key");
            const quotes = await client.getQuotes([]);

            expect(quotes.size).toBe(0);
            expect(fetch).not.toHaveBeenCalled();
        });
    });
});
