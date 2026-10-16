import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PersistenceError } from "@m0n0lab/investlab-core";
import { type Quote } from "@m0n0lab/investlab-domain";
import { RedisQuoteDatasource } from "../datasources/redis-quote.datasource.ts";
import { CachedQuoteRepository } from "./cached-quote.repository.ts";
import type { FinnhubQuoteDatasource } from "../datasources/finnhub-quote.datasource.ts";
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

function createFakeRedis() {
    const store = new Map<string, string>();
    return {
        store,
        get: vi.fn(async (key: string) => store.get(key) ?? null),
        set: vi.fn(async (key: string, value: string) => {
            store.set(key, value);
            return "OK";
        }),
        mget: vi.fn(async (...keys: string[]) => keys.map((k) => store.get(k) ?? null)),
    };
}

function createFakeFinnhub() {
    return {
        getQuote: vi.fn(async (symbol: string) => makeQuote(symbol)),
        getQuotes: vi.fn(async (symbols: string[]) => {
            const map = new Map<string, Quote>();
            for (const s of symbols) {
                map.set(s, makeQuote(s));
            }
            return map;
        }),
    } satisfies FinnhubQuoteDatasource;
}

describe("CachedQuoteRepository", () => {
    let redis: ReturnType<typeof createFakeRedis>;
    let finnhub: ReturnType<typeof createFakeFinnhub>;
    let repository: CachedQuoteRepository;

    const seed = (quote: Quote) =>
        redis.store.set(`investlab:quote:${quote.symbol}`, JSON.stringify(quote));

    beforeEach(() => {
        redis = createFakeRedis();
        finnhub = createFakeFinnhub();
        repository = new CachedQuoteRepository(
            new RedisQuoteDatasource(redis as unknown as Redis),
            finnhub,
        );
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("getQuote", () => {
        it("fetches from Finnhub on a cache miss and writes the quote to the cache", async () => {
            const result = await repository.getQuote("AAPL");

            expect(result._unsafeUnwrap()).toEqual(makeQuote("AAPL"));
            expect(finnhub.getQuote).toHaveBeenCalledWith("AAPL");
            expect(redis.store.has("investlab:quote:AAPL")).toBe(true);
        });

        it("returns the cached quote without calling Finnhub on a cache hit", async () => {
            seed(makeQuote("AAPL", 99));

            const result = await repository.getQuote("AAPL");

            expect(result._unsafeUnwrap().price).toBe(99);
            expect(finnhub.getQuote).not.toHaveBeenCalled();
        });

        it("normalizes the symbol", async () => {
            await repository.getQuote(" aapl ");

            expect(finnhub.getQuote).toHaveBeenCalledWith("AAPL");
        });

        it("fails with a PersistenceError for an empty symbol", async () => {
            const result = await repository.getQuote("   ");

            expect(result._unsafeUnwrapErr()).toBeInstanceOf(PersistenceError);
            expect(finnhub.getQuote).not.toHaveBeenCalled();
        });

        it("treats a Redis read failure as a cache miss and logs it", async () => {
            redis.get.mockRejectedValueOnce(new Error("Redis down"));
            const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

            const result = await repository.getQuote("AAPL");

            expect(result.isOk()).toBe(true);
            expect(finnhub.getQuote).toHaveBeenCalledWith("AAPL");
            expect(warn).toHaveBeenCalled();
        });

        it("still returns the Finnhub quote when the cache write fails and logs it", async () => {
            redis.set.mockRejectedValueOnce(new Error("Redis down"));
            const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

            const result = await repository.getQuote("AAPL");

            expect(result._unsafeUnwrap().symbol).toBe("AAPL");
            expect(warn).toHaveBeenCalled();
        });

        it("answers without waiting for the cache write", async () => {
            redis.set.mockReturnValueOnce(new Promise(() => {}));

            const result = await repository.getQuote("AAPL");

            expect(result._unsafeUnwrap().symbol).toBe("AAPL");
        });

        it("fails with a PersistenceError when Finnhub fails", async () => {
            finnhub.getQuote.mockRejectedValueOnce(new Error("No data for symbol: NOPE"));

            const result = await repository.getQuote("NOPE");

            expect(result._unsafeUnwrapErr()).toBeInstanceOf(PersistenceError);
        });
    });

    describe("getQuotes", () => {
        it("returns all quotes from the cache without calling Finnhub when all are cached", async () => {
            seed(makeQuote("AAPL"));
            seed(makeQuote("GOOGL", 180));

            const result = (await repository.getQuotes(["AAPL", "GOOGL"]))._unsafeUnwrap();

            expect(result.get("AAPL")?.price).toBe(150);
            expect(result.get("GOOGL")?.price).toBe(180);
            expect(finnhub.getQuotes).not.toHaveBeenCalled();
        });

        it("fetches only uncached symbols from Finnhub and caches them", async () => {
            seed(makeQuote("AAPL"));

            const result = (await repository.getQuotes(["AAPL", "GOOGL"]))._unsafeUnwrap();

            expect(result.size).toBe(2);
            expect(finnhub.getQuotes).toHaveBeenCalledWith(["GOOGL"]);
            expect(redis.store.has("investlab:quote:GOOGL")).toBe(true);
        });

        it("fetches all symbols from Finnhub when none are cached", async () => {
            const result = (await repository.getQuotes(["AAPL", "GOOGL"]))._unsafeUnwrap();

            expect(result.size).toBe(2);
            expect(finnhub.getQuotes).toHaveBeenCalledWith(["AAPL", "GOOGL"]);
        });

        it("deduplicates and normalizes symbols", async () => {
            await repository.getQuotes(["aapl", "AAPL", " aapl "]);

            expect(finnhub.getQuotes).toHaveBeenCalledWith(["AAPL"]);
        });

        it("treats a Redis batch read failure as all uncached and logs it", async () => {
            redis.mget.mockRejectedValueOnce(new Error("Redis down"));
            const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

            const result = await repository.getQuotes(["AAPL"]);

            expect(result.isOk()).toBe(true);
            expect(finnhub.getQuotes).toHaveBeenCalledWith(["AAPL"]);
            expect(warn).toHaveBeenCalled();
        });

        it("answers without waiting for the cache writes", async () => {
            redis.set.mockReturnValue(new Promise(() => {}));

            const result = (await repository.getQuotes(["AAPL", "GOOGL"]))._unsafeUnwrap();

            expect(result.size).toBe(2);
        });

        it("still returns fetched quotes when cache writes fail", async () => {
            redis.set.mockRejectedValue(new Error("Redis down"));
            const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

            const result = (await repository.getQuotes(["AAPL", "GOOGL"]))._unsafeUnwrap();

            expect(result.size).toBe(2);
            expect(warn).toHaveBeenCalled();
        });

        it("fails with a PersistenceError when Finnhub fails", async () => {
            finnhub.getQuotes.mockRejectedValueOnce(new Error("Finnhub down"));

            const result = await repository.getQuotes(["AAPL"]);

            expect(result._unsafeUnwrapErr()).toBeInstanceOf(PersistenceError);
        });
    });
});
