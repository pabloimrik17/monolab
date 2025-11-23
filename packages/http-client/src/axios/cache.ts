import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import type { CacheEntry, HttpCache, HttpCacheConfig } from "../contracts/cache.js";

/**
 * Extended cache entry that includes the original AxiosResponse.
 * Used internally to reconstruct full responses from cached data.
 */
interface InternalCacheEntry extends CacheEntry {
    statusText: string;
    status: number;
}

/**
 * Generate cache key from request config.
 * Format: METHOD::URL::PARAMS
 */
export function generateCacheKey(config: AxiosRequestConfig): string {
    const parts: string[] = [];

    // Method
    parts.push((config.method || "GET").toUpperCase());

    // URL
    parts.push(config.url || "");

    // Query params (sorted for consistency)
    if (config.params) {
        const sortedParams = Object.keys(config.params)
            .sort()
            .map((key) => `${key}=${JSON.stringify(config.params[key])}`)
            .join("&");
        parts.push(sortedParams);
    } else {
        parts.push("");
    }

    return parts.join("::");
}

/**
 * Cache manager for HTTP responses.
 */
export class CacheManager {
    private readonly cache: HttpCache;
    private readonly ttl: number;
    private readonly keyIndex: Set<string> = new Set(); // Track keys for pattern invalidation

    constructor(config: HttpCacheConfig) {
        if (!config.cache) {
            throw new Error("Cache implementation is required");
        }
        this.cache = config.cache;
        this.ttl = config.ttl || 60000; // Default 60 seconds
    }

    /**
     * Get cached response if available and not expired.
     */
    async get<T>(key: string): Promise<AxiosResponse<T> | undefined> {
        const entry = await this.cache.get(key) as InternalCacheEntry | null; // eslint-disable-line @typescript-eslint/no-explicit-any

        if (!entry) return undefined;

        // Check expiration
        if (Date.now() > entry.timestamp + entry.ttl) {
            await this.cache.delete(key);
            this.keyIndex.delete(key);
            return undefined;
        }

        // Reconstruct AxiosResponse from cached entry
        return {
            data: entry.data as T,
            status: entry.status,
            statusText: entry.statusText,
            headers: entry.headers,
            config: {} as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        } as AxiosResponse<T>;
    }

    /**
     * Store response in cache with TTL.
     */
    async set<T>(key: string, response: AxiosResponse<T>): Promise<void> {
        // Normalize headers - axios headers can be AxiosHeaders or plain object
        const headers: Record<string, string | string[]> = {};
        if (response.headers) {
            // If it's an AxiosHeaders object with toJSON, use that
            if (typeof response.headers === 'object' && 'toJSON' in response.headers) {
                Object.assign(headers, (response.headers as any).toJSON()); // eslint-disable-line @typescript-eslint/no-explicit-any
            } else {
                // Otherwise treat as plain object
                Object.assign(headers, response.headers);
            }
        }

        const entry: InternalCacheEntry = {
            data: response.data,
            headers,
            timestamp: Date.now(),
            ttl: this.ttl,
            status: response.status,
            statusText: response.statusText,
        };

        await this.cache.set(key, entry);
        this.keyIndex.add(key);
    }

    /**
     * Invalidate cache entries matching a pattern.
     * Pattern matching: "/users" invalidates "/users" and "/users/*"
     */
    async invalidate(url: string): Promise<void> {
        const urlPattern = url.endsWith("/") ? url.slice(0, -1) : url;

        // Iterate through tracked keys
        const keysToDelete: string[] = [];
        for (const key of this.keyIndex) {
            // Extract URL from key (format: METHOD:URL:PARAMS)
            const parts = key.split("::");
            if (parts.length < 2) continue;

            const keyUrl = parts[1];
            if (!keyUrl) continue;

            // Match exact URL or URLs starting with pattern
            if (
                keyUrl === urlPattern ||
                keyUrl.startsWith(urlPattern + "/")
            ) {
                keysToDelete.push(key);
            }
        }

        // Delete matched keys
        await Promise.all(
            keysToDelete.map(async (key) => {
                await this.cache.delete(key);
                this.keyIndex.delete(key);
            })
        );
    }

    /**
     * Clear all cache entries.
     */
    async clear(): Promise<void> {
        await this.cache.clear();
        this.keyIndex.clear();
    }
}

/**
 * Setup caching for an axios instance.
 */
export function setupCache(
    axios: AxiosInstance,
    config: HttpCacheConfig
): CacheManager {
    const manager = new CacheManager(config);

    // Store original GET method
    const originalGet = axios.get.bind(axios);
    const originalPost = axios.post.bind(axios);
    const originalPut = axios.put.bind(axios);
    const originalPatch = axios.patch.bind(axios);
    const originalDelete = axios.delete.bind(axios);

    // Wrap GET with caching
    (axios as any).get = async function (
        url: string,
        requestConfig?: AxiosRequestConfig
    ): Promise<AxiosResponse> {
        const fullConfig = { ...requestConfig, method: "GET", url };

        // Check cache opt-out
        if ((fullConfig as any).cache?.enabled === false) {
            return originalGet(url, requestConfig);
        }

        // Try cache first
        const cacheKey = generateCacheKey(fullConfig);
        const cached = await manager.get(cacheKey);
        if (cached) {
            return cached;
        }

        // Execute request and cache response
        const response = await originalGet(url, requestConfig);
        await manager.set(cacheKey, response);
        return response;
    };

    // Wrap POST with cache invalidation
    (axios as any).post = async function (
        url: string,
        data?: any,
        requestConfig?: AxiosRequestConfig
    ): Promise<AxiosResponse> {
        const response = await originalPost(url, data, requestConfig);
        await manager.invalidate(url);
        return response;
    };

    // Wrap PUT with cache invalidation
    (axios as any).put = async function (
        url: string,
        data?: any,
        requestConfig?: AxiosRequestConfig
    ): Promise<AxiosResponse> {
        const response = await originalPut(url, data, requestConfig);
        await manager.invalidate(url);
        return response;
    };

    // Wrap PATCH with cache invalidation
    (axios as any).patch = async function (
        url: string,
        data?: any,
        requestConfig?: AxiosRequestConfig
    ): Promise<AxiosResponse> {
        const response = await originalPatch(url, data, requestConfig);
        await manager.invalidate(url);
        return response;
    };

    // Wrap DELETE with cache invalidation
    (axios as any).delete = async function (
        url: string,
        requestConfig?: AxiosRequestConfig
    ): Promise<AxiosResponse> {
        const response = await originalDelete(url, requestConfig);
        await manager.invalidate(url);
        return response;
    };

    return manager;
}
