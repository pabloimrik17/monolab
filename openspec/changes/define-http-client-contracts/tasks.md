# Tasks

This change involves defining TypeScript interfaces and types only - no runtime implementation.

## 1. Create Core HTTP Types

- [ ] Create `packages/http-client/src/contracts/types.ts`
- [ ] Define `HttpMethod` type (union of HTTP verbs)
- [ ] Define `HttpHeaders` type (Record<string, string | string[]>)
- [ ] Define `HttpStatusCode` type (union of common status codes)
- [ ] Define `HttpResponseType` type ('json' | 'text' | 'blob' | 'arraybuffer' | 'stream')
- [ ] Define `HttpCredentialsMode` type ('omit' | 'same-origin' | 'include')
- [ ] Add JSDoc documentation for each type

## 2. Create Request Configuration Interface

- [ ] Create `packages/http-client/src/contracts/request.ts`
- [ ] Define `HttpRequestConfig` interface with properties:
  - baseUrl?: string
  - timeout?: number
  - headers?: HttpHeaders
  - query?: Record<string, unknown>
  - responseType?: HttpResponseType
  - credentials?: HttpCredentialsMode
  - deduplicate?: boolean
  - cache?: boolean | CacheOptions
- [ ] Define `HttpRequestBody` type (support JSON, FormData, etc.)
- [ ] Add JSDoc with usage examples

## 3. Create Response Interface

- [ ] Create `packages/http-client/src/contracts/response.ts`
- [ ] Define `HttpResponse<T>` interface with properties:
  - data: T
  - status: number
  - statusText: string
  - ok: boolean
  - headers: HttpHeaders
  - request: Readonly<HttpRequestConfig>
  - url: string
- [ ] Add JSDoc documentation

## 4. Create Error Hierarchy

**Note**: Error classes at this stage are **contract definitions only** (type shapes). Constructor implementation and error throwing logic will be added in implementation proposals (axios/ky adapters).

- [ ] Create `packages/http-client/src/contracts/errors.ts`
- [ ] Define base `HttpError` class extending Error
  - Add properties: name, message, request, timestamp
  - Constructor signature only (no implementation logic yet)
- [ ] Define `HttpNetworkError` class extending HttpError
  - Add property: code (ECONNREFUSED, ETIMEDOUT, etc.)
- [ ] Define `HttpResponseError<T>` class extending HttpError
  - Add properties: status, statusText, data, headers
- [ ] Define specific error classes:
  - HttpBadRequestError (400)
  - HttpUnauthorizedError (401)
  - HttpForbiddenError (403)
  - HttpNotFoundError (404)
  - HttpConflictError (409)
  - HttpUnprocessableEntityError (422)
  - HttpTooManyRequestsError (429)
  - HttpInternalServerError (500)
  - HttpServiceUnavailableError (503)
- [ ] Define `HttpTimeoutError` class
- [ ] Define `HttpAbortError` class
- [ ] Add JSDoc for each error class documenting:
  - When they should be thrown (contract for implementers)
  - What properties they expose
  - Example usage in error handling

## 5. Create Interceptor Types

**Note**: Using onFulfilled/onRejected pattern to abstract both axios interceptors and ky hooks.

- [ ] Create `packages/http-client/src/contracts/interceptors.ts`
- [ ] Define `RequestOnFulfilled` type:
  - Function: (config: HttpRequestConfig) => HttpRequestConfig | Promise<HttpRequestConfig>
- [ ] Define `RequestOnRejected` type:
  - Function: (error: Error) => HttpRequestConfig | Promise<HttpRequestConfig> | never
- [ ] Define `ResponseOnFulfilled` type:
  - Function: (response: HttpResponse<unknown>) => HttpResponse<unknown> | Promise<HttpResponse<unknown>>
- [ ] Define `ResponseOnRejected` type:
  - Function: (error: HttpError) => HttpResponse<unknown> | HttpError | Promise<HttpResponse<unknown> | HttpError> | never
- [ ] Define `InterceptorHandle` type for removal (number | symbol | string)
- [ ] Add JSDoc documenting:
  - onFulfilled/onRejected pattern (matches Promise.then() semantics)
  - How this maps to axios: `axios.interceptors.request.use(onFulfilled, onRejected)`
  - How this maps to ky: `beforeRequest` (onFulfilled), `beforeError` (onRejected)
  - Use cases: authentication, logging, data transformation, error recovery

## 6. Create Retry Configuration

- [ ] Create `packages/http-client/src/contracts/retry.ts`
- [ ] Define `HttpRetryConfig` interface:
  - attempts: number (default 0)
  - delay: number | ((attempt: number, error: HttpError) => number)
  - condition?: (error: HttpError) => boolean
  - onRetry?: (error: HttpError, attempt: number) => void
  - onRetryFailed?: (error: HttpError) => void
  - respectRetryAfter?: boolean (default true)
- [ ] Define default retry condition function type
- [ ] Define common retry strategies:
  - exponentialBackoff: (baseDelay: number, maxDelay?: number) => delay function
  - linearBackoff: (baseDelay: number) => delay function
  - jitterBackoff: (baseDelay: number) => delay function
- [ ] Add JSDoc with retry examples

## 7. Create Deduplication Types

- [ ] Create `packages/http-client/src/contracts/deduplication.ts`
- [ ] Define `HttpDeduplicationConfig` interface:
  - enabled: boolean (default false)
  - keyGenerator?: (config: HttpRequestConfig) => string
  - ttl?: number (milliseconds, default 0)
  - criticalHeaders?: string[] (default: ['Authorization', 'Content-Type'])
- [ ] Define `DeduplicationKey` type (string)
- [ ] Add JSDoc explaining deduplication behavior

## 8. Create Cache Abstraction

- [ ] Create `packages/http-client/src/contracts/cache.ts`
- [ ] Define `CacheEntry` interface:
  - data: unknown
  - headers: HttpHeaders
  - timestamp: number
  - ttl: number
  - etag?: string
- [ ] Define `HttpCache` interface:
  - get(key: string): Promise<CacheEntry | null>
  - set(key: string, value: CacheEntry, ttl?: number): Promise<void>
  - delete(key: string): Promise<void>
  - clear(): Promise<void>
- [ ] Define `HttpCacheConfig` interface:
  - cache?: HttpCache
  - keyGenerator?: (config: HttpRequestConfig) => string
  - ttl?: number
  - respectCacheHeaders?: boolean (default true)
  - staleWhileRevalidate?: boolean (default false)
  - invalidatePatterns?: string[] | ((config: HttpRequestConfig) => string[])
- [ ] Add JSDoc with cache strategy examples

## 9. Create HTTP Client Interface

- [ ] Create `packages/http-client/src/contracts/client.ts`
- [ ] Define `HttpClient` interface with methods:
  - get<TResponse, TError = unknown>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<TResponse>>
  - post<TResponse, TBody = unknown, TError = unknown>(url: string, body?: TBody, config?: HttpRequestConfig): Promise<HttpResponse<TResponse>>
  - put<TResponse, TBody = unknown, TError = unknown>(url: string, body?: TBody, config?: HttpRequestConfig): Promise<HttpResponse<TResponse>>
  - patch<TResponse, TBody = unknown, TError = unknown>(url: string, body?: TBody, config?: HttpRequestConfig): Promise<HttpResponse<TResponse>>
  - delete<TResponse = void, TError = unknown>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<TResponse>>
  - head<TError = unknown>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<void>>
  - options<TError = unknown>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<void>>
- [ ] Add interceptor management methods using onFulfilled/onRejected pattern:
  - addRequestInterceptor(onFulfilled: RequestOnFulfilled, onRejected?: RequestOnRejected): InterceptorHandle
  - addResponseInterceptor(onFulfilled: ResponseOnFulfilled, onRejected?: ResponseOnRejected): InterceptorHandle
  - removeInterceptor(handle: InterceptorHandle): void
- [ ] Add JSDoc with usage examples for each method

## 10. Create Client Options and Factory Types

- [ ] Create `packages/http-client/src/contracts/factory.ts`
- [ ] Define `HttpClientOptions` interface extending HttpRequestConfig:
  - baseUrl?: string
  - timeout?: number
  - headers?: HttpHeaders
  - interceptors?: HttpInterceptors
  - retry?: HttpRetryConfig
  - deduplication?: HttpDeduplicationConfig
  - cache?: HttpCacheConfig
- [ ] Define `HttpClientFactory` type:
  - Function: (options?: HttpClientOptions) => HttpClient
- [ ] Add JSDoc with factory usage examples

## 11. Create Barrel Exports

- [ ] Update `packages/http-client/src/index.ts` to export all contracts:
  - Export all types from types.ts
  - Export all interfaces from request.ts
  - Export all interfaces from response.ts
  - Export all error classes from errors.ts
  - Export all types from interceptors.ts
  - Export all types from retry.ts
  - Export all types from deduplication.ts
  - Export all interfaces from cache.ts
  - Export all interfaces from client.ts
  - Export all types from factory.ts
- [ ] Organize exports by logical grouping (types, errors, client, etc.)

## 12. Add Type-Level Tests

**Note**: This task adds compile-time type tests only. No runtime unit tests are needed since we're defining contracts without implementation.

- [ ] Create `packages/http-client/src/contracts/__tests__/type-checks.test-d.ts`
- [ ] Add type-level tests using `expectTypeOf` from Vitest:
  - Verify `HttpClient.get<User>()` returns `Promise<HttpResponse<User>>`
  - Verify `HttpClient.post<User, CreateUserDto>()` accepts body and returns correct type
  - Verify error classes have expected properties (status, data, headers, etc.)
  - Verify interceptor function signatures accept and return correct types
  - Verify generic type inference works without explicit type parameters
  - Verify readonly properties are enforced at compile time
  - Verify no `any` types leak through public interfaces
- [ ] Add negative tests (should NOT compile):
  - Assigning wrong types to client methods
  - Passing incompatible bodies to POST/PUT/PATCH
  - Invalid interceptor return types
- [ ] Run `nx run http-client:test:unit` to execute type tests (they run with Vitest)

## 13. Update Package Documentation

- [ ] Update `packages/http-client/README.md`:
  - Add "Contracts" section explaining the interface design
  - Add examples of creating typed clients
  - Add examples of error handling with typed errors
  - Add examples of interceptor usage
  - Add examples of retry configuration
  - Note that this is a contract-only package (implementations in separate packages)
- [ ] Add migration guide for users coming from raw axios/fetch

## 14. Validation and Quality Checks

- [ ] Run `nx run http-client:build` and verify compilation succeeds
- [ ] Run `nx run http-client:lint:eslint` and fix any issues
- [ ] Run `nx run http-client:lint:prettier` and format code
- [ ] Run `attw --pack` and ensure no export issues
- [ ] Run `nx run http-client:test:unit` and verify tests pass
- [ ] Verify TypeScript strict mode compliance
- [ ] Check for unused exports with Knip
