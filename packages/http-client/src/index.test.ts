import { describe, expect, it } from "vitest";
import type { HttpClientOptions, HttpRequestConfig } from "./index.ts";

describe("@m0n0lab/http-client", () => {
    describe("HttpRequestConfig", () => {
        it("should accept valid configuration object", () => {
            const config: HttpRequestConfig = {
                baseUrl: "https://api.example.com",
                timeout: 5000,
            };

            expect(config.baseUrl).toBe("https://api.example.com");
            expect(config.timeout).toBe(5000);
        });

        it("should accept empty configuration object", () => {
            const config: HttpRequestConfig = {};

            expect(config).toEqual({});
        });
    });

    describe("HttpClientOptions", () => {
        it("should accept client configuration", () => {
            const options: HttpClientOptions = {
                baseUrl: "https://api.example.com",
                timeout: 5000,
                headers: {
                    "Content-Type": "application/json",
                },
            };

            expect(options.baseUrl).toBe("https://api.example.com");
            expect(options.headers).toEqual({
                "Content-Type": "application/json",
            });
        });
    });
});
