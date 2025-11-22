/**
 * @m0n0lab/http-client
 *
 * Type-safe HTTP client contracts for web and Node.js environments.
 *
 * This package provides TypeScript interfaces and types that define the contract
 * for HTTP client implementations. It supports pluggable adapters (axios, ky)
 * and enables error-handling wrappers (neverthrow, effect-ts) to work uniformly.
 *
 * @packageDocumentation
 */

// Core types
export type {
    HttpCredentialsMode,
    HttpErrorStatusCode,
    HttpHeaders,
    HttpMethod,
    HttpResponseType,
    HttpStatusCode,
} from "./contracts/types.js";

// Request types
export type {
    HttpRequestBody,
    HttpRequestConfig,
} from "./contracts/request.js";

// Response types
export type { HttpResponse } from "./contracts/response.js";

// Error classes
export {
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
} from "./contracts/errors.js";

// Interceptor types
export type {
    InterceptorHandle,
    RequestOnFulfilled,
    RequestOnRejected,
    ResponseOnFulfilled,
    ResponseOnRejected,
} from "./contracts/interceptors.js";

// Retry configuration
export type {
    HttpRetryCondition,
    HttpRetryConfig,
    HttpRetryDelay,
    HttpRetryFailedHook,
    HttpRetryHook,
} from "./contracts/retry.js";

export {
    exponentialBackoff,
    jitterBackoff,
    linearBackoff,
} from "./contracts/retry.js";

// Deduplication types
export type {
    DeduplicationKey,
    HttpDeduplicationConfig,
    HttpDeduplicationKeyGenerator,
} from "./contracts/deduplication.js";

// Cache types
export type {
    CacheEntry,
    HttpCache,
    HttpCacheConfig,
    HttpCacheInvalidationPattern,
    HttpCacheKeyGenerator,
} from "./contracts/cache.js";

// Client interface
export type { HttpClient } from "./contracts/client.js";

// Factory types
export type {
    HttpClientFactory,
    HttpClientOptions,
    HttpInterceptors,
} from "./contracts/factory.js";
