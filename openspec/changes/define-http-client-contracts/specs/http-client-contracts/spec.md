## ADDED Requirements

### Requirement: Core HTTP Types

The system SHALL provide TypeScript type definitions for HTTP requests, responses, headers, and common data structures used across all HTTP operations.

#### Scenario: HTTP headers are represented as key-value pairs

- **GIVEN** an HTTP client needs to send custom headers
- **WHEN** the user creates a headers configuration
- **THEN** the system SHALL accept headers as a record of string keys to string or string array values
- **AND** the type SHALL support common headers like `Content-Type`, `Authorization`, `Accept`
- **AND** the type SHALL allow custom application-specific headers

#### Scenario: HTTP methods are type-safe enumerations

- **GIVEN** the HTTP client supports standard HTTP verbs
- **WHEN** code references an HTTP method
- **THEN** the system SHALL provide a type-safe enumeration or union type for methods
- **AND** it SHALL include at minimum: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`

#### Scenario: HTTP status codes are categorized by type

- **GIVEN** responses return with various status codes
- **WHEN** the system processes a response
- **THEN** status codes SHALL be categorized as:
  - Informational (100-199)
  - Success (200-299)
  - Redirection (300-399)
  - Client Error (400-499)
  - Server Error (500-599)

#### Scenario: Request body supports multiple content types

- **GIVEN** different endpoints accept different content types
- **WHEN** a request includes a body
- **THEN** the system SHALL support:
  - JSON objects (application/json)
  - Form data (application/x-www-form-urlencoded)
  - Multipart form data (multipart/form-data)
  - Plain text (text/plain)
  - Binary data (application/octet-stream)

### Requirement: Request Configuration Interface

The system SHALL provide a `HttpRequestConfig` interface that defines all configurable aspects of an HTTP request with type-safe properties and optional overrides.

#### Scenario: Base URL can be configured per request

- **GIVEN** a request needs to target a specific endpoint
- **WHEN** configuring the request
- **THEN** the config SHALL include an optional `baseUrl` property
- **AND** the `baseUrl` SHALL be combined with the endpoint path
- **AND** explicit `baseUrl` SHALL override client-level base URL

#### Scenario: Query parameters are type-safe objects

- **GIVEN** a request includes URL query parameters
- **WHEN** configuring query parameters
- **THEN** the config SHALL accept query params as a record of string keys to primitive values or arrays
- **AND** the system SHALL serialize params to URL-encoded format
- **AND** array values SHALL be serializable using configurable strategies (repeat key, comma-separated, bracket notation)

#### Scenario: Request timeout is configurable

- **GIVEN** different endpoints have different SLA requirements
- **WHEN** configuring a request
- **THEN** the config SHALL include an optional `timeout` property in milliseconds
- **AND** the request SHALL abort if timeout is exceeded
- **AND** timeout SHALL trigger a `HttpTimeoutError`

#### Scenario: Custom headers can be added per request

- **GIVEN** a specific request needs custom headers
- **WHEN** configuring request headers
- **THEN** the config SHALL accept headers as a `HttpHeaders` object
- **AND** request-level headers SHALL merge with client-level default headers
- **AND** request-level headers SHALL override client defaults when keys conflict

#### Scenario: Response type is configurable

- **GIVEN** different endpoints return different content types
- **WHEN** configuring expected response type
- **THEN** the config SHALL support response types:
  - `json` (parse as JSON)
  - `text` (return as string)
  - `blob` (return as Blob)
  - `arraybuffer` (return as ArrayBuffer)
  - `stream` (return as ReadableStream)

#### Scenario: Request can include credentials configuration

- **GIVEN** a request needs to include cookies or authentication
- **WHEN** configuring credentials
- **THEN** the config SHALL support credentials modes:
  - `omit` (never send credentials)
  - `same-origin` (send for same-origin only)
  - `include` (always send credentials)

### Requirement: Response Interface

The system SHALL provide a `HttpResponse<T>` interface that represents a successful HTTP response with type-safe data access and metadata.

#### Scenario: Response includes parsed data with generic type

- **GIVEN** a request completes successfully
- **WHEN** accessing the response
- **THEN** the response SHALL include a `data` property of generic type `<T>`
- **AND** the data SHALL be parsed according to the configured response type
- **AND** TypeScript SHALL infer the correct type based on the request method signature

#### Scenario: Response includes status information

- **GIVEN** a successful HTTP response
- **WHEN** inspecting the response
- **THEN** it SHALL include:
  - `status`: numeric HTTP status code (200-299)
  - `statusText`: human-readable status message
  - `ok`: boolean indicating success (true for 2xx)

#### Scenario: Response includes headers

- **GIVEN** a server returns response headers
- **WHEN** accessing response metadata
- **THEN** the response SHALL include a `headers` property
- **AND** headers SHALL be accessible as a `HttpHeaders` object
- **AND** header names SHALL be case-insensitive for lookups

#### Scenario: Response includes request metadata

- **GIVEN** debugging or logging requirements
- **WHEN** inspecting a response
- **THEN** it SHALL include a reference to the original request config
- **AND** it SHALL include the final URL (after redirects)

### Requirement: Error Hierarchy

The system SHALL provide a type-safe error hierarchy that categorizes all HTTP failures with sufficient context for error handling strategies.

#### Scenario: Base HttpError provides common error properties

- **GIVEN** any HTTP operation fails
- **WHEN** an error is thrown
- **THEN** it SHALL extend a base `HttpError` class
- **AND** it SHALL include:
  - `message`: human-readable error description
  - `name`: error class name
  - `request`: the original request configuration (sanitized of sensitive data)
  - `timestamp`: ISO 8601 timestamp of when error occurred

#### Scenario: Network errors are distinct from HTTP errors

- **GIVEN** a request fails before receiving a response
- **WHEN** a network-level failure occurs (timeout, DNS failure, connection refused)
- **THEN** the system SHALL throw `HttpNetworkError`
- **AND** it SHALL include:
  - `code`: error code (e.g., `ECONNREFUSED`, `ETIMEDOUT`, `ENOTFOUND`)
  - `message`: descriptive error message

#### Scenario: HTTP error responses include status and response data

- **GIVEN** a server returns an error status code (4xx or 5xx)
- **WHEN** processing the error response
- **THEN** the system SHALL throw `HttpResponseError<T>`
- **AND** it SHALL include:
  - `status`: HTTP status code
  - `statusText`: HTTP status message
  - `data`: parsed error response body (generic type `<T>`)
  - `headers`: response headers

#### Scenario: Specific error classes for common HTTP statuses

- **GIVEN** common HTTP error statuses need specific handling
- **WHEN** these statuses are encountered
- **THEN** the system SHALL provide specific error classes:
  - `HttpBadRequestError` (400)
  - `HttpUnauthorizedError` (401)
  - `HttpForbiddenError` (403)
  - `HttpNotFoundError` (404)
  - `HttpConflictError` (409)
  - `HttpUnprocessableEntityError` (422)
  - `HttpTooManyRequestsError` (429)
  - `HttpInternalServerError` (500)
  - `HttpServiceUnavailableError` (503)

#### Scenario: Timeout errors are identifiable

- **GIVEN** a request exceeds configured timeout
- **WHEN** the timeout is reached
- **THEN** the system SHALL throw `HttpTimeoutError`
- **AND** it SHALL indicate whether timeout occurred on request or response

#### Scenario: Abort/cancellation errors are identifiable

- **GIVEN** a request is manually cancelled
- **WHEN** the cancellation occurs
- **THEN** the system SHALL throw `HttpAbortError`
- **AND** it SHALL include the reason for cancellation if provided

### Requirement: Interceptor System

The system SHALL provide a flexible interceptor mechanism using the onFulfilled/onRejected pattern for transforming requests and responses, enabling cross-cutting concerns like authentication, logging, and data transformation. This design abstracts both axios-style interceptors and ky-style hooks.

#### Scenario: Request interceptors use onFulfilled/onRejected pattern

- **GIVEN** a request interceptor is registered
- **WHEN** registering the interceptor
- **THEN** it SHALL accept two callback parameters:
  - `onFulfilled`: handles successful request preparation
  - `onRejected` (optional): handles request preparation errors
- **AND** both callbacks SHALL support synchronous and asynchronous execution
- **AND** the pattern SHALL match Promise.then() semantics for familiarity

#### Scenario: Request onFulfilled transforms outgoing requests

- **GIVEN** a request interceptor with onFulfilled callback is registered
- **WHEN** a request is about to be sent
- **THEN** the onFulfilled callback SHALL receive the current `HttpRequestConfig`
- **AND** it SHALL return a modified or unmodified config (or Promise thereof)
- **AND** multiple onFulfilled callbacks SHALL execute in registration order
- **AND** the final config SHALL be used for the HTTP request

#### Scenario: Request onRejected handles preparation errors

- **GIVEN** a request interceptor with onRejected callback is registered
- **WHEN** request preparation fails (e.g., config validation error, token refresh failure)
- **THEN** the onRejected callback SHALL receive the error
- **AND** it can return a valid `HttpRequestConfig` to recover and continue
- **AND** it can throw/re-throw the error to abort the request
- **AND** if no onRejected handler is provided, errors SHALL propagate to the next interceptor's onRejected or abort the request

#### Scenario: Response interceptors use onFulfilled/onRejected pattern

- **GIVEN** a response interceptor is registered
- **WHEN** registering the interceptor
- **THEN** it SHALL accept two callback parameters:
  - `onFulfilled`: handles successful responses (2xx status codes)
  - `onRejected` (optional): handles error responses (4xx, 5xx) and network errors
- **AND** both callbacks SHALL support synchronous and asynchronous execution

#### Scenario: Response onFulfilled transforms successful responses

- **GIVEN** a response interceptor with onFulfilled callback is registered
- **WHEN** a successful response is received (2xx status)
- **THEN** the onFulfilled callback SHALL receive the current `HttpResponse<unknown>`
- **AND** it SHALL return a modified or unmodified response (or Promise thereof)
- **AND** multiple onFulfilled callbacks SHALL execute in registration order
- **AND** the final response SHALL be returned to the caller

#### Scenario: Response onRejected handles errors and can recover

- **GIVEN** a response interceptor with onRejected callback is registered
- **WHEN** an HTTP error occurs (4xx/5xx status or network failure)
- **THEN** the onRejected callback SHALL receive the `HttpError`
- **AND** it can return a valid `HttpResponse<unknown>` to recover from the error
- **AND** it can return a modified `HttpError` to continue the error chain
- **AND** it can throw/re-throw the error to propagate it
- **AND** if no onRejected handler is provided, errors SHALL propagate to the next interceptor's onRejected or be thrown to the caller

#### Scenario: Interceptor callbacks can be asynchronous

- **GIVEN** any interceptor callback (onFulfilled or onRejected)
- **WHEN** the callback needs to perform async operations (e.g., token refresh, async validation)
- **THEN** it SHALL support returning a Promise
- **AND** the system SHALL await the Promise before proceeding
- **AND** subsequent interceptors SHALL wait for previous ones to complete
- **AND** async errors SHALL be caught and passed to onRejected handlers

#### Scenario: Interceptors can be removed via handle

- **GIVEN** an interceptor is registered
- **WHEN** it is registered
- **THEN** registration SHALL return a unique `InterceptorHandle`
- **AND** the handle can be passed to a removal method
- **AND** removed interceptors SHALL not execute on subsequent requests
- **AND** removal SHALL be idempotent (removing same handle twice is safe)

#### Scenario: Interceptor execution order is deterministic

- **GIVEN** multiple request and response interceptors are registered
- **WHEN** a request/response is processed
- **THEN** request interceptor onFulfilled callbacks SHALL execute in registration order
- **AND** response interceptor onFulfilled callbacks SHALL execute in registration order
- **AND** onRejected callbacks SHALL execute in registration order when an error occurs
- **AND** order SHALL be preserved across async operations

#### Scenario: Interceptors map to different HTTP client implementations

- **GIVEN** different underlying HTTP libraries have different interceptor/hook models
- **WHEN** implementing the contract for axios
- **THEN** `addRequestInterceptor(onFulfilled, onRejected)` SHALL map to `axios.interceptors.request.use(onFulfilled, onRejected)`
- **AND** `addResponseInterceptor(onFulfilled, onRejected)` SHALL map to `axios.interceptors.response.use(onFulfilled, onRejected)`

#### Scenario: Interceptors map to ky hooks

- **GIVEN** ky uses a hooks-based model instead of interceptors
- **WHEN** implementing the contract for ky
- **THEN** `addRequestInterceptor(onFulfilled, undefined)` SHALL map to `hooks.beforeRequest`
- **AND** `addResponseInterceptor(onFulfilled, undefined)` SHALL map to `hooks.afterResponse`
- **AND** `addResponseInterceptor(undefined, onRejected)` SHALL map to `hooks.beforeError`
- **AND** request onRejected SHALL be emulated (ky doesn't have native support)
- **AND** the abstraction SHALL provide consistent behavior across implementations

### Requirement: Retry Configuration

The system SHALL provide built-in retry logic with configurable policies for handling transient failures, with sensible defaults and extension points for custom strategies.

#### Scenario: Retry attempts are configurable

- **GIVEN** a client is configured with retry settings
- **WHEN** a request fails with a retryable error
- **THEN** the system SHALL retry up to the configured `attempts` count
- **AND** the default SHALL be 0 (no retries)
- **AND** the maximum practical limit SHOULD be documented (e.g., 10)

#### Scenario: Retry delay can be fixed or dynamic

- **GIVEN** retry is configured
- **WHEN** determining delay between retries
- **THEN** the config SHALL support:
  - Fixed delay in milliseconds
  - Function taking attempt number and returning delay
  - Common strategies: exponential backoff, linear backoff, jitter

#### Scenario: Retry condition is customizable

- **GIVEN** not all errors should trigger retry
- **WHEN** configuring retry behavior
- **THEN** the config SHALL accept a `condition` function
- **AND** the function SHALL receive the `HttpError`
- **AND** the function SHALL return boolean indicating whether to retry
- **AND** the default condition SHALL retry on:
  - Network errors (timeouts, connection failures)
  - 5xx server errors
  - 429 Too Many Requests
- **AND** the default SHALL NOT retry on:
  - 4xx client errors (except 429)
  - Aborted requests

#### Scenario: Retry provides lifecycle hooks

- **GIVEN** application needs to observe retry behavior
- **WHEN** configuring retry
- **THEN** the config SHALL provide hooks:
  - `onRetry`: called before each retry attempt with error and attempt number
  - `onRetryFailed`: called when all retry attempts are exhausted
- **AND** hooks SHALL be optional
- **AND** hooks SHALL not block retry execution

#### Scenario: Retry respects Retry-After header

- **GIVEN** server returns 429 or 503 with `Retry-After` header
- **WHEN** retry delay is calculated
- **THEN** the system SHALL respect the `Retry-After` value
- **AND** it SHALL support both delay-seconds and HTTP-date formats
- **AND** custom delay configuration SHALL be overridden by `Retry-After`

### Requirement: Request Deduplication

The system SHALL provide request deduplication to prevent redundant concurrent requests to the same endpoint, reducing server load and improving client performance.

#### Scenario: Concurrent identical requests are deduplicated

- **GIVEN** deduplication is enabled
- **WHEN** multiple identical requests are made concurrently
- **THEN** only one actual HTTP request SHALL be sent
- **AND** all callers SHALL receive the same Promise
- **AND** all callers SHALL receive the same response when it resolves

#### Scenario: Request identity is based on key components

- **GIVEN** two requests need to be compared for deduplication
- **WHEN** determining if requests are identical
- **THEN** requests SHALL be considered identical if they match:
  - HTTP method
  - Full URL (including query parameters)
  - Request body (deep equality)
  - Critical headers (configurable, default: `Authorization`, `Content-Type`)

#### Scenario: Deduplication key is customizable

- **GIVEN** default identity matching is insufficient
- **WHEN** configuring deduplication
- **THEN** the config SHALL accept a custom key generator function
- **AND** the function SHALL receive the request config
- **AND** the function SHALL return a string key for deduplication
- **AND** requests with identical keys SHALL be deduplicated

#### Scenario: Deduplication cache has TTL

- **GIVEN** a request completes successfully
- **WHEN** the response is cached for deduplication
- **THEN** the cache entry SHALL expire after a configurable TTL
- **AND** the default TTL SHALL be 0 (immediate expiration after Promise resolves)
- **AND** subsequent requests after TTL SHALL not be deduplicated

#### Scenario: Deduplication can be disabled per request

- **GIVEN** a specific request should not be deduplicated
- **WHEN** configuring the request
- **THEN** the config SHALL include a `deduplicate: false` option
- **AND** the request SHALL bypass deduplication logic
- **AND** it SHALL execute independently even if identical requests are in flight

#### Scenario: Failed requests are not cached for deduplication

- **GIVEN** a deduplicated request fails
- **WHEN** the error is returned
- **THEN** all waiting callers SHALL receive the same error
- **AND** the deduplication cache SHALL be cleared for that key
- **AND** subsequent requests SHALL attempt a new HTTP call

### Requirement: Cache Layer Abstraction

The system SHALL provide an abstraction for HTTP response caching with pluggable cache implementations and fine-grained control over cache behavior.

#### Scenario: Cache interface is implementation-agnostic

- **GIVEN** different applications need different cache backends
- **WHEN** implementing a cache adapter
- **THEN** it SHALL implement a `HttpCache` interface
- **AND** the interface SHALL define methods:
  - `get(key: string): Promise<CacheEntry | null>`
  - `set(key: string, value: CacheEntry, ttl?: number): Promise<void>`
  - `delete(key: string): Promise<void>`
  - `clear(): Promise<void>`

#### Scenario: Cache entries include metadata

- **GIVEN** cached responses need validation
- **WHEN** storing a response in cache
- **THEN** the cache entry SHALL include:
  - `data`: the cached response data
  - `headers`: response headers (for ETag, Last-Modified)
  - `timestamp`: when the response was cached
  - `ttl`: time-to-live in milliseconds
  - `etag`: optional ETag for revalidation

#### Scenario: Cache key generation is customizable

- **GIVEN** default cache keys may not suit all use cases
- **WHEN** configuring cache
- **THEN** the config SHALL accept a custom key generator function
- **AND** the function SHALL receive the request config
- **AND** the function SHALL return a string cache key
- **AND** the default generator SHALL create keys from: method + URL + query params

#### Scenario: Cache respects HTTP cache headers

- **GIVEN** server includes cache control headers
- **WHEN** caching a response
- **THEN** the system SHALL respect:
  - `Cache-Control: no-cache` (skip cache)
  - `Cache-Control: no-store` (skip cache and don't store)
  - `Cache-Control: max-age=N` (use as TTL)
  - `Expires` header (fallback TTL)
- **AND** explicit TTL configuration SHALL override cache headers

#### Scenario: Stale-while-revalidate pattern is supported

- **GIVEN** application tolerates stale data while fetching fresh
- **WHEN** a cached response is stale
- **THEN** the system SHALL:
  - Return stale data immediately if `staleWhileRevalidate` is enabled
  - Trigger background revalidation
  - Update cache with fresh data when revalidation completes

#### Scenario: Cache invalidation is explicit

- **GIVEN** cached data becomes invalid
- **WHEN** a mutation request succeeds (POST, PUT, PATCH, DELETE)
- **THEN** the config SHALL support `invalidateCache` patterns
- **AND** patterns SHALL match cache keys to invalidate
- **AND** wildcard patterns SHALL be supported (e.g., `/users/*`)

#### Scenario: Cache can be bypassed per request

- **GIVEN** a specific request needs fresh data
- **WHEN** configuring the request
- **THEN** the config SHALL include `cache: false` option
- **AND** the request SHALL bypass cache read
- **AND** the response SHALL still be cached for future requests (unless also `no-store`)

### Requirement: HTTP Client Interface

The system SHALL provide a `HttpClient` interface that defines the contract for making HTTP requests with all standard methods and type-safe generics.

#### Scenario: GET requests return typed responses

- **GIVEN** a GET request to a typed endpoint
- **WHEN** calling `client.get<User>('/users/123')`
- **THEN** the return type SHALL be `Promise<HttpResponse<User>>`
- **AND** the response data SHALL be type-safe as `User`
- **AND** the method SHALL accept optional request config as second parameter

#### Scenario: POST requests send body and return typed response

- **GIVEN** a POST request with request body
- **WHEN** calling `client.post<User, CreateUserDto>('/users', { name: 'Alice' })`
- **THEN** the body SHALL be serialized and sent with the request
- **AND** the return type SHALL be `Promise<HttpResponse<User>>`
- **AND** the method SHALL accept optional request config as third parameter

#### Scenario: PUT requests update resources with full replacement

- **GIVEN** a PUT request to update a resource
- **WHEN** calling `client.put<User, UpdateUserDto>('/users/123', { name: 'Bob' })`
- **THEN** the body SHALL replace the resource at the endpoint
- **AND** the return type SHALL be `Promise<HttpResponse<User>>`
- **AND** the method SHALL accept optional request config as third parameter

#### Scenario: PATCH requests partially update resources

- **GIVEN** a PATCH request to partially modify a resource
- **WHEN** calling `client.patch<User, Partial<User>>('/users/123', { name: 'Charlie' })`
- **THEN** the body SHALL be merged with existing resource
- **AND** the return type SHALL be `Promise<HttpResponse<User>>`
- **AND** the method SHALL accept optional request config as third parameter

#### Scenario: DELETE requests remove resources

- **GIVEN** a DELETE request to remove a resource
- **WHEN** calling `client.delete('/users/123')`
- **THEN** the resource SHALL be deleted
- **AND** the return type SHALL be `Promise<HttpResponse<void>>`
- **AND** the method SHALL accept optional request config as second parameter

#### Scenario: HEAD requests retrieve metadata only

- **GIVEN** a HEAD request to check resource existence
- **WHEN** calling `client.head('/users/123')`
- **THEN** only headers SHALL be retrieved (no response body)
- **AND** the return type SHALL be `Promise<HttpResponse<void>>`
- **AND** the method SHALL accept optional request config as second parameter

#### Scenario: OPTIONS requests discover allowed methods

- **GIVEN** an OPTIONS request to discover endpoint capabilities
- **WHEN** calling `client.options('/users')`
- **THEN** the response SHALL include `Allow` header with supported methods
- **AND** the return type SHALL be `Promise<HttpResponse<void>>`
- **AND** the method SHALL accept optional request config as second parameter

### Requirement: Client Configuration and Factory

The system SHALL provide a factory pattern for creating HTTP client instances with base configuration that persists across requests while allowing per-request overrides.

#### Scenario: Factory creates client with base configuration

- **GIVEN** an application needs a configured HTTP client
- **WHEN** calling `createHttpClient(options)`
- **THEN** the factory SHALL return an instance implementing `HttpClient`
- **AND** the instance SHALL use provided `options` as defaults for all requests

#### Scenario: Base URL is applied to all requests

- **GIVEN** a client created with `{ baseUrl: 'https://api.example.com' }`
- **WHEN** making a request to `/users`
- **THEN** the full URL SHALL be `https://api.example.com/users`
- **AND** absolute URLs SHALL override base URL
- **AND** base URL trailing slashes SHALL be normalized

#### Scenario: Default headers are merged with request headers

- **GIVEN** a client created with default headers `{ 'X-API-Key': 'secret' }`
- **WHEN** making a request with headers `{ 'Content-Type': 'application/json' }`
- **THEN** the request SHALL include both headers
- **AND** request headers SHALL override defaults on key collision
- **AND** header names SHALL be case-insensitive for merging

#### Scenario: Default timeout applies unless overridden

- **GIVEN** a client created with `{ timeout: 5000 }`
- **WHEN** making a request without specifying timeout
- **THEN** the request SHALL use 5000ms timeout
- **AND** per-request timeout SHALL override default

#### Scenario: Interceptors configured at client level apply to all requests

- **GIVEN** a client created with request/response interceptors
- **WHEN** any request is made
- **THEN** the interceptors SHALL execute for that request
- **AND** interceptors SHALL persist for the lifetime of the client instance

#### Scenario: Retry configuration is inherited from client options

- **GIVEN** a client created with `{ retry: { attempts: 3 } }`
- **WHEN** a request fails with retryable error
- **THEN** the request SHALL retry up to 3 times
- **AND** per-request retry config SHALL override client default

#### Scenario: Multiple client instances are independent

- **GIVEN** two clients created with different configurations
- **WHEN** making requests with each client
- **THEN** each client SHALL use its own configuration
- **AND** interceptors SHALL not leak between instances
- **AND** cache SHALL be isolated per instance (unless shared explicitly)

#### Scenario: Client instance is immutable after creation

- **GIVEN** a client instance is created
- **WHEN** attempting to modify client configuration
- **THEN** the modification SHALL not affect the existing instance
- **AND** a new client instance SHALL be created for configuration changes
- **AND** immutability ensures thread-safety and predictable behavior
