/**
 * HTTP interceptor types using the onFulfilled/onRejected pattern.
 * This abstraction works uniformly with both axios interceptors and ky hooks.
 * @module
 */

import type { HttpError } from "./errors.js";
import type { HttpRequestConfig } from "./request.js";
import type { HttpResponse } from "./response.js";

/**
 * Request interceptor onFulfilled callback.
 * Handles successful request preparation by transforming or validating the config.
 * Mirrors the onFulfilled parameter in Promise.then() for familiarity.
 *
 * @param config - The current HTTP request configuration
 * @returns Modified config (or Promise thereof) to continue, or throws to abort
 * @public
 * @example
 * ```ts
 * const onFulfilled: RequestOnFulfilled = async (config) => {
 *   // Add authentication token
 *   const token = await getAuthToken();
 *   return {
 *     ...config,
 *     headers: {
 *       ...config.headers,
 *       'Authorization': `Bearer ${token}`
 *     }
 *   };
 * };
 * ```
 */
export type RequestOnFulfilled = (
    config: HttpRequestConfig
) => HttpRequestConfig | Promise<HttpRequestConfig>;

/**
 * Request interceptor onRejected callback.
 * Handles errors during request preparation (e.g., config validation, token refresh failure).
 * Can recover by returning a valid config or abort by throwing.
 * Mirrors the onRejected parameter in Promise.then() for familiarity.
 *
 * @param error - The error that occurred during request preparation
 * @returns Modified config to recover, or throws to abort
 * @public
 * @example
 * ```ts
 * const onRejected: RequestOnRejected = async (error) => {
 *   // Attempt to recover from token refresh failure
 *   if (error.message.includes('token refresh')) {
 *     console.warn('Token refresh failed, attempting re-login...');
 *     await reLogin();
 *     const newToken = await getAuthToken();
 *     return {
 *       ...originalConfig,
 *       headers: {
 *         ...originalConfig.headers,
 *         'Authorization': `Bearer ${newToken}`
 *       }
 *     };
 *   }
 *   // Cannot recover, abort request
 *   throw error;
 * };
 * ```
 */
export type RequestOnRejected = (
    error: Error
) => HttpRequestConfig | Promise<HttpRequestConfig> | Promise<never> | never;

/**
 * Response interceptor onFulfilled callback.
 * Handles successful responses (2xx status codes) by transforming or logging the response.
 * Mirrors the onFulfilled parameter in Promise.then() for familiarity.
 *
 * @param response - The successful HTTP response
 * @returns Modified response (or Promise thereof) to continue
 * @public
 * @example
 * ```ts
 * const onFulfilled: ResponseOnFulfilled = (response) => {
 *   // Log successful requests
 *   console.log(`[${response.status}] ${response.request.method} ${response.url}`);
 *
 *   // Transform response data
 *   return {
 *     ...response,
 *     data: {
 *       ...response.data,
 *       _metadata: {
 *         fetchedAt: new Date().toISOString()
 *       }
 *     }
 *   };
 * };
 * ```
 */
export type ResponseOnFulfilled = (
    response: HttpResponse<unknown>
) => HttpResponse<unknown> | Promise<HttpResponse<unknown>>;

/**
 * Response interceptor onRejected callback.
 * Handles HTTP errors (4xx/5xx status codes) and network failures.
 * Can recover by returning a valid response, transform the error, or re-throw.
 * Mirrors the onRejected parameter in Promise.then() for familiarity.
 *
 * @param error - The HTTP error that occurred
 * @returns A valid response to recover, a modified error, or throws to propagate
 * @public
 * @example
 * ```ts
 * const onRejected: ResponseOnRejected = async (error) => {
 *   // Handle 401 Unauthorized by refreshing token and retrying
 *   if (error instanceof HttpUnauthorizedError) {
 *     console.log('Token expired, refreshing...');
 *     await refreshAuthToken();
 *     // Retry the original request
 *     return client.request(error.request);
 *   }
 *
 *   // Log error and propagate
 *   console.error(`HTTP Error: ${error.message}`);
 *   throw error;
 * };
 * ```
 */
export type ResponseOnRejected = (
    error: HttpError
) =>
    | HttpResponse<unknown>
    | HttpError
    | Promise<HttpResponse<unknown>>
    | Promise<HttpError>
    | Promise<never>
    | never;

/**
 * Interceptor handle type for removal.
 * Returned when an interceptor is registered, used to remove it later.
 *
 * @public
 * @example
 * ```ts
 * const handle = client.addRequestInterceptor(onFulfilled, onRejected);
 * // Later...
 * client.removeInterceptor(handle);
 * ```
 */
export type InterceptorHandle = number | symbol | string;

/**
 * Implementation mapping guide for axios:
 *
 * @example
 * ```ts
 * // Axios uses interceptors.request.use and interceptors.response.use
 * class AxiosHttpClient implements HttpClient {
 *   addRequestInterceptor(
 *     onFulfilled: RequestOnFulfilled,
 *     onRejected?: RequestOnRejected
 *   ): InterceptorHandle {
 *     return this.axiosInstance.interceptors.request.use(
 *       onFulfilled,
 *       onRejected
 *     );
 *   }
 *
 *   addResponseInterceptor(
 *     onFulfilled: ResponseOnFulfilled,
 *     onRejected?: ResponseOnRejected
 *   ): InterceptorHandle {
 *     return this.axiosInstance.interceptors.response.use(
 *       onFulfilled,
 *       onRejected
 *     );
 *   }
 *
 *   removeInterceptor(handle: InterceptorHandle): void {
 *     this.axiosInstance.interceptors.request.eject(handle);
 *     this.axiosInstance.interceptors.response.eject(handle);
 *   }
 * }
 * ```
 */

/**
 * Implementation mapping guide for ky:
 *
 * @example
 * ```ts
 * // Ky uses hooks: beforeRequest, afterResponse, beforeError
 * class KyHttpClient implements HttpClient {
 *   private interceptors = new Map<InterceptorHandle, Function>();
 *
 *   addRequestInterceptor(
 *     onFulfilled: RequestOnFulfilled,
 *     onRejected?: RequestOnRejected
 *   ): InterceptorHandle {
 *     const handle = Symbol('request-interceptor');
 *     const hook = async (request, options) => {
 *       try {
 *         const config = this.optionsToConfig(options);
 *         const modifiedConfig = await onFulfilled(config);
 *         return this.configToOptions(modifiedConfig);
 *       } catch (error) {
 *         if (onRejected) {
 *           const recoveredConfig = await onRejected(error);
 *           return this.configToOptions(recoveredConfig);
 *         }
 *         throw error;
 *       }
 *     };
 *     this.interceptors.set(handle, hook);
 *     this.kyInstance.extend({ hooks: { beforeRequest: [hook] } });
 *     return handle;
 *   }
 *
 *   addResponseInterceptor(
 *     onFulfilled: ResponseOnFulfilled,
 *     onRejected?: ResponseOnRejected
 *   ): InterceptorHandle {
 *     const handle = Symbol('response-interceptor');
 *     // Map to ky's afterResponse (onFulfilled) and beforeError (onRejected)
 *     const hooks: any = {};
 *
 *     if (onFulfilled) {
 *       hooks.afterResponse = [async (request, options, response) => {
 *         const httpResponse = await this.toHttpResponse(response);
 *         return await onFulfilled(httpResponse);
 *       }];
 *     }
 *
 *     if (onRejected) {
 *       hooks.beforeError = [async (error) => {
 *         const httpError = this.toHttpError(error);
 *         return await onRejected(httpError);
 *       }];
 *     }
 *
 *     this.interceptors.set(handle, hooks);
 *     this.kyInstance.extend({ hooks });
 *     return handle;
 *   }
 *
 *   removeInterceptor(handle: InterceptorHandle): void {
 *     // Implementation-specific removal logic
 *     this.interceptors.delete(handle);
 *   }
 * }
 * ```
 */
