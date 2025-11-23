import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import type { HttpClient } from "../contracts/client.js";
import { exponentialBackoff, linearBackoff } from "../contracts/retry.js";
import { createAxiosHttpClient } from "./adapter.js";

describe("Retry Policy", () => {
    let client: HttpClient;
    let mock: MockAdapter;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let axiosInstance: any;

    beforeEach(() => {
        axiosInstance = axios.create();
        mock = new MockAdapter(axiosInstance);
    });

    afterEach(() => {
        mock.reset();
    });

    describe("basic retry with exponential backoff", () => {
        it("retries failed request up to maxAttempts", async () => {
            mock.onGet("/flaky")
                .replyOnce(500)
                .onGet("/flaky")
                .replyOnce(500)
                .onGet("/flaky")
                .reply(200, { data: "success" });

            client = createAxiosHttpClient({
                axiosInstance,
                retry: {
                    attempts: 3,
                    delay: exponentialBackoff(100, 10000),
                },
            });

            const response = await client.get("/flaky");

            expect(response.status).toBe(200);
            expect(response.data).toEqual({ data: "success" });
            expect(mock.history.get).toHaveLength(3);
        });

        it("throws error after exhausting retry attempts", async () => {
            mock.onGet("/always-fails").reply(500);

            client = createAxiosHttpClient({
                axiosInstance,
                retry: {
                    attempts: 3,
                    delay: 50,
                },
            });

            await expect(client.get("/always-fails")).rejects.toThrow();
            expect(mock.history.get).toHaveLength(3);
        });
    });

    describe("retry strategies", () => {
        it("uses exponential backoff delays", async () => {
            const delays: number[] = [];
            const startTime = Date.now();

            mock.onGet("/flaky").reply(() => {
                delays.push(Date.now() - startTime);
                if (delays.length < 3) return [500];
                return [200, { data: "success" }];
            });

            client = createAxiosHttpClient({
                axiosInstance,
                retry: {
                    attempts: 3,
                    delay: exponentialBackoff(100, 1000),
                },
            });

            await client.get("/flaky");

            // First call immediate, second after ~100ms, third after ~200ms
            expect(delays[0]).toBeLessThan(50);
            expect(delays[1]).toBeGreaterThan(80);
            expect(delays[2]).toBeGreaterThan(250);
        });

        it("uses linear backoff delays", async () => {
            const delays: number[] = [];
            const startTime = Date.now();

            mock.onGet("/flaky").reply(() => {
                delays.push(Date.now() - startTime);
                if (delays.length < 3) return [500];
                return [200, { data: "success" }];
            });

            client = createAxiosHttpClient({
                axiosInstance,
                retry: {
                    attempts: 3,
                    delay: linearBackoff(100),
                },
            });

            await client.get("/flaky");

            // Delays should be ~100ms, ~200ms, ~300ms
            expect(delays[0]).toBeLessThan(50);
            expect(delays[1]).toBeGreaterThan(80);
            expect(delays[1]).toBeLessThan(150);
            expect(delays[2]).toBeGreaterThan(250);
        });

        it("uses fixed delay", async () => {
            const delays: number[] = [];
            const startTime = Date.now();

            mock.onGet("/flaky").reply(() => {
                delays.push(Date.now() - startTime);
                if (delays.length < 3) return [500];
                return [200, { data: "success" }];
            });

            client = createAxiosHttpClient({
                axiosInstance,
                retry: {
                    attempts: 3,
                    delay: 100, // Fixed 100ms delay
                },
            });

            await client.get("/flaky");

            // All delays should be similar (~100ms apart)
            const delay1 = delays[1] - delays[0];
            const delay2 = delays[2] - delays[1];
            expect(delay1).toBeGreaterThan(80);
            expect(delay1).toBeLessThan(150);
            expect(delay2).toBeGreaterThan(80);
            expect(delay2).toBeLessThan(150);
        });
    });

    describe("retry condition", () => {
        it("only retries safe methods (GET) by default", async () => {
            mock.onGet("/resource").networkError();
            mock.onPost("/resource").networkError();

            client = createAxiosHttpClient({
                axiosInstance,
                retry: { attempts: 3, delay: 10 },
            });

            await expect(client.get("/resource")).rejects.toThrow();
            await expect(client.post("/resource", {})).rejects.toThrow();

            // GET should be retried 3 times
            expect(mock.history.get).toHaveLength(3);
            // POST should only be tried once
            expect(mock.history.post).toHaveLength(1);
        });

        it("retries on 5xx errors", async () => {
            mock.onGet("/resource").reply(503);

            client = createAxiosHttpClient({
                axiosInstance,
                retry: { attempts: 3, delay: 10 },
            });

            await expect(client.get("/resource")).rejects.toThrow();
            expect(mock.history.get).toHaveLength(3);
        });

        it("retries on 429 rate limit", async () => {
            mock.onGet("/resource").reply(429);

            client = createAxiosHttpClient({
                axiosInstance,
                retry: { attempts: 3, delay: 10 },
            });

            await expect(client.get("/resource")).rejects.toThrow();
            expect(mock.history.get).toHaveLength(3);
        });

        it("does not retry on 4xx client errors by default", async () => {
            mock.onGet("/resource").reply(404);

            client = createAxiosHttpClient({
                axiosInstance,
                retry: { attempts: 3, delay: 10 },
            });

            await expect(client.get("/resource")).rejects.toThrow();
            // Should only try once (4xx are client errors, not transient)
            expect(mock.history.get).toHaveLength(1);
        });

        it("respects custom retry condition", async () => {
            mock.onGet("/resource").reply(503);

            client = createAxiosHttpClient({
                axiosInstance,
                retry: {
                    attempts: 3,
                    delay: 10,
                    condition: (error) => error.status === 503,
                },
            });

            await expect(client.get("/resource")).rejects.toThrow();
            expect(mock.history.get).toHaveLength(3);
        });
    });

    describe("retry hooks", () => {
        it("calls onRetry hook before each retry", async () => {
            const retryEvents: Array<{ attempt: number }> = [];

            mock.onGet("/flaky")
                .replyOnce(500)
                .onGet("/flaky")
                .replyOnce(500)
                .onGet("/flaky")
                .reply(200);

            client = createAxiosHttpClient({
                axiosInstance,
                retry: {
                    attempts: 3,
                    delay: 10,
                    onRetry: (error, attempt) => {
                        retryEvents.push({ attempt });
                    },
                },
            });

            await client.get("/flaky");

            expect(retryEvents).toHaveLength(2); // Retried twice (3 total attempts)
            expect(retryEvents[0].attempt).toBe(1);
            expect(retryEvents[1].attempt).toBe(2);
        });

        it("calls onRetryFailed hook when retries exhausted", async () => {
            let exhausted = false;

            mock.onGet("/always-fails").reply(500);

            client = createAxiosHttpClient({
                axiosInstance,
                retry: {
                    attempts: 3,
                    delay: 10,
                    onRetryFailed: () => {
                        exhausted = true;
                    },
                },
            });

            await expect(client.get("/always-fails")).rejects.toThrow();
            expect(exhausted).toBe(true);
        });
    });

    describe("Retry-After header", () => {
        it("respects Retry-After header for 429 responses", async () => {
            const startTime = Date.now();

            mock.onGet("/rate-limited")
                .replyOnce(429, {}, { "retry-after": "1" }) // 1 second
                .onGet("/rate-limited")
                .reply(200);

            client = createAxiosHttpClient({
                axiosInstance,
                retry: {
                    attempts: 2,
                    delay: 50,
                    respectRetryAfter: true,
                },
            });

            await client.get("/rate-limited");

            const elapsed = Date.now() - startTime;
            // Should wait ~1000ms (from Retry-After), not 50ms (from delay)
            expect(elapsed).toBeGreaterThan(900);
        });

        it("respects Retry-After header for 503 responses", async () => {
            const startTime = Date.now();

            mock.onGet("/unavailable")
                .replyOnce(503, {}, { "retry-after": "1" })
                .onGet("/unavailable")
                .reply(200);

            client = createAxiosHttpClient({
                axiosInstance,
                retry: {
                    attempts: 2,
                    delay: 50,
                    respectRetryAfter: true,
                },
            });

            await client.get("/unavailable");

            const elapsed = Date.now() - startTime;
            expect(elapsed).toBeGreaterThan(900);
        });

        it("ignores Retry-After when respectRetryAfter is false", async () => {
            const startTime = Date.now();

            mock.onGet("/rate-limited")
                .replyOnce(429, {}, { "retry-after": "5" })
                .onGet("/rate-limited")
                .reply(200);

            client = createAxiosHttpClient({
                axiosInstance,
                retry: {
                    attempts: 2,
                    delay: 50,
                    respectRetryAfter: false,
                },
            });

            await client.get("/rate-limited");

            const elapsed = Date.now() - startTime;
            // Should use configured delay (50ms), not Retry-After (5s)
            expect(elapsed).toBeLessThan(500);
        });
    });
});
