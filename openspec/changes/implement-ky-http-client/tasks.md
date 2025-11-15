# Implementation Tasks

## Phase 1: Dependencies and Project Setup

- [ ] Add `ky` package as production dependency to `packages/http-client/package.json`
- [ ] Add `ky-universal` package as production dependency for Node.js support
- [ ] Add `msw` (Mock Service Worker) as development dependency for testing
- [ ] Install dependencies with `pnpm install`
- [ ] Verify package installation and version compatibility

## Phase 2: Core KyHttpClient Implementation

### 2.1 Environment Detection and Ky Instance Creation

- [ ] Create `packages/http-client/src/implementations/ky/ky-loader.ts`
  - Implement environment detection (browser vs Node.js)
  - Dynamic import of `ky` or `ky-universal` based on environment
  - Export unified ky instance creator
- [ ] Test environment detection works in both browser and Node.js

### 2.2 Configuration Adapter

- [ ] Create `packages/http-client/src/implementations/ky/ky-adapter.ts`
  - Implement `adaptHttpConfigToKy()` function
  - Map HttpRequestConfig to ky Options
  - Handle timeout, headers, credentials, responseType conversion
- [ ] Test config adaptation with various input combinations

### 2.3 Error Mapper

- [ ] Create `packages/http-client/src/implementations/ky/error-mapper.ts`
  - Implement `mapKyErrorToHttpError()` function
  - Map HTTPError to specific HttpError subclasses (400 -> HttpBadRequestError, 401 -> HttpUnauthorizedError, etc.)
  - Map TimeoutError to HttpTimeoutError
  - Map AbortError to HttpAbortError
  - Map network errors to HttpNetworkError
  - Preserve original error context (response, request, options)
- [ ] Test error mapping for all error types

### 2.4 KyHttpClient Class

- [ ] Create `packages/http-client/src/implementations/ky/ky-client.ts`
  - Implement KyHttpClient class implementing IHttpClient interface
  - Constructor accepting HttpClientConfig
  - Initialize internal ky instance with base configuration
  - Implement request() method as base for all HTTP methods
- [ ] Test client instantiation and basic configuration

### 2.5 HTTP Method Implementation

- [ ] Implement `get<T>(url, config?)` method in KyHttpClient
- [ ] Implement `post<T>(url, config?)` method
- [ ] Implement `put<T>(url, config?)` method
- [ ] Implement `patch<T>(url, config?)` method
- [ ] Implement `delete<T>(url, config?)` method
- [ ] Implement `head(url, config?)` method
- [ ] Implement `options(url, config?)` method
- [ ] Test each method individually with type inference

### 2.6 Response Parsing

- [ ] Create `packages/http-client/src/utils/response-parser.ts`
  - Implement response parsing based on responseType (json, text, blob, arraybuffer)
  - Handle empty responses (204 No Content)
  - Extract headers, status, statusText
- [ ] Test response parsing for all response types

## Phase 3: Interceptor Bridge Implementation

### 3.1 Interceptor Manager

- [ ] Create `packages/http-client/src/implementations/ky/interceptor-bridge.ts`
  - Implement InterceptorManager class
  - Maintain interceptor registry (Map<handle, callbacks>)
  - Generate unique handles for removal
  - Implement `addRequestInterceptor(onFulfilled, onRejected?)`
  - Implement `addResponseInterceptor(onFulfilled, onRejected?)`
  - Implement `removeInterceptor(handle)`
- [ ] Test interceptor registration and removal

### 3.2 Request Interceptor Hooks

- [ ] Map request interceptor onFulfilled to ky beforeRequest hook
- [ ] Emulate request interceptor onRejected (wrap config validation errors)
- [ ] Ensure async interceptors are properly awaited
- [ ] Maintain execution order (FIFO)
- [ ] Test request interceptor execution order and async handling

### 3.3 Response Interceptor Hooks

- [ ] Map response interceptor onFulfilled to ky afterResponse hook
- [ ] Map response interceptor onRejected to ky beforeError hook
- [ ] Handle response transformation
- [ ] Handle error recovery (onRejected returning HttpResponse)
- [ ] Test response interceptor execution order and error handling

## Phase 4: Retry Policy Integration

### 4.1 Retry Configuration

- [ ] Create `packages/http-client/src/features/retry/retry-policy.ts`
  - Implement RetryPolicy class
  - Configure ky retry options (limit, methods, statusCodes)
  - Implement exponential backoff calculation
  - Add jitter to backoff delays
- [ ] Test retry configuration mapping

### 4.2 Retry Hooks

- [ ] Implement beforeRetry hook integration with ky
- [ ] Implement afterRetry hook (custom, ky doesn't have native support)
- [ ] Implement shouldRetry custom logic
- [ ] Test retry hooks execute correctly

### 4.3 Retry Budget Management

- [ ] Track retry attempts per request
- [ ] Enforce maxAttempts limit
- [ ] Enforce maxDelay cap
- [ ] Test retry budget exhaustion

## Phase 5: Request Deduplication

### 5.1 Request Fingerprinting

- [ ] Create `packages/http-client/src/features/deduplication/request-fingerprint.ts`
  - Implement fingerprint generation based on keyStrategy
  - Support 'url', 'url-body', 'url-body-headers' strategies
  - Use fast hashing algorithm (e.g., FNV-1a or xxHash)
- [ ] Test fingerprint generation for various inputs

### 5.2 Pending Requests Map

- [ ] Create `packages/http-client/src/features/deduplication/pending-requests-map.ts`
  - Implement PendingRequestsMap class
  - Store pending promises by fingerprint
  - Automatic cleanup on promise resolution/rejection
  - TTL support for long-running requests
- [ ] Test pending requests map behavior

### 5.3 Request Deduplicator

- [ ] Create `packages/http-client/src/features/deduplication/request-deduplicator.ts`
  - Implement RequestDeduplicator class
  - Check for existing pending request before execution
  - Return existing promise if found
  - Execute new request and store promise if not found
- [ ] Integrate deduplicator into KyHttpClient request flow
- [ ] Test deduplication with concurrent requests

## Phase 6: Cache Layer Implementation

### 6.1 Cache Interface and Key Generation

- [ ] Create `packages/http-client/src/features/cache/cache-layer.ts`
  - Define IHttpCache interface (already in contracts)
  - Implement cache key generation (method + URL + query params)
- [ ] Test cache key generation

### 6.2 In-Memory Cache Implementation

- [ ] Create `packages/http-client/src/features/cache/in-memory-cache.ts`
  - Implement InMemoryCache class implementing IHttpCache
  - Use Map for storage
  - Implement LRU eviction (track access order)
  - Implement TTL expiration (lazy deletion on get)
  - Configurable maxSize and defaultTtl
- [ ] Test in-memory cache operations (get, set, delete, clear)
- [ ] Test LRU eviction behavior
- [ ] Test TTL expiration

### 6.3 Cache Integration

- [ ] Integrate cache into KyHttpClient request flow
  - Check cache before request execution
  - Store successful responses (2xx) after execution
  - Respect cache control directives (no-cache, no-store)
  - Support per-request cache override
- [ ] Test cache integration with various scenarios

## Phase 7: Factory Function and Exports

- [ ] Create `packages/http-client/src/implementations/ky/factory.ts`
  - Implement `createKyClient(config?)` factory function
  - Instantiate KyHttpClient with provided config
  - Return IHttpClient interface (hide implementation details)
- [ ] Update `packages/http-client/src/index.ts`
  - Export createKyClient as main entry point
  - Export all contract interfaces and types
  - Export error classes
- [ ] Test factory function and tree-shaking

## Phase 8: Comprehensive Testing

### 8.1 Unit Tests for HTTP Methods

- [ ] Create `packages/http-client/src/implementations/ky/ky-client.spec.ts`
  - Test GET request execution and response parsing
  - Test POST request with JSON body
  - Test PUT request with config override
  - Test PATCH request with partial update
  - Test DELETE request without body
  - Test HEAD request for metadata
  - Test OPTIONS request for CORS
- [ ] Verify type inference in tests

### 8.2 Error Handling Tests

- [ ] Create `packages/http-client/src/implementations/ky/error-mapper.spec.ts`
  - Test mapping of each HTTP status code to corresponding error class
  - Test TimeoutError mapping
  - Test AbortError mapping
  - Test network error mapping
  - Test error context preservation

### 8.3 Interceptor Tests

- [ ] Create `packages/http-client/src/implementations/ky/interceptor-bridge.spec.ts`
  - Test request interceptor execution order
  - Test response interceptor execution order
  - Test async interceptor handling
  - Test interceptor removal
  - Test error interceptor recovery

### 8.4 Retry Policy Tests

- [ ] Create `packages/http-client/src/features/retry/retry-policy.spec.ts`
  - Test retry on network failures
  - Test retry on specific status codes (429, 503)
  - Test exponential backoff timing
  - Test maxAttempts enforcement
  - Test beforeRetry and afterRetry hooks
  - Test shouldRetry custom logic

### 8.5 Deduplication Tests

- [ ] Create `packages/http-client/src/features/deduplication/request-deduplicator.spec.ts`
  - Test concurrent identical requests are deduplicated
  - Test different requests are not deduplicated
  - Test deduplication cache cleanup
  - Test different key strategies (url, url-body, url-body-headers)
  - Test deduplication with errors

### 8.6 Cache Layer Tests

- [ ] Create `packages/http-client/src/features/cache/in-memory-cache.spec.ts`
  - Test cache hit and miss
  - Test TTL expiration
  - Test LRU eviction
  - Test cache key uniqueness
  - Test cache invalidation (delete, clear)
  - Test only successful responses are cached

### 8.7 MSW Integration Tests

- [ ] Create `packages/http-client/src/implementations/ky/integration.spec.ts`
  - Set up MSW handlers for test endpoints
  - Test realistic HTTP workflows
  - Test network failure simulation
  - Test delayed response and timeout
  - Test concurrent request handling
- [ ] Configure MSW for both browser and Node.js environments

### 8.8 Performance Benchmarks

- [ ] Create `packages/http-client/src/benchmarks/ky-benchmarks.spec.ts`
  - Benchmark simple GET request (1000 iterations)
  - Benchmark with interceptors overhead
  - Benchmark retry delay accuracy
  - Benchmark deduplication efficiency
  - Benchmark cache performance

## Phase 9: Documentation Updates

- [ ] Update `packages/http-client/README.md`
  - Add ky implementation section
  - Document createKyClient factory
  - Provide usage examples for each feature
  - Document retry policies, deduplication, and caching
  - Add TypeScript type examples
- [ ] Add JSDoc comments to all public APIs
  - KyHttpClient class methods
  - Factory function
  - Configuration interfaces
  - Utility functions

## Phase 10: Integration and Validation

- [ ] Run `nx run http-client:build` to compile TypeScript
  - Verify no compilation errors
  - Verify type declarations are generated
- [ ] Run `nx run http-client:test:unit` to execute all tests
  - Verify all tests pass
  - Verify coverage meets 90% threshold
- [ ] Run `nx run http-client:lint:eslint` to check code quality
- [ ] Run `attw --pack` to validate package exports
- [ ] Run `openspec validate implement-ky-http-client --strict`
  - Fix any validation errors
- [ ] Verify ky and ky-universal work correctly in both browser and Node.js test environments

## Phase 11: CI/CD Integration (if not already done)

- [ ] Verify `packages/http-client/package.json` includes ky and ky-universal in dependencies
- [ ] Verify affected tests run in CI when http-client code changes
- [ ] Verify coverage uploads to Codecov with 'http-client' flag
- [ ] Verify bundle size tracking includes ky implementation

## Phase 12: Final Review and Cleanup

- [ ] Review all implementation code for code quality
- [ ] Ensure consistent code style (Prettier, ESLint)
- [ ] Remove any console.log or debug statements
- [ ] Verify all TODO comments are resolved
- [ ] Archive this proposal with `openspec archive implement-ky-http-client`
