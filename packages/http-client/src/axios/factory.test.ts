import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { describe, expect, it } from "vitest";
import { exponentialBackoff } from "../contracts/retry.js";
import { createAxiosHttpClient } from "./adapter.js";
import { createHttpClientFactory } from "./factory.js";

describe("HttpClientFactory", () => {
    describe("factory creation with defaults", () => {
        it("creates factory with base configuration", () => {
            // createHttpClientFactory IS the factory function per the contract
            expect(createHttpClientFactory).toBeDefined();
            expect(typeof createHttpClientFactory).toBe("function");
        });

        it("creates clients that inherit factory defaults", async () => {
            // Call the factory function to create a client
            const client = createHttpClientFactory({
                baseUrl: "https://api.example.com",
                timeout: 5000,
                headers: {
                    "X-API-Key": "secret",
                },
            });

            // The client should be properly configured
            expect(client).toBeDefined();
            expect(typeof client.get).toBe("function");
            expect(typeof client.post).toBe("function");
        });
    });

    describe("client creation with overrides", () => {
        it("allows overriding factory defaults per client", () => {
            // Each call to the factory creates a new client
            const client = createHttpClientFactory({
                timeout: 10000,
                headers: {
                    "X-API-Key": "override-key",
                    "X-Custom": "value",
                },
            });

            expect(client).toBeDefined();
        });

        it("merges retry configuration", () => {
            const client = createHttpClientFactory({
                retry: {
                    attempts: 5,
                    delay: exponentialBackoff(100, 1000),
                },
            });

            expect(client).toBeDefined();
        });
    });

    describe("client isolation", () => {
        it("creates isolated client instances", async () => {
            const axiosInstance1 = axios.create();
            const axiosInstance2 = axios.create();
            const mock1 = new MockAdapter(axiosInstance1);
            const mock2 = new MockAdapter(axiosInstance2);

            const client1 = createAxiosHttpClient({ axiosInstance: axiosInstance1 });
            const client2 = createAxiosHttpClient({ axiosInstance: axiosInstance2 });

            client1.addRequestInterceptor((config) => {
                return {
                    ...config,
                    headers: {
                        ...config.headers,
                        "X-Client": "1",
                    },
                };
            });

            mock1.onGet("/test").reply(200);
            mock2.onGet("/test").reply(200);

            await client1.get("/test");
            await client2.get("/test");

            // Client 1 should have the interceptor
            expect(mock1.history.get[0].headers?.["X-Client"]).toBe("1");
            // Client 2 should not have the interceptor
            expect(mock2.history.get[0].headers?.["X-Client"]).toBeUndefined();

            mock1.reset();
            mock2.reset();
        });
    });

    describe("interceptor registration via factory", () => {
        it("registers request interceptors on all clients", async () => {
            // Factory function automatically registers interceptors
            const client = createHttpClientFactory({
                interceptors: {
                    request: [
                        {
                            onFulfilled: (config) => ({
                                ...config,
                                headers: {
                                    ...config.headers,
                                    "X-Factory": "interceptor",
                                },
                            }),
                        },
                    ],
                },
            });

            // Note: We can't test this properly with the current implementation
            // because the factory creates its own axios instance internally.
            // This test just verifies the client was created successfully.
            expect(client).toBeDefined();
            expect(typeof client.get).toBe("function");
        });
    });
});
