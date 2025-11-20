/**
 * HTTP error hierarchy and error classes.
 * These are contract definitions - constructor implementation and error throwing logic
 * will be added in implementation proposals (axios/ky adapters).
 * @module
 */

import type { HttpRequestConfig } from "./request.js";
import type { HttpHeaders } from "./types.js";

/**
 * Base class for all HTTP-related errors.
 * Provides common error properties for all HTTP failures.
 *
 * @public
 * @example
 * ```ts
 * try {
 *   await client.get('/users/1');
 * } catch (error) {
 *   if (error instanceof HttpError) {
 *     console.log(error.name);      // Error class name
 *     console.log(error.message);   // Human-readable description
 *     console.log(error.request);   // Original request config (sanitized)
 *     console.log(error.timestamp); // When error occurred
 *   }
 * }
 * ```
 */
export class HttpError extends Error {
    /**
     * The name of the error class.
     * @example 'HttpError', 'HttpNetworkError', 'HttpNotFoundError', etc.
     */
    override readonly name: string;

    /**
     * Human-readable error description.
     */
    override readonly message: string;

    /**
     * The original request configuration (sanitized of sensitive data like tokens).
     * Useful for debugging and error logging.
     */
    readonly request: Readonly<HttpRequestConfig>;

    /**
     * ISO 8601 timestamp of when the error occurred.
     * @example '2024-01-15T10:30:00.000Z'
     */
    readonly timestamp: string;

    /**
     * Creates a new HttpError instance.
     * Note: Constructor signature only - implementation added in adapter proposals.
     *
     * @param message - Human-readable error description
     * @param request - The original request configuration
     */
    constructor(message: string, request: Readonly<HttpRequestConfig>) {
        super(message);
        this.name = "HttpError";
        this.message = message;
        this.request = request;
        this.timestamp = new Date().toISOString();
    }
}

/**
 * Network-level errors that occur before receiving a response.
 * Examples: connection refused, DNS failure, timeout, network unavailable.
 *
 * @public
 * @example
 * ```ts
 * try {
 *   await client.get('/users');
 * } catch (error) {
 *   if (error instanceof HttpNetworkError) {
 *     console.log(error.code); // 'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', etc.
 *     // Handle network failure
 *   }
 * }
 * ```
 */
export class HttpNetworkError extends HttpError {
    override readonly name = "HttpNetworkError";

    /**
     * Error code indicating the type of network failure.
     * Common codes:
     * - 'ECONNREFUSED': Connection refused by server
     * - 'ETIMEDOUT': Connection timeout
     * - 'ENOTFOUND': DNS lookup failed
     * - 'ECONNRESET': Connection reset by peer
     * - 'ENETUNREACH': Network unreachable
     */
    readonly code: string;

    /**
     * Creates a new HttpNetworkError instance.
     * Note: Constructor signature only - implementation added in adapter proposals.
     *
     * @param message - Human-readable error description
     * @param code - Network error code
     * @param request - The original request configuration
     */
    constructor(
        message: string,
        code: string,
        request: Readonly<HttpRequestConfig>
    ) {
        super(message, request);
        this.name = "HttpNetworkError";
        this.code = code;
    }
}

/**
 * HTTP error responses with status codes (4xx or 5xx).
 * Includes the full response data, status, and headers.
 *
 * @typeParam T - The type of the error response data
 * @public
 * @example
 * ```ts
 * interface ErrorResponse {
 *   error: string;
 *   details: string[];
 * }
 *
 * try {
 *   await client.post<User, CreateUserDto>('/users', userData);
 * } catch (error) {
 *   if (error instanceof HttpResponseError) {
 *     console.log(error.status);     // 400, 404, 500, etc.
 *     console.log(error.statusText); // 'Bad Request', 'Not Found', etc.
 *     console.log(error.data);       // Parsed error response body
 *     console.log(error.headers);    // Response headers
 *   }
 * }
 * ```
 */
export class HttpResponseError<T = unknown> extends HttpError {
    override readonly name: string = "HttpResponseError";

    /**
     * HTTP status code (400-599).
     */
    readonly status: number;

    /**
     * HTTP status text message.
     */
    readonly statusText: string;

    /**
     * Parsed error response body.
     * Type is determined by the generic parameter.
     */
    readonly data: T;

    /**
     * Response headers.
     */
    readonly headers: HttpHeaders;

    /**
     * Creates a new HttpResponseError instance.
     * Note: Constructor signature only - implementation added in adapter proposals.
     *
     * @param message - Human-readable error description
     * @param status - HTTP status code
     * @param statusText - HTTP status text
     * @param data - Parsed error response body
     * @param headers - Response headers
     * @param request - The original request configuration
     */
    constructor(
        message: string,
        status: number,
        statusText: string,
        data: T,
        headers: HttpHeaders,
        request: Readonly<HttpRequestConfig>
    ) {
        super(message, request);
        this.name = "HttpResponseError";
        this.status = status;
        this.statusText = statusText;
        this.data = data;
        this.headers = headers;
    }
}

/**
 * 400 Bad Request - The request was malformed or invalid.
 *
 * @public
 * @example
 * ```ts
 * try {
 *   await client.post('/users', invalidData);
 * } catch (error) {
 *   if (error instanceof HttpBadRequestError) {
 *     // Handle validation errors
 *   }
 * }
 * ```
 */
export class HttpBadRequestError<T = unknown> extends HttpResponseError<T> {
    override readonly name = "HttpBadRequestError" as const;
    override readonly status = 400 as const;
}

/**
 * 401 Unauthorized - Authentication is required and has failed or not been provided.
 *
 * @public
 * @example
 * ```ts
 * try {
 *   await client.get('/protected-resource');
 * } catch (error) {
 *   if (error instanceof HttpUnauthorizedError) {
 *     // Redirect to login or refresh token
 *   }
 * }
 * ```
 */
export class HttpUnauthorizedError<T = unknown> extends HttpResponseError<T> {
    override readonly name = "HttpUnauthorizedError" as const;
    override readonly status = 401 as const;
}

/**
 * 403 Forbidden - The request was valid but the server refuses to respond.
 *
 * @public
 * @example
 * ```ts
 * try {
 *   await client.delete('/admin/users/1');
 * } catch (error) {
 *   if (error instanceof HttpForbiddenError) {
 *     // User lacks permission
 *   }
 * }
 * ```
 */
export class HttpForbiddenError<T = unknown> extends HttpResponseError<T> {
    override readonly name = "HttpForbiddenError" as const;
    override readonly status = 403 as const;
}

/**
 * 404 Not Found - The requested resource does not exist.
 *
 * @public
 * @example
 * ```ts
 * try {
 *   await client.get('/users/999');
 * } catch (error) {
 *   if (error instanceof HttpNotFoundError) {
 *     // Resource not found
 *   }
 * }
 * ```
 */
export class HttpNotFoundError<T = unknown> extends HttpResponseError<T> {
    override readonly name = "HttpNotFoundError" as const;
    override readonly status = 404 as const;
}

/**
 * 409 Conflict - The request conflicts with the current state of the server.
 *
 * @public
 * @example
 * ```ts
 * try {
 *   await client.post('/users', { email: 'existing@example.com' });
 * } catch (error) {
 *   if (error instanceof HttpConflictError) {
 *     // Handle duplicate resource
 *   }
 * }
 * ```
 */
export class HttpConflictError<T = unknown> extends HttpResponseError<T> {
    override readonly name = "HttpConflictError" as const;
    override readonly status = 409 as const;
}

/**
 * 422 Unprocessable Entity - The request was well-formed but contains semantic errors.
 *
 * @public
 * @example
 * ```ts
 * try {
 *   await client.post('/users', { age: -5 }); // Valid syntax, invalid semantics
 * } catch (error) {
 *   if (error instanceof HttpUnprocessableEntityError) {
 *     // Handle validation errors
 *   }
 * }
 * ```
 */
export class HttpUnprocessableEntityError<
    T = unknown
> extends HttpResponseError<T> {
    override readonly name = "HttpUnprocessableEntityError" as const;
    override readonly status = 422 as const;
}

/**
 * 429 Too Many Requests - Rate limit exceeded.
 *
 * @public
 * @example
 * ```ts
 * try {
 *   await client.get('/api/data');
 * } catch (error) {
 *   if (error instanceof HttpTooManyRequestsError) {
 *     const retryAfter = error.headers['retry-after'];
 *     // Wait before retrying
 *   }
 * }
 * ```
 */
export class HttpTooManyRequestsError<
    T = unknown
> extends HttpResponseError<T> {
    override readonly name = "HttpTooManyRequestsError" as const;
    override readonly status = 429 as const;
}

/**
 * 500 Internal Server Error - Generic server error.
 *
 * @public
 * @example
 * ```ts
 * try {
 *   await client.post('/users', userData);
 * } catch (error) {
 *   if (error instanceof HttpInternalServerError) {
 *     // Server error - retry or notify user
 *   }
 * }
 * ```
 */
export class HttpInternalServerError<T = unknown> extends HttpResponseError<T> {
    override readonly name = "HttpInternalServerError" as const;
    override readonly status = 500 as const;
}

/**
 * 503 Service Unavailable - The server is temporarily unavailable.
 *
 * @public
 * @example
 * ```ts
 * try {
 *   await client.get('/health');
 * } catch (error) {
 *   if (error instanceof HttpServiceUnavailableError) {
 *     const retryAfter = error.headers['retry-after'];
 *     // Service is down - retry after delay
 *   }
 * }
 * ```
 */
export class HttpServiceUnavailableError<
    T = unknown
> extends HttpResponseError<T> {
    override readonly name = "HttpServiceUnavailableError" as const;
    override readonly status = 503 as const;
}

/**
 * Request timeout error - the request exceeded the configured timeout.
 *
 * @public
 * @example
 * ```ts
 * try {
 *   await client.get('/slow-endpoint', { timeout: 1000 });
 * } catch (error) {
 *   if (error instanceof HttpTimeoutError) {
 *     // Request timed out
 *   }
 * }
 * ```
 */
export class HttpTimeoutError extends HttpError {
    override readonly name = "HttpTimeoutError";

    /**
     * Creates a new HttpTimeoutError instance.
     * Note: Constructor signature only - implementation added in adapter proposals.
     *
     * @param message - Human-readable error description
     * @param request - The original request configuration
     */
    constructor(message: string, request: Readonly<HttpRequestConfig>) {
        super(message, request);
        this.name = "HttpTimeoutError";
    }
}

/**
 * Request abort/cancellation error - the request was manually cancelled.
 *
 * @public
 * @example
 * ```ts
 * const controller = new AbortController();
 *
 * setTimeout(() => controller.abort(), 100);
 *
 * try {
 *   await client.get('/data', { signal: controller.signal });
 * } catch (error) {
 *   if (error instanceof HttpAbortError) {
 *     console.log(error.reason); // Cancellation reason if provided
 *   }
 * }
 * ```
 */
export class HttpAbortError extends HttpError {
    override readonly name = "HttpAbortError";

    /**
     * Reason for cancellation if provided.
     */
    readonly reason?: string | undefined;

    /**
     * Creates a new HttpAbortError instance.
     * Note: Constructor signature only - implementation added in adapter proposals.
     *
     * @param message - Human-readable error description
     * @param request - The original request configuration
     * @param reason - Optional reason for cancellation
     */
    constructor(
        message: string,
        request: Readonly<HttpRequestConfig>,
        reason?: string
    ) {
        super(message, request);
        this.name = "HttpAbortError";
        this.reason = reason;
    }
}
