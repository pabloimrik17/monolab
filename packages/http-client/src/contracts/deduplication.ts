import type { HttpRequestConfig } from "./request.js";

/**
 * HTTP request deduplication types and configuration.
 * @module
 */

/**
 * Deduplication key type.
 * A unique string identifier for grouping identical concurrent requests.
 *
 * @public
 */
export type DeduplicationKey = string;

/**
 * Key generator function for request deduplication.
 * Creates a unique key based on request configuration to identify identical requests.
 *
 * @param config - The HTTP request configuration
 * @returns A unique string key
 * @public
 * @example
 * ```ts
 * const keyGenerator: HttpDeduplicationKeyGenerator = (config) => {
 *   const baseUrl = config.baseUrl || '';
 *   const query = JSON.stringify(config.query || {});
 *   return `${baseUrl}?${query}`;
 * };
 * ```
 */
export type HttpDeduplicationKeyGenerator = (
    config: Readonly<HttpRequestConfig>
) => DeduplicationKey;

/**
 * Request deduplication configuration.
 * Prevents redundant concurrent requests to the same endpoint.
 *
 * @public
 * @example
 * ```ts
 * const deduplicationConfig: HttpDeduplicationConfig = {
 *   enabled: true,
 *   ttl: 5000, // Keep deduplication entry for 5 seconds
 *   criticalHeaders: ['Authorization', 'Content-Type', 'X-API-Key'],
 *   keyGenerator: (config) => {
 *     // Custom key generation logic
 *     const baseUrl = config.baseUrl || '';
 *     const query = JSON.stringify(config.query || {});
 *     const authHeader = config.headers?.['Authorization'];
 *     return `${baseUrl}:${query}:${authHeader}`;
 *   }
 * };
 * ```
 */
export interface HttpDeduplicationConfig {
    /**
     * Whether deduplication is enabled.
     *
     * @defaultValue false
     * @example
     * ```ts
     * enabled: true // Enable deduplication
     * ```
     */
    readonly enabled: boolean;

    /**
     * Custom key generator function.
     * If not provided, default key generation uses:
     * - HTTP method
     * - Full URL (including query parameters)
     * - Request body (deep equality)
     * - Critical headers
     *
     * @example
     * ```ts
     * keyGenerator: (config) => {
     *   // Simple key based on baseUrl and query params
     *   return `${config.baseUrl || ''}:${JSON.stringify(config.query || {})}`;
     * }
     * ```
     */
    readonly keyGenerator?: HttpDeduplicationKeyGenerator;

    /**
     * Time-to-live for deduplication cache entries in milliseconds.
     * After this time, a new request with the same key will not be deduplicated.
     *
     * @defaultValue 0 (immediate expiration after promise resolves)
     * @example
     * ```ts
     * ttl: 5000 // Keep deduplication entry for 5 seconds
     * ```
     */
    readonly ttl?: number;

    /**
     * Headers that must match for requests to be considered identical.
     * Only these headers are included in the deduplication key.
     *
     * @defaultValue ['Authorization', 'Content-Type']
     * @example
     * ```ts
     * criticalHeaders: ['Authorization', 'Content-Type', 'X-API-Key', 'Accept']
     * ```
     */
    readonly criticalHeaders?: string[];
}
