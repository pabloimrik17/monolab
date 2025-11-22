import { describe, expectTypeOf, test } from "vitest";
import type {
    HttpBadRequestError,
    HttpError,
    HttpErrorStatusCode,
    HttpNetworkError,
    HttpNotFoundError,
    HttpRequestConfig,
    HttpResponseError,
    HttpUnauthorizedError,
} from "../index.js";

/**
 * Type-level tests for HTTP error hierarchy.
 * @vitest-environment node
 */

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

        expectTypeOf(error.status).toEqualTypeOf<HttpErrorStatusCode>();
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

describe("Error generic type inference", () => {
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

describe("Error readonly enforcement", () => {
    test("error request property is readonly", () => {
        const error: HttpError = {} as HttpError;

        expectTypeOf(error.request).toMatchTypeOf<
            Readonly<HttpRequestConfig>
        >();
    });
});
