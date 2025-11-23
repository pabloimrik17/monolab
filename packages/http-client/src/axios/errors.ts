import type { AxiosError } from "axios";
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
} from "../contracts/errors.js";
import type { HttpRequestConfig } from "../contracts/request.js";
import type { HttpHeaders } from "../contracts/types.js";

/**
 * Normalize axios headers to HttpHeaders format.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeHeaders(headers: any): HttpHeaders {
    if (!headers) return {};

    // If it's already a plain object, return it
    if (typeof headers === "object" && !headers.toJSON) {
        return headers as HttpHeaders;
    }

    // If it has a toJSON method (AxiosHeaders), convert it
    if (headers.toJSON) {
        return headers.toJSON() as HttpHeaders;
    }

    return {};
}

/**
 * Transform an AxiosError into contract-compliant HTTP error classes.
 *
 * @param error - The AxiosError to transform
 * @param config - The original request configuration
 * @returns Transformed HttpError subclass
 */
export function transformAxiosError(
    error: AxiosError,
    config: HttpRequestConfig
): HttpError {
    // Timeout errors
    if (
        error.code === "ECONNABORTED" &&
        error.message.toLowerCase().includes("timeout")
    ) {
        return new HttpTimeoutError(error.message, config);
    }

    // Abort/cancel errors
    if (error.code === "ERR_CANCELED") {
        return new HttpAbortError("Request aborted", config);
    }

    // Response errors (4xx, 5xx)
    if (error.response) {
        const { status, statusText, data, headers } = error.response;
        const normalizedHeaders = normalizeHeaders(headers);

        switch (status) {
            case 400:
                return new HttpBadRequestError(
                    error.message,
                    statusText,
                    data,
                    normalizedHeaders,
                    config
                );
            case 401:
                return new HttpUnauthorizedError(
                    error.message,
                    statusText,
                    data,
                    normalizedHeaders,
                    config
                );
            case 403:
                return new HttpForbiddenError(
                    error.message,
                    statusText,
                    data,
                    normalizedHeaders,
                    config
                );
            case 404:
                return new HttpNotFoundError(
                    error.message,
                    statusText,
                    data,
                    normalizedHeaders,
                    config
                );
            case 409:
                return new HttpConflictError(
                    error.message,
                    statusText,
                    data,
                    normalizedHeaders,
                    config
                );
            case 422:
                return new HttpUnprocessableEntityError(
                    error.message,
                    statusText,
                    data,
                    normalizedHeaders,
                    config
                );
            case 429:
                return new HttpTooManyRequestsError(
                    error.message,
                    statusText,
                    data,
                    normalizedHeaders,
                    config
                );
            case 500:
                return new HttpInternalServerError(
                    error.message,
                    statusText,
                    data,
                    normalizedHeaders,
                    config
                );
            case 503:
                return new HttpServiceUnavailableError(
                    error.message,
                    statusText,
                    data,
                    normalizedHeaders,
                    config
                );
            default:
                return new HttpResponseError(
                    error.message,
                    status as any, // eslint-disable-line @typescript-eslint/no-explicit-any
                    statusText,
                    data,
                    normalizedHeaders,
                    config
                );
        }
    }

    // Network errors (no response received)
    return new HttpNetworkError(
        error.message,
        error.code || "UNKNOWN",
        config
    );
}
