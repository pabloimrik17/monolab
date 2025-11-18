import { describe, expect, it } from "vitest";
import { HTTP_CLIENT_VERSION, type HttpClientConfig } from "./index.ts";

describe("@m0n0lab/http-client", () => {
    describe("HTTP_CLIENT_VERSION", () => {
        it("should export the correct version constant", () => {
            expect(HTTP_CLIENT_VERSION).toBe("0.1.0");
        });
    });

    describe("HttpClientConfig", () => {
        it("should accept valid configuration object", () => {
            const config: HttpClientConfig = {
                baseUrl: "https://api.example.com",
            };

            expect(config.baseUrl).toBe("https://api.example.com");
        });

        it("should accept empty configuration object", () => {
            const config: HttpClientConfig = {};

            expect(config).toEqual({});
        });
    });
});
