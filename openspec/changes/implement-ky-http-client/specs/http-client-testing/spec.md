# http-client-testing

Specification for testing strategy and infrastructure for the HTTP client implementation.

## ADDED Requirements

### Requirement: Unit Tests for HTTP Methods

The system SHALL provide comprehensive unit tests for all HTTP methods with type-safe mocking.

#### Scenario: Testing GET request

**GIVEN** a test suite for KyHttpClient
**WHEN** testing the get() method
**THEN** it SHALL verify correct HTTP method (GET)
**AND** it SHALL verify URL construction
**AND** it SHALL verify response parsing
**AND** it SHALL verify TypeScript types are correct

#### Scenario: Testing POST request with JSON body

**GIVEN** a test for POST method
**WHEN** calling post('/users', { json: { name: 'John' } })
**THEN** it SHALL verify Content-Type header is 'application/json'
**AND** it SHALL verify body is correctly serialized
**AND** it SHALL verify response type matches generic parameter

#### Scenario: Testing error responses

**GIVEN** a mocked 404 error response
**WHEN** executing a request
**THEN** it SHALL verify HttpNotFoundError is thrown
**AND** it SHALL verify error includes status, statusText, data
**AND** it SHALL verify error type is correct

---

### Requirement: MSW Integration Testing

The system SHALL use Mock Service Worker (MSW) for integration testing with realistic HTTP scenarios.

#### Scenario: MSW setup for browser tests

**GIVEN** running tests in browser environment
**WHEN** initializing MSW
**THEN** it SHALL set up service worker for request interception
**AND** it SHALL register HTTP handlers for test endpoints
**AND** it SHALL start before tests run

#### Scenario: MSW setup for Node.js tests

**GIVEN** running tests in Node.js environment
**WHEN** initializing MSW
**THEN** it SHALL set up HTTP server for request interception
**AND** it SHALL listen on localhost
**AND** it SHALL clean up after tests complete

#### Scenario: Mocking successful response

**GIVEN** MSW handler for GET '/users/123'
**WHEN** client.get<User>('/users/123') is called
**THEN** MSW SHALL intercept the request
**AND** it SHALL return mocked User data
**AND** status SHALL be 200

#### Scenario: Mocking error response

**GIVEN** MSW handler for GET '/users/999' returns 404
**WHEN** client.get('/users/999') is called
**THEN** MSW SHALL intercept the request
**AND** it SHALL return 404 status
**AND** client SHALL throw HttpNotFoundError

#### Scenario: Mocking network failure

**GIVEN** MSW handler simulates network error
**WHEN** client.get('/users/123') is called
**THEN** MSW SHALL reject the request
**AND** client SHALL throw HttpNetworkError

#### Scenario: Mocking delayed response

**GIVEN** MSW handler includes delay(2000)
**WHEN** client.get('/users/123') is called with timeout: 1000
**THEN** request SHALL timeout after 1 second
**AND** client SHALL throw HttpTimeoutError

---

### Requirement: Interceptor Lifecycle Tests

The system SHALL test interceptor lifecycle and execution order.

#### Scenario: Request interceptor execution order

**GIVEN** three request interceptors registered: A, B, C
**WHEN** a request is made
**THEN** interceptors SHALL execute in order: A -> B -> C
**AND** each SHALL receive config from previous interceptor
**AND** final config SHALL be used for request

#### Scenario: Response interceptor execution order

**GIVEN** three response interceptors registered: A, B, C
**WHEN** a successful response is received
**THEN** interceptors SHALL execute in order: A -> B -> C
**AND** each SHALL receive response from previous interceptor
**AND** final response SHALL be returned to caller

#### Scenario: Error interceptor execution

**GIVEN** response error interceptor is registered
**WHEN** a 500 error occurs
**THEN** onRejected callback SHALL execute
**AND** it SHALL receive HttpInternalServerError
**AND** it can transform error or recover

#### Scenario: Async interceptor handling

**GIVEN** request interceptor with async token refresh
**WHEN** token is expired
**THEN** interceptor SHALL await token refresh
**AND** refreshed token SHALL be added to headers
**AND** request SHALL proceed with new token

#### Scenario: Interceptor removal

**GIVEN** interceptor is registered and receives handle
**WHEN** removeInterceptor(handle) is called
**THEN** interceptor SHALL not execute on next request
**AND** other interceptors SHALL remain active

---

### Requirement: Retry Policy Tests

The system SHALL test retry policy behavior with various failure scenarios.

#### Scenario: Testing exponential backoff timing

**GIVEN** retry policy with exponential backoff
**WHEN** request fails 3 times
**THEN** delays SHALL approximately match: 1s, 2s, 4s
**AND** total retry time SHALL be measured
**AND** jitter SHALL be applied to prevent thundering herd

#### Scenario: Testing retry on specific status codes

**GIVEN** retry policy statusCodes: [429, 503]
**WHEN** request returns 429
**THEN** request SHALL be retried
**WHEN** request returns 400
**THEN** request SHALL not be retried (throws immediately)

#### Scenario: Testing retry budget exhaustion

**GIVEN** retry policy maxAttempts: 3
**WHEN** all 3 attempts fail
**THEN** final error SHALL be thrown
**AND** error SHALL indicate retry budget exhausted

#### Scenario: Testing beforeRetry hook

**GIVEN** beforeRetry hook with spy
**WHEN** request is retried twice
**THEN** hook SHALL be called 2 times
**AND** each call SHALL include attempt number and error

#### Scenario: Testing shouldRetry custom logic

**GIVEN** shouldRetry callback returns false for 5xx errors
**WHEN** request returns 500
**THEN** request SHALL not be retried
**AND** error SHALL be thrown immediately

---

### Requirement: Deduplication Tests

The system SHALL test request deduplication correctness.

#### Scenario: Testing concurrent identical requests

**GIVEN** deduplication enabled
**WHEN** 5 identical GET requests are made concurrently
**THEN** only 1 network request SHALL be executed
**AND** all 5 callers SHALL receive the same response
**AND** network request count SHALL be verified

#### Scenario: Testing deduplication cache cleanup

**GIVEN** a deduplicated request completes
**WHEN** checking pending requests map
**THEN** the entry SHALL be removed
**AND** subsequent identical request SHALL execute new network call

#### Scenario: Testing different key strategies

**GIVEN** deduplication with keyStrategy: 'url'
**WHEN** two requests with same URL but different bodies
**THEN** they SHALL be deduplicated (only 1 executed)

**GIVEN** deduplication with keyStrategy: 'url-body'
**WHEN** two requests with same URL but different bodies
**THEN** they SHALL not be deduplicated (both executed)

#### Scenario: Testing deduplication with errors

**GIVEN** deduplicated request fails with 404
**WHEN** error is thrown
**THEN** all waiting callers SHALL receive the same error
**AND** pending request SHALL be cleaned up

---

### Requirement: Cache Layer Tests

The system SHALL test cache layer behavior including TTL, LRU eviction, and cache key generation.

#### Scenario: Testing cache hit

**GIVEN** a GET request is cached
**WHEN** identical request is made within TTL
**THEN** cached response SHALL be returned
**AND** network request SHALL not be executed
**AND** cache hit metric SHALL increment

#### Scenario: Testing cache miss

**GIVEN** no cached entry exists
**WHEN** a request is made
**THEN** network request SHALL execute
**AND** response SHALL be cached
**AND** cache miss metric SHALL increment

#### Scenario: Testing TTL expiration

**GIVEN** cached entry with TTL: 1000ms
**WHEN** waiting 1100ms
**THEN** cache entry SHALL be expired
**AND** next request SHALL execute network call
**AND** new response SHALL replace expired entry

#### Scenario: Testing LRU eviction

**GIVEN** cache maxSize: 3
**WHEN** 4 different requests are cached
**THEN** oldest unused entry SHALL be evicted
**AND** cache size SHALL remain at 3

#### Scenario: Testing cache key uniqueness

**GIVEN** two requests with different query params
**WHEN** generating cache keys
**THEN** keys SHALL be different
**AND** each request SHALL have separate cache entry

**GIVEN** two identical requests
**WHEN** generating cache keys
**THEN** keys SHALL be identical
**AND** second request SHALL hit cache

#### Scenario: Testing cache invalidation

**GIVEN** cached entries exist
**WHEN** cache.delete(key) is called
**THEN** specific entry SHALL be removed
**WHEN** cache.clear() is called
**THEN** all entries SHALL be removed

#### Scenario: Testing cache only stores successful responses

**GIVEN** requests return 200, 404, 500
**WHEN** responses are processed
**THEN** only 200 response SHALL be cached
**AND** 404 and 500 SHALL not be cached

---

### Requirement: Code Coverage Requirements

The system SHALL achieve minimum 90% code coverage for implementation code with comprehensive test scenarios.

#### Scenario: Coverage for happy paths

**GIVEN** all HTTP methods (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS)
**WHEN** running unit tests
**THEN** each method SHALL have tests for successful execution
**AND** response parsing SHALL be covered
**AND** type inference SHALL be verified

#### Scenario: Coverage for error paths

**GIVEN** all error types in HttpError hierarchy
**WHEN** running integration tests with MSW
**THEN** each error type SHALL have test coverage
**AND** error mapping SHALL be verified
**AND** error properties SHALL be validated

#### Scenario: Coverage for edge cases

**GIVEN** implementation code
**WHEN** running test suite
**THEN** it SHALL cover:
- Empty request bodies
- Null/undefined config values
- Very large responses
- Concurrent request limits
- Memory cleanup after errors

#### Scenario: Coverage reporting

**GIVEN** test suite runs in CI
**WHEN** coverage report is generated
**THEN** it SHALL use vitest coverage-v8
**AND** it SHALL output lcov, json, html formats
**AND** it SHALL upload to Codecov with 'http-client' flag
**AND** coverage threshold SHALL be 90%

---

### Requirement: Test Utilities and Helpers

The system SHALL provide test utilities and helpers for common testing scenarios.

#### Scenario: Mock HTTP client factory

**GIVEN** a test needs a configured client
**WHEN** calling createTestClient(config)
**THEN** it SHALL return a KyHttpClient with test-friendly defaults
**AND** it SHALL use in-memory cache
**AND** it SHALL disable retry by default (for deterministic tests)

#### Scenario: Request spy helper

**GIVEN** a test needs to verify requests
**WHEN** using createRequestSpy()
**THEN** it SHALL intercept requests via MSW
**AND** it SHALL record all requests (method, URL, headers, body)
**AND** it SHALL provide assertion helpers (e.g., expectRequestWasMade())

#### Scenario: Response builder helper

**GIVEN** a test needs custom response
**WHEN** using buildHttpResponse({ data, status, headers })
**THEN** it SHALL create properly typed HttpResponse<T>
**AND** it SHALL fill in default values (ok, statusText)

#### Scenario: Error builder helper

**GIVEN** a test needs custom error
**WHEN** using buildHttpError({ status, message })
**THEN** it SHALL create appropriate HttpError subclass
**AND** it SHALL include all required properties

---

### Requirement: Performance Benchmarks

The system SHALL include performance benchmarks comparing ky implementation against expected baseline.

#### Scenario: Benchmark simple GET request

**GIVEN** a benchmark suite
**WHEN** executing 1000 GET requests
**THEN** average latency SHALL be measured
**AND** p95 and p99 percentiles SHALL be calculated
**AND** results SHALL be logged for comparison

#### Scenario: Benchmark with interceptors

**GIVEN** client with 3 request and 3 response interceptors
**WHEN** executing 1000 requests
**THEN** interceptor overhead SHALL be measured
**AND** overhead SHALL be < 5% compared to no interceptors

#### Scenario: Benchmark with retry

**GIVEN** retry policy with maxAttempts: 3
**WHEN** simulating transient failures
**THEN** retry delay accuracy SHALL be measured
**AND** exponential backoff SHALL match expected formula

#### Scenario: Benchmark deduplication

**GIVEN** 1000 concurrent identical requests
**WHEN** deduplication is enabled
**THEN** it SHALL execute only 1 network request
**AND** deduplication overhead SHALL be < 2ms per request

#### Scenario: Benchmark cache performance

**GIVEN** 1000 requests with 50% cache hit rate
**WHEN** cache is enabled
**THEN** cache hit latency SHALL be < 1ms
**AND** cache miss SHALL match normal request latency
**AND** total time SHALL be significantly reduced
