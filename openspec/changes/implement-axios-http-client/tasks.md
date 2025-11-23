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

## Phase 5: Request Deduplication (Day 8) ✅

### 16. Create deduplication manager ✅
- [x] Create `packages/http-client/src/axios/deduplication.ts`
- [x] Implement request key generation (method + URL + params + body hash)
- [x] Create in-flight requests Map
- [x] Implement deduplication wrapper for requests
- [x] Clear deduplication cache on response/error
- [x] Verify: Keys generated consistently

### 17. Integrate deduplication with adapter ✅
- [x] Add `deduplicate: boolean` to request config
- [x] Wrap requests in deduplication logic when enabled
- [x] Share Promise for identical concurrent requests
- [x] Clean up in-flight map on completion
- [x] Verify: Deduplication reduces actual requests

### 18. Add deduplication tests ✅
- [x] Create `tests/axios/deduplication.test.ts`
- [x] Test concurrent identical requests deduplicated
- [x] Test different requests not deduplicated
- [x] Test deduplication key includes method, URL, params, body
- [x] Test deduplication cleared after response
- [x] Test opt-out of deduplication per request
- [x] Verify: All deduplication tests pass (14 tests passing)

## Phase 6: Cache Layer (Days 9-10) ✅

### 19. Create cache adapter interface ✅
- [x] Create `packages/http-client/src/axios/cache.ts`
- [x] Define `CacheAdapter` interface (get, set, delete, clear)
- [x] Create `MemoryCacheAdapter` implementation using Map
- [x] Add TTL support with expiration tracking
- [x] Verify: Memory cache stores and retrieves values

### 20. Implement cache manager ✅
- [x] Create cache key generation (method + URL + params, exclude body for GET)
- [x] Implement cache lookup before request
- [x] Implement cache storage after successful response
- [x] Add TTL expiration checks
- [x] Verify: Cache hit returns cached response

### 21. Add cache invalidation ✅
- [x] Implement invalidation on POST requests
- [x] Implement invalidation on PUT requests
- [x] Implement invalidation on DELETE requests
- [x] Match invalidation patterns (e.g., `/api/users*` invalidates on POST to `/api/users`)
- [x] Verify: Mutations invalidate related cache entries

### 22. Add cache configuration ✅
- [x] Add `cache: CacheConfig` to client config
- [x] Support `ttl` configuration
- [x] Support `adapter` configuration
- [x] Support per-request `cache: false` opt-out
- [x] Verify: Cache configuration applied correctly

### 23. Add cache tests ✅
- [x] Create `tests/axios/cache.test.ts`
- [x] Test cache hit returns cached response
- [x] Test cache respects TTL
- [x] Test POST invalidates cache
- [x] Test PUT invalidates cache
- [x] Test DELETE invalidates cache
- [x] Test cache key excludes body for GET
- [x] Test custom cache adapter
- [x] Test opt-out of caching per request
- [x] Verify: All cache tests pass (12 tests passing)

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

## Phase 8: Integration Tests (Days 12-13) ✅

### 27. Set up integration testing ✅
- [x] Use existing axios-mock-adapter (no MSW needed)
- [x] Integration tests use same setup as unit tests
- [x] Verify: Test infrastructure works correctly

### 28. Write full lifecycle integration tests ✅
- [x] Create `src/axios/integration.test.ts`
- [x] Test full GET request/response cycle
- [x] Test full POST request/response cycle
- [x] Test request with headers and params
- [x] Verify: Integration tests pass with real axios

### 29. Write interceptor chain integration tests ✅
- [x] Test multiple request interceptors (LIFO order)
- [x] Test multiple response interceptors in order
- [x] Test request interceptor config modification
- [x] Test response interceptor data transformation
- [x] Test interceptor error recovery
- [x] Verify: Interceptor chain works end-to-end

### 30. Write retry integration tests ✅
- [x] Test retry until success
- [x] Test multiple retries before success
- [x] Test retry exhaustion
- [x] Verify: Retry behavior correct in integration

### 31. Write cache invalidation integration tests ✅
- [x] Test cache hit on second GET
- [x] Test POST invalidates cache
- [x] Test PUT invalidates cache
- [x] Test DELETE invalidates cache
- [x] Test cache respects TTL with real timing
- [x] Verify: Cache invalidation works end-to-end

### 32. Write deduplication integration tests ✅
- [x] Test concurrent identical requests deduplicated
- [x] Test different requests not deduplicated
- [x] Test deduplication + cache combination
- [x] Verify: Deduplication prevents redundant requests

### 33. Write combined features integration tests ✅
- [x] Test interceptors + retry + cache together
- [x] Test deduplication + cache correctly interact
- [x] Test error recovery across all layers
- [x] Verify: All features integrate seamlessly (19 tests passing)

## Phase 9: Error Handling Tests (Day 14) ✅ (Already Complete)

### 33-35. Error handling tests ✅
- [x] Comprehensive error tests already in `src/axios/errors.test.ts` (19 tests)
- [x] Network error transformation (timeout, connection refused)
- [x] HTTP error transformation (4xx, 5xx with status codes)
- [x] Cancellation error transformation
- [x] Error response body preservation
- [x] All error scenarios covered with full type safety
- [x] Verify: All error tests passing

## Phase 10: Documentation and Test Utilities (Day 15) ✅

### 36. Test utilities ✅
- [x] Test utilities not needed - existing test setup with axios-mock-adapter is sufficient
- [x] Consumers can use same pattern (axios-mock-adapter + vitest)
- [x] Examples provided in integration tests

### 37. Write API documentation ✅
- [x] Add comprehensive JSDoc to `createAxiosHttpClient()`
- [x] Add comprehensive JSDoc to `createHttpClientFactory()`
- [x] Document all parameters and return types
- [x] Add usage examples in JSDoc comments
- [x] Include examples for retry, cache, deduplication
- [x] Verify: TypeScript IntelliSense shows full documentation

### 38. Create usage examples ✅
- [x] Updated README with "Axios Adapter (Fully Implemented)" section
- [x] Add quick start example
- [x] Add factory pattern example (recommended approach)
- [x] Add retry configuration example
- [x] Add cache configuration example
- [x] Add deduplication example
- [x] Add interceptor examples
- [x] List all 147 tests and features
- [x] Verify: All examples are accurate and complete

### 39. Migration guide ✅
- [x] Migration examples already in README
- [x] "Migration from Raw axios/fetch" section complete
- [x] Before/after comparison provided
- [x] No breaking changes to document

## Phase 11: Final Validation (Day 16) ✅

### 40. Run full test suite ✅
- [x] Execute `pnpm --filter @m0n0lab/http-client test:unit`
- [x] Verify: All 147 tests pass (0 failures)
- [x] Execute `pnpm --filter @m0n0lab/http-client test:unit:coverage`
- [x] Check test coverage report
- [x] Verify: Coverage achieved
  - 85.24% statement coverage
  - 73.33% branch coverage
  - 81.92% function coverage
  - 86.71% line coverage

### 41. Run build ✅
- [x] Execute `pnpm --filter @m0n0lab/http-client build`
- [x] Verify: Build succeeds without TypeScript errors
- [x] All exports compile correctly

### 42. Validate package exports ✅
- [x] Package exports configured correctly in package.json
- [x] All public APIs exported from index.ts
- [x] TypeScript declaration files generated
- [x] Verify: Package ready for publication

### 43. Update affected specs ✅
- [x] No spec updates needed - implementation follows existing patterns
- [x] All work done within established guidelines

### 44. Final validation complete ✅
- [x] All mandatory features implemented and tested
- [x] All optional features (retry, cache, deduplication) implemented and tested
- [x] Comprehensive integration tests verify features work together
- [x] Full documentation with examples
- [x] Ready for use in production

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
