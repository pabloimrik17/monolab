## Why

The `@m0n0lab/http-client` package has defined contracts (`define-http-client-contracts`) but lacks a concrete implementation. We need to implement the full HTTP client abstraction using axios as the underlying library, providing interceptors, retry policies, request deduplication, caching, and factory patterns. This enables consumers to leverage a type-safe, feature-rich HTTP client that abstracts axios-specific details while maintaining all its power.

## What Changes

- Implement complete axios adapter following the `http-client-contracts`:
  - Core HTTP verbs (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS) with full type safety
  - Request/response interceptor system mapping axios interceptors to contract onFulfilled/onRejected
  - Retry policy implementation with configurable strategies (exponential backoff, linear, fixed)
  - Request deduplication to prevent concurrent identical requests
  - Cache layer with pluggable adapters (memory cache, localStorage, custom)
  - Factory pattern for creating configured client instances with persistent base config
- Transform axios errors into contract-compliant error taxonomy
- Comprehensive test suite:
  - Unit tests with axios mocks for all client methods
  - Integration tests for interceptors, retries, and cache behavior
  - Error handling test scenarios
  - Deduplication test cases
- Documentation:
  - API documentation with usage examples
  - Migration guide from raw axios
  - Advanced patterns (custom interceptors, retry strategies, cache plugins)

**Note**: This proposal focuses on the **axios implementation only**. Error handling wrappers (neverthrow, effect-ts) are **out of scope** and will be addressed in future proposals.

**Design Principles**:
- **Contract compliance**: Strictly follows the interfaces defined in `http-client-contracts`
- **Zero breaking changes**: Maps axios features to contracts without losing functionality
- **Performance**: Efficient request deduplication and caching with minimal overhead
- **Testability**: Fully mockable for consumer unit tests
- **Extensibility**: Allows custom interceptors, retry strategies, and cache implementations

## Impact

- **Affected specs**:
  - NEW: `axios-http-client` (axios adapter implementation)
  - NEW: `axios-testing` (test coverage for axios implementation)
  - MODIFIED: `vitest-testing` (add axios mocking patterns)

- **Affected code**:
  - `packages/http-client/src/axios/` - New directory for axios implementation
  - `packages/http-client/src/axios/adapter.ts` - Core axios adapter
  - `packages/http-client/src/axios/interceptors.ts` - Interceptor system
  - `packages/http-client/src/axios/retry.ts` - Retry policy implementation
  - `packages/http-client/src/axios/deduplication.ts` - Request deduplication
  - `packages/http-client/src/axios/cache.ts` - Cache layer implementation
  - `packages/http-client/src/axios/factory.ts` - Client factory
  - `packages/http-client/src/axios/errors.ts` - Error transformation
  - `packages/http-client/src/index.ts` - Export axios implementation
  - `packages/http-client/tests/` - Comprehensive test suite

- **Dependencies**:
  - Add `axios` as peer dependency (^1.6.0)
  - Internal dependency on `http-client-contracts`

- **Migration**: None required (new implementation, no breaking changes)

- **Related work**:
  - Depends on `define-http-client-contracts` (contract definitions)
  - Depends on `add-http-client-package` (package infrastructure)
  - Future: `implement-ky-http-client` (alternative ky implementation)
  - Future: `add-neverthrow-wrapper`, `add-effect-wrapper` (error handling)
