import type { HttpCacheConfig } from "./cache.js";
import type { HttpClient } from "./client.js";
import type { HttpDeduplicationConfig } from "./deduplication.js";
import type {
    RequestOnFulfilled,
    RequestOnRejected,
    ResponseOnFulfilled,
    ResponseOnRejected,
} from "./interceptors.js";
import type { HttpRequestConfig } from "./request.js";
import type { HttpRetryConfig } from "./retry.js";

/**
 * HTTP client factory types and options.
 * @module
 */

/**
 * Interceptor configuration for client initialization.
 *
 * @public
 */
export interface HttpInterceptors {
    /**
     * Request interceptors to register on client creation.
     * Each interceptor has onFulfilled and optional onRejected callbacks.
     *
     * @example
     * ```ts
     * request: [
     *   {
     *     onFulfilled: async (config) => ({
     *       ...config,
     *       headers: {
     *         ...config.headers,
     *         'Authorization': `Bearer ${await getToken()}`
     *       }
     *     }),
     *     onRejected: (error) => {
     *       console.error('Request preparation failed:', error);
     *       throw error;
     *     }
     *   }
     * ]
     * ```
     */
    readonly request?: Array<{
        readonly onFulfilled: RequestOnFulfilled;
        readonly onRejected?: RequestOnRejected;
    }>;

    /**
     * Response interceptors to register on client creation.
     * Each interceptor has onFulfilled and optional onRejected callbacks.
     *
     * @example
     * ```ts
     * response: [
     *   {
     *     onFulfilled: (response) => {
     *       console.log(`[${response.status}] ${response.url}`);
     *       return response;
     *     },
     *     onRejected: async (error) => {
     *       if (error instanceof HttpUnauthorizedError) {
     *         await refreshToken();
     *         return client.request(error.request);
     *       }
     *       throw error;
     *     }
     *   }
     * ]
     * ```
     */
    readonly response?: Array<{
        readonly onFulfilled: ResponseOnFulfilled;
        readonly onRejected?: ResponseOnRejected;
    }>;
}

/**
 * HTTP client configuration options.
 * Extends HttpRequestConfig with client-specific settings like interceptors.
 *
 * @public
 * @example
 * ```ts
 * const options: HttpClientOptions = {
 *   baseUrl: 'https://api.example.com',
 *   timeout: 5000,
 *   headers: {
 *     'Content-Type': 'application/json',
 *     'Accept': 'application/json'
 *   },
 *   retry: {
 *     attempts: 3,
 *     delay: exponentialBackoff(1000, 10000)
 *   },
 *   deduplication: {
 *     enabled: true,
 *     ttl: 5000
 *   },
 *   cache: {
 *     cache: new MemoryCache(),
 *     ttl: 60000,
 *     respectCacheHeaders: true
 *   },
 *   interceptors: {
 *     request: [
 *       {
 *         onFulfilled: async (config) => ({
 *           ...config,
 *           headers: {
 *             ...config.headers,
 *             'Authorization': `Bearer ${await getToken()}`
 *           }
 *         })
 *       }
 *     ],
 *     response: [
 *       {
 *         onFulfilled: (response) => {
 *           console.log(`[${response.status}] ${response.url}`);
 *           return response;
 *         }
 *       }
 *     ]
 *   }
 * };
 *
 * const client = createHttpClient(options);
 * ```
 */
export interface HttpClientOptions extends HttpRequestConfig {
    /**
     * Interceptors to register on client creation.
     * These apply to all requests made with this client instance.
     *
     * @example
     * ```ts
     * interceptors: {
     *   request: [
     *     {
     *       onFulfilled: async (config) => {
     *         // Add authentication
     *         return { ...config, headers: { ...config.headers, 'Authorization': token } };
     *       }
     *     }
     *   ]
     * }
     * ```
     */
    readonly interceptors?: HttpInterceptors;

    /**
     * Default retry configuration for all requests.
     * Can be overridden per request.
     *
     * @example
     * ```ts
     * retry: {
     *   attempts: 3,
     *   delay: 1000,
     *   condition: (error) => error instanceof HttpNetworkError
     * }
     * ```
     */
    readonly retry?: HttpRetryConfig;

    /**
     * Default deduplication configuration for all requests.
     * Can be overridden per request.
     *
     * @example
     * ```ts
     * deduplication: {
     *   enabled: true,
     *   ttl: 5000,
     *   criticalHeaders: ['Authorization']
     * }
     * ```
     */
    readonly deduplication?: HttpDeduplicationConfig;

    /**
     * Default cache configuration for all requests.
     * Can be overridden per request.
     *
     * @example
     * ```ts
     * cache: {
     *   cache: new MemoryCache(),
     *   ttl: 60000,
     *   respectCacheHeaders: true
     * }
     * ```
     */
    readonly cache?: HttpCacheConfig;
}

/**
 * Factory function type for creating HTTP client instances.
 * Implementations (axios, ky) provide this factory function.
 *
 * @param options - Optional client configuration
 * @returns Configured HttpClient instance
 * @public
 * @example
 * ```ts
 * // Implementation example (axios adapter)
 * const createAxiosHttpClient: HttpClientFactory = (options) => {
 *   const axiosInstance = axios.create({
 *     baseURL: options?.baseUrl,
 *     timeout: options?.timeout,
 *     headers: options?.headers
 *   });
 *
 *   // Apply retry config
 *   if (options?.retry) {
 *     axiosRetry(axiosInstance, options.retry);
 *   }
 *
 *   // Register interceptors
 *   if (options?.interceptors?.request) {
 *     for (const interceptor of options.interceptors.request) {
 *       axiosInstance.interceptors.request.use(
 *         interceptor.onFulfilled,
 *         interceptor.onRejected
 *       );
 *     }
 *   }
 *
 *   return new AxiosHttpClient(axiosInstance);
 * };
 *
 * // Usage
 * const client = createAxiosHttpClient({
 *   baseUrl: 'https://api.example.com',
 *   timeout: 5000,
 *   retry: { attempts: 3 }
 * });
 * ```
 */
export type HttpClientFactory = (options?: HttpClientOptions) => HttpClient;
