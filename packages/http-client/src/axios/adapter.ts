import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import type { HttpCacheConfig } from "../contracts/cache.js";
import type { HttpClient } from "../contracts/client.js";
import type { HttpDeduplicationConfig } from "../contracts/deduplication.js";
import type {
    InterceptorHandle,
    RequestOnFulfilled,
    RequestOnRejected,
    ResponseOnFulfilled,
    ResponseOnRejected,
} from "../contracts/interceptors.js";
import type { HttpRequestConfig } from "../contracts/request.js";
import type { HttpResponse } from "../contracts/response.js";
import type { HttpRetryConfig } from "../contracts/retry.js";
import type { HttpHeaders } from "../contracts/types.js";
import { setupCache } from "./cache.js";
import { setupDeduplication } from "./deduplication.js";
import { transformAxiosError } from "./errors.js";
import { setupRetry } from "./retry.js";

/**
 * Options for creating an axios HTTP client.
 */
export interface AxiosHttpClientOptions {
    /**
     * Pre-configured axios instance to use.
     * If not provided, a new instance will be created.
     */
    axiosInstance?: AxiosInstance;

    /**
     * Retry configuration for failed requests.
     */
    retry?: HttpRetryConfig;

    /**
     * Deduplication configuration for concurrent identical requests.
     */
    deduplication?: HttpDeduplicationConfig;

    /**
     * Cache configuration for response caching.
     */
    cache?: HttpCacheConfig;
}

/**
 * Axios implementation of the HttpClient interface.
 */
class AxiosHttpClient implements HttpClient {
    private readonly axios: AxiosInstance;
    private readonly interceptorMap = new Map<
        InterceptorHandle,
        { type: "request" | "response"; id: number }
    >();
    private nextHandleId = 0;

    constructor(axios: AxiosInstance) {
        this.axios = axios;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async get<TResponse, _TError = unknown>(
        url: string,
        config?: HttpRequestConfig
    ): Promise<HttpResponse<TResponse>> {
        try {
            const axiosConfig = this.mapToAxiosConfig(config);
            const response = await this.axios.get<TResponse>(url, axiosConfig);
            return this.mapFromAxiosResponse(response, config);
        } catch (error: unknown) {
            throw transformAxiosError(error as any, config || {}); // eslint-disable-line @typescript-eslint/no-explicit-any
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async post<TResponse, TBody = unknown, _TError = unknown>(
        url: string,
        body?: TBody,
        config?: HttpRequestConfig
    ): Promise<HttpResponse<TResponse>> {
        try {
            const axiosConfig = this.mapToAxiosConfig(config);
            const response = await this.axios.post<TResponse>(
                url,
                body,
                axiosConfig
            );
            return this.mapFromAxiosResponse(response, config);
        } catch (error: unknown) {
            throw transformAxiosError(error as any, config || {}); // eslint-disable-line @typescript-eslint/no-explicit-any
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async put<TResponse, TBody = unknown, _TError = unknown>(
        url: string,
        body?: TBody,
        config?: HttpRequestConfig
    ): Promise<HttpResponse<TResponse>> {
        try {
            const axiosConfig = this.mapToAxiosConfig(config);
            const response = await this.axios.put<TResponse>(
                url,
                body,
                axiosConfig
            );
            return this.mapFromAxiosResponse(response, config);
        } catch (error: unknown) {
            throw transformAxiosError(error as any, config || {}); // eslint-disable-line @typescript-eslint/no-explicit-any
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async patch<TResponse, TBody = unknown, _TError = unknown>(
        url: string,
        body?: TBody,
        config?: HttpRequestConfig
    ): Promise<HttpResponse<TResponse>> {
        try {
            const axiosConfig = this.mapToAxiosConfig(config);
            const response = await this.axios.patch<TResponse>(
                url,
                body,
                axiosConfig
            );
            return this.mapFromAxiosResponse(response, config);
        } catch (error: unknown) {
            throw transformAxiosError(error as any, config || {}); // eslint-disable-line @typescript-eslint/no-explicit-any
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async delete<TResponse = void, _TError = unknown>(
        url: string,
        config?: HttpRequestConfig
    ): Promise<HttpResponse<TResponse>> {
        try {
            const axiosConfig = this.mapToAxiosConfig(config);
            const response = await this.axios.delete<TResponse>(
                url,
                axiosConfig
            );
            return this.mapFromAxiosResponse(response, config);
        } catch (error: unknown) {
            throw transformAxiosError(error as any, config || {}); // eslint-disable-line @typescript-eslint/no-explicit-any
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async head<_TError = unknown>(
        url: string,
        config?: HttpRequestConfig
    ): Promise<HttpResponse<void>> {
        try {
            const axiosConfig = this.mapToAxiosConfig(config);
            const response = await this.axios.head(url, axiosConfig);
            return this.mapFromAxiosResponse(response, config);
        } catch (error: unknown) {
            throw transformAxiosError(error as any, config || {}); // eslint-disable-line @typescript-eslint/no-explicit-any
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async options<_TError = unknown>(
        url: string,
        config?: HttpRequestConfig
    ): Promise<HttpResponse<void>> {
        try {
            const axiosConfig = this.mapToAxiosConfig(config);
            const response = await this.axios.options(url, axiosConfig);
            return this.mapFromAxiosResponse(response, config);
        } catch (error: unknown) {
            throw transformAxiosError(error as any, config || {}); // eslint-disable-line @typescript-eslint/no-explicit-any
        }
    }

    addRequestInterceptor(
        onFulfilled: RequestOnFulfilled,
        onRejected?: RequestOnRejected
    ): InterceptorHandle {
        const id = this.axios.interceptors.request.use(
            async (config) => {
                try {
                    const httpConfig = this.mapFromAxiosConfig(config);
                    const result = await onFulfilled(httpConfig);
                    // Merge the result back into the axios config
                    return {
                        ...config,
                        headers: result.headers,
                        timeout: result.timeout,
                        params: result.query,
                        withCredentials: result.credentials === "include",
                        responseType: result.responseType,
                    } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
                } catch (error: unknown) {
                    if (onRejected) {
                        const recoveredConfig = await onRejected(error);
                        return {
                            ...config,
                            headers: recoveredConfig.headers,
                            timeout: recoveredConfig.timeout,
                            params: recoveredConfig.query,
                            withCredentials:
                                recoveredConfig.credentials === "include",
                            responseType: recoveredConfig.responseType,
                        } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
                    }
                    throw error;
                }
            },
            undefined // Don't pass onRejected to axios, we handle it above
        );

        const handle = this.nextHandleId++;
        this.interceptorMap.set(handle, { type: "request", id });
        return handle;
    }

    addResponseInterceptor(
        onFulfilled: ResponseOnFulfilled,
        onRejected?: ResponseOnRejected
    ): InterceptorHandle {
        const id = this.axios.interceptors.response.use(
            async (response) => {
                const httpResponse = this.mapFromAxiosResponse(response, {});
                const result = await onFulfilled(httpResponse);
                // Convert back to axios response format
                return {
                    ...response,
                    data: result.data,
                    status: result.status,
                    statusText: result.statusText,
                    headers: result.headers,
                } as AxiosResponse; // eslint-disable-line @typescript-eslint/no-explicit-any
            },
            onRejected
                ? async (error) => {
                      const httpError = transformAxiosError(error, {});
                      const result = await onRejected(httpError);
                      // If result is a response, convert it back to axios format
                      if ("data" in result && "status" in result) {
                          return {
                              data: result.data,
                              status: result.status,
                              statusText: result.statusText,
                              headers: result.headers,
                              config: error.config || ({} as any), // eslint-disable-line @typescript-eslint/no-explicit-any
                              request: error.request,
                              response: undefined,
                          } as AxiosResponse; // eslint-disable-line @typescript-eslint/no-explicit-any
                      }
                      // If result is an error, throw it
                      throw result;
                  }
                : undefined
        );

        const handle = this.nextHandleId++;
        this.interceptorMap.set(handle, { type: "response", id });
        return handle;
    }

    removeInterceptor(handle: InterceptorHandle): void {
        const interceptor = this.interceptorMap.get(handle);
        if (!interceptor) return;

        if (interceptor.type === "request") {
            this.axios.interceptors.request.eject(interceptor.id);
        } else {
            this.axios.interceptors.response.eject(interceptor.id);
        }

        this.interceptorMap.delete(handle);
    }

    /**
     * Map HttpRequestConfig to AxiosRequestConfig.
     */
    private mapToAxiosConfig(
        config?: HttpRequestConfig
    ): AxiosRequestConfig | undefined {
        if (!config) return undefined;

        const axiosConfig: AxiosRequestConfig = {};

        if (config.headers) axiosConfig.headers = config.headers as any; // eslint-disable-line @typescript-eslint/no-explicit-any
        if (config.timeout) axiosConfig.timeout = config.timeout;
        if (config.query) axiosConfig.params = config.query;
        if (config.credentials) axiosConfig.withCredentials = config.credentials === "include";
        if (config.responseType) axiosConfig.responseType = config.responseType as any; // eslint-disable-line @typescript-eslint/no-explicit-any

        // Pass through deduplication config for setupDeduplication to check
        if ((config as any).deduplication !== undefined) { // eslint-disable-line @typescript-eslint/no-explicit-any
            (axiosConfig as any).deduplication = (config as any).deduplication; // eslint-disable-line @typescript-eslint/no-explicit-any
        }

        // Pass through cache config for setupCache to check
        if ((config as any).cache !== undefined) { // eslint-disable-line @typescript-eslint/no-explicit-any
            (axiosConfig as any).cache = (config as any).cache; // eslint-disable-line @typescript-eslint/no-explicit-any
        }

        return axiosConfig;
    }

    /**
     * Map AxiosRequestConfig to HttpRequestConfig.
     */
    private mapFromAxiosConfig(
        config: AxiosRequestConfig
    ): HttpRequestConfig {
        return {
            ...(config.headers && { headers: this.normalizeHeaders(config.headers) }),
            ...(config.timeout && { timeout: config.timeout }),
            ...(config.params && { query: config.params }),
            ...(config.withCredentials && { credentials: "include" as const }),
            ...(config.responseType && { responseType: config.responseType as any }), // eslint-disable-line @typescript-eslint/no-explicit-any
        };
    }

    /**
     * Normalize axios headers to HttpHeaders format.
     */
    private normalizeHeaders(headers: any): HttpHeaders {
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
     * Map AxiosResponse to HttpResponse.
     */
    private mapFromAxiosResponse<T>(
        response: AxiosResponse<T>,
        originalConfig?: HttpRequestConfig
    ): HttpResponse<T> {
        return {
            data: response.data,
            status: response.status as any, // eslint-disable-line @typescript-eslint/no-explicit-any
            statusText: response.statusText,
            headers: this.normalizeHeaders(response.headers),
            request: originalConfig || {},
            url: response.config.url || "",
        };
    }
}

/**
 * Create an axios-based HTTP client with optional retry, deduplication, and cache features.
 *
 * This function creates a fully-configured HTTP client that wraps an axios instance
 * with additional capabilities:
 * - **Retry**: Automatically retry failed requests with configurable backoff strategies
 * - **Deduplication**: Prevent duplicate concurrent requests
 * - **Cache**: Cache GET responses with TTL and automatic invalidation
 *
 * @param options - Configuration options
 * @param options.axiosInstance - Pre-configured axios instance (required)
 * @param options.retry - Optional retry configuration with exponential/linear backoff
 * @param options.deduplication - Optional request deduplication configuration
 * @param options.cache - Optional response caching configuration
 *
 * @returns HttpClient instance implementing the HttpClient interface
 *
 * @throws Error if axiosInstance is not provided
 *
 * @example
 * ```typescript
 * // Basic usage
 * const client = createAxiosHttpClient({
 *   axiosInstance: axios.create({ baseURL: 'https://api.example.com' })
 * });
 *
 * // With retry and exponential backoff
 * const clientWithRetry = createAxiosHttpClient({
 *   axiosInstance: axios.create({ baseURL: 'https://api.example.com' }),
 *   retry: {
 *     attempts: 3,
 *     delay: exponentialBackoff(1000, 10000)
 *   }
 * });
 *
 * // With caching and deduplication
 * const cache = new Map();
 * const clientWithCache = createAxiosHttpClient({
 *   axiosInstance: axios.create({ baseURL: 'https://api.example.com' }),
 *   cache: {
 *     cache,
 *     ttl: 60000 // 1 minute
 *   },
 *   deduplication: {
 *     enabled: true
 *   }
 * });
 * ```
 *
 * @public
 */
export function createAxiosHttpClient(
    options?: AxiosHttpClientOptions
): HttpClient {
    const axios = options?.axiosInstance;
    if (!axios) {
        throw new Error("axiosInstance is required");
    }

    // Setup cache if configured (before deduplication/retry)
    if (options?.cache) {
        setupCache(axios, options.cache);
    }

    // Setup deduplication if configured
    if (options?.deduplication?.enabled) {
        setupDeduplication(axios, options.deduplication);
    }

    // Setup retry if configured
    if (options?.retry) {
        setupRetry(axios, options.retry);
    }

    return new AxiosHttpClient(axios);
}
