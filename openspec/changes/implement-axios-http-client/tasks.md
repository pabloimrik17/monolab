# Implementation Tasks

## Phase 1: Foundation and Core Adapter (Days 1-2)

### 1. Set up axios dependency and TypeScript types
- [ ] Add `axios@^1.6.0` as peer dependency in `packages/http-client/package.json`
- [ ] Add `@types/axios` as dev dependency
- [ ] Update package.json exports to include axios implementation
- [ ] Verify: `pnpm install` succeeds without errors

### 2. Create core axios adapter structure
- [ ] Create `packages/http-client/src/axios/` directory
- [ ] Create `adapter.ts` with `AxiosHttpClient` class skeleton
- [ ] Implement basic constructor accepting axios instance
- [ ] Add TypeScript interfaces for adapter configuration
- [ ] Verify: `pnpm build --filter @m0n0lab/http-client` succeeds

### 3. Implement core HTTP methods (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS)
- [ ] Implement `get<T>()` method delegating to axios.get
- [ ] Implement `post<T, D>()` method delegating to axios.post
- [ ] Implement `put<T, D>()` method delegating to axios.put
- [ ] Implement `patch<T, D>()` method delegating to axios.patch
- [ ] Implement `delete<T>()` method delegating to axios.delete
- [ ] Implement `head()` method delegating to axios.head
- [ ] Implement `options()` method delegating to axios.options
- [ ] Verify: All methods compile with correct generic types

### 4. Add basic unit tests for core methods
- [ ] Create `packages/http-client/tests/axios/adapter.test.ts`
- [ ] Set up axios mocking with vitest
- [ ] Write test for GET request
- [ ] Write test for POST request with body
- [ ] Write test for all HTTP methods
- [ ] Verify: `pnpm --filter @m0n0lab/http-client test:unit` passes

## Phase 2: Error Transformation (Day 3)

### 5. Create error taxonomy classes
- [ ] Create `packages/http-client/src/axios/errors.ts`
- [ ] Implement `HttpError` base class
- [ ] Implement `NetworkError` class
- [ ] Implement `TimeoutError` class
- [ ] Implement `ResponseError` class with statusCode
- [ ] Implement `CancelError` class
- [ ] Verify: Error classes extend Error correctly

### 6. Implement error transformer
- [ ] Create `transformAxiosError()` function
- [ ] Map `ERR_NETWORK` to `NetworkError`
- [ ] Map `ECONNABORTED` to `TimeoutError`
- [ ] Map response errors to `ResponseError`
- [ ] Map cancelled requests to `CancelError`
- [ ] Preserve original axios error as `cause`
- [ ] Verify: All axios error codes mapped correctly

### 7. Add error transformation tests
- [ ] Create `tests/axios/errors.test.ts`
- [ ] Test network error transformation
- [ ] Test timeout error transformation
- [ ] Test response error transformation (4xx, 5xx)
- [ ] Test cancellation error transformation
- [ ] Test original error preservation
- [ ] Verify: `pnpm test:unit` passes with 100% error coverage

## Phase 3: Interceptor System (Days 4-5)

### 8. Create interceptor bridge
- [ ] Create `packages/http-client/src/axios/interceptors.ts`
- [ ] Define contract `Interceptor<T>` type with onFulfilled/onRejected
- [ ] Implement `addRequestInterceptor()` method
- [ ] Implement `addResponseInterceptor()` method
- [ ] Register interceptors with axios instance
- [ ] Maintain interceptor registration order
- [ ] Verify: Interceptors registered without errors

### 9. Add request interceptor support
- [ ] Wrap contract onFulfilled callback for axios request interceptor
- [ ] Wrap contract onRejected callback for axios request interceptor
- [ ] Handle async interceptor callbacks
- [ ] Support multiple request interceptors
- [ ] Verify: Request interceptors execute in order

### 10. Add response interceptor support
- [ ] Wrap contract onFulfilled callback for axios response interceptor
- [ ] Wrap contract onRejected callback for axios response interceptor
- [ ] Support error recovery in onRejected
- [ ] Support multiple response interceptors
- [ ] Verify: Response interceptors execute in order

### 11. Add interceptor tests
- [ ] Create `tests/axios/interceptors.test.ts`
- [ ] Test request interceptor onFulfilled
- [ ] Test request interceptor onRejected
- [ ] Test response interceptor onFulfilled
- [ ] Test response interceptor onRejected with error recovery
- [ ] Test multiple interceptors execute in order
- [ ] Test interceptor error handling
- [ ] Verify: All interceptor tests pass

## Phase 4: Retry Policy (Days 6-7)

### 12. Create retry policy engine
- [ ] Create `packages/http-client/src/axios/retry.ts`
- [ ] Define `RetryPolicy` configuration interface
- [ ] Implement exponential backoff strategy
- [ ] Implement linear backoff strategy
- [ ] Implement fixed delay strategy
- [ ] Create delay calculator function
- [ ] Verify: Delay calculations correct for each strategy

### 13. Implement retry logic
- [ ] Create retry wrapper for axios requests
- [ ] Detect retryable errors (network, timeout, 5xx)
- [ ] Respect HTTP method idempotency (GET retries by default, POST doesn't)
- [ ] Implement `shouldRetry` custom condition
- [ ] Add `maxAttempts` limit
- [ ] Verify: Retry logic respects configuration

### 14. Add retry lifecycle hooks
- [ ] Implement `onBeforeRetry(attempt, delay)` hook
- [ ] Implement `onAfterRetry(attempt, response)` hook
- [ ] Implement `onRetryExhausted(error)` hook
- [ ] Call hooks at appropriate points in retry cycle
- [ ] Verify: Hooks called with correct parameters

### 15. Add retry tests
- [ ] Create `tests/axios/retry.test.ts`
- [ ] Test exponential backoff retry
- [ ] Test linear backoff retry
- [ ] Test fixed delay retry
- [ ] Test retry exhaustion
- [ ] Test safe methods retry, unsafe methods don't
- [ ] Test custom shouldRetry condition
- [ ] Test lifecycle hooks
- [ ] Verify: All retry tests pass

## Phase 5: Request Deduplication (Day 8)

### 16. Create deduplication manager
- [ ] Create `packages/http-client/src/axios/deduplication.ts`
- [ ] Implement request key generation (method + URL + params + body hash)
- [ ] Create in-flight requests Map
- [ ] Implement deduplication wrapper for requests
- [ ] Clear deduplication cache on response/error
- [ ] Verify: Keys generated consistently

### 17. Integrate deduplication with adapter
- [ ] Add `deduplicate: boolean` to request config
- [ ] Wrap requests in deduplication logic when enabled
- [ ] Share Promise for identical concurrent requests
- [ ] Clean up in-flight map on completion
- [ ] Verify: Deduplication reduces actual requests

### 18. Add deduplication tests
- [ ] Create `tests/axios/deduplication.test.ts`
- [ ] Test concurrent identical requests deduplicated
- [ ] Test different requests not deduplicated
- [ ] Test deduplication key includes method, URL, params, body
- [ ] Test deduplication cleared after response
- [ ] Test opt-out of deduplication per request
- [ ] Verify: All deduplication tests pass

## Phase 6: Cache Layer (Days 9-10)

### 19. Create cache adapter interface
- [ ] Create `packages/http-client/src/axios/cache.ts`
- [ ] Define `CacheAdapter` interface (get, set, delete, clear)
- [ ] Create `MemoryCacheAdapter` implementation using Map
- [ ] Add TTL support with expiration tracking
- [ ] Verify: Memory cache stores and retrieves values

### 20. Implement cache manager
- [ ] Create cache key generation (method + URL + params, exclude body for GET)
- [ ] Implement cache lookup before request
- [ ] Implement cache storage after successful response
- [ ] Add TTL expiration checks
- [ ] Verify: Cache hit returns cached response

### 21. Add cache invalidation
- [ ] Implement invalidation on POST requests
- [ ] Implement invalidation on PUT requests
- [ ] Implement invalidation on DELETE requests
- [ ] Match invalidation patterns (e.g., `/api/users*` invalidates on POST to `/api/users`)
- [ ] Verify: Mutations invalidate related cache entries

### 22. Add cache configuration
- [ ] Add `cache: CacheConfig` to client config
- [ ] Support `ttl` configuration
- [ ] Support `adapter` configuration
- [ ] Support per-request `cache: false` opt-out
- [ ] Verify: Cache configuration applied correctly

### 23. Add cache tests
- [ ] Create `tests/axios/cache.test.ts`
- [ ] Test cache hit returns cached response
- [ ] Test cache respects TTL
- [ ] Test POST invalidates cache
- [ ] Test PUT invalidates cache
- [ ] Test DELETE invalidates cache
- [ ] Test cache key excludes body for GET
- [ ] Test custom cache adapter
- [ ] Test opt-out of caching per request
- [ ] Verify: All cache tests pass

## Phase 7: Factory Pattern (Day 11)

### 24. Create client factory
- [ ] Create `packages/http-client/src/axios/factory.ts`
- [ ] Implement `createHttpClientFactory(baseConfig)` function
- [ ] Implement `factory.createClient(instanceConfig)` method
- [ ] Clone base config for each client instance
- [ ] Merge instance config with base config
- [ ] Verify: Factory creates isolated instances

### 25. Add environment presets
- [ ] Add `presets` configuration to factory
- [ ] Support named presets (e.g., "production", "staging")
- [ ] Allow `createClient({ preset: "production" })`
- [ ] Merge preset config with base and instance config
- [ ] Verify: Presets apply correct configuration

### 26. Add factory tests
- [ ] Create `tests/axios/factory.test.ts`
- [ ] Test factory creates client with base config
- [ ] Test instance config overrides factory config
- [ ] Test multiple clients are isolated
- [ ] Test environment presets
- [ ] Verify: All factory tests pass

## Phase 8: Integration Tests (Days 12-13)

### 27. Set up MSW for integration testing
- [ ] Add `msw@^2.0.0` as dev dependency
- [ ] Create `tests/axios/setup.ts` with MSW server setup
- [ ] Configure vitest to use MSW setup file
- [ ] Verify: MSW server starts/stops correctly

### 28. Write full lifecycle integration tests
- [ ] Create `tests/axios/integration.test.ts`
- [ ] Test full GET request/response cycle
- [ ] Test full POST request/response cycle
- [ ] Test request with headers and params
- [ ] Verify: Integration tests pass with real axios

### 29. Write interceptor chain integration tests
- [ ] Test multiple request interceptors in order
- [ ] Test multiple response interceptors in order
- [ ] Test interceptor error recovery
- [ ] Verify: Interceptor chain works end-to-end

### 30. Write retry integration tests
- [ ] Test retry with exponential backoff (measure delays)
- [ ] Test retry exhaustion
- [ ] Test safe methods retry, unsafe methods don't
- [ ] Verify: Retry behavior correct in integration

### 31. Write cache invalidation integration tests
- [ ] Test cache hit on second GET
- [ ] Test POST invalidates cache
- [ ] Test cache respects TTL
- [ ] Verify: Cache invalidation works end-to-end

### 32. Write deduplication integration tests
- [ ] Test concurrent identical requests deduplicated
- [ ] Test deduplication with real delays
- [ ] Verify: Deduplication prevents redundant requests

## Phase 9: Error Handling Tests (Day 14)

### 33. Write network error tests
- [ ] Test network timeout error
- [ ] Test network connection error
- [ ] Verify: Network errors transformed correctly

### 34. Write HTTP error tests
- [ ] Test 4xx client errors
- [ ] Test 5xx server errors
- [ ] Test error response body preserved
- [ ] Verify: HTTP errors transformed correctly

### 35. Write cancellation error tests
- [ ] Test request cancellation with AbortController
- [ ] Verify: Cancellation errors transformed correctly

## Phase 10: Documentation and Test Utilities (Day 15)

### 36. Create test utilities for consumers
- [ ] Create `packages/http-client/src/testing/mocks.ts`
- [ ] Implement `createMockHttpClient()` factory
- [ ] Implement `buildHttpResponse()` builder
- [ ] Implement `buildNetworkError()` builder
- [ ] Export test utilities from package
- [ ] Verify: Test utilities compile and export correctly

### 37. Write API documentation
- [ ] Add JSDoc comments to all public methods
- [ ] Document generic type parameters
- [ ] Add usage examples in comments
- [ ] Verify: TypeScript IntelliSense shows documentation

### 38. Create usage examples
- [ ] Create `packages/http-client/README.md` section for axios
- [ ] Add basic usage example
- [ ] Add interceptor usage example
- [ ] Add retry configuration example
- [ ] Add cache configuration example
- [ ] Add factory usage example
- [ ] Verify: Examples compile and run

### 39. Create migration guide
- [ ] Add "Migration from raw axios" section to README
- [ ] Add "Migration from fetch" section to README
- [ ] Document breaking changes (if any)
- [ ] Verify: Migration examples accurate

## Phase 11: Final Validation (Day 16)

### 40. Run full test suite
- [ ] Execute `pnpm --filter @m0n0lab/http-client test:unit`
- [ ] Verify: All tests pass (0 failures)
- [ ] Check test coverage report
- [ ] Verify: Coverage meets thresholds (90% lines, 95% functions, 85% branches)

### 41. Run build and lint
- [ ] Execute `pnpm --filter @m0n0lab/http-client build`
- [ ] Verify: Build succeeds without errors
- [ ] Execute `pnpm --filter @m0n0lab/http-client lint`
- [ ] Verify: No linting errors

### 42. Validate package exports
- [ ] Execute `attw --pack` on built package
- [ ] Verify: No export issues reported
- [ ] Test tree-shaking with example consumer
- [ ] Verify: Unused code excluded from bundle

### 43. Update affected specs
- [ ] Review `vitest-testing` spec for necessary updates
- [ ] Update spec with axios-specific patterns
- [ ] Verify: Spec changes documented

### 44. Final integration check
- [ ] Create example consumer project
- [ ] Install `@m0n0lab/http-client` with axios
- [ ] Test all features in consumer
- [ ] Verify: All features work as documented

## Dependencies and Parallelization

**Parallel Work Opportunities:**
- Phases 2-3 can partially overlap (error transformation independent of interceptors)
- Phase 5 (deduplication) can be developed in parallel with Phase 4 (retry)
- Phase 7 (factory) can be developed in parallel with Phase 6 (cache)
- Phase 10 (documentation) can start after Phase 7 completes

**Critical Dependencies:**
- Phase 1 must complete before all others (foundation)
- Phase 2 must complete before Phase 4 (retry needs error transformation)
- Phases 3-7 must complete before Phase 8 (integration tests need all features)
- Phase 8 must complete before Phase 11 (final validation)

**Estimated Timeline:** 16 days with 1 developer, can be reduced to 10-12 days with parallel work
