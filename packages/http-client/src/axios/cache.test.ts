import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAxiosHttpClient } from "./adapter.js";

describe("Cache Layer", () => {
    let mock: MockAdapter;
    let axiosInstance: ReturnType<typeof axios.create>;

    beforeEach(() => {
        axiosInstance = axios.create();
        mock = new MockAdapter(axiosInstance);
    });

    describe("cache hit", () => {
        it("returns cached response on second identical GET", async () => {
            let callCount = 0;
            mock.onGet("/data").reply(() => {
                callCount++;
                return [200, { result: `call-${callCount}` }];
            });

            const client = createAxiosHttpClient({
                axiosInstance,
                cache: {
                    cache: new Map(),
                    ttl: 60000,
                },
            });

            const response1 = await client.get("/data");
            const response2 = await client.get("/data");

            expect(response1.data.result).toBe("call-1");
            expect(response2.data.result).toBe("call-1"); // Cached
            expect(callCount).toBe(1); // Only one actual request
        });

        it("does not cache non-GET requests", async () => {
            mock.onPost("/data").reply(200, { id: 1 });

            const client = createAxiosHttpClient({
                axiosInstance,
                cache: {
                    cache: new Map(),
                    ttl: 60000,
                },
            });

            await client.post("/data", { name: "test" });
            await client.post("/data", { name: "test" });

            expect(mock.history.post.length).toBe(2); // Both requests made
        });
    });

    describe("TTL expiration", () => {
        it("respects cache TTL and refetches after expiration", async () => {
            vi.useFakeTimers();

            let callCount = 0;
            mock.onGet("/data").reply(() => {
                callCount++;
                return [200, { result: `call-${callCount}` }];
            });

            const client = createAxiosHttpClient({
                axiosInstance,
                cache: {
                    cache: new Map(),
                    ttl: 1000, // 1 second
                },
            });

            // First call
            const response1 = await client.get("/data");
            expect(response1.data.result).toBe("call-1");

            // Advance time by 500ms (still within TTL)
            vi.advanceTimersByTime(500);

            // Second call - should be cached
            const response2 = await client.get("/data");
            expect(response2.data.result).toBe("call-1");
            expect(callCount).toBe(1);

            // Advance time by 600ms (total 1100ms, past TTL)
            vi.advanceTimersByTime(600);

            // Third call - should refetch
            const response3 = await client.get("/data");
            expect(response3.data.result).toBe("call-2");
            expect(callCount).toBe(2);

            vi.useRealTimers();
        });
    });

    describe("cache invalidation", () => {
        it("invalidates cache on POST to same endpoint", async () => {
            mock.onGet("/users").reply(200, [{ id: 1 }]);
            mock.onPost("/users").reply(201, { id: 2 });

            const client = createAxiosHttpClient({
                axiosInstance,
                cache: {
                    cache: new Map(),
                    ttl: 60000,
                },
            });

            // GET request - cache it
            const response1 = await client.get("/users");
            expect(response1.data[0].id).toBe(1);

            // POST request - should invalidate cache
            await client.post("/users", { name: "New User" });

            // GET request again - should refetch (not cached)
            mock.onGet("/users").reply(200, [{ id: 1 }, { id: 2 }]);
            const response2 = await client.get("/users");
            expect(response2.data.length).toBe(2);
            expect(mock.history.get.length).toBe(2); // Two actual GET requests
        });

        it("invalidates cache on PUT", async () => {
            mock.onGet("/users/1").reply(200, { id: 1, name: "John" });
            mock.onPut("/users/1").reply(200, { id: 1, name: "Jane" });

            const client = createAxiosHttpClient({
                axiosInstance,
                cache: {
                    cache: new Map(),
                    ttl: 60000,
                },
            });

            await client.get("/users/1");
            await client.put("/users/1", { name: "Jane" });

            mock.onGet("/users/1").reply(200, { id: 1, name: "Jane" });
            await client.get("/users/1");

            expect(mock.history.get.length).toBe(2);
        });

        it("invalidates cache on DELETE", async () => {
            mock.onGet("/users/1").reply(200, { id: 1 });
            mock.onDelete("/users/1").reply(204);

            const client = createAxiosHttpClient({
                axiosInstance,
                cache: {
                    cache: new Map(),
                    ttl: 60000,
                },
            });

            await client.get("/users/1");
            await client.delete("/users/1");

            mock.onGet("/users/1").reply(404);
            await client.get("/users/1").catch(() => {});

            expect(mock.history.get.length).toBe(2);
        });

        it("invalidates related cache entries with pattern matching", async () => {
            mock.onGet("/users").reply(200, []);
            mock.onGet("/users/1").reply(200, { id: 1 });
            mock.onPost("/users").reply(201, { id: 2 });

            const client = createAxiosHttpClient({
                axiosInstance,
                cache: {
                    cache: new Map(),
                    ttl: 60000,
                },
            });

            // Cache both endpoints
            await client.get("/users");
            await client.get("/users/1");

            // POST to /users should invalidate /users and /users/*
            await client.post("/users", { name: "New" });

            // Both should refetch
            mock.resetHistory();
            await client.get("/users");
            await client.get("/users/1");

            expect(mock.history.get.length).toBe(2);
        });
    });

    describe("cache configuration", () => {
        it("allows per-request cache opt-out", async () => {
            mock.onGet("/data").reply(200, { value: 1 });

            const client = createAxiosHttpClient({
                axiosInstance,
                cache: {
                    cache: new Map(),
                    ttl: 60000,
                },
            });

            await client.get("/data");
            await client.get("/data", { cache: { enabled: false } } as any);

            expect(mock.history.get.length).toBe(2); // Both requests made
        });

        it("respects global cache disabled", async () => {
            mock.onGet("/data").reply(200, { value: 1 });

            const client = createAxiosHttpClient({
                axiosInstance,
                // No cache config = disabled
            });

            await client.get("/data");
            await client.get("/data");

            expect(mock.history.get.length).toBe(2);
        });
    });

    describe("cache key generation", () => {
        it("includes URL in cache key", async () => {
            mock.onGet("/endpoint1").reply(200, { data: 1 });
            mock.onGet("/endpoint2").reply(200, { data: 2 });

            const client = createAxiosHttpClient({
                axiosInstance,
                cache: {
                    cache: new Map(),
                    ttl: 60000,
                },
            });

            const response1 = await client.get("/endpoint1");
            const response2 = await client.get("/endpoint2");

            expect(response1.data.data).toBe(1);
            expect(response2.data.data).toBe(2);
            expect(mock.history.get.length).toBe(2);
        });

        it("includes query params in cache key", async () => {
            mock.onGet("/search").reply((config) => {
                const q = config.params?.q;
                return [200, { query: q }];
            });

            const client = createAxiosHttpClient({
                axiosInstance,
                cache: {
                    cache: new Map(),
                    ttl: 60000,
                },
            });

            const response1 = await client.get("/search", {
                query: { q: "test1" },
            });
            const response2 = await client.get("/search", {
                query: { q: "test2" },
            });

            expect(response1.data.query).toBe("test1");
            expect(response2.data.query).toBe("test2");
            expect(mock.history.get.length).toBe(2);
        });

        it("does not include body in cache key for GET requests", async () => {
            mock.onGet("/data").reply(200, { value: 1 });

            const client = createAxiosHttpClient({
                axiosInstance,
                cache: {
                    cache: new Map(),
                    ttl: 60000,
                },
            });

            await client.get("/data");
            // Second request with same URL should hit cache regardless of "body"
            await client.get("/data");

            expect(mock.history.get.length).toBe(1);
        });
    });
});
