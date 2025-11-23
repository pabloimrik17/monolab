import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import type { HttpClient } from "../contracts/client.js";
import { createAxiosHttpClient } from "./adapter.js";

describe("AxiosHttpClient", () => {
    let client: HttpClient;
    let mock: MockAdapter;

    beforeEach(() => {
        const axiosInstance = axios.create();
        mock = new MockAdapter(axiosInstance);
        client = createAxiosHttpClient({ axiosInstance });
    });

    afterEach(() => {
        mock.reset();
    });

    describe("GET requests", () => {
        it("makes GET request and returns typed response", async () => {
            interface User {
                id: number;
                name: string;
            }

            mock.onGet("/users/1").reply(200, { id: 1, name: "John" });

            const response = await client.get<User>("/users/1");

            expect(response.status).toBe(200);
            expect(response.data).toEqual({ id: 1, name: "John" });
            expect(response.data.id).toBe(1);
            expect(response.data.name).toBe("John");
        });

        it("includes request configuration in response", async () => {
            mock.onGet("/users").reply(200, []);

            const response = await client.get("/users", {
                headers: { "X-Custom": "value" },
                timeout: 3000,
            });

            expect(response.request).toBeDefined();
            expect(response.request.headers?.["X-Custom"]).toBe("value");
            expect(response.request.timeout).toBe(3000);
        });

        it("supports query parameters", async () => {
            mock.onGet("/search", { params: { q: "test", limit: 10 } }).reply(
                200,
                []
            );

            const response = await client.get("/search", {
                query: { q: "test", limit: 10 },
            });

            expect(response.status).toBe(200);
            expect(mock.history.get[0].params).toEqual({ q: "test", limit: 10 });
        });

        it("includes response headers", async () => {
            mock.onGet("/users").reply(200, [], {
                "content-type": "application/json",
                "x-total-count": "100",
            });

            const response = await client.get("/users");

            expect(response.headers["content-type"]).toBe("application/json");
            expect(response.headers["x-total-count"]).toBe("100");
        });
    });

    describe("POST requests", () => {
        it("makes POST request with body", async () => {
            interface User {
                id: number;
                name: string;
            }
            interface CreateUserDto {
                name: string;
                email: string;
            }

            const newUser: CreateUserDto = {
                name: "Jane",
                email: "jane@example.com",
            };

            mock.onPost("/users", newUser).reply(201, {
                id: 2,
                name: "Jane",
            });

            const response = await client.post<User, CreateUserDto>(
                "/users",
                newUser
            );

            expect(response.status).toBe(201);
            expect(response.data.id).toBe(2);
            expect(response.data.name).toBe("Jane");
            expect(mock.history.post[0].data).toBe(JSON.stringify(newUser));
        });

        it("supports POST without body", async () => {
            mock.onPost("/actions/trigger").reply(200, { triggered: true });

            const response = await client.post("/actions/trigger");

            expect(response.status).toBe(200);
            expect(response.data).toEqual({ triggered: true });
        });
    });

    describe("PUT requests", () => {
        it("makes PUT request with body", async () => {
            interface User {
                id: number;
                name: string;
            }

            const updateData = { name: "Bob", email: "bob@example.com" };

            mock.onPut("/users/1", updateData).reply(200, {
                id: 1,
                name: "Bob",
            });

            const response = await client.put<User>("/users/1", updateData);

            expect(response.status).toBe(200);
            expect(response.data.name).toBe("Bob");
        });
    });

    describe("PATCH requests", () => {
        it("makes PATCH request with partial body", async () => {
            interface User {
                id: number;
                name: string;
                email: string;
            }

            const partialUpdate = { name: "Charlie" };

            mock.onPatch("/users/1", partialUpdate).reply(200, {
                id: 1,
                name: "Charlie",
                email: "charlie@example.com",
            });

            const response = await client.patch<User>("/users/1", partialUpdate);

            expect(response.status).toBe(200);
            expect(response.data.name).toBe("Charlie");
        });
    });

    describe("DELETE requests", () => {
        it("makes DELETE request", async () => {
            mock.onDelete("/users/1").reply(204);

            const response = await client.delete("/users/1");

            expect(response.status).toBe(204);
        });

        it("handles DELETE with response data", async () => {
            interface DeleteResult {
                success: boolean;
                deletedId: number;
            }

            mock.onDelete("/users/1").reply(200, {
                success: true,
                deletedId: 1,
            });

            const response = await client.delete<DeleteResult>("/users/1");

            expect(response.data.success).toBe(true);
            expect(response.data.deletedId).toBe(1);
        });
    });

    describe("HEAD requests", () => {
        it("makes HEAD request", async () => {
            mock.onHead("/users/1").reply(200);

            const response = await client.head("/users/1");

            expect(response.status).toBe(200);
        });

        it("includes headers but no body", async () => {
            mock.onHead("/users/1").reply(200, undefined, {
                "content-type": "application/json",
                "content-length": "42",
            });

            const response = await client.head("/users/1");

            expect(response.headers["content-type"]).toBe("application/json");
            expect(response.headers["content-length"]).toBe("42");
            expect(response.data).toBeUndefined();
        });
    });

    describe("OPTIONS requests", () => {
        it("makes OPTIONS request", async () => {
            mock.onOptions("/users").reply(200, undefined, {
                allow: "GET, POST, PUT, DELETE",
            });

            const response = await client.options("/users");

            expect(response.status).toBe(200);
            expect(response.headers.allow).toBe("GET, POST, PUT, DELETE");
        });
    });

    describe("base URL configuration", () => {
        it("uses baseUrl from configuration", async () => {
            const axiosInstance = axios.create({
                baseURL: "https://api.example.com",
            });
            mock = new MockAdapter(axiosInstance);
            client = createAxiosHttpClient({ axiosInstance });

            mock.onGet("https://api.example.com/users").reply(200, []);

            const response = await client.get("/users");

            expect(response.status).toBe(200);
        });
    });

    describe("headers configuration", () => {
        it("includes default headers from configuration", async () => {
            const axiosInstance = axios.create({
                headers: {
                    "X-API-Key": "secret",
                    "Content-Type": "application/json",
                },
            });
            mock = new MockAdapter(axiosInstance);
            client = createAxiosHttpClient({ axiosInstance });

            mock.onGet("/users").reply(200, []);

            await client.get("/users");

            expect(mock.history.get[0].headers?.["X-API-Key"]).toBe("secret");
            expect(mock.history.get[0].headers?.["Content-Type"]).toBe(
                "application/json"
            );
        });

        it("merges request headers with default headers", async () => {
            const axiosInstance = axios.create({
                headers: { "X-API-Key": "secret" },
            });
            mock = new MockAdapter(axiosInstance);
            client = createAxiosHttpClient({ axiosInstance });

            mock.onGet("/users").reply(200, []);

            await client.get("/users", {
                headers: { "X-Custom": "value" },
            });

            expect(mock.history.get[0].headers?.["X-API-Key"]).toBe("secret");
            expect(mock.history.get[0].headers?.["X-Custom"]).toBe("value");
        });
    });

    describe("timeout configuration", () => {
        it("respects timeout from request config", async () => {
            mock.onGet("/users").reply(200, []);

            await client.get("/users", { timeout: 5000 });

            expect(mock.history.get[0].timeout).toBe(5000);
        });
    });
});
