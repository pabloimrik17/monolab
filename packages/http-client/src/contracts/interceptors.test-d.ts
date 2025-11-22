import { describe, expectTypeOf, test } from "vitest";
import type {
    HttpError,
    HttpRequestConfig,
    HttpResponse,
    RequestOnFulfilled,
    RequestOnRejected,
    ResponseOnFulfilled,
    ResponseOnRejected,
} from "../index.js";

/**
 * Type-level tests for interceptor types.
 * @vitest-environment node
 */

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

describe("Interceptor no any types", () => {
    test("interceptor types don't accept any", () => {
        expectTypeOf<RequestOnFulfilled>().parameters.not.toEqualTypeOf<
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            [any]
        >();
        expectTypeOf<ResponseOnFulfilled>().parameters.not.toEqualTypeOf<
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            [any]
        >();
    });
});
