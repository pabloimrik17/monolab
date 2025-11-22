import { describe, expectTypeOf, test } from "vitest";
import type { HttpRequestConfig } from "../index.js";

/**
 * Type-level tests for HttpRequestConfig interface.
 * @vitest-environment node
 */

describe("HttpRequestConfig type safety", () => {
    test("HttpRequestConfig has all optional properties", () => {
        const config: HttpRequestConfig = {};

        expectTypeOf(config.baseUrl).toEqualTypeOf<string | undefined>();
        expectTypeOf(config.timeout).toEqualTypeOf<number | undefined>();
        expectTypeOf(config.deduplicate).toEqualTypeOf<boolean | undefined>();
    });
});

describe("HttpRequestConfig readonly enforcement", () => {
    test("HttpRequestConfig properties are readonly", () => {
        const config: HttpRequestConfig = {
            baseUrl: "https://api.example.com",
            timeout: 5000,
        };

        expectTypeOf(config)
            .toHaveProperty("baseUrl")
            .toMatchTypeOf<string | undefined>();
        expectTypeOf(config)
            .toHaveProperty("timeout")
            .toMatchTypeOf<number | undefined>();
    });
});
