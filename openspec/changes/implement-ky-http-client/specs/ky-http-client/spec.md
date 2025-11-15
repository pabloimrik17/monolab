# ky-http-client

Specification for the ky-based HTTP client implementation.

## ADDED Requirements

### Requirement: KyHttpClient Implementation

The system SHALL provide a KyHttpClient class that implements the IHttpClient interface using ky as the underlying HTTP library.

#### Scenario: Basic client instantiation

**GIVEN** the http-client package is installed
**WHEN** creating a ky client instance
**THEN** it SHALL accept an optional HttpClientConfig parameter
**AND** it SHALL initialize with default configuration if no config is provided
**AND** it SHALL create an internal ky instance with merged configuration
**AND** it SHALL return an object implementing IHttpClient interface

#### Scenario: Environment-aware ky selection

**GIVEN** the client is being instantiated
**WHEN** detecting the runtime environment
**THEN** it SHALL use `ky` package in browser environments
**AND** it SHALL use `ky-universal` package in Node.js environments
**AND** detection SHALL be based on `typeof process !== 'undefined' && process.versions?.node`
**AND** the selection SHALL be transparent to consumers

#### Scenario: Base URL configuration

**GIVEN** a KyHttpClient is instantiated with baseUrl: 'https://api.example.com'
**WHEN** making a request to '/users'
**THEN** the final URL SHALL be 'https://api.example.com/users'
**AND** relative paths SHALL be automatically resolved
**AND** absolute URLs SHALL override the baseUrl

#### Scenario: Default headers configuration

**GIVEN** a KyHttpClient is instantiated with default headers { 'X-API-Key': 'secret' }
**WHEN** making any request without specifying headers
**THEN** the request SHALL include 'X-API-Key: secret' header
**AND** request-specific headers SHALL merge with defaults
**AND** request-specific headers SHALL override defaults when keys conflict

---

### Requirement: Standard HTTP Methods

The system SHALL implement all standard HTTP methods (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS) with type-safe request/response handling.

#### Scenario: GET request execution

**GIVEN** a configured KyHttpClient
**WHEN** calling client.get<User>('/users/123')
**THEN** it SHALL execute an HTTP GET request
**AND** it SHALL return Promise<HttpResponse<User>>
**AND** the response data SHALL be typed as User
**AND** the response SHALL include status, statusText, headers, and data properties

#### Scenario: POST request with JSON body

**GIVEN** a configured KyHttpClient
**WHEN** calling client.post<User>('/users', { json: { name: 'John' } })
**THEN** it SHALL execute an HTTP POST request
**AND** it SHALL set Content-Type header to 'application/json'
**AND** it SHALL serialize the body as JSON
**AND** it SHALL return Promise<HttpResponse<User>>

#### Scenario: PUT request with request config override

**GIVEN** a configured KyHttpClient with default timeout of 5000ms
**WHEN** calling client.put('/users/123', { timeout: 10000, json: { name: 'Jane' } })
**THEN** it SHALL use timeout of 10000ms for this specific request
**AND** other default config values SHALL remain unchanged
**AND** the request SHALL execute normally

#### Scenario: DELETE request without body

**GIVEN** a configured KyHttpClient
**WHEN** calling client.delete('/users/123')
**THEN** it SHALL execute an HTTP DELETE request
**AND** it SHALL not send a request body
**AND** it SHALL return Promise<HttpResponse<void>>

#### Scenario: PATCH request with partial update

**GIVEN** a configured KyHttpClient
**WHEN** calling client.patch<User>('/users/123', { json: { email: 'new@example.com' } })
**THEN** it SHALL execute an HTTP PATCH request
**AND** it SHALL send only the specified fields
**AND** it SHALL return Promise<HttpResponse<User>>

#### Scenario: HEAD request for metadata

**GIVEN** a configured KyHttpClient
**WHEN** calling client.head('/users/123')
**THEN** it SHALL execute an HTTP HEAD request
**AND** it SHALL return response headers without body
**AND** it SHALL return Promise<HttpResponse<void>>

#### Scenario: OPTIONS request for CORS preflight

**GIVEN** a configured KyHttpClient
**WHEN** calling client.options('/users')
**THEN** it SHALL execute an HTTP OPTIONS request
**AND** it SHALL return allowed methods and headers
**AND** it SHALL return Promise<HttpResponse<void>>

---

### Requirement: Interceptor Bridge

The system SHALL map ky hooks (beforeRequest, afterResponse, beforeError) to the interceptor contract (onFulfilled/onRejected pattern).

#### Scenario: Request interceptor with onFulfilled callback

**GIVEN** a KyHttpClient instance
**WHEN** calling client.addRequestInterceptor(config => ({ ...config, headers: { ...config.headers, 'X-Custom': 'value' } }))
**THEN** the callback SHALL be registered as a ky beforeRequest hook
**AND** the callback SHALL execute before every request
**AND** it SHALL receive the current HttpRequestConfig
**AND** it SHALL return modified or unmodified config
**AND** multiple interceptors SHALL execute in registration order

#### Scenario: Request interceptor with onRejected callback

**GIVEN** a KyHttpClient instance
**WHEN** calling client.addRequestInterceptor(undefined, error => { console.error(error); throw error; })
**THEN** the onRejected callback SHALL be emulated (ky doesn't have native support)
**AND** it SHALL execute when request preparation fails
**AND** it SHALL receive the error object
**AND** it can throw/re-throw to abort the request
**AND** it can return valid config to recover

#### Scenario: Response interceptor with onFulfilled callback

**GIVEN** a KyHttpClient instance
**WHEN** calling client.addResponseInterceptor(response => ({ ...response, data: transform(response.data) }))
**THEN** the callback SHALL be registered as a ky afterResponse hook
**AND** it SHALL execute for successful responses (2xx status codes)
**AND** it SHALL receive the current HttpResponse
**AND** it SHALL return modified or unmodified response

#### Scenario: Response interceptor with onRejected callback

**GIVEN** a KyHttpClient instance
**WHEN** calling client.addResponseInterceptor(undefined, error => { log(error); throw error; })
**THEN** the callback SHALL be registered as a ky beforeError hook
**AND** it SHALL execute for error responses (4xx, 5xx) and network errors
**AND** it SHALL receive the HttpError object
**AND** it can return HttpResponse to recover from error
**AND** it can throw/re-throw to propagate error

#### Scenario: Interceptor removal

**GIVEN** an interceptor is registered and returns handle ID
**WHEN** calling client.removeInterceptor(handle)
**THEN** the interceptor SHALL be removed from ky hooks
**AND** it SHALL not execute on subsequent requests
**AND** removal SHALL be idempotent

#### Scenario: Async interceptor execution

**GIVEN** an async request interceptor is registered
**WHEN** a request is made
**THEN** the system SHALL await the interceptor Promise
**AND** subsequent interceptors SHALL wait for previous ones to complete
**AND** the request SHALL not proceed until all interceptors finish

---

### Requirement: Error Mapping

The system SHALL map ky errors (HTTPError, TimeoutError) to the HttpError hierarchy defined in the contracts.

#### Scenario: Mapping 400 Bad Request

**GIVEN** a request returns HTTP 400 status
**WHEN** ky throws HTTPError with status 400
**THEN** the system SHALL map it to HttpBadRequestError
**AND** it SHALL preserve the original response body
**AND** it SHALL preserve status, statusText, and headers
**AND** it SHALL include original request config (sanitized)

#### Scenario: Mapping 401 Unauthorized

**GIVEN** a request returns HTTP 401 status
**WHEN** ky throws HTTPError with status 401
**THEN** the system SHALL map it to HttpUnauthorizedError
**AND** it SHALL include error details for authentication handling

#### Scenario: Mapping 404 Not Found

**GIVEN** a request returns HTTP 404 status
**WHEN** ky throws HTTPError with status 404
**THEN** the system SHALL map it to HttpNotFoundError

#### Scenario: Mapping 500 Internal Server Error

**GIVEN** a request returns HTTP 500 status
**WHEN** ky throws HTTPError with status 500
**THEN** the system SHALL map it to HttpInternalServerError
**AND** it SHALL categorize as server error (not client error)

#### Scenario: Mapping TimeoutError

**GIVEN** a request exceeds configured timeout
**WHEN** ky throws TimeoutError
**THEN** the system SHALL map it to HttpTimeoutError
**AND** it SHALL indicate whether timeout occurred on request or response

#### Scenario: Mapping AbortError

**GIVEN** a request is manually cancelled via AbortController
**WHEN** ky throws AbortError
**THEN** the system SHALL map it to HttpAbortError
**AND** it SHALL include cancellation reason if provided

#### Scenario: Mapping network errors

**GIVEN** a request fails due to network issues (DNS failure, connection refused)
**WHEN** ky throws a network error
**THEN** the system SHALL map it to HttpNetworkError
**AND** it SHALL include error code (ECONNREFUSED, ETIMEDOUT, ENOTFOUND)
**AND** it SHALL provide descriptive error message

#### Scenario: Generic error fallback

**GIVEN** ky throws an unexpected error type
**WHEN** the error doesn't match known error types
**THEN** the system SHALL wrap it in base HttpError class
**AND** it SHALL preserve the original error message and stack trace

---

### Requirement: Retry Policy Integration

The system SHALL integrate ky's built-in retry mechanism with custom retry policies defined in the contracts.

#### Scenario: Configuring retry policy

**GIVEN** a KyHttpClient is created with retry config { maxAttempts: 3, backoff: 'exponential' }
**WHEN** the client is initialized
**THEN** it SHALL configure ky retry options with limit: 3
**AND** it SHALL enable exponential backoff
**AND** retry SHALL apply to network failures by default

#### Scenario: Retry on transient network failure

**GIVEN** a request fails with ECONNRESET
**WHEN** retry policy allows network error retries
**THEN** the system SHALL retry the request up to maxAttempts
**AND** it SHALL apply exponential backoff delay between attempts
**AND** it SHALL execute beforeRetry hook before each retry

#### Scenario: Retry on specific status codes

**GIVEN** retry policy includes statusCodes: [429, 503]
**WHEN** a request returns 429 Too Many Requests
**THEN** the system SHALL retry the request
**AND** it SHALL respect rate limit headers (Retry-After)
**AND** it SHALL not retry on 4xx errors not in the list

#### Scenario: Custom shouldRetry logic

**GIVEN** retry policy includes shouldRetry callback
**WHEN** a request fails
**THEN** the callback SHALL receive error and attempt number
**AND** it SHALL return boolean indicating whether to retry
**AND** custom logic SHALL override default retry behavior

#### Scenario: beforeRetry hook execution

**GIVEN** retry policy includes beforeRetry hook
**WHEN** a retry is about to occur
**THEN** the hook SHALL execute with request, error, and attempt number
**AND** it can modify request config for retry (e.g., refresh token)
**AND** it SHALL support async operations

#### Scenario: afterRetry hook execution

**GIVEN** retry policy includes afterRetry hook
**WHEN** a retry completes (success or failure)
**THEN** the hook SHALL execute with result and attempt number
**AND** it can perform logging or metrics collection

#### Scenario: Max delay enforcement

**GIVEN** retry policy includes maxDelay: 10000 (10 seconds)
**WHEN** exponential backoff calculates a delay exceeding 10 seconds
**THEN** the delay SHALL be capped at 10 seconds
**AND** subsequent retries SHALL use the capped delay

#### Scenario: Retry budget exhaustion

**GIVEN** retry policy maxAttempts: 3
**WHEN** all 3 attempts fail
**THEN** the system SHALL throw the last error received
**AND** it SHALL not attempt further retries
**AND** error SHALL indicate all retries were exhausted

---

### Requirement: Request Deduplication

The system SHALL implement request deduplication to prevent redundant concurrent requests to the same endpoint.

#### Scenario: Deduplication enabled by default

**GIVEN** a KyHttpClient is created with deduplication: { enabled: true }
**WHEN** the client is initialized
**THEN** deduplication SHALL be active for all requests
**AND** a pending requests map SHALL be created

#### Scenario: Deduplicating identical concurrent GET requests

**GIVEN** deduplication is enabled
**WHEN** two GET requests to '/users/123' are made concurrently
**THEN** only one network request SHALL be executed
**AND** both callers SHALL receive the same response Promise
**AND** the response SHALL be returned to both callers when available

#### Scenario: Deduplicating POST requests with identical bodies

**GIVEN** deduplication strategy: 'url-body'
**WHEN** two POST requests to '/users' with identical JSON bodies are made concurrently
**THEN** only one network request SHALL be executed
**AND** both callers SHALL receive the same response

#### Scenario: Different requests not deduplicated

**GIVEN** deduplication is enabled
**WHEN** GET '/users/123' and GET '/users/456' are made concurrently
**THEN** both requests SHALL execute independently
**AND** each SHALL receive its own response

#### Scenario: Deduplication cache cleanup

**GIVEN** a deduplicated request completes
**WHEN** the response Promise resolves or rejects
**THEN** the entry SHALL be removed from pending requests map
**AND** subsequent requests to the same endpoint SHALL execute new request

#### Scenario: Deduplication key strategy: url

**GIVEN** deduplication keyStrategy: 'url'
**WHEN** generating request fingerprint
**THEN** it SHALL hash only method + URL
**AND** different headers or bodies SHALL be ignored

#### Scenario: Deduplication key strategy: url-body

**GIVEN** deduplication keyStrategy: 'url-body'
**WHEN** generating request fingerprint
**THEN** it SHALL hash method + URL + request body
**AND** different headers SHALL be ignored

#### Scenario: Deduplication key strategy: url-body-headers

**GIVEN** deduplication keyStrategy: 'url-body-headers'
**WHEN** generating request fingerprint
**THEN** it SHALL hash method + URL + request body + headers
**AND** even minor header differences SHALL prevent deduplication

#### Scenario: Deduplication TTL expiration

**GIVEN** deduplication TTL: 5000 (5 seconds)
**WHEN** a deduplicated request takes longer than 5 seconds
**THEN** subsequent identical requests SHALL execute new request
**AND** old pending promise SHALL be cleaned up

---

### Requirement: Pluggable Cache Layer

The system SHALL provide a pluggable cache layer with an in-memory default implementation supporting TTL and LRU eviction.

#### Scenario: In-memory cache initialization

**GIVEN** a KyHttpClient is created with cache: { enabled: true }
**WHEN** the client is initialized
**THEN** an in-memory cache instance SHALL be created
**AND** it SHALL use LRU eviction strategy
**AND** default max size SHALL be 100 entries

#### Scenario: Cache hit on GET request

**GIVEN** a GET request to '/users/123' was previously cached
**WHEN** the same GET request is made again
**THEN** the cached response SHALL be returned immediately
**AND** no network request SHALL be executed
**AND** cache hit SHALL be logged

#### Scenario: Cache miss on first request

**GIVEN** a GET request to '/users/123' has not been cached
**WHEN** the request is made
**THEN** it SHALL execute a network request
**AND** the successful response SHALL be cached
**AND** cache entry SHALL include TTL

#### Scenario: Cache TTL expiration

**GIVEN** a cached response with TTL: 60000 (1 minute)
**WHEN** 61 seconds have passed
**THEN** the cached entry SHALL be considered expired
**AND** the next request SHALL execute a new network request
**AND** the new response SHALL replace the expired cache entry

#### Scenario: LRU eviction on max size

**GIVEN** cache max size is 100 entries
**WHEN** the 101st unique request is cached
**THEN** the least recently used entry SHALL be evicted
**AND** the new entry SHALL be cached
**AND** eviction SHALL maintain cache size at 100

#### Scenario: Cache key generation

**GIVEN** a request with method, URL, and query params
**WHEN** generating cache key
**THEN** it SHALL hash method + full URL (including query params)
**AND** identical requests SHALL produce identical keys
**AND** different requests SHALL produce different keys

#### Scenario: Per-request cache override (no-cache)

**GIVEN** a request config includes cache: 'no-cache'
**WHEN** the request is executed
**THEN** it SHALL bypass cache read
**AND** it SHALL execute a fresh network request
**AND** it SHALL not store the response in cache

#### Scenario: Per-request cache override (no-store)

**GIVEN** a request config includes cache: 'no-store'
**WHEN** the request is executed
**THEN** it SHALL read from cache if available
**AND** it SHALL not write the response to cache

#### Scenario: Cache only caches successful responses

**GIVEN** a request returns HTTP 404 error
**WHEN** the request completes
**THEN** the error response SHALL not be cached
**AND** subsequent identical requests SHALL execute network request

#### Scenario: Manual cache invalidation

**GIVEN** a cached entry exists for '/users/123'
**WHEN** calling cache.delete('/users/123')
**THEN** the entry SHALL be removed from cache
**AND** the next request SHALL execute network request

#### Scenario: Cache clear

**GIVEN** the cache contains multiple entries
**WHEN** calling cache.clear()
**THEN** all cache entries SHALL be removed
**AND** cache size SHALL be 0

#### Scenario: Custom cache implementation

**GIVEN** a custom cache implementation (e.g., Redis)
**WHEN** creating KyHttpClient with cache: new RedisCache()
**THEN** the custom cache SHALL be used instead of in-memory cache
**AND** all cache operations SHALL route to the custom implementation

---

### Requirement: Factory Function Export

The system SHALL export a factory function for creating KyHttpClient instances with persistent configuration.

#### Scenario: Factory function signature

**GIVEN** the http-client package exports createKyClient
**WHEN** calling createKyClient(config)
**THEN** it SHALL accept optional HttpClientConfig parameter
**AND** it SHALL return an object implementing IHttpClient interface
**AND** implementation class (KyHttpClient) SHALL be hidden from consumers

#### Scenario: Creating client with default config

**GIVEN** no config is provided
**WHEN** calling createKyClient()
**THEN** it SHALL create a client with sensible defaults:
- timeout: 30000 (30 seconds)
- retry: { maxAttempts: 0 } (no retry by default)
- cache: { enabled: false }
- deduplication: { enabled: false }

#### Scenario: Creating client with custom base URL

**GIVEN** calling createKyClient({ baseUrl: 'https://api.example.com' })
**WHEN** making requests
**THEN** all relative URLs SHALL be resolved against base URL
**AND** base URL SHALL persist across all requests

#### Scenario: Creating multiple independent clients

**GIVEN** two clients created with different configs
**WHEN** using both clients
**THEN** each SHALL maintain its own configuration
**AND** changes to one client SHALL not affect the other
**AND** each SHALL have independent interceptor chains

#### Scenario: Tree-shaking optimization

**GIVEN** a project imports only createKyClient
**WHEN** building the project
**THEN** unused parts of http-client package SHALL be excluded
**AND** bundle size SHALL be minimized
