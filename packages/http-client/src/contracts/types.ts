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
 * Common HTTP status codes categorized by type.
 *
 * - Informational (100-199): Request received, continuing process
 * - Success (200-299): The action was successfully received, understood, and accepted
 * - Redirection (300-399): Further action must be taken to complete the request
 * - Client Error (400-499): The request contains bad syntax or cannot be fulfilled
 * - Server Error (500-599): The server failed to fulfill a valid request
 *
 * @public
 */
export type HttpStatusCode =
    // Informational (100-199)
    | 100 // Continue
    | 101 // Switching Protocols
    | 102 // Processing
    | 103 // Early Hints
    // Success (200-299)
    | 200 // OK
    | 201 // Created
    | 202 // Accepted
    | 203 // Non-Authoritative Information
    | 204 // No Content
    | 205 // Reset Content
    | 206 // Partial Content
    | 207 // Multi-Status
    | 208 // Already Reported
    | 226 // IM Used
    // Redirection (300-399)
    | 300 // Multiple Choices
    | 301 // Moved Permanently
    | 302 // Found
    | 303 // See Other
    | 304 // Not Modified
    | 305 // Use Proxy
    | 307 // Temporary Redirect
    | 308 // Permanent Redirect
    // Client Error (400-499)
    | 400 // Bad Request
    | 401 // Unauthorized
    | 402 // Payment Required
    | 403 // Forbidden
    | 404 // Not Found
    | 405 // Method Not Allowed
    | 406 // Not Acceptable
    | 407 // Proxy Authentication Required
    | 408 // Request Timeout
    | 409 // Conflict
    | 410 // Gone
    | 411 // Length Required
    | 412 // Precondition Failed
    | 413 // Payload Too Large
    | 414 // URI Too Long
    | 415 // Unsupported Media Type
    | 416 // Range Not Satisfiable
    | 417 // Expectation Failed
    | 418 // I'm a teapot
    | 421 // Misdirected Request
    | 422 // Unprocessable Entity
    | 423 // Locked
    | 424 // Failed Dependency
    | 425 // Too Early
    | 426 // Upgrade Required
    | 428 // Precondition Required
    | 429 // Too Many Requests
    | 431 // Request Header Fields Too Large
    | 451 // Unavailable For Legal Reasons
    // Server Error (500-599)
    | 500 // Internal Server Error
    | 501 // Not Implemented
    | 502 // Bad Gateway
    | 503 // Service Unavailable
    | 504 // Gateway Timeout
    | 505 // HTTP Version Not Supported
    | 506 // Variant Also Negotiates
    | 507 // Insufficient Storage
    | 508 // Loop Detected
    | 510 // Not Extended
    | 511; // Network Authentication Required

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
