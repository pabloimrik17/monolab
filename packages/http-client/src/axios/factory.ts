import axios from "axios";
import type { HttpClient } from "../contracts/client.js";
import type {
    HttpClientFactory,
    HttpClientOptions,
} from "../contracts/factory.js";
import { createAxiosHttpClient } from "./adapter.js";

/**
 * Create a fully-configured HTTP client using the factory pattern.
 *
 * This factory function provides a convenient way to create HTTP clients with
 * all features pre-configured. It handles axios instance creation and setup
 * of retry, cache, deduplication, and interceptors.
 *
 * @param options - Complete client configuration options
 * @param options.baseUrl - Base URL for all requests
 * @param options.timeout - Request timeout in milliseconds
 * @param options.headers - Default headers for all requests
 * @param options.query - Default query parameters for all requests
 * @param options.credentials - Credentials mode ('include', 'omit', 'same-origin')
 * @param options.responseType - Expected response type
 * @param options.retry - Retry configuration with backoff strategies
 * @param options.cache - Cache configuration with TTL and adapter
 * @param options.deduplication - Deduplication configuration
 * @param options.interceptors - Request and response interceptors
 *
 * @returns Configured HttpClient instance ready to use
 *
 * @example
 * ```typescript
 * import { createHttpClientFactory, exponentialBackoff } from '@m0n0lab/http-client';
 *
 * // Basic usage
 * const client = createHttpClientFactory({
 *   baseUrl: 'https://api.example.com',
 *   timeout: 5000
 * });
 *
 * // With retry, cache, and interceptors
 * const advancedClient = createHttpClientFactory({
 *   baseUrl: 'https://api.example.com',
 *   timeout: 5000,
 *   headers: {
 *     'X-API-Key': 'secret'
 *   },
 *   retry: {
 *     attempts: 3,
 *     delay: exponentialBackoff(1000, 10000)
 *   },
 *   cache: {
 *     cache: new Map(),
 *     ttl: 60000
 *   },
 *   deduplication: {
 *     enabled: true
 *   },
 *   interceptors: {
 *     request: [{
 *       onFulfilled: async (config) => {
 *         // Add auth token
 *         return {
 *           ...config,
 *           headers: {
 *             ...config.headers,
 *             Authorization: `Bearer ${getToken()}`
 *           }
 *         };
 *       }
 *     }],
 *     response: [{
 *       onFulfilled: async (response) => response,
 *       onRejected: async (error) => {
 *         // Handle 401 errors
 *         if (error.status === 401) {
 *           await refreshToken();
 *           // Retry request
 *         }
 *         throw error;
 *       }
 *     }]
 *   }
 * });
 *
 * // Use the client
 * const response = await advancedClient.get('/users');
 * ```
 *
 * @public
 */
export const createHttpClientFactory: HttpClientFactory = (
    options?: HttpClientOptions
): HttpClient => {
    // Build axios config, filtering out undefined values
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const axiosConfig: Record<string, any> = {};

    if (options?.baseUrl) axiosConfig["baseURL"] = options.baseUrl;
    if (options?.timeout) axiosConfig["timeout"] = options.timeout;
    if (options?.headers) axiosConfig["headers"] = options.headers;
    if (options?.query) axiosConfig["params"] = options.query;
    if (options?.credentials) axiosConfig["withCredentials"] = options.credentials === "include";
    if (options?.responseType) axiosConfig["responseType"] = options.responseType;

    // Create axios instance
    const axiosInstance = axios.create(axiosConfig);

    // Build adapter options, filtering out undefined values
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adapterOptions: Record<string, any> = {
        axiosInstance,
    };

    if (options?.retry) adapterOptions["retry"] = options.retry;
    if (options?.deduplication) adapterOptions["deduplication"] = options.deduplication;
    if (options?.cache) adapterOptions["cache"] = options.cache;

    // Create HTTP client
    const client = createAxiosHttpClient(adapterOptions);

    // Register interceptors
    if (options?.interceptors?.request) {
        for (const interceptor of options.interceptors.request) {
            client.addRequestInterceptor(
                interceptor.onFulfilled,
                interceptor.onRejected
            );
        }
    }

    if (options?.interceptors?.response) {
        for (const interceptor of options.interceptors.response) {
            client.addResponseInterceptor(
                interceptor.onFulfilled,
                interceptor.onRejected
            );
        }
    }

    return client;
};
