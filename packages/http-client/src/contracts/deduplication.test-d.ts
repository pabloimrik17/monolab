import { describe, expectTypeOf, test } from "vitest";
import type {
    DeduplicationKey,
    HttpDeduplicationConfig,
    HttpDeduplicationKeyGenerator,
    HttpRequestConfig,
} from "../index.js";

/**
 * Type-level tests for HTTP deduplication types.
 * @vitest-environment node
 */

describe("DeduplicationKey type safety", () => {
    test("DeduplicationKey is a string", () => {
        const key: DeduplicationKey = "GET:/users/1";

        expectTypeOf(key).toEqualTypeOf<string>();
    });
});

describe("HttpDeduplicationKeyGenerator type safety", () => {
    test("HttpDeduplicationKeyGenerator accepts config and returns DeduplicationKey", () => {
        const keyGenerator: HttpDeduplicationKeyGenerator = (
            config: HttpRequestConfig
        ): DeduplicationKey => {
            expectTypeOf(config).toMatchTypeOf<HttpRequestConfig>();
            return "dedup-key";
        };

        expectTypeOf(
            keyGenerator
        ).toMatchTypeOf<HttpDeduplicationKeyGenerator>();

        const result = keyGenerator({});
        expectTypeOf(result).toEqualTypeOf<DeduplicationKey>();
    });

    test("HttpDeduplicationKeyGenerator return type is string", () => {
        const keyGenerator: HttpDeduplicationKeyGenerator = (config) => {
            const method = "GET";
            const url = config.baseUrl || "";
            return `${method}:${url}`;
        };

        const result = keyGenerator({ baseUrl: "https://api.example.com" });
        expectTypeOf(result).toEqualTypeOf<string>();
    });
});

describe("HttpDeduplicationConfig type safety", () => {
    test("HttpDeduplicationConfig requires enabled property", () => {
        const config: HttpDeduplicationConfig = {
            enabled: true,
        };

        expectTypeOf(config.enabled).toEqualTypeOf<boolean>();
    });

    test("HttpDeduplicationConfig has optional keyGenerator", () => {
        const keyGenerator: HttpDeduplicationKeyGenerator = (config) =>
            `${config.baseUrl}`;

        const config: HttpDeduplicationConfig = {
            enabled: true,
            keyGenerator,
        };

        expectTypeOf(config.keyGenerator).toEqualTypeOf<
            HttpDeduplicationKeyGenerator | undefined
        >();
    });

    test("HttpDeduplicationConfig has optional ttl", () => {
        const config: HttpDeduplicationConfig = {
            enabled: true,
            ttl: 5000,
        };

        expectTypeOf(config.ttl).toEqualTypeOf<number | undefined>();
    });

    test("HttpDeduplicationConfig has optional criticalHeaders", () => {
        const config: HttpDeduplicationConfig = {
            enabled: true,
            criticalHeaders: ["Authorization", "Content-Type"],
        };

        expectTypeOf(config.criticalHeaders).toEqualTypeOf<
            string[] | undefined
        >();
    });

    test("HttpDeduplicationConfig accepts full configuration", () => {
        const keyGenerator: HttpDeduplicationKeyGenerator = (config) =>
            `${config.baseUrl}:${config.timeout}`;

        const config: HttpDeduplicationConfig = {
            enabled: true,
            keyGenerator,
            ttl: 5000,
            criticalHeaders: ["Authorization", "Content-Type", "X-API-Key"],
        };

        expectTypeOf(config).toMatchTypeOf<HttpDeduplicationConfig>();
    });
});
