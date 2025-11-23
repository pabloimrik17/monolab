import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createAxiosHttpClient } from "./adapter.js";

/**
 * Integration tests verifying all features work together correctly.
 * These tests combine multiple features (interceptors, retry, cache, deduplication)
 * to ensure they integrate properly.
 */
describe("Integration Tests", () => {
    let axiosInstance: ReturnType<typeof axios.create>;
    let mock: MockAdapter;

    beforeEach(() => {
        axiosInstance = axios.create({ baseURL: "https://api.example.com" });
        mock = new MockAdapter(axiosInstance);
    });

    afterEach(() => {
        mock.reset();
    });

    describe("full lifecycle", () => {
        it("handles complete GET request/response cycle", async () => {
            mock.onGet("/users").reply(200, [{ id: 1, name: "Alice" }], {
                "content-type": "application/json",
            });

            const client = createAxiosHttpClient({ axiosInstance });
            const response = await client.get("/users");

            expect(response.status).toBe(200);
            expect(response.data).toEqual([{ id: 1, name: "Alice" }]);
            expect(response.headers["content-type"]).toBe("application/json");
        });

        it("handles complete POST request/response cycle with body", async () => {
            mock.onPost("/users", { name: "Bob" }).reply(
                201,
                { id: 2, name: "Bob" },
                { location: "/users/2" }
            );

            const client = createAxiosHttpClient({ axiosInstance });
            const response = await client.post("/users", { name: "Bob" });

            expect(response.status).toBe(201);
            expect(response.data).toEqual({ id: 2, name: "Bob" });
            expect(response.headers.location).toBe("/users/2");
        });

        it("handles request with headers and query params", async () => {
            mock.onGet("/users").reply((config) => {
                expect(config.headers?.["X-API-Key"]).toBe("secret");
                expect(config.params).toEqual({ page: 1, limit: 10 });
                return [200, [{ id: 1 }]];
            });

            const client = createAxiosHttpClient({ axiosInstance });
            await client.get("/users", {
                headers: { "X-API-Key": "secret" },
                query: { page: 1, limit: 10 },
            });
        });
    });

    describe("interceptor chain integration", () => {
        it("executes multiple request interceptors in reverse order (axios LIFO)", async () => {
            mock.onGet("/test").reply(200, "ok");

            const client = createAxiosHttpClient({ axiosInstance });
            const order: number[] = [];

            client.addRequestInterceptor(async (config) => {
                order.push(1);
                return config;
            });

            client.addRequestInterceptor(async (config) => {
                order.push(2);
                return config;
            });

            await client.get("/test");

            // Axios executes request interceptors in LIFO (Last In, First Out)
            expect(order).toEqual([2, 1]);
        });

        it("executes multiple response interceptors in order", async () => {
            mock.onGet("/test").reply(200, "ok");

            const client = createAxiosHttpClient({ axiosInstance });
            const order: number[] = [];

            client.addResponseInterceptor(async (response) => {
                order.push(1);
                return response;
            });

            client.addResponseInterceptor(async (response) => {
                order.push(2);
                return response;
            });

            await client.get("/test");

            expect(order).toEqual([1, 2]);
        });

        it("allows request interceptor to modify config", async () => {
            mock.onGet("/test").reply((config) => {
                expect(config.headers?.["Authorization"]).toBe("Bearer token");
                return [200, "ok"];
            });

            const client = createAxiosHttpClient({ axiosInstance });

            client.addRequestInterceptor(async (config) => {
                return {
                    ...config,
                    headers: {
                        ...config.headers,
                        Authorization: "Bearer token",
                    },
                };
            });

            await client.get("/test");
        });

        it("allows response interceptor to transform data", async () => {
            mock.onGet("/test").reply(200, { value: 10 });

            const client = createAxiosHttpClient({ axiosInstance });

            client.addResponseInterceptor(async (response) => {
                return {
                    ...response,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    data: { value: (response.data as any).value * 2 },
                };
            });

            const response = await client.get("/test");
            expect(response.data).toEqual({ value: 20 });
        });

        it("handles error recovery in response interceptor", async () => {
            mock.onGet("/test").reply(500, "Server Error");

            const client = createAxiosHttpClient({ axiosInstance });

            client.addResponseInterceptor(
                async (response) => response,
                async () => {
                    // Recover from error by returning a default response
                    return {
                        data: { fallback: true },
                        status: 200,
                        statusText: "OK",
                        headers: {},
                        request: {},
                        url: "/test",
                    };
                }
            );

            const response = await client.get("/test");
            expect(response.data).toEqual({ fallback: true });
        });
    });

    describe("retry integration", () => {
        it("retries failed requests until success", async () => {
            mock.onGet("/test").replyOnce(500).onGet("/test").reply(200, "ok");

            const client = createAxiosHttpClient({
                axiosInstance,
                retry: {
                    attempts: 3,
                    delay: () => 10, // Small delay for fast test
                },
            });

            const response = await client.get("/test");
            expect(response.status).toBe(200);
            expect(mock.history.get.length).toBe(2); // 1 failed + 1 retry
        });

        it("retries multiple times before success", async () => {
            mock.onGet("/test")
                .replyOnce(500)
                .onGet("/test")
                .replyOnce(500)
                .onGet("/test")
                .reply(200, "ok");

            const client = createAxiosHttpClient({
                axiosInstance,
                retry: {
                    attempts: 3,
                    delay: () => 10,
                },
            });

            const response = await client.get("/test");
            expect(response.status).toBe(200);
            expect(mock.history.get.length).toBe(3); // 2 failed + 1 retry
        });

        it("exhausts retries and throws final error", async () => {
            mock.onGet("/test").reply(500, "Server Error");

            const client = createAxiosHttpClient({
                axiosInstance,
                retry: {
                    attempts: 2,
                    delay: () => 10,
                },
            });

            await expect(client.get("/test")).rejects.toThrow();
            expect(mock.history.get.length).toBe(2); // attempts
        });
    });

    describe("cache integration", () => {
        it("caches GET responses and returns cached data on subsequent requests", async () => {
            let callCount = 0;
            mock.onGet("/data").reply(() => {
                callCount++;
                return [200, { value: callCount }];
            });

            const cache = new Map();
            const client = createAxiosHttpClient({
                axiosInstance,
                cache: {
                    cache,
                    ttl: 60000,
                },
            });

            const response1 = await client.get("/data");
            expect(response1.data).toEqual({ value: 1 });

            const response2 = await client.get("/data");
            expect(response2.data).toEqual({ value: 1 }); // Cached

            expect(callCount).toBe(1); // Only one actual request
        });

        it("invalidates cache on POST to same endpoint", async () => {
            let callCount = 0;
            mock.onGet("/users").reply(() => {
                callCount++;
                return [200, [{ id: callCount }]];
            });
            mock.onPost("/users").reply(201, { id: 2 });

            const cache = new Map();
            const client = createAxiosHttpClient({
                axiosInstance,
                cache: {
                    cache,
                    ttl: 60000,
                },
            });

            // First GET - populates cache
            await client.get("/users");

            // POST - invalidates cache
            await client.post("/users", { name: "New User" });

            // Second GET - should make new request
            await client.get("/users");

            expect(callCount).toBe(2); // Two actual GETs
        });

        it("respects cache TTL and refetches after expiration", async () => {
            let callCount = 0;
            mock.onGet("/data").reply(() => {
                callCount++;
                return [200, { value: callCount }];
            });

            const cache = new Map();
            const client = createAxiosHttpClient({
                axiosInstance,
                cache: {
                    cache,
                    ttl: 50, // 50ms TTL for fast test
                },
            });

            await client.get("/data");
            expect(callCount).toBe(1);

            // Immediately after - still within TTL
            await client.get("/data");
            expect(callCount).toBe(1); // Cached

            // Wait for TTL to expire
            await new Promise((resolve) => setTimeout(resolve, 60));

            // After TTL expiration
            await client.get("/data");
            expect(callCount).toBe(2); // New request
        });
    });

    describe("deduplication integration", () => {
        it("deduplicates concurrent identical GET requests", async () => {
            let callCount = 0;
            mock.onGet("/users").reply(() => {
                callCount++;
                return new Promise((resolve) => {
                    setTimeout(() => resolve([200, [{ id: callCount }]]), 50);
                });
            });

            const client = createAxiosHttpClient({
                axiosInstance,
                deduplication: {
                    enabled: true,
                },
            });

            // Fire 5 concurrent identical requests
            const promises = Array(5)
                .fill(null)
                .map(() => client.get("/users"));

            const responses = await Promise.all(promises);

            // All should get same response
            responses.forEach((response) => {
                expect(response.data).toEqual([{ id: 1 }]);
            });

            // Only 1 actual request made
            expect(callCount).toBe(1);
        });

        it("does not deduplicate different requests", async () => {
            let callCount = 0;
            mock.onGet(/\/users\/\d+/).reply(() => {
                callCount++;
                return [200, { id: callCount }];
            });

            const client = createAxiosHttpClient({
                axiosInstance,
                deduplication: {
                    enabled: true,
                },
            });

            const [response1, response2] = await Promise.all([
                client.get("/users/1"),
                client.get("/users/2"),
            ]);

            expect(response1.data.id).not.toBe(response2.data.id);
            expect(callCount).toBe(2); // Two different requests
        });
    });

    describe("combined features integration", () => {
        it("combines interceptors + retry + cache", async () => {
            let callCount = 0;
            mock.onGet("/data").reply(() => {
                callCount++;
                return callCount === 1
                    ? [500, "Error"]
                    : [200, { value: callCount }];
            });

            const cache = new Map();
            const client = createAxiosHttpClient({
                axiosInstance,
                retry: {
                    attempts: 2,
                    delay: () => 10,
                },
                cache: {
                    cache,
                    ttl: 60000,
                },
            });

            // Add interceptor to add auth header
            client.addRequestInterceptor(async (config) => ({
                ...config,
                headers: {
                    ...config.headers,
                    Authorization: "Bearer token",
                },
            }));

            const response1 = await client.get("/data");
            expect(response1.data).toEqual({ value: 2 }); // Succeeded after retry

            // Second request should hit cache
            const response2 = await client.get("/data");
            expect(response2.data).toEqual({ value: 2 }); // Cached

            expect(callCount).toBe(2); // 1 failed + 1 retry, no third request
        });

        it("combines deduplication + cache correctly", async () => {
            let callCount = 0;
            mock.onGet("/users").reply(() => {
                callCount++;
                return [200, [{ id: callCount }]];
            });

            const cache = new Map();
            const client = createAxiosHttpClient({
                axiosInstance,
                deduplication: {
                    enabled: true,
                },
                cache: {
                    cache,
                    ttl: 60000,
                },
            });

            // First batch of concurrent requests - deduplicated
            const batch1 = await Promise.all([
                client.get("/users"),
                client.get("/users"),
                client.get("/users"),
            ]);

            expect(callCount).toBe(1); // Deduplicated to 1 request

            // Second batch - should hit cache (no need to wait, deduplication already cleared)
            const batch2 = await Promise.all([
                client.get("/users"),
                client.get("/users"),
            ]);

            expect(callCount).toBe(1); // Still only 1 request (cache hit)

            // All responses should be identical
            [...batch1, ...batch2].forEach((response) => {
                expect(response.data).toEqual([{ id: 1 }]);
            });
        });

        it("handles error recovery across all layers", async () => {
            mock.onGet("/test").reply(401, "Unauthorized");

            const client = createAxiosHttpClient({ axiosInstance });

            // Add interceptor that recovers from 401 errors
            client.addResponseInterceptor(
                async (response) => response,
                async (error) => {
                    if (error.message.includes("401")) {
                        return {
                            data: { recovered: true },
                            status: 200,
                            statusText: "OK",
                            headers: {},
                            request: {},
                            url: "/test",
                        };
                    }
                    throw error;
                }
            );

            const response = await client.get("/test");
            expect(response.data).toEqual({ recovered: true });
        });
    });
});
