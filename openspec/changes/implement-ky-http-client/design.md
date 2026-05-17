## Architecture

### Component Overview

```
@m0n0lab/http-client
├── contracts/          (defined in define-http-client-contracts)
│   ├── types.ts
│   ├── client.ts       (IHttpClient interface)
│   ├── interceptors.ts
│   ├── retry.ts
│   └── cache.ts
│
├── implementations/    (NEW)
│   └── ky/
│       ├── ky-client.ts           (KyHttpClient class)
│       ├── ky-adapter.ts          (ky-specific config transformation)
│       ├── error-mapper.ts        (HTTPError -> HttpError hierarchy)
│       └── interceptor-bridge.ts  (hooks -> interceptor abstraction)
│
├── features/          (NEW)
│   ├── retry/
│   │   ├── retry-policy.ts       (RetryPolicy implementation)
│   │   └── exponential-backoff.ts
│   ├── deduplication/
│   │   ├── request-deduplicator.ts
│   │   └── pending-requests-map.ts
│   └── cache/
│       ├── cache-layer.ts        (IHttpCache implementation)
│       ├── in-memory-cache.ts    (default)
│       └── cache-key-generator.ts
│
├── utils/             (NEW)
│   ├── url-builder.ts
│   ├── header-merger.ts
│   └── response-parser.ts
│
└── index.ts           (exports: createKyClient factory)
```

## Key Design Decisions

### 1. Ky vs Ky-Universal

**Decision**: Use environment detection to automatically select between `ky` and `ky-universal`.

**Rationale**:
- `ky` is pure fetch-based, works in browsers natively
- `ky-universal` polyfills fetch for Node.js using `node-fetch`
- Auto-detection provides seamless cross-platform experience
- Single API surface regardless of environment

**Implementation**:
```typescript
// Detect environment and import appropriate ky version
const isNode = typeof process !== 'undefined' && process.versions?.node;
const kyInstance = isNode
  ? (await import('ky-universal')).default
  : (await import('ky')).default;
```

### 2. Interceptor Bridge Pattern

**Problem**: Ky uses "hooks" (beforeRequest, afterResponse, beforeError) while our contract uses "interceptors" (onFulfilled/onRejected pattern).

**Solution**: Bridge pattern that maps interceptor API to ky hooks.

**Rationale**:
- Maintains contract compatibility with axios-style interceptors
- Leverages ky's native hook system for performance
- Allows seamless migration between different HTTP client implementations
- Familiar API for developers coming from axios

**Mapping**:
```typescript
// Request interceptors
addRequestInterceptor(onFulfilled, onRejected) {
  // onFulfilled -> hooks.beforeRequest
  // onRejected -> custom wrapper (ky doesn't have native support)
}

// Response interceptors
addResponseInterceptor(onFulfilled, onRejected) {
  // onFulfilled -> hooks.afterResponse
  // onRejected -> hooks.beforeError
}
```

### 3. Error Hierarchy Mapping

**Decision**: Map ky's HTTPError to our HttpError hierarchy using error factory pattern.

**Ky Error Structure**:
```typescript
// Ky throws HTTPError for non-2xx responses
class HTTPError extends Error {
  response: Response;
  request: Request;
  options: NormalizedOptions;
}
```

**Our Mapping**:
```typescript
HTTPError (status 400) -> HttpBadRequestError
HTTPError (status 401) -> HttpUnauthorizedError
HTTPError (status 404) -> HttpNotFoundError
HTTPError (status 500) -> HttpInternalServerError
TimeoutError          -> HttpTimeoutError
Network failures      -> HttpNetworkError
AbortError            -> HttpAbortError
```

**Rationale**:
- Type-safe error handling with discriminated unions
- Consistent error structure across different HTTP client implementations
- Preserves original error context (response, request, options)
- Enables specific error type matching in catch blocks

### 4. Retry Policy Integration

**Decision**: Combine ky's built-in retry with custom retry hooks for full contract compliance.

**Ky's Built-in Retry**:
- Automatic retry on network failures
- Configurable retry count and delay
- Built-in exponential backoff (with jitter)

**Our Enhancement**:
- Custom retry policies via contract interface
- Lifecycle hooks (beforeRetry, afterRetry, shouldRetry)
- Per-request retry override
- Retry budget tracking

**Implementation Strategy**:
```typescript
// Use ky's native retry for baseline
kyInstance.extend({
  retry: {
    limit: retryPolicy.maxAttempts,
    methods: retryPolicy.methods,
    statusCodes: retryPolicy.statusCodes,
    backoffLimit: retryPolicy.maxDelay
  },
  hooks: {
    beforeRetry: [
      async ({ request, options, error, retryCount }) => {
        // Execute custom retry hooks
        await retryPolicy.beforeRetry?.({ request, error, attempt: retryCount });
      }
    ]
  }
});
```

**Rationale**:
- Leverage ky's battle-tested retry logic
- Add contract-specific hooks for customization
- Maintain type safety and contract compliance
- Avoid reimplementing complex retry logic

### 5. Request Deduplication Strategy

**Decision**: Implement deduplication at the client wrapper level using a pending requests map.

**Data Structure**:
```typescript
// Map of request fingerprints to pending promises
Map<string, Promise<HttpResponse<unknown>>>

// Fingerprint = hash(method + url + body + headers)
```

**Flow**:
1. Generate request fingerprint from config
2. Check if identical request is already pending
3. If yes: return existing promise
4. If no: execute request, store promise, cleanup on completion

**Configuration**:
```typescript
interface DeduplicationConfig {
  enabled: boolean;
  keyStrategy: 'url' | 'url-body' | 'url-body-headers';
  ttl?: number; // Optional TTL for dedup cache
}
```

**Rationale**:
- Prevents wasteful duplicate requests (e.g., rapid button clicks)
- Configurable granularity (URL only vs full request signature)
- Memory-safe with automatic cleanup
- Transparent to consumers (automatic behavior)

### 6. Cache Layer Architecture

**Decision**: Plugin-based cache architecture with default in-memory implementation.

**Interface**:
```typescript
interface IHttpCache {
  get<T>(key: string): Promise<HttpResponse<T> | null>;
  set<T>(key: string, value: HttpResponse<T>, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}
```

**Default Implementation** (In-Memory):
- LRU-based eviction when max size reached
- TTL support with lazy expiration
- Configurable max size and default TTL
- Per-request cache override

**Integration**:
```typescript
// Check cache before request
const cacheKey = generateCacheKey(config);
const cached = await cache.get(cacheKey);
if (cached && config.cache !== 'no-cache') {
  return cached;
}

// Execute request and cache successful responses
const response = await kyInstance(url, options);
if (response.ok && config.cache !== 'no-store') {
  await cache.set(cacheKey, response, config.cacheTtl);
}
```

**Future Extensions**:
- Redis cache implementation
- LocalStorage/SessionStorage for browsers
- Service worker integration
- Stale-while-revalidate strategy

**Rationale**:
- Reduces network traffic and latency
- Pluggable design allows custom cache backends
- Respects HTTP cache headers (Cache-Control, ETag)
- Production-ready default (in-memory LRU)

### 7. Factory Pattern for Client Instantiation

**Decision**: Provide factory function instead of direct class instantiation.

**API**:
```typescript
// Factory function
export function createKyClient(config?: HttpClientConfig): IHttpClient {
  return new KyHttpClient(config);
}

// Usage
const client = createKyClient({
  baseUrl: 'https://api.example.com',
  timeout: 5000,
  retry: { maxAttempts: 3, backoff: 'exponential' },
  cache: { enabled: true, ttl: 60000 },
  deduplication: { enabled: true }
});
```

**Rationale**:
- Hides implementation details (consumers don't need to know about KyHttpClient class)
- Easier to swap implementations in future
- Consistent with functional programming patterns
- Better for tree-shaking (only used code is bundled)

## Testing Strategy

### Unit Tests
- HTTP method correctness (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS)
- Config merging (client defaults + request overrides)
- Interceptor execution order
- Error mapping accuracy
- Retry policy behavior
- Deduplication correctness
- Cache hit/miss scenarios

### Integration Tests (with MSW)
- Real HTTP workflow simulation
- Network failure scenarios
- Timeout handling
- Concurrent request deduplication
- Cache invalidation
- Retry on transient failures

### Test Infrastructure
- Mock Service Worker (MSW) for HTTP mocking
- Vitest for test runner
- Coverage target: 90%+ for implementation code

## Trade-offs

### Ky Limitations

**No native support for request interceptor error handling**:
- Workaround: Custom wrapper that catches config validation errors
- Impact: Slight API inconsistency with axios-style interceptors
- Mitigation: Clear documentation and type hints

**No progress events**:
- Ky doesn't expose upload/download progress
- Workaround: Not implemented in v1 (future enhancement)
- Impact: Can't track large file uploads/downloads
- Alternative: Use native fetch with streams for progress-critical scenarios

**No support for cancel token**:
- Ky uses AbortController (modern standard)
- Workaround: Wrap AbortController in our IHttpClient interface
- Impact: None (AbortController is better than axios cancel tokens)

### Performance Considerations

**Deduplication overhead**:
- Fingerprint hashing adds ~1-2ms per request
- Benefit: Eliminates redundant network calls (saving 100s of ms)
- Trade-off accepted: Minimal CPU cost for significant network savings

**Cache memory usage**:
- In-memory cache grows with usage
- Mitigation: LRU eviction + TTL-based expiration
- Default limit: 100 entries or 10MB (whichever comes first)

## Migration Path

### Phase 1 (This Proposal)
- Implement ky adapter with all contract features
- Comprehensive test coverage
- Production-ready for direct usage

### Phase 2 (Future)
- Add neverthrow wrapper: `createKyClient().asResult()` returns `ResultAsync<T, E>`
- Add effect-ts wrapper: `createKyClient().asEffect()` returns `Effect<T, E, R>`

### Phase 3 (Future)
- Axios adapter implementation (alternative to ky)
- Benchmark comparison (ky vs axios)
- Migration guide for axios users

## Open Questions

None - all design decisions finalized with user feedback.
