/**
 * HTTP cache abstraction and configuration.
 * @module
 */

import type { HttpRequestConfig } from "./request.js";
import type { HttpHeaders } from "./types.js";

/**
 * Cache entry metadata and data.
 * Stored in cache implementations to represent a cached response.
 *
 * @public
 * @example
 * ```ts
 * const cacheEntry: CacheEntry = {
 *   data: { id: 1, name: 'Alice' },
 *   headers: { 'content-type': 'application/json' },
 *   timestamp: Date.now(),
 *   ttl: 60000, // 1 minute
 *   etag: '"abc123"'
 * };
 * ```
 */
export interface CacheEntry {
    /**
     * The cached response data.
     */
    readonly data: unknown;

    /**
     * Response headers from the original request.
     * Used for validation (ETag, Last-Modified).
     */
    readonly headers: HttpHeaders;

    /**
     * Timestamp when the response was cached (milliseconds since epoch).
     */
    readonly timestamp: number;

    /**
     * Time-to-live in milliseconds.
     * Determines when the cache entry expires.
     */
    readonly ttl: number;

    /**
     * Optional ETag for cache revalidation.
     * If present, can be used to check if cached data is still fresh.
     */
    readonly etag?: string;
}

/**
 * Cache implementation interface.
 * Applications can provide custom cache backends by implementing this interface.
 *
 * @public
 * @example
 * ```ts
 * class MemoryCache implements HttpCache {
 *   private store = new Map<string, CacheEntry>();
 *
 *   async get(key: string): Promise<CacheEntry | null> {
 *     const entry = this.store.get(key);
 *     if (!entry) return null;
 *     if (Date.now() - entry.timestamp > entry.ttl) {
 *       this.store.delete(key);
 *       return null;
 *     }
 *     return entry;
 *   }
 *
 *   async set(key: string, value: CacheEntry, ttl?: number): Promise<void> {
 *     this.store.set(key, { ...value, ttl: ttl ?? value.ttl });
 *   }
 *
 *   async delete(key: string): Promise<void> {
 *     this.store.delete(key);
 *   }
 *
 *   async clear(): Promise<void> {
 *     this.store.clear();
 *   }
 * }
 * ```
 */
export interface HttpCache {
    /**
     * Retrieve a cache entry by key.
     *
     * @param key - The cache key
     * @returns The cached entry or null if not found or expired
     */
    get(key: string): Promise<CacheEntry | null>;

    /**
     * Store a cache entry with optional TTL override.
     *
     * @param key - The cache key
     * @param value - The cache entry to store
     * @param ttl - Optional TTL override in milliseconds
     */
    set(key: string, value: CacheEntry, ttl?: number): Promise<void>;

    /**
     * Delete a specific cache entry.
     *
     * @param key - The cache key to delete
     */
    delete(key: string): Promise<void>;

    /**
     * Clear all cache entries.
     */
    clear(): Promise<void>;
}

/**
 * Cache key generator function.
 * Creates a unique key based on request configuration for cache lookups.
 *
 * @param config - The HTTP request configuration
 * @returns A unique cache key string
 * @public
 * @example
 * ```ts
 * const keyGenerator: HttpCacheKeyGenerator = (config) => {
 *   const method = config.method || 'GET';
 *   const url = config.baseUrl ? `${config.baseUrl}${config.url}` : config.url;
 *   const query = JSON.stringify(config.query || {});
 *   return `${method}:${url}?${query}`;
 * };
 * ```
 */
export type HttpCacheKeyGenerator = (config: HttpRequestConfig) => string;

/**
 * Cache invalidation pattern matcher.
 * Returns cache keys or patterns to invalidate after a mutation.
 *
 * @param config - The HTTP request configuration that triggered invalidation
 * @returns Array of cache keys or patterns to invalidate
 * @public
 * @example
 * ```ts
 * const invalidatePatterns: HttpCacheInvalidationPattern = (config) => {
 *   // Invalidate all user-related cache entries after POST/PUT/DELETE
 *   if (config.url?.includes('/users')) {
 *     return ['/users/*'];
 *   }
 *   return [];
 * };
 * ```
 */
export type HttpCacheInvalidationPattern = (
    config: HttpRequestConfig
) => string[];

/**
 * HTTP cache configuration.
 * Defines cache behavior and pluggable cache implementation.
 *
 * @public
 * @example
 * ```ts
 * const cacheConfig: HttpCacheConfig = {
 *   cache: new MemoryCache(),
 *   ttl: 60000, // 1 minute default TTL
 *   respectCacheHeaders: true,
 *   staleWhileRevalidate: true,
 *   keyGenerator: (config) => `${config.method}:${config.url}`,
 *   invalidatePatterns: (config) => {
 *     // Invalidate related cache entries after mutations
 *     if (config.method === 'POST' && config.url?.includes('/users')) {
 *       return ['/users', '/users/*'];
 *     }
 *     return [];
 *   }
 * };
 * ```
 */
export interface HttpCacheConfig {
    /**
     * The cache implementation to use.
     * If not provided, caching is disabled.
     *
     * @example
     * ```ts
     * cache: new MemoryCache() // Use in-memory cache
     * cache: new RedisCache()  // Use Redis cache
     * ```
     */
    readonly cache?: HttpCache;

    /**
     * Custom cache key generator.
     * If not provided, default generates keys from method, URL, and query params.
     *
     * @example
     * ```ts
     * keyGenerator: (config) => {
     *   return `${config.method || 'GET'}:${config.url}`;
     * }
     * ```
     */
    readonly keyGenerator?: HttpCacheKeyGenerator;

    /**
     * Default time-to-live for cache entries in milliseconds.
     * Can be overridden by HTTP cache headers if `respectCacheHeaders` is true.
     *
     * @defaultValue 0 (no caching)
     * @example
     * ```ts
     * ttl: 60000 // Cache for 1 minute
     * ```
     */
    readonly ttl?: number;

    /**
     * Whether to respect HTTP cache control headers.
     * When true, `Cache-Control` and `Expires` headers override TTL config.
     *
     * @defaultValue true
     * @example
     * ```ts
     * respectCacheHeaders: true // Honor server cache directives
     * ```
     */
    readonly respectCacheHeaders?: boolean;

    /**
     * Enable stale-while-revalidate pattern.
     * When true, stale cache entries are returned immediately while
     * a background revalidation request updates the cache.
     *
     * @defaultValue false
     * @example
     * ```ts
     * staleWhileRevalidate: true // Return stale data, refresh in background
     * ```
     */
    readonly staleWhileRevalidate?: boolean;

    /**
     * Cache invalidation patterns.
     * Defines which cache entries to invalidate after mutations.
     * Can be static patterns or a function returning patterns.
     *
     * @example
     * ```ts
     * // Static patterns
     * invalidatePatterns: ['/users/*', '/posts/*']
     *
     * // Dynamic patterns based on request
     * invalidatePatterns: (config) => {
     *   if (config.url?.includes('/users')) {
     *     return ['/users', '/users/*'];
     *   }
     *   return [];
     * }
     * ```
     */
    readonly invalidatePatterns?: string[] | HttpCacheInvalidationPattern;
}
