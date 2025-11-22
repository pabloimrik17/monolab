import { describe, expect, it } from "vitest";
import {
    HttpAbortError,
    HttpBadRequestError,
    HttpConflictError,
    HttpError,
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
} from "../index.js";

/**
 * Unit tests for HTTP error classes.
 * @vitest-environment node
 */

describe("HttpError", () => {
    it("should create error with correct properties", () => {
        const request = { baseUrl: "https://api.example.com", timeout: 5000 };
        const error = new HttpError("Test error", request);

        expect(error.name).toBe("HttpError");
        expect(error.message).toBe("Test error");
        expect(error.request).toEqual(request);
        expect(error.timestamp).toMatch(
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
        );
    });

    it("should be instanceof HttpError and Error", () => {
        const error = new HttpError("Test", {});

        expect(error).toBeInstanceOf(HttpError);
        expect(error).toBeInstanceOf(Error);
    });

    it("should have stack trace", () => {
        const error = new HttpError("Test", {});
        expect(error.stack).toBeDefined();
        expect(error.stack).toContain("HttpError");
    });
});

describe("HttpNetworkError", () => {
    it("should create error with code property", () => {
        const request = { baseUrl: "https://api.example.com" };
        const error = new HttpNetworkError(
            "Connection refused",
            "ECONNREFUSED",
            request
        );

        expect(error.name).toBe("HttpNetworkError");
        expect(error.message).toBe("Connection refused");
        expect(error.code).toBe("ECONNREFUSED");
        expect(error.request).toEqual(request);
    });

    it("should be instanceof HttpNetworkError, HttpError, and Error", () => {
        const error = new HttpNetworkError("Test", "ETIMEDOUT", {});

        expect(error).toBeInstanceOf(HttpNetworkError);
        expect(error).toBeInstanceOf(HttpError);
        expect(error).toBeInstanceOf(Error);
    });
});

describe("HttpResponseError", () => {
    it("should create error with response properties", () => {
        const request = { baseUrl: "https://api.example.com" };
        const headers = { "content-type": "application/json" };
        const data = { error: "Bad Request", details: [] };
        const error = new HttpResponseError(
            "Bad request",
            400,
            "Bad Request",
            data,
            headers,
            request
        );

        expect(error.name).toBe("HttpResponseError");
        expect(error.message).toBe("Bad request");
        expect(error.status).toBe(400);
        expect(error.statusText).toBe("Bad Request");
        expect(error.data).toEqual(data);
        expect(error.headers).toEqual(headers);
        expect(error.request).toEqual(request);
    });

    it("should be instanceof HttpResponseError, HttpError, and Error", () => {
        const error = new HttpResponseError(
            "Test",
            500,
            "Internal Server Error",
            {},
            {},
            {}
        );

        expect(error).toBeInstanceOf(HttpResponseError);
        expect(error).toBeInstanceOf(HttpError);
        expect(error).toBeInstanceOf(Error);
    });

    it("should handle generic type for data", () => {
        interface ErrorResponse {
            code: string;
            message: string;
        }

        const data: ErrorResponse = { code: "ERR_001", message: "Failed" };
        const error = new HttpResponseError<ErrorResponse>(
            "Failed",
            400,
            "Bad Request",
            data,
            {},
            {}
        );

        expect(error.data.code).toBe("ERR_001");
        expect(error.data.message).toBe("Failed");
    });
});

describe("Specific HTTP error classes", () => {
    it("HttpBadRequestError should have status 400", () => {
        const error = new HttpBadRequestError(
            "Bad request",
            400,
            "Bad Request",
            {},
            {},
            {}
        );

        expect(error.name).toBe("HttpBadRequestError");
        expect(error.status).toBe(400);
        expect(error).toBeInstanceOf(HttpBadRequestError);
        expect(error).toBeInstanceOf(HttpResponseError);
        expect(error).toBeInstanceOf(HttpError);
        expect(error).toBeInstanceOf(Error);
    });

    it("HttpUnauthorizedError should have status 401", () => {
        const error = new HttpUnauthorizedError(
            "Unauthorized",
            401,
            "Unauthorized",
            {},
            {},
            {}
        );

        expect(error.name).toBe("HttpUnauthorizedError");
        expect(error.status).toBe(401);
        expect(error).toBeInstanceOf(HttpUnauthorizedError);
        expect(error).toBeInstanceOf(HttpResponseError);
    });

    it("HttpForbiddenError should have status 403", () => {
        const error = new HttpForbiddenError(
            "Forbidden",
            403,
            "Forbidden",
            {},
            {},
            {}
        );

        expect(error.name).toBe("HttpForbiddenError");
        expect(error.status).toBe(403);
        expect(error).toBeInstanceOf(HttpForbiddenError);
        expect(error).toBeInstanceOf(HttpResponseError);
    });

    it("HttpNotFoundError should have status 404", () => {
        const error = new HttpNotFoundError(
            "Not found",
            404,
            "Not Found",
            {},
            {},
            {}
        );

        expect(error.name).toBe("HttpNotFoundError");
        expect(error.status).toBe(404);
        expect(error).toBeInstanceOf(HttpNotFoundError);
        expect(error).toBeInstanceOf(HttpResponseError);
    });

    it("HttpConflictError should have status 409", () => {
        const error = new HttpConflictError(
            "Conflict",
            409,
            "Conflict",
            {},
            {},
            {}
        );

        expect(error.name).toBe("HttpConflictError");
        expect(error.status).toBe(409);
        expect(error).toBeInstanceOf(HttpConflictError);
        expect(error).toBeInstanceOf(HttpResponseError);
    });

    it("HttpUnprocessableEntityError should have status 422", () => {
        const error = new HttpUnprocessableEntityError(
            "Unprocessable",
            422,
            "Unprocessable Entity",
            {},
            {},
            {}
        );

        expect(error.name).toBe("HttpUnprocessableEntityError");
        expect(error.status).toBe(422);
        expect(error).toBeInstanceOf(HttpUnprocessableEntityError);
        expect(error).toBeInstanceOf(HttpResponseError);
    });

    it("HttpTooManyRequestsError should have status 429", () => {
        const error = new HttpTooManyRequestsError(
            "Too many requests",
            429,
            "Too Many Requests",
            {},
            { "retry-after": "60" },
            {}
        );

        expect(error.name).toBe("HttpTooManyRequestsError");
        expect(error.status).toBe(429);
        expect(error.headers["retry-after"]).toBe("60");
        expect(error).toBeInstanceOf(HttpTooManyRequestsError);
        expect(error).toBeInstanceOf(HttpResponseError);
    });

    it("HttpInternalServerError should have status 500", () => {
        const error = new HttpInternalServerError(
            "Internal error",
            500,
            "Internal Server Error",
            {},
            {},
            {}
        );

        expect(error.name).toBe("HttpInternalServerError");
        expect(error.status).toBe(500);
        expect(error).toBeInstanceOf(HttpInternalServerError);
        expect(error).toBeInstanceOf(HttpResponseError);
    });

    it("HttpServiceUnavailableError should have status 503", () => {
        const error = new HttpServiceUnavailableError(
            "Service unavailable",
            503,
            "Service Unavailable",
            {},
            { "retry-after": "120" },
            {}
        );

        expect(error.name).toBe("HttpServiceUnavailableError");
        expect(error.status).toBe(503);
        expect(error.headers["retry-after"]).toBe("120");
        expect(error).toBeInstanceOf(HttpServiceUnavailableError);
        expect(error).toBeInstanceOf(HttpResponseError);
    });
});

describe("HttpTimeoutError", () => {
    it("should create error with timeout properties", () => {
        const request = { baseUrl: "https://api.example.com", timeout: 1000 };
        const error = new HttpTimeoutError("Request timeout", request);

        expect(error.name).toBe("HttpTimeoutError");
        expect(error.message).toBe("Request timeout");
        expect(error.request).toEqual(request);
    });

    it("should be instanceof HttpTimeoutError, HttpError, and Error", () => {
        const error = new HttpTimeoutError("Timeout", {});

        expect(error).toBeInstanceOf(HttpTimeoutError);
        expect(error).toBeInstanceOf(HttpError);
        expect(error).toBeInstanceOf(Error);
    });
});

describe("HttpAbortError", () => {
    it("should create error without reason", () => {
        const request = { baseUrl: "https://api.example.com" };
        const error = new HttpAbortError("Request aborted", request);

        expect(error.name).toBe("HttpAbortError");
        expect(error.message).toBe("Request aborted");
        expect(error.request).toEqual(request);
        expect(error.reason).toBeUndefined();
    });

    it("should create error with reason", () => {
        const request = { baseUrl: "https://api.example.com" };
        const error = new HttpAbortError(
            "Request aborted",
            request,
            "User cancelled"
        );

        expect(error.name).toBe("HttpAbortError");
        expect(error.message).toBe("Request aborted");
        expect(error.reason).toBe("User cancelled");
    });

    it("should be instanceof HttpAbortError, HttpError, and Error", () => {
        const error = new HttpAbortError("Aborted", {});

        expect(error).toBeInstanceOf(HttpAbortError);
        expect(error).toBeInstanceOf(HttpError);
        expect(error).toBeInstanceOf(Error);
    });
});

describe("Error prototype chain integrity", () => {
    it("should maintain prototype chain for nested inheritance", () => {
        // Create errors at different inheritance levels
        const baseError = new HttpError("Base", {});
        const networkError = new HttpNetworkError("Network", "ENETWORK", {});
        const responseError = new HttpResponseError(
            "Response",
            400,
            "Bad Request",
            {},
            {},
            {}
        );
        const notFoundError = new HttpNotFoundError(
            "Not found",
            404,
            "Not Found",
            {},
            {},
            {}
        );

        // Base error checks
        expect(baseError).toBeInstanceOf(HttpError);
        expect(baseError).toBeInstanceOf(Error);
        expect(baseError).not.toBeInstanceOf(HttpNetworkError);
        expect(baseError).not.toBeInstanceOf(HttpResponseError);

        // Network error checks
        expect(networkError).toBeInstanceOf(HttpNetworkError);
        expect(networkError).toBeInstanceOf(HttpError);
        expect(networkError).toBeInstanceOf(Error);
        expect(networkError).not.toBeInstanceOf(HttpResponseError);

        // Response error checks
        expect(responseError).toBeInstanceOf(HttpResponseError);
        expect(responseError).toBeInstanceOf(HttpError);
        expect(responseError).toBeInstanceOf(Error);
        expect(responseError).not.toBeInstanceOf(HttpNetworkError);
        expect(responseError).not.toBeInstanceOf(HttpNotFoundError);

        // Specific error checks (two levels of inheritance)
        expect(notFoundError).toBeInstanceOf(HttpNotFoundError);
        expect(notFoundError).toBeInstanceOf(HttpResponseError);
        expect(notFoundError).toBeInstanceOf(HttpError);
        expect(notFoundError).toBeInstanceOf(Error);
        expect(notFoundError).not.toBeInstanceOf(HttpNetworkError);
        expect(notFoundError).not.toBeInstanceOf(HttpBadRequestError);
    });

    it("should have correct constructor names", () => {
        const errors = [
            new HttpError("Test", {}),
            new HttpNetworkError("Test", "CODE", {}),
            new HttpResponseError("Test", 500, "Error", {}, {}, {}),
            new HttpBadRequestError("Test", 400, "Bad Request", {}, {}, {}),
            new HttpTimeoutError("Test", {}),
            new HttpAbortError("Test", {}),
        ];

        expect(errors[0]!.constructor.name).toBe("HttpError");
        expect(errors[1]!.constructor.name).toBe("HttpNetworkError");
        expect(errors[2]!.constructor.name).toBe("HttpResponseError");
        expect(errors[3]!.constructor.name).toBe("HttpBadRequestError");
        expect(errors[4]!.constructor.name).toBe("HttpTimeoutError");
        expect(errors[5]!.constructor.name).toBe("HttpAbortError");
    });
});
