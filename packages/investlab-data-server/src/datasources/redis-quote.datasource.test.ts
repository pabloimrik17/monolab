import { describe, expect, it, vi } from "vitest";
import { RedisQuoteDatasource } from "./redis-quote.datasource.ts";
import type { Quote } from "@m0n0lab/investlab-domain";
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
    const fake = {
        store,
        get: vi.fn(async (key: string) => store.get(key) ?? null),
        set: vi.fn(async (key: string, value: string) => {
            store.set(key, value);
            return "OK";
        }),
        mget: vi.fn(async (...keys: string[]) => keys.map((k) => store.get(k) ?? null)),
    };
    return { fake, redis: fake as unknown as Redis };
}

describe("RedisQuoteDatasource", () => {
    describe("get", () => {
        it("returns null on a cache miss", async () => {
            const { redis } = createFakeRedis();
            const datasource = new RedisQuoteDatasource(redis);

            await expect(datasource.get("AAPL")).resolves.toBeNull();
        });

        it("returns a stored quote with updatedAt revived as a Date", async () => {
            const { redis } = createFakeRedis();
            const datasource = new RedisQuoteDatasource(redis);
            const quote = makeQuote("AAPL");

            await datasource.set("AAPL", quote);

            await expect(datasource.get("AAPL")).resolves.toEqual(quote);
        });

        it("treats a malformed entry as a miss", async () => {
            const { fake, redis } = createFakeRedis();
            fake.store.set("investlab:quote:AAPL", "{not json");
            const datasource = new RedisQuoteDatasource(redis);

            await expect(datasource.get("AAPL")).resolves.toBeNull();
        });

        it("rejects when Redis fails", async () => {
            const { fake, redis } = createFakeRedis();
            fake.get.mockRejectedValueOnce(new Error("Redis down"));
            const datasource = new RedisQuoteDatasource(redis);

            await expect(datasource.get("AAPL")).rejects.toThrow("Redis down");
        });
    });

    describe("getMany", () => {
        it("returns only the cached symbols", async () => {
            const { redis } = createFakeRedis();
            const datasource = new RedisQuoteDatasource(redis);
            await datasource.set("AAPL", makeQuote("AAPL"));

            const result = await datasource.getMany(["AAPL", "GOOGL"]);

            expect([...result.keys()]).toEqual(["AAPL"]);
            expect(result.get("AAPL")?.updatedAt).toBeInstanceOf(Date);
        });

        it("skips malformed entries", async () => {
            const { fake, redis } = createFakeRedis();
            fake.store.set("investlab:quote:AAPL", "{not json");
            const datasource = new RedisQuoteDatasource(redis);
            await datasource.set("GOOGL", makeQuote("GOOGL", 180));

            const result = await datasource.getMany(["AAPL", "GOOGL"]);

            expect([...result.keys()]).toEqual(["GOOGL"]);
        });

        it("returns an empty map without calling Redis for no symbols", async () => {
            const { fake, redis } = createFakeRedis();
            const datasource = new RedisQuoteDatasource(redis);

            await expect(datasource.getMany([])).resolves.toEqual(new Map());
            expect(fake.mget).not.toHaveBeenCalled();
        });

        it("rejects when Redis fails", async () => {
            const { fake, redis } = createFakeRedis();
            fake.mget.mockRejectedValueOnce(new Error("Redis down"));
            const datasource = new RedisQuoteDatasource(redis);

            await expect(datasource.getMany(["AAPL"])).rejects.toThrow("Redis down");
        });
    });

    describe("set", () => {
        it("uses the default TTL of 3600 seconds", async () => {
            const { fake, redis } = createFakeRedis();
            const datasource = new RedisQuoteDatasource(redis);

            await datasource.set("AAPL", makeQuote("AAPL"));

            expect(fake.set).toHaveBeenCalledWith(
                "investlab:quote:AAPL",
                expect.any(String),
                "EX",
                3600,
            );
        });

        it("uses a custom TTL when provided", async () => {
            const { fake, redis } = createFakeRedis();
            const datasource = new RedisQuoteDatasource(redis, 1800);

            await datasource.set("AAPL", makeQuote("AAPL"));

            expect(fake.set).toHaveBeenCalledWith(
                "investlab:quote:AAPL",
                expect.any(String),
                "EX",
                1800,
            );
        });

        it("falls back to the default TTL when the TTL is invalid", async () => {
            const { fake, redis } = createFakeRedis();
            const datasource = new RedisQuoteDatasource(redis, -1);

            await datasource.set("AAPL", makeQuote("AAPL"));

            expect(fake.set).toHaveBeenCalledWith(
                "investlab:quote:AAPL",
                expect.any(String),
                "EX",
                3600,
            );
        });

        it("rejects when Redis fails", async () => {
            const { fake, redis } = createFakeRedis();
            fake.set.mockRejectedValueOnce(new Error("Redis down"));
            const datasource = new RedisQuoteDatasource(redis);

            await expect(datasource.set("AAPL", makeQuote("AAPL"))).rejects.toThrow("Redis down");
        });
    });
});
