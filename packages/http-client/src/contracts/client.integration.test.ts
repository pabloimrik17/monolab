/**
 * HttpClient Integration Test Suite
 *
 * This parametric test suite verifies that all HttpClient implementations
 * (axios, ky, etc.) behave identically at the HTTP request/response level.
 *
 * Uses MSW (Mock Service Worker) to intercept real HTTP requests,
 * ensuring we test actual network behavior regardless of the HTTP library.
 *
 * To add a new adapter:
 * 1. Create a factory function that returns an HttpClient
 * 2. Add it to the clientFactories array below
 * 3. All tests will automatically run against the new implementation
 */

import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import {
    afterAll,
    afterEach,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    test,
} from "vitest";
import { createHttpClientFactory } from "../axios/factory.js";
import type { HttpClient } from "./client.js";

// Base URL for all test requests
const BASE_URL = "http://test-api.localhost";

// ============================================================================
// Client Factories
// ============================================================================

/**
 * Factory function type for creating HttpClient instances.
 */
type HttpClientFactory = () => HttpClient;

/**
 * Register all adapter factories here.
 * Each entry: [adapterName, factoryFunction]
 */
const clientFactories: [string, HttpClientFactory][] = [
    [
        "axios",
        () =>
            createHttpClientFactory({
                baseUrl: BASE_URL,
            }),
    ],
    // ["ky", () => createKyHttpClient({ baseUrl: BASE_URL })], // Future
];

// ============================================================================
// MSW Server Setup
// ============================================================================

// Track requests for assertions
let capturedRequests: Request[] = [];

const server = setupServer();

// ============================================================================
// Test Suite
// ============================================================================

describe.each(clientFactories)(
    "HttpClient Integration (%s)",
    (_name, createClient) => {
        let client: HttpClient;

        beforeAll(() => {
            server.listen({ onUnhandledRequest: "error" });
        });

        afterAll(() => {
            server.close();
        });

        beforeEach(() => {
            client = createClient();
            capturedRequests = [];
        });

        afterEach(() => {
            server.resetHandlers();
        });

        // =====================================================================
        // GET Requests
        // =====================================================================

        describe("GET requests", () => {
            it("makes GET request to correct URL", async () => {
                server.use(
                    http.get(`${BASE_URL}/users`, ({ request }) => {
                        capturedRequests.push(request);
                        return HttpResponse.json([{ id: 1, name: "John" }]);
                    })
                );

                const response = await client.get("/users");

                expect(response.status).toBe(200);
                expect(response.data).toEqual([{ id: 1, name: "John" }]);
                expect(capturedRequests).toHaveLength(1);
                expect(capturedRequests[0]!.method).toBe("GET");
            });

            it("includes query parameters in URL", async () => {
                server.use(
                    http.get(`${BASE_URL}/search`, ({ request }) => {
                        capturedRequests.push(request);
                        const url = new URL(request.url);
                        return HttpResponse.json({
                            q: url.searchParams.get("q"),
                            limit: url.searchParams.get("limit"),
                        });
                    })
                );

                const response = await client.get("/search", {
                    query: { q: "test", limit: 10 },
                });

                expect(response.data).toEqual({ q: "test", limit: "10" });
                const url = new URL(capturedRequests[0]!.url);
                expect(url.searchParams.get("q")).toBe("test");
                expect(url.searchParams.get("limit")).toBe("10");
            });

            it("sends custom headers", async () => {
                server.use(
                    http.get(`${BASE_URL}/users`, ({ request }) => {
                        capturedRequests.push(request);
                        return HttpResponse.json({
                            receivedHeader: request.headers.get("X-Custom"),
                        });
                    })
                );

                const response = await client.get("/users", {
                    headers: { "X-Custom": "custom-value" },
                });

                expect(response.data).toEqual({
                    receivedHeader: "custom-value",
                });
                expect(capturedRequests[0]!.headers.get("X-Custom")).toBe(
                    "custom-value"
                );
            });

            it("receives response headers", async () => {
                server.use(
                    http.get(`${BASE_URL}/users`, () => {
                        return HttpResponse.json([], {
                            headers: {
                                "X-Total-Count": "100",
                                "X-Page": "1",
                            },
                        });
                    })
                );

                const response = await client.get("/users");

                expect(response.headers["x-total-count"]).toBe("100");
                expect(response.headers["x-page"]).toBe("1");
            });

            it("returns typed response data", async () => {
                interface User {
                    id: number;
                    name: string;
                }

                server.use(
                    http.get(`${BASE_URL}/users/1`, () => {
                        return HttpResponse.json({ id: 1, name: "John" });
                    })
                );

                const response = await client.get<User>("/users/1");

                expect(response.data.id).toBe(1);
                expect(response.data.name).toBe("John");
            });
        });

        // =====================================================================
        // POST Requests
        // =====================================================================

        describe("POST requests", () => {
            it("sends JSON body correctly", async () => {
                server.use(
                    http.post(`${BASE_URL}/users`, async ({ request }) => {
                        capturedRequests.push(request);
                        const body = (await request.json()) as Record<
                            string,
                            unknown
                        >;
                        return HttpResponse.json(
                            { id: 1, ...body },
                            { status: 201 }
                        );
                    })
                );

                const response = await client.post("/users", {
                    name: "John",
                    email: "john@test.com",
                });

                expect(response.status).toBe(201);
                expect(response.data).toEqual({
                    id: 1,
                    name: "John",
                    email: "john@test.com",
                });
            });

            it("works without body", async () => {
                server.use(
                    http.post(`${BASE_URL}/trigger`, ({ request }) => {
                        capturedRequests.push(request);
                        return HttpResponse.json({ triggered: true });
                    })
                );

                const response = await client.post("/trigger");

                expect(response.status).toBe(200);
                expect(response.data).toEqual({ triggered: true });
            });

            it("returns correct status code", async () => {
                server.use(
                    http.post(`${BASE_URL}/users`, () => {
                        return HttpResponse.json(
                            { id: 1, name: "Jane" },
                            { status: 201 }
                        );
                    })
                );

                const response = await client.post("/users", { name: "Jane" });

                expect(response.status).toBe(201);
            });
        });

        // =====================================================================
        // PUT Requests
        // =====================================================================

        describe("PUT requests", () => {
            it("sends full replacement body", async () => {
                server.use(
                    http.put(`${BASE_URL}/users/1`, async ({ request }) => {
                        capturedRequests.push(request);
                        const body = (await request.json()) as Record<
                            string,
                            unknown
                        >;
                        return HttpResponse.json({ id: 1, ...body });
                    })
                );

                const response = await client.put("/users/1", {
                    name: "Jane",
                    email: "jane@test.com",
                });

                expect(response.data).toEqual({
                    id: 1,
                    name: "Jane",
                    email: "jane@test.com",
                });
            });
        });

        // =====================================================================
        // PATCH Requests
        // =====================================================================

        describe("PATCH requests", () => {
            it("sends partial update body", async () => {
                server.use(
                    http.patch(`${BASE_URL}/users/1`, async ({ request }) => {
                        capturedRequests.push(request);
                        const body = (await request.json()) as Record<
                            string,
                            unknown
                        >;
                        return HttpResponse.json({
                            id: 1,
                            email: "original@test.com",
                            ...body,
                        });
                    })
                );

                const response = await client.patch("/users/1", {
                    name: "Patched",
                });

                expect(response.data).toEqual({
                    id: 1,
                    name: "Patched",
                    email: "original@test.com",
                });
            });
        });

        // =====================================================================
        // DELETE Requests
        // =====================================================================

        describe("DELETE requests", () => {
            it("makes DELETE request to correct URL", async () => {
                server.use(
                    http.delete(`${BASE_URL}/users/1`, ({ request }) => {
                        capturedRequests.push(request);
                        return new HttpResponse(null, { status: 204 });
                    })
                );

                const response = await client.delete("/users/1");

                expect(response.status).toBe(204);
                expect(capturedRequests[0]!.method).toBe("DELETE");
            });

            it("can return response data", async () => {
                server.use(
                    http.delete(`${BASE_URL}/users/1`, () => {
                        return HttpResponse.json({
                            success: true,
                            deletedId: 1,
                        });
                    })
                );

                const response = await client.delete<{
                    success: boolean;
                    deletedId: number;
                }>("/users/1");

                expect(response.data.success).toBe(true);
                expect(response.data.deletedId).toBe(1);
            });
        });

        // =====================================================================
        // HEAD Requests
        // =====================================================================

        describe("HEAD requests", () => {
            it("returns headers without body", async () => {
                server.use(
                    http.head(`${BASE_URL}/users/1`, ({ request }) => {
                        capturedRequests.push(request);
                        return new HttpResponse(null, {
                            status: 200,
                            headers: {
                                "Content-Length": "42",
                                "Content-Type": "application/json",
                            },
                        });
                    })
                );

                const response = await client.head("/users/1");

                expect(response.status).toBe(200);
                expect(response.headers["content-length"]).toBe("42");
                expect(response.data).toBeUndefined();
            });
        });

        // =====================================================================
        // OPTIONS Requests
        // =====================================================================

        describe("OPTIONS requests", () => {
            it("returns allowed methods", async () => {
                server.use(
                    http.options(`${BASE_URL}/users`, ({ request }) => {
                        capturedRequests.push(request);
                        return new HttpResponse(null, {
                            status: 200,
                            headers: {
                                Allow: "GET, POST, PUT, DELETE",
                            },
                        });
                    })
                );

                const response = await client.options("/users");

                expect(response.headers["allow"]).toBe(
                    "GET, POST, PUT, DELETE"
                );
            });
        });

        // =====================================================================
        // Error Handling Tests
        // =====================================================================

        describe("Error handling", () => {
            it("transforms 4xx errors to HttpResponseError", async () => {
                server.use(
                    http.get(`${BASE_URL}/not-found`, () => {
                        return HttpResponse.json(
                            { error: "Not found" },
                            { status: 404 }
                        );
                    })
                );

                await expect(client.get("/not-found")).rejects.toMatchObject({
                    name: "HttpNotFoundError",
                    status: 404,
                });
            });

            it("transforms 5xx errors to HttpResponseError", async () => {
                server.use(
                    http.get(`${BASE_URL}/server-error`, () => {
                        return HttpResponse.json(
                            { error: "Internal error" },
                            { status: 500 }
                        );
                    })
                );

                await expect(client.get("/server-error")).rejects.toMatchObject(
                    {
                        name: "HttpInternalServerError",
                        status: 500,
                    }
                );
            });

            it("transforms 400 to HttpBadRequestError", async () => {
                server.use(
                    http.post(`${BASE_URL}/validate`, () => {
                        return HttpResponse.json(
                            { error: "Invalid data" },
                            { status: 400 }
                        );
                    })
                );

                await expect(
                    client.post("/validate", { invalid: true })
                ).rejects.toMatchObject({
                    name: "HttpBadRequestError",
                    status: 400,
                });
            });

            it("transforms 401 to HttpUnauthorizedError", async () => {
                server.use(
                    http.get(`${BASE_URL}/protected`, () => {
                        return HttpResponse.json(
                            { error: "Unauthorized" },
                            { status: 401 }
                        );
                    })
                );

                await expect(client.get("/protected")).rejects.toMatchObject({
                    name: "HttpUnauthorizedError",
                    status: 401,
                });
            });

            it("transforms 403 to HttpForbiddenError", async () => {
                server.use(
                    http.get(`${BASE_URL}/forbidden`, () => {
                        return HttpResponse.json(
                            { error: "Forbidden" },
                            { status: 403 }
                        );
                    })
                );

                await expect(client.get("/forbidden")).rejects.toMatchObject({
                    name: "HttpForbiddenError",
                    status: 403,
                });
            });

            it("transforms 409 to HttpConflictError", async () => {
                server.use(
                    http.post(`${BASE_URL}/users`, () => {
                        return HttpResponse.json(
                            { error: "Conflict" },
                            { status: 409 }
                        );
                    })
                );

                await expect(
                    client.post("/users", { email: "exists@test.com" })
                ).rejects.toMatchObject({
                    name: "HttpConflictError",
                    status: 409,
                });
            });

            it("transforms 422 to HttpUnprocessableEntityError", async () => {
                server.use(
                    http.post(`${BASE_URL}/entities`, () => {
                        return HttpResponse.json(
                            { error: "Unprocessable" },
                            { status: 422 }
                        );
                    })
                );

                await expect(
                    client.post("/entities", { age: -5 })
                ).rejects.toMatchObject({
                    name: "HttpUnprocessableEntityError",
                    status: 422,
                });
            });

            it("transforms 429 to HttpTooManyRequestsError", async () => {
                server.use(
                    http.get(`${BASE_URL}/rate-limited`, () => {
                        return HttpResponse.json(
                            { error: "Too many requests" },
                            { status: 429 }
                        );
                    })
                );

                await expect(client.get("/rate-limited")).rejects.toMatchObject(
                    {
                        name: "HttpTooManyRequestsError",
                        status: 429,
                    }
                );
            });

            it("transforms 503 to HttpServiceUnavailableError", async () => {
                server.use(
                    http.get(`${BASE_URL}/unavailable`, () => {
                        return HttpResponse.json(
                            { error: "Service unavailable" },
                            { status: 503 }
                        );
                    })
                );

                await expect(client.get("/unavailable")).rejects.toMatchObject({
                    name: "HttpServiceUnavailableError",
                    status: 503,
                });
            });

            it("preserves error response data", async () => {
                const errorData = {
                    error: "Validation failed",
                    fields: { email: "Invalid format" },
                };

                server.use(
                    http.post(`${BASE_URL}/validate`, () => {
                        return HttpResponse.json(errorData, { status: 400 });
                    })
                );

                try {
                    await client.post("/validate", { email: "invalid" });
                    expect.fail("Should have thrown");
                } catch (error: unknown) {
                    expect(error).toMatchObject({
                        status: 400,
                        data: errorData,
                    });
                }
            });

            it("preserves error response headers", async () => {
                server.use(
                    http.get(`${BASE_URL}/rate-limited`, () => {
                        return HttpResponse.json(
                            { error: "Rate limited" },
                            {
                                status: 429,
                                headers: { "Retry-After": "60" },
                            }
                        );
                    })
                );

                try {
                    await client.get("/rate-limited");
                    expect.fail("Should have thrown");
                } catch (error: unknown) {
                    expect(error).toMatchObject({
                        status: 429,
                        headers: expect.objectContaining({
                            "retry-after": "60",
                        }),
                    });
                }
            });
        });

        // =====================================================================
        // Features Tests (TODO - implement when features are added to factory)
        // These tests require the factory to support retry, cache, deduplication
        // =====================================================================

        describe("Retry behavior", () => {
            test.todo("retries on 5xx errors");
            test.todo("respects retry-after header");
            test.todo("uses exponential backoff");
            test.todo("stops after max attempts");
            test.todo("does not retry on 4xx errors by default");
            test.todo("allows custom retry condition");
        });

        describe("Cache behavior", () => {
            test.todo("caches GET responses");
            test.todo("invalidates cache on POST/PUT/PATCH/DELETE");
            test.todo("respects TTL");
            test.todo("allows cache bypass per request");
            test.todo("uses consistent cache key generation");
        });

        describe("Deduplication behavior", () => {
            test.todo("deduplicates concurrent identical GET requests");
            test.todo("includes critical headers in dedup key");
            test.todo("clears dedup entry after response");
            test.todo("allows dedup opt-out per request");
        });

        describe("Interceptors behavior", () => {
            test.todo("runs request interceptors in order");
            test.todo("runs response interceptors in order");
            test.todo("handles interceptor errors gracefully");
            test.todo("allows interceptor removal");
        });
    }
);
