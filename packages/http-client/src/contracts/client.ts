/**
 * HTTP client interface defining the contract for making HTTP requests.
 * @module
 */

import type {
    InterceptorHandle,
    RequestOnFulfilled,
    RequestOnRejected,
    ResponseOnFulfilled,
    ResponseOnRejected,
} from "./interceptors.js";
import type { HttpRequestConfig } from "./request.js";
import type { HttpResponse } from "./response.js";

/**
 * HTTP client interface with standard methods and interceptor management.
 * All implementations (axios, ky) must conform to this interface.
 *
 * @public
 * @example
 * ```ts
 * interface User {
 *   id: number;
 *   name: string;
 *   email: string;
 * }
 *
 * interface CreateUserDto {
 *   name: string;
 *   email: string;
 * }
 *
 * const client: HttpClient = createHttpClient({
 *   baseUrl: 'https://api.example.com',
 *   timeout: 5000
 * });
 *
 * // GET request
 * const user = await client.get<User>('/users/1');
 * console.log(user.data.name);
 *
 * // POST request
 * const newUser = await client.post<User, CreateUserDto>('/users', {
 *   name: 'Alice',
 *   email: 'alice@example.com'
 * });
 *
 * // Add authentication interceptor
 * client.addRequestInterceptor(async (config) => ({
 *   ...config,
 *   headers: {
 *     ...config.headers,
 *     'Authorization': `Bearer ${await getToken()}`
 *   }
 * }));
 * ```
 */
export interface HttpClient {
    /**
     * Perform a GET request.
     *
     * @typeParam TResponse - The type of the response data
     * @typeParam TError - The type of the error response data (optional)
     * @param url - The URL path to request
     * @param config - Optional request configuration
     * @returns Promise resolving to the typed response
     * @throws {HttpError} When the request fails
     * @example
     * ```ts
     * interface User {
     *   id: number;
     *   name: string;
     * }
     *
     * const response = await client.get<User>('/users/1');
     * console.log(response.data.name); // Type-safe access
     *
     * // With query parameters
     * const users = await client.get<User[]>('/users', {
     *   query: { page: 1, limit: 10 }
     * });
     * ```
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    get<TResponse, _TError = unknown>(
        url: string,
        config?: HttpRequestConfig
    ): Promise<HttpResponse<TResponse>>;

    /**
     * Perform a POST request with a request body.
     *
     * @typeParam TResponse - The type of the response data
     * @typeParam TBody - The type of the request body (optional)
     * @typeParam TError - The type of the error response data (optional)
     * @param url - The URL path to request
     * @param body - The request body (optional)
     * @param config - Optional request configuration
     * @returns Promise resolving to the typed response
     * @throws {HttpError} When the request fails
     * @example
     * ```ts
     * interface User {
     *   id: number;
     *   name: string;
     *   email: string;
     * }
     *
     * interface CreateUserDto {
     *   name: string;
     *   email: string;
     * }
     *
     * const response = await client.post<User, CreateUserDto>('/users', {
     *   name: 'Alice',
     *   email: 'alice@example.com'
     * });
     * console.log(response.data.id); // Type-safe access
     * ```
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    post<TResponse, TBody = unknown, _TError = unknown>(
        url: string,
        body?: TBody,
        config?: HttpRequestConfig
    ): Promise<HttpResponse<TResponse>>;

    /**
     * Perform a PUT request to fully replace a resource.
     *
     * @typeParam TResponse - The type of the response data
     * @typeParam TBody - The type of the request body (optional)
     * @typeParam TError - The type of the error response data (optional)
     * @param url - The URL path to request
     * @param body - The request body (optional)
     * @param config - Optional request configuration
     * @returns Promise resolving to the typed response
     * @throws {HttpError} When the request fails
     * @example
     * ```ts
     * interface User {
     *   id: number;
     *   name: string;
     *   email: string;
     * }
     *
     * interface UpdateUserDto {
     *   name: string;
     *   email: string;
     * }
     *
     * const response = await client.put<User, UpdateUserDto>('/users/1', {
     *   name: 'Bob',
     *   email: 'bob@example.com'
     * });
     * ```
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    put<TResponse, TBody = unknown, _TError = unknown>(
        url: string,
        body?: TBody,
        config?: HttpRequestConfig
    ): Promise<HttpResponse<TResponse>>;

    /**
     * Perform a PATCH request to partially update a resource.
     *
     * @typeParam TResponse - The type of the response data
     * @typeParam TBody - The type of the request body (optional)
     * @typeParam TError - The type of the error response data (optional)
     * @param url - The URL path to request
     * @param body - The request body (optional)
     * @param config - Optional request configuration
     * @returns Promise resolving to the typed response
     * @throws {HttpError} When the request fails
     * @example
     * ```ts
     * interface User {
     *   id: number;
     *   name: string;
     *   email: string;
     * }
     *
     * const response = await client.patch<User, Partial<User>>('/users/1', {
     *   name: 'Charlie' // Only update name
     * });
     * ```
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    patch<TResponse, TBody = unknown, _TError = unknown>(
        url: string,
        body?: TBody,
        config?: HttpRequestConfig
    ): Promise<HttpResponse<TResponse>>;

    /**
     * Perform a DELETE request to remove a resource.
     *
     * @typeParam TResponse - The type of the response data (default: void)
     * @typeParam TError - The type of the error response data (optional)
     * @param url - The URL path to request
     * @param config - Optional request configuration
     * @returns Promise resolving to the typed response
     * @throws {HttpError} When the request fails
     * @example
     * ```ts
     * // Delete returns void
     * await client.delete('/users/1');
     *
     * // Delete returns data
     * interface DeleteResult {
     *   success: boolean;
     *   deletedId: number;
     * }
     * const response = await client.delete<DeleteResult>('/users/1');
     * console.log(response.data.deletedId);
     * ```
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    delete<TResponse = void, _TError = unknown>(
        url: string,
        config?: HttpRequestConfig
    ): Promise<HttpResponse<TResponse>>;

    /**
     * Perform a HEAD request to retrieve metadata only.
     * No response body is returned, only headers and status.
     *
     * @typeParam TError - The type of the error response data (optional)
     * @param url - The URL path to request
     * @param config - Optional request configuration
     * @returns Promise resolving to the response with void data
     * @throws {HttpError} When the request fails
     * @example
     * ```ts
     * // Check if resource exists
     * const response = await client.head('/users/1');
     * if (response.ok) {
     *   console.log('User exists');
     *   console.log('Content-Type:', response.headers['content-type']);
     * }
     * ```
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    head<_TError = unknown>(
        url: string,
        config?: HttpRequestConfig
    ): Promise<HttpResponse<void>>;

    /**
     * Perform an OPTIONS request to discover allowed methods.
     * Returns allowed HTTP methods in the `Allow` header.
     *
     * @typeParam TError - The type of the error response data (optional)
     * @param url - The URL path to request
     * @param config - Optional request configuration
     * @returns Promise resolving to the response with void data
     * @throws {HttpError} When the request fails
     * @example
     * ```ts
     * // Discover allowed methods
     * const response = await client.options('/users');
     * const allowedMethods = response.headers['allow'];
     * console.log('Allowed methods:', allowedMethods); // "GET, POST, PUT, DELETE"
     * ```
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options<_TError = unknown>(
        url: string,
        config?: HttpRequestConfig
    ): Promise<HttpResponse<void>>;

    /**
     * Add a request interceptor using the onFulfilled/onRejected pattern.
     * The interceptor is called before each request is sent.
     *
     * @param onFulfilled - Callback for successful request preparation
     * @param onRejected - Optional callback for request preparation errors
     * @returns Handle for removing the interceptor
     * @example
     * ```ts
     * // Add authentication token to all requests
     * const handle = client.addRequestInterceptor(
     *   async (config) => ({
     *     ...config,
     *     headers: {
     *       ...config.headers,
     *       'Authorization': `Bearer ${await getToken()}`
     *     }
     *   }),
     *   (error) => {
     *     console.error('Request preparation failed:', error);
     *     throw error;
     *   }
     * );
     *
     * // Later, remove the interceptor
     * client.removeInterceptor(handle);
     * ```
     */
    addRequestInterceptor(
        onFulfilled: RequestOnFulfilled,
        onRejected?: RequestOnRejected
    ): InterceptorHandle;

    /**
     * Add a response interceptor using the onFulfilled/onRejected pattern.
     * The interceptor is called after each response is received.
     *
     * @param onFulfilled - Callback for successful responses (2xx)
     * @param onRejected - Optional callback for error responses (4xx, 5xx) and network failures
     * @returns Handle for removing the interceptor
     * @example
     * ```ts
     * // Log all responses
     * const handle = client.addResponseInterceptor(
     *   (response) => {
     *     console.log(`[${response.status}] ${response.url}`);
     *     return response;
     *   },
     *   async (error) => {
     *     // Retry on 401 by refreshing token
     *     if (error instanceof HttpUnauthorizedError) {
     *       await refreshToken();
     *       return client.request(error.request);
     *     }
     *     throw error;
     *   }
     * );
     *
     * // Later, remove the interceptor
     * client.removeInterceptor(handle);
     * ```
     */
    addResponseInterceptor(
        onFulfilled: ResponseOnFulfilled,
        onRejected?: ResponseOnRejected
    ): InterceptorHandle;

    /**
     * Remove an interceptor by its handle.
     * Removal is idempotent - removing the same handle twice is safe.
     *
     * @param handle - The handle returned from add*Interceptor methods
     * @example
     * ```ts
     * const handle = client.addRequestInterceptor(...);
     * client.removeInterceptor(handle); // Remove the interceptor
     * client.removeInterceptor(handle); // Safe to call again
     * ```
     */
    removeInterceptor(handle: InterceptorHandle): void;
}
