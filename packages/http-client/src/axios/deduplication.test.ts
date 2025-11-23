import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { beforeEach, describe, expect, it } from "vitest";
import { createAxiosHttpClient } from "./adapter.js";

describe("Request Deduplication", () => {
    let mock: MockAdapter;
    let axiosInstance: ReturnType<typeof axios.create>;

    beforeEach(() => {
        axiosInstance = axios.create();
        mock = new MockAdapter(axiosInstance);
    });

    describe("concurrent identical requests", () => {
        it("deduplicates identical GET requests", async () => {
            mock.onGet("/users").reply(200, [{ id: 1, name: "John" }]);

            const client = createAxiosHttpClient({
                axiosInstance,
                deduplication: { enabled: true },
            });

            // Make 3 identical concurrent requests
            const [response1, response2, response3] = await Promise.all([
                client.get("/users"),
                client.get("/users"),
                client.get("/users"),
            ]);

            // All responses should be identical
            expect(response1.data).toEqual(response2.data);
            expect(response2.data).toEqual(response3.data);

            // Only one actual request should have been made
            expect(mock.history.get.length).toBe(1);
        });

        it("does not deduplicate requests with different URLs", async () => {
            mock.onGet("/users").reply(200, []);
            mock.onGet("/posts").reply(200, []);

            const client = createAxiosHttpClient({
                axiosInstance,
                deduplication: { enabled: true },
            });

            await Promise.all([client.get("/users"), client.get("/posts")]);

            expect(mock.history.get.length).toBe(2);
        });

        it("does not deduplicate requests with different query params", async () => {
            mock.onGet("/search").reply(200, []);

            const client = createAxiosHttpClient({
                axiosInstance,
                deduplication: { enabled: true },
            });

            await Promise.all([
                client.get("/search", { query: { q: "foo" } }),
                client.get("/search", { query: { q: "bar" } }),
            ]);

            expect(mock.history.get.length).toBe(2);
        });

        it("does not deduplicate requests with different methods", async () => {
            mock.onGet("/users").reply(200, []);
            mock.onPost("/users").reply(201, {});

            const client = createAxiosHttpClient({
                axiosInstance,
                deduplication: { enabled: true },
            });

            await Promise.all([
                client.get("/users"),
                client.post("/users", { name: "John" }),
            ]);

            expect(mock.history.get.length).toBe(1);
            expect(mock.history.post.length).toBe(1);
        });

        it("does not deduplicate POST requests with different bodies", async () => {
            mock.onPost("/users").reply(201, {});

            const client = createAxiosHttpClient({
                axiosInstance,
                deduplication: { enabled: true },
            });

            await Promise.all([
                client.post("/users", { name: "John" }),
                client.post("/users", { name: "Jane" }),
            ]);

            expect(mock.history.post.length).toBe(2);
        });
    });

    describe("deduplication key generation", () => {
        it("includes method in deduplication key", async () => {
            mock.onGet("/data").reply(200, { type: "get" });
            mock.onPost("/data").reply(200, { type: "post" });

            const client = createAxiosHttpClient({
                axiosInstance,
                deduplication: { enabled: true },
            });

            const [getResponse, postResponse] = await Promise.all([
                client.get("/data"),
                client.post("/data", {}),
            ]);

            expect(getResponse.data.type).toBe("get");
            expect(postResponse.data.type).toBe("post");
            expect(mock.history.get.length).toBe(1);
            expect(mock.history.post.length).toBe(1);
        });

        it("includes query params in deduplication key", async () => {
            mock.onGet("/search", { params: { q: "test", limit: 10 } }).reply(
                200,
                { results: "test-10" }
            );
            mock.onGet("/search", { params: { q: "test", limit: 20 } }).reply(
                200,
                { results: "test-20" }
            );

            const client = createAxiosHttpClient({
                axiosInstance,
                deduplication: { enabled: true },
            });

            const [response1, response2] = await Promise.all([
                client.get("/search", { query: { q: "test", limit: 10 } }),
                client.get("/search", { query: { q: "test", limit: 20 } }),
            ]);

            expect(response1.data.results).toBe("test-10");
            expect(response2.data.results).toBe("test-20");
            expect(mock.history.get.length).toBe(2);
        });

        it("includes body in deduplication key for POST", async () => {
            mock.onPost("/users").reply((config) => {
                const body = JSON.parse(config.data);
                return [201, { id: 1, ...body }];
            });

            const client = createAxiosHttpClient({
                axiosInstance,
                deduplication: { enabled: true },
            });

            const [response1, response2] = await Promise.all([
                client.post("/users", { name: "John", age: 30 }),
                client.post("/users", { name: "Jane", age: 25 }),
            ]);

            expect(response1.data.name).toBe("John");
            expect(response2.data.name).toBe("Jane");
            expect(mock.history.post.length).toBe(2);
        });
    });

    describe("deduplication cleanup", () => {
        it("clears deduplication cache after successful response", async () => {
            let callCount = 0;
            mock.onGet("/users").reply(() => {
                callCount++;
                return [200, []];
            });

            const client = createAxiosHttpClient({
                axiosInstance,
                deduplication: { enabled: true },
            });

            // First batch of concurrent requests
            await Promise.all([
                client.get("/users"),
                client.get("/users"),
                client.get("/users"),
            ]);

            expect(callCount).toBe(1);

            // Second batch after completion - should make new request
            await Promise.all([
                client.get("/users"),
                client.get("/users"),
            ]);

            expect(callCount).toBe(2);
        });

        it("clears deduplication cache after error", async () => {
            let callCount = 0;
            mock.onGet("/users").reply(() => {
                callCount++;
                return [500, {}];
            });

            const client = createAxiosHttpClient({
                axiosInstance,
                deduplication: { enabled: true },
            });

            // First batch - all should fail
            await Promise.allSettled([
                client.get("/users"),
                client.get("/users"),
            ]);

            expect(callCount).toBe(1);

            // Second batch - should make new request
            await Promise.allSettled([client.get("/users")]);

            expect(callCount).toBe(2);
        });
    });

    describe("opt-out per request", () => {
        it("allows disabling deduplication per request", async () => {
            mock.onGet("/users").reply(200, []);

            const client = createAxiosHttpClient({
                axiosInstance,
                deduplication: { enabled: true },
            });

            await Promise.all([
                client.get("/users"),
                client.get("/users"),
                client.get("/users", { deduplication: { enabled: false } }),
            ]);

            // First two requests deduplicated (1 call), third not deduplicated (1 call)
            // Total: 2 calls
            expect(mock.history.get.length).toBe(2);
        });

        it("respects global deduplication disabled", async () => {
            mock.onGet("/users").reply(200, []);

            const client = createAxiosHttpClient({
                axiosInstance,
                // No deduplication config = disabled by default
            });

            await Promise.all([
                client.get("/users"),
                client.get("/users"),
                client.get("/users"),
            ]);

            // All requests should execute
            expect(mock.history.get.length).toBe(3);
        });
    });

    describe("deduplication with headers", () => {
        it("considers critical headers in deduplication key", async () => {
            mock.onGet("/data").reply((config) => {
                const auth = config.headers?.["Authorization"];
                return [200, { user: auth === "Bearer token1" ? "user1" : "user2" }];
            });

            const client = createAxiosHttpClient({
                axiosInstance,
                deduplication: {
                    enabled: true,
                    criticalHeaders: ["Authorization"],
                },
            });

            const [response1, response2] = await Promise.all([
                client.get("/data", {
                    headers: { Authorization: "Bearer token1" },
                }),
                client.get("/data", {
                    headers: { Authorization: "Bearer token2" },
                }),
            ]);

            expect(response1.data.user).toBe("user1");
            expect(response2.data.user).toBe("user2");
            expect(mock.history.get.length).toBe(2);
        });

        it("ignores non-critical headers in deduplication", async () => {
            mock.onGet("/data").reply(200, { data: "result" });

            const client = createAxiosHttpClient({
                axiosInstance,
                deduplication: { enabled: true },
            });

            await Promise.all([
                client.get("/data", { headers: { "X-Request-ID": "1" } }),
                client.get("/data", { headers: { "X-Request-ID": "2" } }),
            ]);

            // Should be deduplicated despite different headers
            expect(mock.history.get.length).toBe(1);
        });
    });
});
