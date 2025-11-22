import type { HttpRequestConfig } from "./request.js";
import type { HttpHeaders } from "./types.js";

/**
 * HTTP response interface and types.
 * @module
 */

/**
 * Represents a successful HTTP response with type-safe data access.
 *
 * @typeParam T - The type of the response data
 * @public
 * @example
 * ```ts
 * interface User {
 *   id: number;
 *   name: string;
 *   email: string;
 * }
 *
 * const response: HttpResponse<User> = await client.get<User>('/users/1');
 *
 * console.log(response.data.name); // Type-safe access to User properties
 * console.log(response.status);    // 200
 * console.log(response.ok);        // true
 * console.log(response.headers);   // { 'content-type': 'application/json', ... }
 * ```
 */
export interface HttpResponse<T> {
    /**
     * The parsed response data.
     * Type is determined by the generic parameter and response type configuration.
     *
     * @example
     * ```ts
     * const response = await client.get<User>('/users/1');
     * const user: User = response.data; // Type-safe access
     * ```
     */
    readonly data: T;

    /**
     * The HTTP status code.
     * For successful responses, this is typically in the 200-299 range.
     *
     * @example
     * ```ts
     * console.log(response.status); // 200, 201, 204, etc.
     * ```
     */
    readonly status: number;

    /**
     * The HTTP status text message.
     * Human-readable status description.
     *
     * @example
     * ```ts
     * console.log(response.statusText); // "OK", "Created", "No Content", etc.
     * ```
     */
    readonly statusText: string;

    /**
     * Whether the response is considered successful.
     * True for 2xx status codes, false otherwise.
     *
     * @example
     * ```ts
     * if (response.ok) {
     *   console.log('Request succeeded');
     * }
     * ```
     */
    readonly ok: boolean;

    /**
     * The response headers.
     * Header names are case-insensitive for lookups.
     *
     * @example
     * ```ts
     * const contentType = response.headers['content-type'];
     * const cacheControl = response.headers['Cache-Control'];
     * ```
     */
    readonly headers: HttpHeaders;

    /**
     * The original request configuration.
     * Useful for debugging and logging.
     * Sensitive data (like authorization tokens) should be sanitized.
     *
     * @example
     * ```ts
     * console.log(response.request.baseUrl);
     * console.log(response.request.timeout);
     * ```
     */
    readonly request: Readonly<HttpRequestConfig>;

    /**
     * The final URL of the request after redirects.
     * This may differ from the original request URL if redirects occurred.
     *
     * @example
     * ```ts
     * console.log(response.url); // "https://api.example.com/users/1"
     * ```
     */
    readonly url: string;
}
