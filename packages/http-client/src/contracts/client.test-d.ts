import { describe, expectTypeOf, test } from "vitest";
import type { HttpClient, HttpResponse } from "../index.js";

/**
 * Type-level tests for HttpClient interface.
 * @vitest-environment node
 */

describe("HttpClient type inference", () => {
    test("GET returns typed response", () => {
        interface User {
            id: number;
            name: string;
            email: string;
        }

        const client = {} as HttpClient;
        const response = client.get<User>("/users/1");

        expectTypeOf(response).toEqualTypeOf<Promise<HttpResponse<User>>>();
    });

    test("POST accepts body and returns typed response", () => {
        interface User {
            id: number;
            name: string;
            email: string;
        }

        interface CreateUserDto {
            name: string;
            email: string;
        }

        const client = {} as HttpClient;
        const response = client.post<User, CreateUserDto>("/users", {
            name: "Alice",
            email: "alice@example.com",
        });

        expectTypeOf(response).toEqualTypeOf<Promise<HttpResponse<User>>>();
    });

    test("PUT accepts body and returns typed response", () => {
        interface User {
            id: number;
            name: string;
        }

        interface UpdateUserDto {
            name: string;
        }

        const client = {} as HttpClient;
        const response = client.put<User, UpdateUserDto>("/users/1", {
            name: "Bob",
        });

        expectTypeOf(response).toEqualTypeOf<Promise<HttpResponse<User>>>();
    });

    test("PATCH accepts partial body and returns typed response", () => {
        interface User {
            id: number;
            name: string;
            email: string;
        }

        const client = {} as HttpClient;
        const response = client.patch<User, Partial<User>>("/users/1", {
            name: "Charlie",
        });

        expectTypeOf(response).toEqualTypeOf<Promise<HttpResponse<User>>>();
    });

    test("DELETE returns typed response with default void", () => {
        const client = {} as HttpClient;
        const response = client.delete("/users/1");

        expectTypeOf(response).toEqualTypeOf<Promise<HttpResponse<void>>>();
    });

    test("DELETE can return data", () => {
        interface DeleteResult {
            success: boolean;
            deletedId: number;
        }

        const client = {} as HttpClient;
        const response = client.delete<DeleteResult>("/users/1");

        expectTypeOf(response).toEqualTypeOf<
            Promise<HttpResponse<DeleteResult>>
        >();
    });

    test("HEAD returns void response", () => {
        const client = {} as HttpClient;
        const response = client.head("/users/1");

        expectTypeOf(response).toEqualTypeOf<Promise<HttpResponse<void>>>();
    });

    test("OPTIONS returns void response", () => {
        const client = {} as HttpClient;
        const response = client.options("/users");

        expectTypeOf(response).toEqualTypeOf<Promise<HttpResponse<void>>>();
    });
});

describe("HttpClient generic type inference", () => {
    test("generic type parameters flow through the client", () => {
        interface User {
            id: number;
            name: string;
        }

        const client = {} as HttpClient;

        // Type inference without explicit type parameters
        const getUserById = (id: number) => client.get<User>(`/users/${id}`);

        const result = getUserById(1);
        expectTypeOf(result).toEqualTypeOf<Promise<HttpResponse<User>>>();
    });
});

describe("HttpClient no any types", () => {
    test("client methods don't return any", () => {
        const client = {} as HttpClient;

        expectTypeOf(client.get<unknown>).parameters.not.toEqualTypeOf<
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            [any]
        >();
        expectTypeOf(client.post<unknown>).parameters.not.toEqualTypeOf<
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            [any]
        >();
        expectTypeOf(client.put<unknown>).parameters.not.toEqualTypeOf<
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            [any]
        >();
        expectTypeOf(client.patch<unknown>).parameters.not.toEqualTypeOf<
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            [any]
        >();
        expectTypeOf(client.delete<unknown>).parameters.not.toEqualTypeOf<
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            [any]
        >();
    });
});
