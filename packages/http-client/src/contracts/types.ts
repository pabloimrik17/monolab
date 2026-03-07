/**
 * Core HTTP type definitions used across all HTTP operations.
 * @module
 */

/**
 * Standard HTTP methods supported by the HTTP client.
 *
 * @public
 * @example
 * ```ts
 * const method: HttpMethod = 'GET';
 * ```
 */
export type HttpMethod =
    | "GET"
    | "POST"
    | "PUT"
    | "PATCH"
    | "DELETE"
    | "HEAD"
    | "OPTIONS";

/**
 * HTTP headers represented as key-value pairs.
 * Values can be a single string or an array of strings for multi-value headers.
 *
 * @public
 * @example
 * ```ts
 * const headers: HttpHeaders = {
 *   'Content-Type': 'application/json',
 *   'Authorization': 'Bearer token123',
 *   'Accept': 'application/json',
 *   'X-Custom-Header': ['value1', 'value2']
 * };
 * ```
 */
export type HttpHeaders = Record<string, string | string[]>;

/**
 * HTTP status codes.
 *
 * Represents any valid HTTP status code (100-599).
 * Using `number` instead of literal union allows for:
 * - Custom/non-standard status codes from servers
 * - Better compatibility with HTTP libraries
 * - Runtime flexibility without type casting
 *
 * Common ranges:
 * - Informational (100-199): Request received, continuing process
 * - Success (200-299): The action was successfully received, understood, and accepted
 * - Redirection (300-399): Further action must be taken to complete the request
 * - Client Error (400-499): The request contains bad syntax or cannot be fulfilled
 * - Server Error (500-599): The server failed to fulfill a valid request
 *
 * @public
 */
export type HttpStatusCode = number;

/**
 * HTTP error status codes (4xx and 5xx).
 * Used for error responses in {@link HttpResponseError}.
 *
 * Represents any HTTP error status code, typically in the 400-599 range.
 * Using `number` instead of literal union allows for:
 * - Custom/non-standard error codes from servers
 * - Better compatibility with HTTP libraries
 * - Runtime flexibility without type casting
 *
 * Common ranges:
 * - Client Error (400-499): The request contains bad syntax or cannot be fulfilled
 * - Server Error (500-599): The server failed to fulfill a valid request
 *
 * @public
 */
export type HttpErrorStatusCode = number;

/**
 * Expected response type format.
 *
 * - `json`: Parse response as JSON (default)
 * - `text`: Return response as plain text string
 * - `blob`: Return response as Blob (browser) or Buffer (Node.js)
 * - `arraybuffer`: Return response as ArrayBuffer
 * - `stream`: Return response as ReadableStream
 *
 * @public
 * @example
 * ```ts
 * // JSON response (most common)
 * const userResponse = await client.get<User>('/users/1', {
 *   responseType: 'json'
 * });
 *
 * // Download file as blob
 * const imageResponse = await client.get<Blob>('/images/logo.png', {
 *   responseType: 'blob'
 * });
 *
 * // Stream large response
 * const streamResponse = await client.get<ReadableStream>('/large-file', {
 *   responseType: 'stream'
 * });
 * ```
 */
export type HttpResponseType =
    | "json"
    | "text"
    | "blob"
    | "arraybuffer"
    | "stream";

/**
 * Credentials mode for cross-origin requests.
 *
 * - `omit`: Never send credentials (cookies, authorization headers)
 * - `same-origin`: Send credentials only for same-origin requests (default)
 * - `include`: Always send credentials, even for cross-origin requests
 *
 * @public
 * @example
 * ```ts
 * // Include credentials in cross-origin request
 * const response = await client.get('/api/data', {
 *   credentials: 'include'
 * });
 * ```
 */
export type HttpCredentialsMode = "omit" | "same-origin" | "include";
