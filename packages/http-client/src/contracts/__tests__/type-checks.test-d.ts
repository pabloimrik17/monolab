/**
 * Type-level tests for HTTP client contracts.
 * These tests verify compile-time type safety and type inference.
 * @vitest-environment node
 */

import { describe, expectTypeOf, test } from "vitest";
import type {
    HttpBadRequestError,
    HttpClient,
    HttpClientFactory,
    HttpClientOptions,
    HttpError,
    HttpNetworkError,
    HttpNotFoundError,
    HttpRequestConfig,
    HttpResponse,
    HttpResponseError,
    HttpRetryConfig,
    HttpUnauthorizedError,
    RequestOnFulfilled,
    RequestOnRejected,
    ResponseOnFulfilled,
    ResponseOnRejected,
} from "../../index.js";

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

describe("HttpResponse type safety", () => {
    test("response data is typed", () => {
        interface User {
            id: number;
            name: string;
        }

        const response: HttpResponse<User> = {} as HttpResponse<User>;

        expectTypeOf(response.data).toEqualTypeOf<User>();
        expectTypeOf(response.status).toEqualTypeOf<number>();
        expectTypeOf(response.statusText).toEqualTypeOf<string>();
        expectTypeOf(response.ok).toEqualTypeOf<boolean>();
        expectTypeOf(response.url).toEqualTypeOf<string>();
    });

    test("response request is readonly", () => {
        const response: HttpResponse<unknown> = {} as HttpResponse<unknown>;

        expectTypeOf(response.request).toMatchTypeOf<
            Readonly<HttpRequestConfig>
        >();
    });
});

describe("Error hierarchy type checking", () => {
    test("HttpError has base properties", () => {
        const error: HttpError = {} as HttpError;

        expectTypeOf(error.name).toEqualTypeOf<string>();
        expectTypeOf(error.message).toEqualTypeOf<string>();
        expectTypeOf(error.request).toMatchTypeOf<
            Readonly<HttpRequestConfig>
        >();
        expectTypeOf(error.timestamp).toEqualTypeOf<string>();
    });

    test("HttpNetworkError has code property", () => {
        const error: HttpNetworkError = {} as HttpNetworkError;

        expectTypeOf(error.code).toEqualTypeOf<string>();
        expectTypeOf(error).toMatchTypeOf<HttpError>();
    });

    test("HttpResponseError has status and data", () => {
        interface ErrorResponse {
            error: string;
            details: string[];
        }

        const error: HttpResponseError<ErrorResponse> =
            {} as HttpResponseError<ErrorResponse>;

        expectTypeOf(error.status).toEqualTypeOf<number>();
        expectTypeOf(error.statusText).toEqualTypeOf<string>();
        expectTypeOf(error.data).toEqualTypeOf<ErrorResponse>();
        expectTypeOf(error).toMatchTypeOf<HttpError>();
    });

    test("specific error classes have correct status", () => {
        const badRequest: HttpBadRequestError = {} as HttpBadRequestError;
        const unauthorized: HttpUnauthorizedError = {} as HttpUnauthorizedError;
        const notFound: HttpNotFoundError = {} as HttpNotFoundError;

        expectTypeOf(badRequest.status).toEqualTypeOf<400>();
        expectTypeOf(unauthorized.status).toEqualTypeOf<401>();
        expectTypeOf(notFound.status).toEqualTypeOf<404>();
    });
});

describe("Interceptor type signatures", () => {
    test("RequestOnFulfilled accepts and returns config", () => {
        const onFulfilled: RequestOnFulfilled = (
            config: HttpRequestConfig
        ): HttpRequestConfig => {
            expectTypeOf(config).toMatchTypeOf<HttpRequestConfig>();
            return config;
        };

        expectTypeOf(onFulfilled).toMatchTypeOf<RequestOnFulfilled>();
    });

    test("RequestOnFulfilled can be async", () => {
        const onFulfilled: RequestOnFulfilled = async (
            config: HttpRequestConfig
        ): Promise<HttpRequestConfig> => {
            return config;
        };

        expectTypeOf(onFulfilled).toMatchTypeOf<RequestOnFulfilled>();
    });

    test("RequestOnRejected accepts error and returns config or throws", () => {
        const onRejected: RequestOnRejected = (error: Error): never => {
            expectTypeOf(error).toMatchTypeOf<Error>();
            throw error;
        };

        expectTypeOf(onRejected).toMatchTypeOf<RequestOnRejected>();
    });

    test("ResponseOnFulfilled accepts and returns response", () => {
        const onFulfilled: ResponseOnFulfilled = (
            response: HttpResponse<unknown>
        ): HttpResponse<unknown> => {
            expectTypeOf(response).toMatchTypeOf<HttpResponse<unknown>>();
            return response;
        };

        expectTypeOf(onFulfilled).toMatchTypeOf<ResponseOnFulfilled>();
    });

    test("ResponseOnRejected accepts error and can return response or error", () => {
        const onRejected: ResponseOnRejected = (error: HttpError): never => {
            expectTypeOf(error).toMatchTypeOf<HttpError>();
            throw error;
        };

        expectTypeOf(onRejected).toMatchTypeOf<ResponseOnRejected>();
    });
});

describe("Configuration type safety", () => {
    test("HttpRequestConfig has all optional properties", () => {
        const config: HttpRequestConfig = {};

        expectTypeOf(config.baseUrl).toEqualTypeOf<string | undefined>();
        expectTypeOf(config.timeout).toEqualTypeOf<number | undefined>();
        expectTypeOf(config.deduplicate).toEqualTypeOf<boolean | undefined>();
    });

    test("HttpRetryConfig has required and optional properties", () => {
        const config: HttpRetryConfig = {
            attempts: 3,
            delay: 1000,
        };

        expectTypeOf(config.attempts).toEqualTypeOf<number>();
        expectTypeOf(config.delay).toMatchTypeOf<
            number | ((attempt: number, error: HttpError) => number)
        >();
        expectTypeOf(config.condition).toEqualTypeOf<
            ((error: HttpError) => boolean) | undefined
        >();
    });

    test("HttpClientOptions extends HttpRequestConfig", () => {
        const options: HttpClientOptions = {
            baseUrl: "https://api.example.com",
            timeout: 5000,
        };

        expectTypeOf(options).toMatchTypeOf<HttpRequestConfig>();
    });
});

describe("Factory type checking", () => {
    test("HttpClientFactory accepts options and returns client", () => {
        const factory: HttpClientFactory = (
            options?: HttpClientOptions
        ): HttpClient => {
            expectTypeOf(options).toEqualTypeOf<
                HttpClientOptions | undefined
            >();
            return {} as HttpClient;
        };

        const client = factory({ baseUrl: "https://api.example.com" });
        expectTypeOf(client).toMatchTypeOf<HttpClient>();
    });
});

describe("Generic type inference", () => {
    test("generic type parameters flow through the client", async () => {
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

    test("error generic type is propagated", () => {
        interface ErrorResponse {
            error: string;
            code: number;
        }

        const error: HttpResponseError<ErrorResponse> =
            {} as HttpResponseError<ErrorResponse>;

        expectTypeOf(error.data).toEqualTypeOf<ErrorResponse>();
    });
});

describe("Readonly enforcement", () => {
    test("HttpRequestConfig properties are readonly", () => {
        const config: HttpRequestConfig = {
            baseUrl: "https://api.example.com",
            timeout: 5000,
        };

        expectTypeOf(config)
            .toHaveProperty("baseUrl")
            .toMatchTypeOf<string | undefined>();
        expectTypeOf(config)
            .toHaveProperty("timeout")
            .toMatchTypeOf<number | undefined>();
    });

    test("HttpResponse properties are readonly", () => {
        interface User {
            id: number;
        }

        const response: HttpResponse<User> = {} as HttpResponse<User>;

        expectTypeOf(response).toHaveProperty("data").toEqualTypeOf<User>();
        expectTypeOf(response).toHaveProperty("status").toEqualTypeOf<number>();
    });

    test("error request property is readonly", () => {
        const error: HttpError = {} as HttpError;

        expectTypeOf(error.request).toMatchTypeOf<
            Readonly<HttpRequestConfig>
        >();
    });
});

describe("No any types leak through", () => {
    test("client methods don't return any", () => {
        const client = {} as HttpClient;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expectTypeOf(client.get<unknown>).parameters.not.toEqualTypeOf<[any]>();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expectTypeOf(client.post<unknown>).parameters.not.toEqualTypeOf<
            [any]
        >();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expectTypeOf(client.put<unknown>).parameters.not.toEqualTypeOf<[any]>();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expectTypeOf(client.patch<unknown>).parameters.not.toEqualTypeOf<
            [any]
        >();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expectTypeOf(client.delete<unknown>).parameters.not.toEqualTypeOf<
            [any]
        >();
    });

    test("interceptor types don't accept any", () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expectTypeOf<RequestOnFulfilled>().parameters.not.toEqualTypeOf<
            [any]
        >();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expectTypeOf<ResponseOnFulfilled>().parameters.not.toEqualTypeOf<
            [any]
        >();
    });
});
