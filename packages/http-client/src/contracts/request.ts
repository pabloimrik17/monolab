import type { HttpCacheConfig } from "./cache.js";
import type { HttpDeduplicationConfig } from "./deduplication.js";
import type { HttpRetryConfig } from "./retry.js";
import type {
    HttpCredentialsMode,
    HttpHeaders,
    HttpResponseType,
} from "./types.js";

/**
 * HTTP request configuration interfaces and types.
 * @module
 */

/**
 * HTTP request body type.
 * Supports various content types including JSON, form data, and binary data.
 *
 * @public
 * @example
 * ```ts
 * // JSON body
 * const jsonBody: HttpRequestBody = { name: 'Alice', age: 30 };
 *
 * // Form data
 * const formData = new FormData();
 * formData.append('file', fileBlob);
 * const formBody: HttpRequestBody = formData;
 *
 * // Plain text
 * const textBody: HttpRequestBody = 'Hello, world!';
 *
 * // Binary data
 * const binaryBody: HttpRequestBody = new Uint8Array([1, 2, 3]);
 * ```
 */
export type HttpRequestBody =
    | Record<string, unknown>
    | FormData
    | Blob
    | ArrayBuffer
    | ArrayBufferView
    | ReadableStream
    | string
    | null
    | undefined;

/**
 * Configuration options for an HTTP request.
 * All properties are optional and can override client-level defaults.
 *
 * @public
 * @example
 * ```ts
 * const config: HttpRequestConfig = {
 *   baseUrl: 'https://api.example.com',
 *   timeout: 5000,
 *   headers: {
 *     'Authorization': 'Bearer token123',
 *     'Content-Type': 'application/json'
 *   },
 *   query: {
 *     page: 1,
 *     limit: 10,
 *     tags: ['javascript', 'typescript']
 *   },
 *   responseType: 'json',
 *   credentials: 'include',
 *   deduplicate: true,
 *   cache: {
 *     ttl: 60000, // 1 minute
 *     respectCacheHeaders: true
 *   },
 *   retry: {
 *     attempts: 3,
 *     delay: 1000
 *   }
 * };
 * ```
 */
export interface HttpRequestConfig {
    /**
     * Base URL to prepend to the request path.
     * If the request path is absolute, this will be ignored.
     *
     * @example
     * ```ts
     * // baseUrl: 'https://api.example.com'
     * // path: '/users'
     * // Result: 'https://api.example.com/users'
     * ```
     */
    readonly baseUrl?: string;

    /**
     * Request timeout in milliseconds.
     * The request will be aborted if this timeout is exceeded.
     *
     * @defaultValue No timeout (infinite)
     * @example
     * ```ts
     * timeout: 5000 // 5 seconds
     * ```
     */
    readonly timeout?: number;

    /**
     * HTTP headers to include with the request.
     * Request-level headers override client-level defaults.
     *
     * @example
     * ```ts
     * headers: {
     *   'Authorization': 'Bearer token123',
     *   'Content-Type': 'application/json',
     *   'X-Custom-Header': 'custom-value'
     * }
     * ```
     */
    readonly headers?: HttpHeaders;

    /**
     * URL query parameters as key-value pairs.
     * Parameters are serialized and appended to the URL.
     *
     * @example
     * ```ts
     * query: {
     *   page: 1,
     *   limit: 10,
     *   tags: ['javascript', 'typescript'], // Serialization strategy is implementation-specific
     *   search: 'hello world'
     * }
     * // Result: ?page=1&limit=10&tags=javascript&tags=typescript&search=hello%20world
     * ```
     */
    readonly query?: Record<string, unknown>;

    /**
     * Expected response type format.
     * Determines how the response body is parsed.
     *
     * @defaultValue 'json'
     * @example
     * ```ts
     * responseType: 'json' // Parse as JSON
     * responseType: 'blob' // Return as Blob
     * responseType: 'text' // Return as string
     * ```
     */
    readonly responseType?: HttpResponseType;

    /**
     * Credentials mode for cross-origin requests.
     * Controls whether cookies and authorization headers are sent.
     *
     * @defaultValue 'same-origin'
     * @example
     * ```ts
     * credentials: 'include' // Always send credentials
     * credentials: 'omit'    // Never send credentials
     * ```
     */
    readonly credentials?: HttpCredentialsMode;

    /**
     * Enable request deduplication to prevent redundant concurrent requests.
     * When enabled, identical concurrent requests share the same promise.
     *
     * @defaultValue false
     * @example
     * ```ts
     * deduplicate: true // Enable deduplication for this request
     * ```
     */
    readonly deduplicate?: boolean;

    /**
     * Cache configuration for this request.
     * Can be a boolean (enable/disable) or fine-grained cache options.
     *
     * @defaultValue false
     * @example
     * ```ts
     * cache: true // Use default cache settings
     * cache: false // Disable caching
     * cache: {
     *   ttl: 60000,
     *   respectCacheHeaders: true
     * }
     * ```
     */
    readonly cache?: boolean | HttpCacheConfig;

    /**
     * Retry configuration for this request.
     * Defines how many times to retry on failure and with what strategy.
     *
     * @defaultValue No retries
     * @example
     * ```ts
     * retry: {
     *   attempts: 3,
     *   delay: 1000,
     *   condition: (error) => error.status >= 500
     * }
     * ```
     */
    readonly retry?: HttpRetryConfig;

    /**
     * Deduplication configuration for this request.
     * Provides fine-grained control over request deduplication behavior.
     *
     * @example
     * ```ts
     * deduplication: {
     *   enabled: true,
     *   ttl: 5000,
     *   keyGenerator: (config) => `${config.baseUrl || ''}:${JSON.stringify(config.query || {})}`
     * }
     * ```
     */
    readonly deduplication?: HttpDeduplicationConfig;
}
