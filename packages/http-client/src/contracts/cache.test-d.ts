import { describe, expectTypeOf, test } from "vitest";
import type {
    CacheEntry,
    HttpCache,
    HttpCacheConfig,
    HttpCacheInvalidationPattern,
    HttpCacheKeyGenerator,
    HttpRequestConfig,
} from "../index.js";

/**
 * Type-level tests for HTTP cache types.
 * @vitest-environment node
 */

describe("CacheEntry type safety", () => {
    test("CacheEntry has all required properties", () => {
        const entry: CacheEntry = {
            data: { id: 1, name: "test" },
            headers: { "content-type": "application/json" },
            timestamp: Date.now(),
            ttl: 60000,
        };

        expectTypeOf(entry.data).toEqualTypeOf<unknown>();
        expectTypeOf(entry.headers).toMatchTypeOf<
            Record<string, string | string[]>
        >();
        expectTypeOf(entry.timestamp).toEqualTypeOf<number>();
        expectTypeOf(entry.ttl).toEqualTypeOf<number>();
    });

    test("CacheEntry accepts optional etag", () => {
        const entry: CacheEntry = {
            data: { id: 1 },
            headers: {},
            timestamp: Date.now(),
            ttl: 60000,
            etag: '"abc123"',
        };

        expectTypeOf(entry.etag).toEqualTypeOf<string | undefined>();
    });
});

describe("HttpCache interface", () => {
    test("HttpCache has all required methods", () => {
        const cache: HttpCache = {} as HttpCache;

        expectTypeOf(cache.get).toMatchTypeOf<
            (key: string) => Promise<CacheEntry | null>
        >();
        expectTypeOf(cache.set).toMatchTypeOf<
            (key: string, value: CacheEntry, ttl?: number) => Promise<void>
        >();
        expectTypeOf(cache.delete).toMatchTypeOf<
            (key: string) => Promise<void>
        >();
        expectTypeOf(cache.clear).toMatchTypeOf<() => Promise<void>>();
    });

    test("HttpCache methods return correct types", () => {
        const cache: HttpCache = {} as HttpCache;

        const getResult = cache.get("key");
        const setResult = cache.set("key", {} as CacheEntry);
        const deleteResult = cache.delete("key");
        const clearResult = cache.clear();

        expectTypeOf(getResult).toEqualTypeOf<Promise<CacheEntry | null>>();
        expectTypeOf(setResult).toEqualTypeOf<Promise<void>>();
        expectTypeOf(deleteResult).toEqualTypeOf<Promise<void>>();
        expectTypeOf(clearResult).toEqualTypeOf<Promise<void>>();
    });
});

describe("HttpCacheKeyGenerator type safety", () => {
    test("HttpCacheKeyGenerator accepts config and returns string", () => {
        const keyGenerator: HttpCacheKeyGenerator = (
            config: HttpRequestConfig
        ): string => {
            expectTypeOf(config).toMatchTypeOf<HttpRequestConfig>();
            return "cache-key";
        };

        expectTypeOf(keyGenerator).toMatchTypeOf<HttpCacheKeyGenerator>();

        const result = keyGenerator({});
        expectTypeOf(result).toEqualTypeOf<string>();
    });
});

describe("HttpCacheInvalidationPattern type safety", () => {
    test("HttpCacheInvalidationPattern accepts config and returns string array", () => {
        const pattern: HttpCacheInvalidationPattern = (
            config: HttpRequestConfig
        ): string[] => {
            expectTypeOf(config).toMatchTypeOf<HttpRequestConfig>();
            return ["/users/*"];
        };

        expectTypeOf(pattern).toMatchTypeOf<HttpCacheInvalidationPattern>();

        const result = pattern({});
        expectTypeOf(result).toEqualTypeOf<string[]>();
    });
});

describe("HttpCacheConfig type safety", () => {
    test("HttpCacheConfig has all optional properties", () => {
        const config: HttpCacheConfig = {};

        expectTypeOf(config.cache).toEqualTypeOf<HttpCache | undefined>();
        expectTypeOf(config.keyGenerator).toEqualTypeOf<
            HttpCacheKeyGenerator | undefined
        >();
        expectTypeOf(config.ttl).toEqualTypeOf<number | undefined>();
        expectTypeOf(config.respectCacheHeaders).toEqualTypeOf<
            boolean | undefined
        >();
        expectTypeOf(config.staleWhileRevalidate).toEqualTypeOf<
            boolean | undefined
        >();
    });

    test("HttpCacheConfig accepts cache implementation", () => {
        const cache: HttpCache = {} as HttpCache;
        const config: HttpCacheConfig = {
            cache,
        };

        expectTypeOf(config.cache).toMatchTypeOf<HttpCache | undefined>();
    });

    test("HttpCacheConfig accepts static invalidation patterns", () => {
        const config: HttpCacheConfig = {
            invalidatePatterns: ["/users/*", "/posts/*"],
        };

        expectTypeOf(config.invalidatePatterns).toMatchTypeOf<
            string[] | HttpCacheInvalidationPattern | undefined
        >();
    });

    test("HttpCacheConfig accepts dynamic invalidation patterns", () => {
        const pattern: HttpCacheInvalidationPattern = () => {
            return ["/users/*"];
        };

        const config: HttpCacheConfig = {
            invalidatePatterns: pattern,
        };

        expectTypeOf(config.invalidatePatterns).toMatchTypeOf<
            string[] | HttpCacheInvalidationPattern | undefined
        >();
    });

    test("HttpCacheConfig accepts full configuration", () => {
        const cache: HttpCache = {} as HttpCache;
        const keyGenerator: HttpCacheKeyGenerator = (config) =>
            `${config.baseUrl}${config.timeout}`;

        const config: HttpCacheConfig = {
            cache,
            keyGenerator,
            ttl: 60000,
            respectCacheHeaders: true,
            staleWhileRevalidate: true,
            invalidatePatterns: ["/users/*"],
        };

        expectTypeOf(config).toMatchTypeOf<HttpCacheConfig>();
    });
});
