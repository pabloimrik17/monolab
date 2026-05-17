## Why

The `@m0n0lab/http-client` package has defined contracts (interfaces and types) but lacks a concrete implementation. We need to implement a production-ready HTTP client based on ky (a tiny, elegant fetch-based HTTP client) that fulfills all the defined contracts, including advanced features like retry policies, request deduplication, and caching. This will provide consumers with a modern, type-safe HTTP client that works in both browsers and Node.js environments.

Ky was chosen for its:
- Tiny footprint with zero dependencies
- Native fetch API foundation (modern, standardized)
- Built-in retry logic and timeout support
- TypeScript-first design with excellent type inference
- Active maintenance and community adoption
- Cross-platform support (browsers, Node.js, Bun, Deno)

## What Changes

- Implement KyHttpClient class that satisfies the IHttpClient interface:
  - All standard HTTP methods (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS)
  - Request/response interceptors mapped from ky hooks
  - Error handling with proper HttpError hierarchy
  - Configuration merging (client-level defaults + request-level overrides)

- Implement advanced features defined in contracts:
  - Retry policies with exponential backoff (leveraging ky's built-in retry + custom hooks)
  - Request deduplication to prevent redundant concurrent requests
  - Pluggable cache layer with in-memory default implementation
  - Timeout handling with AbortController integration

- Add ky and ky-universal dependencies:
  - `ky` for browser environments
  - `ky-universal` for Node.js/SSR environments

- Comprehensive test suite:
  - Unit tests for all HTTP methods
  - Interceptor lifecycle tests
  - Retry policy behavior tests
  - Deduplication scenario tests
  - Cache layer tests
  - Error handling tests
  - Mock service worker integration for realistic HTTP testing

**Note**: This proposal implements the core ky adapter and advanced features. Error-handling wrappers (neverthrow ResultAsync, effect-ts Effect) are **out of scope** and will be covered in future proposals.

## Impact

- **Affected specs**:
  - NEW: `ky-http-client` (ky implementation details)
  - NEW: `http-client-testing` (testing strategy and infrastructure)
  - MODIFIED: `http-client-package` (add ky dependencies, update exports)

- **Affected code**:
  - `packages/http-client/src/implementations/ky/` - New ky adapter implementation
  - `packages/http-client/src/features/` - Retry, deduplication, cache implementations
  - `packages/http-client/src/index.ts` - Export ky client factory
  - `packages/http-client/package.json` - Add ky, ky-universal dependencies
  - `packages/http-client/src/**/*.spec.ts` - Comprehensive test suite

- **Dependencies**:
  - Production: `ky` (latest), `ky-universal` (latest)
  - Development: `msw` (Mock Service Worker) for testing

- **Migration**: None required (first concrete implementation)

- **Related work**:
  - Builds on `define-http-client-contracts` (contract definitions)
  - Builds on `add-http-client-package` (package infrastructure)
  - Enables future `add-neverthrow-wrapper` and `add-effect-wrapper` proposals
