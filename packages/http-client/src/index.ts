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

export type {
    HttpCredentialsMode,
    HttpErrorStatusCode,
    HttpHeaders,
    HttpMethod,
    HttpResponseType,
    HttpStatusCode,
} from "./contracts/types.js";

export type { HttpRequestBody, HttpRequestConfig } from "./contracts/request.js";

export type { HttpResponse } from "./contracts/response.js";

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

export type {
    InterceptorHandle,
    RequestOnFulfilled,
    RequestOnRejected,
    ResponseOnFulfilled,
    ResponseOnRejected,
} from "./contracts/interceptors.js";

export type {
    HttpRetryCondition,
    HttpRetryConfig,
    HttpRetryDelay,
    HttpRetryFailedHook,
    HttpRetryHook,
} from "./contracts/retry.js";

export { exponentialBackoff, jitterBackoff, linearBackoff } from "./contracts/retry.js";

export type {
    DeduplicationKey,
    HttpDeduplicationConfig,
    HttpDeduplicationKeyGenerator,
} from "./contracts/deduplication.js";

export type {
    CacheEntry,
    HttpCache,
    HttpCacheConfig,
    HttpCacheInvalidationPattern,
    HttpCacheKeyGenerator,
} from "./contracts/cache.js";

export type { HttpClient } from "./contracts/client.js";

export type {
    HttpClientFactory,
    HttpClientOptions,
    HttpInterceptors,
} from "./contracts/factory.js";
