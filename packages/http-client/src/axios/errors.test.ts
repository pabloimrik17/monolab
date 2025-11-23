import { AxiosError } from "axios";
import { describe, expect, it } from "vitest";
import {
    HttpAbortError,
    HttpBadRequestError,
    HttpConflictError,
    HttpForbiddenError,
    HttpInternalServerError,
    HttpNetworkError,
    HttpNotFoundError,
    HttpResponseError,
    HttpServiceUnavailableError,
    HttpTimeoutError,
    HttpTooManyRequestsError,
    HttpUnauthorizedError,
    HttpUnprocessableEntityError,
} from "../contracts/errors.js";
import type { HttpRequestConfig } from "../contracts/request.js";
import { transformAxiosError } from "./errors.js";

describe("transformAxiosError", () => {
    const mockConfig: HttpRequestConfig = {
        baseUrl: "https://api.example.com",
        headers: { "Content-Type": "application/json" },
    };

    describe("network errors", () => {
        it("transforms ECONNREFUSED to HttpNetworkError", () => {
            const axiosError = new AxiosError(
                "Network Error",
                "ECONNREFUSED",
                undefined,
                {},
                undefined
            );
            axiosError.code = "ECONNREFUSED";

            const result = transformAxiosError(axiosError, mockConfig);

            expect(result).toBeInstanceOf(HttpNetworkError);
            expect(result.name).toBe("HttpNetworkError");
            expect(result.code).toBe("ECONNREFUSED");
            expect(result.message).toContain("Network Error");
            expect(result.request).toEqual(mockConfig);
            expect(result.timestamp).toBeDefined();
        });

        it("transforms ETIMEDOUT to HttpNetworkError", () => {
            const axiosError = new AxiosError(
                "Timeout",
                "ETIMEDOUT",
                undefined,
                {},
                undefined
            );
            axiosError.code = "ETIMEDOUT";

            const result = transformAxiosError(axiosError, mockConfig);

            expect(result).toBeInstanceOf(HttpNetworkError);
            expect(result.code).toBe("ETIMEDOUT");
        });

        it("transforms ENOTFOUND to HttpNetworkError", () => {
            const axiosError = new AxiosError(
                "DNS lookup failed",
                "ENOTFOUND",
                undefined,
                {},
                undefined
            );
            axiosError.code = "ENOTFOUND";

            const result = transformAxiosError(axiosError, mockConfig);

            expect(result).toBeInstanceOf(HttpNetworkError);
            expect(result.code).toBe("ENOTFOUND");
        });
    });

    describe("timeout errors", () => {
        it("transforms ECONNABORTED with timeout to HttpTimeoutError", () => {
            const axiosError = new AxiosError(
                "timeout of 5000ms exceeded",
                "ECONNABORTED",
                undefined,
                {},
                undefined
            );
            axiosError.code = "ECONNABORTED";

            const result = transformAxiosError(axiosError, mockConfig);

            expect(result).toBeInstanceOf(HttpTimeoutError);
            expect(result.name).toBe("HttpTimeoutError");
            expect(result.message).toContain("timeout");
            expect(result.request).toEqual(mockConfig);
        });
    });

    describe("abort errors", () => {
        it("transforms ERR_CANCELED to HttpAbortError", () => {
            const axiosError = new AxiosError(
                "Request aborted",
                "ERR_CANCELED",
                undefined,
                {},
                undefined
            );
            axiosError.code = "ERR_CANCELED";

            const result = transformAxiosError(axiosError, mockConfig);

            expect(result).toBeInstanceOf(HttpAbortError);
            expect(result.name).toBe("HttpAbortError");
            expect(result.message).toContain("aborted");
            expect(result.request).toEqual(mockConfig);
        });
    });

    describe("4xx response errors", () => {
        it("transforms 400 Bad Request to HttpBadRequestError", () => {
            const axiosError = new AxiosError(
                "Bad Request",
                "ERR_BAD_REQUEST",
                undefined,
                {},
                {
                    status: 400,
                    statusText: "Bad Request",
                    data: { error: "Invalid input" },
                    headers: { "content-type": "application/json" },
                    config: {} as any,
                }
            );

            const result = transformAxiosError(axiosError, mockConfig);

            expect(result).toBeInstanceOf(HttpBadRequestError);
            expect(result.status).toBe(400);
            expect(result.statusText).toBe("Bad Request");
            expect(result.data).toEqual({ error: "Invalid input" });
            expect(result.headers).toEqual({
                "content-type": "application/json",
            });
        });

        it("transforms 401 Unauthorized to HttpUnauthorizedError", () => {
            const axiosError = new AxiosError(
                "Unauthorized",
                "ERR_BAD_REQUEST",
                undefined,
                {},
                {
                    status: 401,
                    statusText: "Unauthorized",
                    data: { error: "Not authenticated" },
                    headers: {},
                    config: {} as any,
                }
            );

            const result = transformAxiosError(axiosError, mockConfig);

            expect(result).toBeInstanceOf(HttpUnauthorizedError);
            expect(result.status).toBe(401);
        });

        it("transforms 403 Forbidden to HttpForbiddenError", () => {
            const axiosError = new AxiosError(
                "Forbidden",
                "ERR_BAD_REQUEST",
                undefined,
                {},
                {
                    status: 403,
                    statusText: "Forbidden",
                    data: { error: "No permission" },
                    headers: {},
                    config: {} as any,
                }
            );

            const result = transformAxiosError(axiosError, mockConfig);

            expect(result).toBeInstanceOf(HttpForbiddenError);
            expect(result.status).toBe(403);
        });

        it("transforms 404 Not Found to HttpNotFoundError", () => {
            const axiosError = new AxiosError(
                "Not Found",
                "ERR_BAD_REQUEST",
                undefined,
                {},
                {
                    status: 404,
                    statusText: "Not Found",
                    data: { error: "Resource not found" },
                    headers: {},
                    config: {} as any,
                }
            );

            const result = transformAxiosError(axiosError, mockConfig);

            expect(result).toBeInstanceOf(HttpNotFoundError);
            expect(result.status).toBe(404);
        });

        it("transforms 409 Conflict to HttpConflictError", () => {
            const axiosError = new AxiosError(
                "Conflict",
                "ERR_BAD_REQUEST",
                undefined,
                {},
                {
                    status: 409,
                    statusText: "Conflict",
                    data: { error: "Resource already exists" },
                    headers: {},
                    config: {} as any,
                }
            );

            const result = transformAxiosError(axiosError, mockConfig);

            expect(result).toBeInstanceOf(HttpConflictError);
            expect(result.status).toBe(409);
        });

        it("transforms 422 Unprocessable Entity to HttpUnprocessableEntityError", () => {
            const axiosError = new AxiosError(
                "Unprocessable Entity",
                "ERR_BAD_REQUEST",
                undefined,
                {},
                {
                    status: 422,
                    statusText: "Unprocessable Entity",
                    data: { errors: ["Age must be positive"] },
                    headers: {},
                    config: {} as any,
                }
            );

            const result = transformAxiosError(axiosError, mockConfig);

            expect(result).toBeInstanceOf(HttpUnprocessableEntityError);
            expect(result.status).toBe(422);
        });

        it("transforms 429 Too Many Requests to HttpTooManyRequestsError", () => {
            const axiosError = new AxiosError(
                "Too Many Requests",
                "ERR_BAD_REQUEST",
                undefined,
                {},
                {
                    status: 429,
                    statusText: "Too Many Requests",
                    data: { error: "Rate limit exceeded" },
                    headers: { "retry-after": "60" },
                    config: {} as any,
                }
            );

            const result = transformAxiosError(axiosError, mockConfig);

            expect(result).toBeInstanceOf(HttpTooManyRequestsError);
            expect(result.status).toBe(429);
            expect(result.headers["retry-after"]).toBe("60");
        });

        it("transforms other 4xx to generic HttpResponseError", () => {
            const axiosError = new AxiosError(
                "Request Error",
                "ERR_BAD_REQUEST",
                undefined,
                {},
                {
                    status: 418,
                    statusText: "I'm a teapot",
                    data: {},
                    headers: {},
                    config: {} as any,
                }
            );

            const result = transformAxiosError(axiosError, mockConfig);

            expect(result).toBeInstanceOf(HttpResponseError);
            expect(result).not.toBeInstanceOf(HttpBadRequestError);
            expect(result.status).toBe(418);
        });
    });

    describe("5xx response errors", () => {
        it("transforms 500 Internal Server Error to HttpInternalServerError", () => {
            const axiosError = new AxiosError(
                "Internal Server Error",
                "ERR_BAD_RESPONSE",
                undefined,
                {},
                {
                    status: 500,
                    statusText: "Internal Server Error",
                    data: { error: "Something went wrong" },
                    headers: {},
                    config: {} as any,
                }
            );

            const result = transformAxiosError(axiosError, mockConfig);

            expect(result).toBeInstanceOf(HttpInternalServerError);
            expect(result.status).toBe(500);
        });

        it("transforms 503 Service Unavailable to HttpServiceUnavailableError", () => {
            const axiosError = new AxiosError(
                "Service Unavailable",
                "ERR_BAD_RESPONSE",
                undefined,
                {},
                {
                    status: 503,
                    statusText: "Service Unavailable",
                    data: { error: "Maintenance mode" },
                    headers: { "retry-after": "300" },
                    config: {} as any,
                }
            );

            const result = transformAxiosError(axiosError, mockConfig);

            expect(result).toBeInstanceOf(HttpServiceUnavailableError);
            expect(result.status).toBe(503);
            expect(result.headers["retry-after"]).toBe("300");
        });

        it("transforms other 5xx to generic HttpResponseError", () => {
            const axiosError = new AxiosError(
                "Server Error",
                "ERR_BAD_RESPONSE",
                undefined,
                {},
                {
                    status: 502,
                    statusText: "Bad Gateway",
                    data: {},
                    headers: {},
                    config: {} as any,
                }
            );

            const result = transformAxiosError(axiosError, mockConfig);

            expect(result).toBeInstanceOf(HttpResponseError);
            expect(result).not.toBeInstanceOf(HttpInternalServerError);
            expect(result.status).toBe(502);
        });
    });

    describe("edge cases", () => {
        it("handles error without response", () => {
            const axiosError = new AxiosError(
                "Unknown error",
                undefined,
                undefined,
                {},
                undefined
            );

            const result = transformAxiosError(axiosError, mockConfig);

            expect(result).toBeInstanceOf(HttpNetworkError);
            expect(result.code).toBe("UNKNOWN");
        });

        it("preserves original request config", () => {
            const axiosError = new AxiosError(
                "Error",
                "ERR_NETWORK",
                undefined,
                {},
                undefined
            );

            const result = transformAxiosError(axiosError, mockConfig);

            expect(result.request).toEqual(mockConfig);
            expect(result.request.baseUrl).toBe("https://api.example.com");
        });

        it("includes timestamp", () => {
            const before = new Date().toISOString();
            const axiosError = new AxiosError(
                "Error",
                "ERR_NETWORK",
                undefined,
                {},
                undefined
            );

            const result = transformAxiosError(axiosError, mockConfig);

            const after = new Date().toISOString();
            expect(result.timestamp).toBeDefined();
            expect(result.timestamp >= before).toBe(true);
            expect(result.timestamp <= after).toBe(true);
        });
    });
});
