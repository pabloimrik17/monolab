## Why

The `@m0n0lab/http-client` package needs a clear contract specification defining the interfaces that all HTTP client implementations (axios, ky) must follow. This establishes a consistent abstraction layer that allows swapping underlying implementations without changing application code, and enables future error-handling wrappers (neverthrow, effect-ts) to work uniformly across different HTTP libraries.

## What Changes

- Define core TypeScript interfaces for HTTP client contracts:
  - Request/response types and configurations
  - HTTP client interface with standard verbs (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS)
  - Interceptor system using onFulfilled/onRejected pattern (abstracts axios interceptors and ky hooks)
  - Retry policy configuration with native support and lifecycle hooks
  - Request deduplication strategy to prevent redundant concurrent requests
  - Cache layer abstraction with pluggable implementations
  - Factory pattern for client instantiation with persistent base configuration
- Establish error taxonomy and hierarchy
- Document contract guarantees and extension points
- Provide implementation mapping guides for axios and ky

**Note**: This proposal focuses solely on **defining the contracts** (interfaces and types). The actual implementation of axios/ky adapters is **out of scope** and will be covered in separate proposals.

**Design Principles**:
- **Abstraction over implementation**: Contracts work identically whether using axios or ky underneath
- **Familiar patterns**: onFulfilled/onRejected mirrors Promise.then() for easy adoption
- **Type-safe**: Full generic support for request/response/error types
- **Extensible**: Interceptors, retry hooks, and cache plugins enable customization

## Impact

- **Affected specs**:
  - NEW: `http-client-contracts` (contract interfaces and types)

- **Affected code**:
  - `packages/http-client/src/contracts/` - New directory for contract definitions
  - `packages/http-client/src/index.ts` - Export contract interfaces

- **Dependencies**: None (pure TypeScript types)

- **Migration**: None required (new contracts, no existing implementation)

- **Related work**:
  - Linear ticket MON-55 provides reference implementation
  - Proposal `add-http-client-package` established package infrastructure
  - Future proposals will implement concrete adapters (axios, ky)
