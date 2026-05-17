## Architecture Overview

The axios implementation follows a layered architecture that maps axios-specific features to the contract interfaces defined in `http-client-contracts`. Each layer is independently testable and composable.

```
┌─────────────────────────────────────────┐
│   Consumer Application Code            │
└──────────────┬──────────────────────────┘
               │ uses
               ▼
┌─────────────────────────────────────────┐
│   HTTP Client Contract Interface        │  ◄── Defined in contracts
│   (HttpClient, Interceptor, Retry...)   │
└──────────────┬──────────────────────────┘
               │ implements
               ▼
┌─────────────────────────────────────────┐
│   Axios Adapter Layer                   │  ◄── This proposal
│   ├─ Core Adapter                       │
│   ├─ Interceptor Bridge                 │
│   ├─ Retry Policy Engine                │
│   ├─ Request Deduplicator               │
│   ├─ Cache Manager                      │
│   └─ Error Transformer                  │
└──────────────┬──────────────────────────┘
               │ delegates to
               ▼
┌─────────────────────────────────────────┐
│   Axios Library                         │  ◄── External dependency
└─────────────────────────────────────────┘
```

## Component Design

### 1. Core Adapter (`adapter.ts`)

**Responsibility**: Implements the `HttpClient` interface by delegating to axios instance.

**Key Design Decisions**:
- Wraps a configured axios instance (not global axios)
- Maps contract request config to axios `AxiosRequestConfig`
- Transforms axios responses to contract `HttpResponse<T>`
- Integrates all middleware layers (interceptors, retry, cache, deduplication)

**Trade-offs**:
- ✅ Full type safety with generics
- ✅ Instance isolation (no global state pollution)
- ⚠️ Slightly more complex than raw axios usage
- ⚠️ Requires understanding of contract types

### 2. Interceptor Bridge (`interceptors.ts`)

**Responsibility**: Maps axios interceptors to contract `onFulfilled/onRejected` pattern.

**Key Design Decisions**:
- Contract interceptors use Promise-like callbacks for familiarity
- Axios request/response interceptors registered internally
- Maintains interceptor registration order
- Supports both request and response interceptors

**Implementation Pattern**:
```typescript
// Contract interceptor
type Interceptor<T> = {
  onFulfilled?: (value: T) => T | Promise<T>
  onRejected?: (error: unknown) => unknown
}

// Maps to axios
axiosInstance.interceptors.request.use(
  onFulfilled,  // Wraps contract callback
  onRejected    // Wraps contract callback
)
```

**Trade-offs**:
- ✅ Familiar pattern (mirrors Promise.then)
- ✅ No axios-specific types leak to consumers
- ⚠️ Small overhead from wrapper functions

### 3. Retry Policy Engine (`retry.ts`)

**Responsibility**: Implements automatic retry with configurable strategies.

**Key Design Decisions**:
- Built-in strategies: exponential backoff, linear, fixed delay
- Retry hooks for lifecycle events (beforeRetry, afterRetry, onRetryExhausted)
- Respects HTTP idempotency (safe methods like GET retry by default)
- Configurable per-request or client-wide

**Retry Strategies**:
1. **Exponential Backoff**: delay = baseDelay * (2 ^ attemptNumber)
2. **Linear**: delay = baseDelay * attemptNumber
3. **Fixed**: delay = baseDelay

**Trade-offs**:
- ✅ Handles transient failures automatically
- ✅ Configurable strategies avoid hardcoded delays
- ✅ Lifecycle hooks enable telemetry/logging
- ⚠️ Can increase latency on persistent failures
- ⚠️ Requires careful configuration for non-idempotent operations

### 4. Request Deduplicator (`deduplication.ts`)

**Responsibility**: Prevents concurrent identical requests from executing multiple times.

**Key Design Decisions**:
- Request identity based on: method + URL + params + body hash
- In-flight requests share the same Promise
- Cache cleared on response/error
- Configurable per-request via `deduplicate: boolean`

**Implementation Pattern**:
```typescript
const requestKey = computeKey(method, url, params, body)
if (inflightRequests.has(requestKey)) {
  return inflightRequests.get(requestKey)  // Reuse existing
}
const promise = executeRequest(...)
inflightRequests.set(requestKey, promise)
promise.finally(() => inflightRequests.delete(requestKey))
return promise
```

**Trade-offs**:
- ✅ Reduces redundant network calls
- ✅ Improves performance for duplicate requests
- ✅ Low memory overhead (cleared on completion)
- ⚠️ Requires stable body serialization
- ⚠️ Not suitable for all request types (e.g., file uploads)

### 5. Cache Manager (`cache.ts`)

**Responsibility**: Provides pluggable caching with multiple storage backends.

**Key Design Decisions**:
- Cache interface allows custom implementations
- Built-in adapters: in-memory Map, localStorage (browser), custom
- Cache key includes: method + URL + params (body excluded for GET)
- TTL (time-to-live) support with automatic expiration
- Cache invalidation on mutations (POST, PUT, DELETE)

**Cache Adapter Interface**:
```typescript
interface CacheAdapter {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, ttl?: number): Promise<void>
  delete(key: string): Promise<void>
  clear(): Promise<void>
}
```

**Invalidation Strategy**:
- Mutations to `/api/users` invalidate cache entries matching `/api/users*`
- Configurable invalidation patterns via cache config

**Trade-offs**:
- ✅ Reduces network calls for cacheable responses
- ✅ Pluggable adapters support different storage backends
- ✅ Automatic invalidation prevents stale data
- ⚠️ Memory overhead for in-memory cache
- ⚠️ localStorage limited to 5-10MB in browsers
- ⚠️ Cache invalidation patterns may be too broad or narrow

### 6. Error Transformer (`errors.ts`)

**Responsibility**: Maps axios errors to contract error taxonomy.

**Key Design Decisions**:
- Axios `AxiosError` → Contract `HttpError` hierarchy
- Preserve original axios error as `cause` for debugging
- Classify errors: NetworkError, TimeoutError, ResponseError, CancelError
- Extract meaningful error messages from axios error structure

**Error Hierarchy**:
```typescript
class HttpError extends Error {
  cause: AxiosError
}
class NetworkError extends HttpError {}        // Network failure
class TimeoutError extends HttpError {}        // Request timeout
class ResponseError extends HttpError {        // HTTP error status
  statusCode: number
  response: HttpResponse
}
class CancelError extends HttpError {}         // Request cancelled
```

**Trade-offs**:
- ✅ Consistent error handling across implementations
- ✅ Original error preserved for debugging
- ✅ Type-safe error classification
- ⚠️ Extra wrapping adds stack frames

### 7. Factory Pattern (`factory.ts`)

**Responsibility**: Creates pre-configured client instances with shared config.

**Key Design Decisions**:
- Factory function accepts base config (baseURL, headers, timeout)
- Clones base config for each client instance
- Allows instance-level interceptor/retry/cache customization
- Supports preset configurations (e.g., "production", "staging")

**Usage Pattern**:
```typescript
const factory = createHttpClientFactory({
  baseURL: 'https://api.example.com',
  timeout: 5000,
  headers: { 'Authorization': 'Bearer token' }
})

const client = factory.createClient({
  retry: { maxAttempts: 3, strategy: 'exponential' },
  cache: { ttl: 60000 }
})
```

**Trade-offs**:
- ✅ DRY: Shared config across multiple clients
- ✅ Environment-specific presets (dev, prod)
- ✅ Instance isolation prevents cross-contamination
- ⚠️ More setup code than raw axios

## Integration Points

### With Contracts
- Strict adherence to `HttpClient`, `Interceptor`, `RetryPolicy`, `CacheConfig` interfaces
- Generic types `<TData, TError>` preserved throughout
- Error types match contract error taxonomy

### With Testing
- All components mockable via dependency injection
- Axios mocked using `vitest.mock('axios')`
- Test utilities for creating mock responses, errors, interceptors

### With Future Work
- **neverthrow wrapper**: Will consume this axios adapter and wrap in `ResultAsync`
- **effect-ts wrapper**: Will consume this adapter and wrap in `Effect`
- **ky implementation**: Alternative implementation using ky library

## Testing Strategy

### Unit Tests
- Mock axios at module level
- Test each component in isolation
- Verify contract compliance
- Edge cases (network errors, timeouts, cancellations)

### Integration Tests
- Use real axios instance with mocked HTTP server (MSW or nock)
- Test full request/response lifecycle
- Verify interceptor chains
- Validate retry behavior
- Cache hit/miss scenarios
- Deduplication effectiveness

### Coverage Targets
- Line coverage: 90%
- Branch coverage: 85%
- Function coverage: 95%

## Performance Considerations

### Memory
- Deduplication map cleared on request completion
- Cache respects TTL and supports size limits
- No memory leaks from retained axios instances

### Latency
- Deduplication reduces redundant network calls
- Cache eliminates network latency for cache hits
- Retry adds latency on failures (configurable)

### Bundle Size
- Tree-shakeable: unused features excluded
- Axios as peer dependency (not bundled)
- Estimated impact: ~8-12KB gzipped (excluding axios)

## Migration Path

### From Raw Axios
```typescript
// Before
import axios from 'axios'
const response = await axios.get('/users')

// After
import { createHttpClient } from '@m0n0lab/http-client'
const client = createHttpClient()
const response = await client.get('/users')
```

### From Fetch
```typescript
// Before
const response = await fetch('/users')
const data = await response.json()

// After
const client = createHttpClient()
const { data } = await client.get('/users')
```

## Security Considerations

- **CSRF Protection**: Support for CSRF tokens via interceptors
- **Sensitive Headers**: No logging of Authorization headers in errors
- **XSS Prevention**: No eval() or dynamic code execution
- **CORS**: Respects axios CORS handling
- **Timeout**: Default timeout prevents hanging requests

## Open Questions

1. **Cache Size Limits**: Should we enforce max cache size for memory adapter?
   - Proposal: Add optional `maxSize` config with LRU eviction

2. **Retry on Non-Idempotent Methods**: Should POST/PUT retry by default?
   - Proposal: No retry by default, explicit opt-in per request

3. **Deduplication Hash Algorithm**: Use fast hash (FNV-1a) or cryptographic (SHA-256)?
   - Proposal: FNV-1a for speed, collisions unlikely in practice

4. **Interceptor Error Recovery**: Can onRejected convert error to success?
   - Proposal: Yes, matching axios behavior (return value = success)

## Future Enhancements (Out of Scope)

- GraphQL support via interceptors
- Request/response compression
- Automatic authentication token refresh
- Offline queue with persistence
- Request prioritization
- Telemetry/analytics hooks
- WebSocket support
