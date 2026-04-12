import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QuoteCacheImpl } from "./quote-cache-impl.ts";
import type { Quote } from "@m0n0lab/investlab-domain";
import type { FinnhubClient } from "@m0n0lab/wealth-tracker-core";
import type Redis from "ioredis";

function makeQuote(symbol: string, price = 150): Quote {
    return {
        symbol,
        price,
        change: 1.5,
        changePercent: 1.01,
        updatedAt: new Date("2026-04-10T12:00:00Z"),
    };
}

function createMockRedis(): Redis {
    const store = new Map<string, string>();
    return {
        get: vi.fn(async (key: string) => store.get(key) ?? null),
        set: vi.fn(async (key: string, value: string) => {
            store.set(key, value);
            return "OK";
        }),
        mget: vi.fn(async (...keys: string[]) => keys.map((k) => store.get(k) ?? null)),
        _store: store,
    } as unknown as Redis;
}

function createMockFinnhub(): FinnhubClient {
    return {
        getQuote: vi.fn(async (symbol: string) => makeQuote(symbol)),
        getQuotes: vi.fn(async (symbols: string[]) => {
            const map = new Map<string, Quote>();
            for (const s of symbols) {
                map.set(s, makeQuote(s));
            }
            return map;
        }),
    };
}

// Inject dependencies manually (bypass Inversify for unit tests)
function createCache(redis: Redis, finnhub: FinnhubClient, ttl?: number): QuoteCacheImpl {
    const cache = new QuoteCacheImpl(redis, finnhub, ttl);
    return cache;
}

describe("QuoteCacheImpl", () => {
    let redis: ReturnType<typeof createMockRedis>;
    let finnhub: ReturnType<typeof createMockFinnhub>;
    let cache: QuoteCacheImpl;

    beforeEach(() => {
        redis = createMockRedis();
        finnhub = createMockFinnhub();
        cache = createCache(redis, finnhub);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("getQuote", () => {
        it("fetches from Finnhub on cache miss and stores in Redis", async () => {
            const result = await cache.getQuote("AAPL");
            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
                expect(result.value.symbol).toBe("AAPL");
                expect(result.value.price).toBe(150);
            }
            expect(finnhub.getQuote).toHaveBeenCalledWith("AAPL");
            expect(redis.set).toHaveBeenCalled();
        });

        it("returns cached value on cache hit without calling Finnhub", async () => {
            const quote = makeQuote("AAPL");
            (redis as any)._store.set("investlab:quote:AAPL", JSON.stringify(quote));

            const result = await cache.getQuote("AAPL");
            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
                expect(result.value.symbol).toBe("AAPL");
            }
            expect(finnhub.getQuote).not.toHaveBeenCalled();
        });

        it("normalizes symbol to uppercase", async () => {
            await cache.getQuote("aapl");
            expect(finnhub.getQuote).toHaveBeenCalledWith("AAPL");
        });

        it("returns error for empty symbol", async () => {
            const result = await cache.getQuote("   ");
            expect(result.isErr()).toBe(true);
        });

        it("treats Redis read error as cache miss (graceful degradation)", async () => {
            vi.spyOn(redis, "get").mockRejectedValueOnce(new Error("Redis down"));
            const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

            const result = await cache.getQuote("AAPL");
            expect(result.isOk()).toBe(true);
            expect(finnhub.getQuote).toHaveBeenCalledWith("AAPL");
            expect(warnSpy).toHaveBeenCalled();
        });

        it("still returns quote when Redis write fails", async () => {
            vi.spyOn(redis, "set").mockRejectedValueOnce(new Error("Redis down"));
            const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

            const result = await cache.getQuote("AAPL");
            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
                expect(result.value.symbol).toBe("AAPL");
            }
            // writeCache is fire-and-forget, so we need to wait for it
            await vi.waitFor(() => expect(warnSpy).toHaveBeenCalled());
        });
    });

    describe("getQuotes", () => {
        it("returns all from cache when all cached", async () => {
            const aapl = makeQuote("AAPL");
            const googl = makeQuote("GOOGL", 180);
            (redis as any)._store.set("investlab:quote:AAPL", JSON.stringify(aapl));
            (redis as any)._store.set("investlab:quote:GOOGL", JSON.stringify(googl));

            const result = await cache.getQuotes(["AAPL", "GOOGL"]);
            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
                expect(result.value.size).toBe(2);
                expect(result.value.get("AAPL")?.price).toBe(150);
                expect(result.value.get("GOOGL")?.price).toBe(180);
            }
            expect(finnhub.getQuotes).not.toHaveBeenCalled();
        });

        it("fetches only uncached symbols from Finnhub (partial cache hit)", async () => {
            const aapl = makeQuote("AAPL");
            (redis as any)._store.set("investlab:quote:AAPL", JSON.stringify(aapl));

            const result = await cache.getQuotes(["AAPL", "GOOGL"]);
            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
                expect(result.value.size).toBe(2);
            }
            expect(finnhub.getQuotes).toHaveBeenCalledWith(["GOOGL"]);
        });

        it("fetches all from Finnhub when none cached", async () => {
            const result = await cache.getQuotes(["AAPL", "GOOGL"]);
            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
                expect(result.value.size).toBe(2);
            }
            expect(finnhub.getQuotes).toHaveBeenCalledWith(["AAPL", "GOOGL"]);
        });

        it("deduplicates and normalizes symbols", async () => {
            await cache.getQuotes(["aapl", "AAPL", " aapl "]);
            expect(finnhub.getQuotes).toHaveBeenCalledWith(["AAPL"]);
        });

        it("treats Redis batch read error as all-uncached", async () => {
            vi.spyOn(redis, "mget").mockRejectedValueOnce(new Error("Redis down"));
            const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

            const result = await cache.getQuotes(["AAPL"]);
            expect(result.isOk()).toBe(true);
            expect(finnhub.getQuotes).toHaveBeenCalledWith(["AAPL"]);
            expect(warnSpy).toHaveBeenCalled();
        });
    });

    describe("TTL configuration", () => {
        it("uses default TTL of 3600 when none provided", async () => {
            await cache.getQuote("AAPL");
            expect(redis.set).toHaveBeenCalledWith(
                "investlab:quote:AAPL",
                expect.any(String),
                "EX",
                3600,
            );
        });

        it("uses custom TTL when provided", async () => {
            cache = createCache(redis, finnhub, 1800);
            await cache.getQuote("AAPL");
            expect(redis.set).toHaveBeenCalledWith(
                "investlab:quote:AAPL",
                expect.any(String),
                "EX",
                1800,
            );
        });

        it("falls back to default for invalid TTL", async () => {
            cache = createCache(redis, finnhub, -1);
            await cache.getQuote("AAPL");
            expect(redis.set).toHaveBeenCalledWith(
                "investlab:quote:AAPL",
                expect.any(String),
                "EX",
                3600,
            );
        });
    });
});
