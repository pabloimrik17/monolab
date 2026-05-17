## ADDED Requirements

### Requirement: Unit Test Coverage

The axios adapter MUST have comprehensive unit tests with mocked axios.

#### Scenario: Core HTTP methods unit tests

```typescript
import { describe, it, expect, vi } from 'vitest'
import axios from 'axios'
import { createHttpClient } from '@m0n0lab/http-client'

vi.mock('axios')

describe('AxiosAdapter', () => {
  it('should execute GET request', async () => {
    const mockResponse = { data: { id: 1 }, status: 200 }
    vi.mocked(axios.create).mockReturnValue({
      get: vi.fn().mockResolvedValue(mockResponse)
    } as any)

    const client = createHttpClient()
    const response = await client.get('/users/1')

    expect(response.data).toEqual({ id: 1 })
    expect(response.status).toBe(200)
  })

  it('should execute POST request with body', async () => {
    const client = createHttpClient()
    await client.post('/users', { name: 'John' })

    expect(axios.post).toHaveBeenCalledWith('/users', { name: 'John' }, expect.any(Object))
  })
})
```

#### Scenario: Interceptor unit tests

```typescript
describe('Interceptors', () => {
  it('should call request interceptor', async () => {
    const onFulfilled = vi.fn((config) => config)
    const client = createHttpClient()

    client.addRequestInterceptor({ onFulfilled })
    await client.get('/test')

    expect(onFulfilled).toHaveBeenCalled()
  })

  it('should call response interceptor', async () => {
    const onFulfilled = vi.fn((response) => response)
    const client = createHttpClient()

    client.addResponseInterceptor({ onFulfilled })
    await client.get('/test')

    expect(onFulfilled).toHaveBeenCalled()
  })

  it('should handle interceptor error', async () => {
    const onRejected = vi.fn((error) => {
      throw error
    })
    const client = createHttpClient()

    client.addResponseInterceptor({ onRejected })
    vi.mocked(axios.get).mockRejectedValue(new Error('Network error'))

    await expect(client.get('/test')).rejects.toThrow('Network error')
    expect(onRejected).toHaveBeenCalled()
  })
})
```

#### Scenario: Retry logic unit tests

```typescript
describe('Retry Policy', () => {
  it('should retry on failure', async () => {
    const client = createHttpClient({
      retry: { maxAttempts: 3, strategy: 'fixed', baseDelay: 10 }
    })

    vi.mocked(axios.get)
      .mockRejectedValueOnce(new Error('Fail 1'))
      .mockRejectedValueOnce(new Error('Fail 2'))
      .mockResolvedValueOnce({ data: 'success', status: 200 })

    const response = await client.get('/test')

    expect(response.data).toBe('success')
    expect(axios.get).toHaveBeenCalledTimes(3)
  })

  it('should exhaust retries and throw', async () => {
    const client = createHttpClient({
      retry: { maxAttempts: 2 }
    })

    vi.mocked(axios.get).mockRejectedValue(new Error('Always fails'))

    await expect(client.get('/test')).rejects.toThrow('Always fails')
    expect(axios.get).toHaveBeenCalledTimes(2)
  })

  it('should calculate exponential backoff delays', () => {
    const delays = calculateExponentialDelays({ baseDelay: 100, maxAttempts: 4 })

    expect(delays).toEqual([100, 200, 400, 800])
  })
})
```

#### Scenario: Deduplication unit tests

```typescript
describe('Request Deduplication', () => {
  it('should deduplicate concurrent identical requests', async () => {
    const client = createHttpClient({ deduplicate: true })

    vi.mocked(axios.get).mockResolvedValue({ data: 'result', status: 200 })

    const [res1, res2] = await Promise.all([
      client.get('/test'),
      client.get('/test')
    ])

    expect(axios.get).toHaveBeenCalledTimes(1)
    expect(res1).toBe(res2)  // Same promise
  })

  it('should generate unique keys for different requests', () => {
    const key1 = generateDeduplicationKey('GET', '/users', { page: 1 })
    const key2 = generateDeduplicationKey('GET', '/users', { page: 2 })
    const key3 = generateDeduplicationKey('POST', '/users', { page: 1 })

    expect(key1).not.toBe(key2)
    expect(key1).not.toBe(key3)
    expect(key2).not.toBe(key3)
  })
})
```

#### Scenario: Cache logic unit tests

```typescript
describe('Cache Manager', () => {
  it('should cache GET responses', async () => {
    const cacheAdapter = new MemoryCacheAdapter()
    const client = createHttpClient({ cache: { adapter: cacheAdapter, ttl: 60000 } })

    vi.mocked(axios.get).mockResolvedValue({ data: 'cached', status: 200 })

    await client.get('/test')
    await client.get('/test')

    expect(axios.get).toHaveBeenCalledTimes(1)
  })

  it('should invalidate cache on mutation', async () => {
    const cacheAdapter = new MemoryCacheAdapter()
    const client = createHttpClient({ cache: { adapter: cacheAdapter } })

    await client.get('/users')
    await client.post('/users', { name: 'John' })
    await client.get('/users')

    expect(axios.get).toHaveBeenCalledTimes(2)  // Cache invalidated
  })

  it('should respect TTL', async () => {
    vi.useFakeTimers()
    const cacheAdapter = new MemoryCacheAdapter()
    const client = createHttpClient({ cache: { adapter: cacheAdapter, ttl: 1000 } })

    await client.get('/test')
    vi.advanceTimersByTime(1500)
    await client.get('/test')

    expect(axios.get).toHaveBeenCalledTimes(2)  // Cache expired
    vi.useRealTimers()
  })
})
```

#### Scenario: Error transformation unit tests

```typescript
describe('Error Transformation', () => {
  it('should transform AxiosError to NetworkError', () => {
    const axiosError = new AxiosError('Network Error', 'ERR_NETWORK')
    const httpError = transformAxiosError(axiosError)

    expect(httpError).toBeInstanceOf(NetworkError)
    expect(httpError.cause).toBe(axiosError)
  })

  it('should transform timeout to TimeoutError', () => {
    const axiosError = new AxiosError('Timeout', 'ECONNABORTED')
    const httpError = transformAxiosError(axiosError)

    expect(httpError).toBeInstanceOf(TimeoutError)
  })

  it('should transform 404 to ResponseError with statusCode', () => {
    const axiosError = new AxiosError('Not Found', 'ERR_BAD_REQUEST')
    axiosError.response = { status: 404, data: { message: 'Not found' } }

    const httpError = transformAxiosError(axiosError)

    expect(httpError).toBeInstanceOf(ResponseError)
    expect(httpError.statusCode).toBe(404)
    expect(httpError.response.data).toEqual({ message: 'Not found' })
  })
})
```

### Requirement: Integration Test Coverage

The axios adapter MUST have integration tests using real axios with mocked HTTP server.

#### Scenario: Full request/response lifecycle integration test

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { createHttpClient } from '@m0n0lab/http-client'

const server = setupServer()

beforeAll(() => server.listen())
afterAll(() => server.close())

describe('Axios Integration', () => {
  it('should complete full request/response cycle', async () => {
    server.use(
      http.get('https://api.test.com/users', () => {
        return HttpResponse.json({ id: 1, name: 'John' })
      })
    )

    const client = createHttpClient({ baseURL: 'https://api.test.com' })
    const response = await client.get('/users')

    expect(response.data).toEqual({ id: 1, name: 'John' })
    expect(response.status).toBe(200)
  })
})
```

#### Scenario: Interceptor chain integration test

```typescript
describe('Interceptor Chain', () => {
  it('should execute multiple interceptors in order', async () => {
    const order: number[] = []

    server.use(
      http.get('https://api.test.com/test', () => {
        return HttpResponse.json({ data: 'test' })
      })
    )

    const client = createHttpClient({ baseURL: 'https://api.test.com' })

    client.addRequestInterceptor({
      onFulfilled: (config) => {
        order.push(1)
        config.headers['X-Step-1'] = 'done'
        return config
      }
    })

    client.addRequestInterceptor({
      onFulfilled: (config) => {
        order.push(2)
        config.headers['X-Step-2'] = 'done'
        return config
      }
    })

    client.addResponseInterceptor({
      onFulfilled: (response) => {
        order.push(3)
        return response
      }
    })

    await client.get('/test')

    expect(order).toEqual([1, 2, 3])
  })
})
```

#### Scenario: Retry with backoff integration test

```typescript
describe('Retry Integration', () => {
  it('should retry with exponential backoff', async () => {
    let attempts = 0
    const delays: number[] = []
    const startTimes: number[] = []

    server.use(
      http.get('https://api.test.com/flaky', () => {
        startTimes.push(Date.now())
        attempts++
        if (attempts < 3) {
          return new HttpResponse(null, { status: 500 })
        }
        return HttpResponse.json({ data: 'success' })
      })
    )

    const client = createHttpClient({
      baseURL: 'https://api.test.com',
      retry: {
        maxAttempts: 3,
        strategy: 'exponential',
        baseDelay: 100
      }
    })

    const response = await client.get('/flaky')

    expect(attempts).toBe(3)
    expect(response.data).toEqual({ data: 'success' })

    // Verify exponential backoff delays
    for (let i = 1; i < startTimes.length; i++) {
      delays.push(startTimes[i] - startTimes[i - 1])
    }
    expect(delays[0]).toBeGreaterThanOrEqual(100)
    expect(delays[1]).toBeGreaterThanOrEqual(200)
  })
})
```

#### Scenario: Cache invalidation integration test

```typescript
describe('Cache Invalidation', () => {
  it('should invalidate cache on POST', async () => {
    let getUsersCalls = 0

    server.use(
      http.get('https://api.test.com/users', () => {
        getUsersCalls++
        return HttpResponse.json({ data: 'users' })
      }),
      http.post('https://api.test.com/users', () => {
        return HttpResponse.json({ data: 'created' }, { status: 201 })
      })
    )

    const client = createHttpClient({
      baseURL: 'https://api.test.com',
      cache: { ttl: 60000 }
    })

    await client.get('/users')  // Cache miss
    await client.get('/users')  // Cache hit
    await client.post('/users', { name: 'John' })  // Invalidates
    await client.get('/users')  // Cache miss again

    expect(getUsersCalls).toBe(2)
  })
})
```

#### Scenario: Deduplication race condition integration test

```typescript
describe('Deduplication Race Conditions', () => {
  it('should handle concurrent identical requests', async () => {
    let serverCalls = 0

    server.use(
      http.get('https://api.test.com/data', async () => {
        serverCalls++
        await new Promise(resolve => setTimeout(resolve, 100))
        return HttpResponse.json({ data: 'result' })
      })
    )

    const client = createHttpClient({
      baseURL: 'https://api.test.com',
      deduplicate: true
    })

    const [res1, res2, res3] = await Promise.all([
      client.get('/data'),
      client.get('/data'),
      client.get('/data')
    ])

    expect(serverCalls).toBe(1)
    expect(res1.data).toEqual(res2.data)
    expect(res2.data).toEqual(res3.data)
  })
})
```

### Requirement: Error Handling Test Coverage

The axios adapter MUST test all error scenarios comprehensively.

#### Scenario: Network timeout error test

```typescript
describe('Error Handling', () => {
  it('should handle timeout error', async () => {
    server.use(
      http.get('https://api.test.com/slow', async () => {
        await new Promise(resolve => setTimeout(resolve, 10000))
        return HttpResponse.json({ data: 'slow' })
      })
    )

    const client = createHttpClient({
      baseURL: 'https://api.test.com',
      timeout: 100
    })

    await expect(client.get('/slow')).rejects.toThrow(TimeoutError)
  })

  it('should handle network error', async () => {
    server.use(
      http.get('https://api.test.com/network-error', () => {
        return HttpResponse.error()
      })
    )

    const client = createHttpClient({ baseURL: 'https://api.test.com' })

    await expect(client.get('/network-error')).rejects.toThrow(NetworkError)
  })

  it('should handle 4xx client errors', async () => {
    server.use(
      http.get('https://api.test.com/forbidden', () => {
        return new HttpResponse(null, { status: 403 })
      })
    )

    const client = createHttpClient({ baseURL: 'https://api.test.com' })

    try {
      await client.get('/forbidden')
    } catch (error) {
      expect(error).toBeInstanceOf(ResponseError)
      expect(error.statusCode).toBe(403)
    }
  })

  it('should handle 5xx server errors', async () => {
    server.use(
      http.get('https://api.test.com/server-error', () => {
        return new HttpResponse(null, { status: 500 })
      })
    )

    const client = createHttpClient({ baseURL: 'https://api.test.com' })

    await expect(client.get('/server-error')).rejects.toThrow(ResponseError)
  })
})
```

### Requirement: Test Utilities and Mocks

The package MUST provide test utilities for consumers to mock HTTP clients in their tests.

#### Scenario: Mock HTTP client factory for testing

```typescript
export function createMockHttpClient(overrides = {}): HttpClient {
  return {
    get: vi.fn().mockResolvedValue({ data: null, status: 200 }),
    post: vi.fn().mockResolvedValue({ data: null, status: 201 }),
    put: vi.fn().mockResolvedValue({ data: null, status: 200 }),
    patch: vi.fn().mockResolvedValue({ data: null, status: 200 }),
    delete: vi.fn().mockResolvedValue({ data: null, status: 204 }),
    head: vi.fn().mockResolvedValue({ status: 200 }),
    options: vi.fn().mockResolvedValue({ status: 200 }),
    addRequestInterceptor: vi.fn(),
    addResponseInterceptor: vi.fn(),
    ...overrides
  }
}

// Consumer usage
describe('UserService', () => {
  it('should fetch users', async () => {
    const mockClient = createMockHttpClient({
      get: vi.fn().mockResolvedValue({ data: [{ id: 1, name: 'John' }] })
    })

    const userService = new UserService(mockClient)
    const users = await userService.getUsers()

    expect(users).toHaveLength(1)
  })
})
```

#### Scenario: Response builder utility

```typescript
export function buildHttpResponse<T>(data: T, overrides = {}): HttpResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {},
    ...overrides
  }
}

// Usage
const response = buildHttpResponse({ id: 1 }, { status: 201 })
expect(response.status).toBe(201)
```

#### Scenario: Error builder utility

```typescript
export function buildNetworkError(message: string): NetworkError {
  const error = new NetworkError(message)
  error.cause = new AxiosError(message, 'ERR_NETWORK')
  return error
}

// Usage
mockClient.get.mockRejectedValue(buildNetworkError('Connection failed'))
```

### Requirement: Coverage Thresholds

The axios implementation MUST meet coverage thresholds.

#### Scenario: Coverage thresholds in Vitest config

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      thresholds: {
        lines: 90,
        functions: 95,
        branches: 85,
        statements: 90
      },
      include: ['src/axios/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.spec.ts', '**/types.ts']
    }
  }
})
```

### Requirement: Continuous Integration Testing

The axios tests MUST run in CI with proper reporting.

#### Scenario: CI test execution

```yaml
# .github/workflows/ci.yml
- name: Run axios tests
  run: pnpm --filter @m0n0lab/http-client test:unit

- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    flags: http-client
    files: ./packages/http-client/coverage/lcov.info
```

## MODIFIED Requirements

### Requirement: Vitest Configuration (from vitest-testing spec)

The vitest configuration MUST include axios-specific testing patterns and MSW setup for integration tests.

#### Scenario: MSW server setup for integration tests

```typescript
// vitest.setup.ts
import { beforeAll, afterEach, afterAll } from 'vitest'
import { setupServer } from 'msw/node'

export const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

#### Scenario: Axios mock setup for unit tests

```typescript
// vitest.setup.ts
import { vi } from 'vitest'
import axios from 'axios'

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      head: vi.fn(),
      options: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
      }
    }))
  }
}))
```
