import { describe, expectTypeOf, test } from "vitest";
import type {
    HttpClient,
    HttpClientFactory,
    HttpClientOptions,
    HttpRequestConfig,
} from "../index.js";

/**
 * Type-level tests for HttpClientFactory and HttpClientOptions.
 * @vitest-environment node
 */

describe("Factory type checking", () => {
    test("HttpClientFactory accepts options and returns client", () => {
        const factory: HttpClientFactory = (
            options?: HttpClientOptions
        ): HttpClient => {
            expectTypeOf(options).toEqualTypeOf<
                HttpClientOptions | undefined
            >();
            return {} as HttpClient;
        };

        const client = factory({ baseUrl: "https://api.example.com" });
        expectTypeOf(client).toMatchTypeOf<HttpClient>();
    });
});

describe("HttpClientOptions type safety", () => {
    test("HttpClientOptions extends HttpRequestConfig", () => {
        const options: HttpClientOptions = {
            baseUrl: "https://api.example.com",
            timeout: 5000,
        };

        expectTypeOf(options).toMatchTypeOf<HttpRequestConfig>();
    });
});
