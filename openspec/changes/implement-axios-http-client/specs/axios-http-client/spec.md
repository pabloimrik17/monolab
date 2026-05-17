## ADDED Requirements

### Requirement: Axios Adapter Core Implementation

The axios adapter MUST implement the `HttpClient` interface with full type safety.

#### Scenario: GET request with type inference

```typescript
import { createHttpClient } from '@m0n0lab/http-client'

interface User {
  id: number
  name: string
}

const client = createHttpClient()
const response = await client.get<User>('/users/1')

// THEN response.data is typed as User
expect(response.data.id).toBe(1)
expect(response.data.name).toBe('John')
```

#### Scenario: POST request with request body

```typescript
const newUser = { name: 'Jane', email: 'jane@example.com' }
const response = await client.post<User, typeof newUser>('/users', newUser)

// THEN response includes created user
expect(response.data.id).toBeDefined()
expect(response.data.name).toBe('Jane')
```

#### Scenario: Request with custom headers and timeout

```typescript
const response = await client.get('/api/data', {
  headers: { 'X-Custom': 'value' },
  timeout: 3000,
  params: { page: 1, limit: 10 }
})

// THEN axios receives the configuration
expect(response.status).toBe(200)
```

#### Scenario: All HTTP methods are supported

```typescript
await client.get('/resource')
await client.post('/resource', { data: 'value' })
await client.put('/resource/1', { data: 'updated' })
await client.patch('/resource/1', { data: 'partial' })
await client.delete('/resource/1')
await client.head('/resource')
await client.options('/resource')

// THEN all methods execute successfully
```

### Requirement: Request/Response Interceptor System

The adapter MUST support interceptors following the contract onFulfilled/onRejected pattern.

#### Scenario: Add request interceptor for authentication

```typescript
client.addRequestInterceptor({
  onFulfilled: (config) => {
    config.headers['Authorization'] = 'Bearer token'
    return config
  }
})

const response = await client.get('/protected')

// THEN request includes Authorization header
expect(response.config.headers['Authorization']).toBe('Bearer token')
```

#### Scenario: Add response interceptor for logging

```typescript
const logs: string[] = []

client.addResponseInterceptor({
  onFulfilled: (response) => {
    logs.push(`Response: ${response.status}`)
    return response
  }
})

await client.get('/users')

// THEN interceptor was called
expect(logs).toContain('Response: 200')
```

#### Scenario: Response interceptor error recovery

```typescript
client.addResponseInterceptor({
  onRejected: (error) => {
    if (error.response?.status === 404) {
      return { data: null, status: 200 }  // Convert 404 to success
    }
    throw error
  }
})

const response = await client.get('/nonexistent')

// THEN error was recovered
expect(response.data).toBeNull()
expect(response.status).toBe(200)
```

#### Scenario: Multiple interceptors execute in order

```typescript
const order: number[] = []

client.addRequestInterceptor({
  onFulfilled: (config) => {
    order.push(1)
    return config
  }
})

client.addRequestInterceptor({
  onFulfilled: (config) => {
    order.push(2)
    return config
  }
})

await client.get('/test')

// THEN interceptors executed in registration order
expect(order).toEqual([1, 2])
```

### Requirement: Retry Policy Implementation

The adapter MUST implement automatic retry with configurable strategies.

#### Scenario: Exponential backoff retry strategy

```typescript
const client = createHttpClient({
  retry: {
    maxAttempts: 3,
    strategy: 'exponential',
    baseDelay: 100
  }
})

// Mock: First two calls fail, third succeeds
mockAxios.onGet('/flaky').replyOnce(500).onGet('/flaky').replyOnce(500).onGet('/flaky').reply(200)

const response = await client.get('/flaky')

// THEN retried 2 times and succeeded on 3rd attempt
expect(mockAxios.history.get).toHaveLength(3)
expect(response.status).toBe(200)
```

#### Scenario: Linear retry strategy

```typescript
const client = createHttpClient({
  retry: {
    maxAttempts: 3,
    strategy: 'linear',
    baseDelay: 100
  }
})

// THEN delays are: 100ms, 200ms
// (exponential would be 100ms, 200ms, 400ms)
```

#### Scenario: Fixed delay retry strategy

```typescript
const client = createHttpClient({
  retry: {
    maxAttempts: 3,
    strategy: 'fixed',
    baseDelay: 100
  }
})

// THEN all delays are 100ms
```

#### Scenario: Retry only on safe HTTP methods

```typescript
const client = createHttpClient({
  retry: { maxAttempts: 3 }
})

mockAxios.onGet('/resource').networkError()
mockAxios.onPost('/resource').networkError()

await expect(client.get('/resource')).rejects.toThrow()  // Retried
await expect(client.post('/resource', {})).rejects.toThrow()  // NOT retried

// THEN GET retried 3 times, POST only tried once
expect(mockAxios.history.get).toHaveLength(3)
expect(mockAxios.history.post).toHaveLength(1)
```

#### Scenario: Custom retry condition

```typescript
const client = createHttpClient({
  retry: {
    maxAttempts: 3,
    shouldRetry: (error) => error.response?.status === 503
  }
})

mockAxios.onGet('/service').reply(503).onGet('/service').reply(200)

const response = await client.get('/service')

// THEN retried on 503 and succeeded
expect(response.status).toBe(200)
```

#### Scenario: Retry lifecycle hooks

```typescript
const events: string[] = []

const client = createHttpClient({
  retry: {
    maxAttempts: 3,
    onBeforeRetry: (attempt, delay) => {
      events.push(`beforeRetry-${attempt}-${delay}`)
    },
    onAfterRetry: (attempt, response) => {
      events.push(`afterRetry-${attempt}`)
    },
    onRetryExhausted: (error) => {
      events.push('exhausted')
    }
  }
})

// THEN hooks are called appropriately
```

### Requirement: Request Deduplication

The adapter MUST prevent concurrent identical requests from executing multiple times.

#### Scenario: Concurrent identical GET requests deduplicated

```typescript
const client = createHttpClient({ deduplicate: true })

mockAxios.onGet('/users').reply(200, { data: 'users' })

const [response1, response2, response3] = await Promise.all([
  client.get('/users'),
  client.get('/users'),
  client.get('/users')
])

// THEN only one actual request made
expect(mockAxios.history.get).toHaveLength(1)
expect(response1).toBe(response2)  // Same promise result
expect(response2).toBe(response3)
```

#### Scenario: Different requests are not deduplicated

```typescript
await Promise.all([
  client.get('/users'),
  client.get('/posts'),
  client.get('/users?page=2')
])

// THEN 3 separate requests made
expect(mockAxios.history.get).toHaveLength(3)
```

#### Scenario: Deduplication key includes method, URL, params, body

```typescript
await Promise.all([
  client.get('/users', { params: { page: 1 } }),
  client.get('/users', { params: { page: 2 } }),
  client.post('/users', { name: 'John' }),
  client.post('/users', { name: 'Jane' })
])

// THEN 4 separate requests (different params/body)
expect(mockAxios.history.get).toHaveLength(2)
expect(mockAxios.history.post).toHaveLength(2)
```

#### Scenario: Deduplication cleared after response

```typescript
await client.get('/users')
await client.get('/users')  // Second call after first completes

// THEN 2 separate requests (not concurrent)
expect(mockAxios.history.get).toHaveLength(2)
```

#### Scenario: Opt-out of deduplication per request

```typescript
await Promise.all([
  client.get('/users', { deduplicate: false }),
  client.get('/users', { deduplicate: false })
])

// THEN 2 separate requests despite being identical
expect(mockAxios.history.get).toHaveLength(2)
```

### Requirement: Cache Layer Implementation

The adapter MUST provide pluggable caching with TTL and automatic invalidation.

#### Scenario: Cache hit returns cached response

```typescript
const client = createHttpClient({
  cache: {
    adapter: new MemoryCacheAdapter(),
    ttl: 60000  // 1 minute
  }
})

mockAxios.onGet('/users').reply(200, { data: 'users' })

await client.get('/users')
const cachedResponse = await client.get('/users')

// THEN second call served from cache
expect(mockAxios.history.get).toHaveLength(1)
expect(cachedResponse.data).toEqual({ data: 'users' })
```

#### Scenario: Cache respects TTL

```typescript
const client = createHttpClient({
  cache: { ttl: 100 }  // 100ms
})

await client.get('/users')
await new Promise(resolve => setTimeout(resolve, 150))
await client.get('/users')

// THEN second call made new request (cache expired)
expect(mockAxios.history.get).toHaveLength(2)
```

#### Scenario: POST invalidates cache for resource

```typescript
await client.get('/users')
await client.post('/users', { name: 'John' })
await client.get('/users')

// THEN POST invalidated cache, second GET made new request
expect(mockAxios.history.get).toHaveLength(2)
expect(mockAxios.history.post).toHaveLength(1)
```

#### Scenario: Cache key excludes body for GET requests

```typescript
await client.get('/search', { params: { q: 'test' } })
await client.get('/search', { params: { q: 'test' } })

// THEN cache hit (params included in key)
expect(mockAxios.history.get).toHaveLength(1)
```

#### Scenario: Custom cache adapter

```typescript
class CustomCacheAdapter implements CacheAdapter {
  async get<T>(key: string): Promise<T | null> {
    return localStorage.getItem(key) as T
  }
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    localStorage.setItem(key, value)
  }
  async delete(key: string): Promise<void> {
    localStorage.removeItem(key)
  }
  async clear(): Promise<void> {
    localStorage.clear()
  }
}

const client = createHttpClient({
  cache: { adapter: new CustomCacheAdapter() }
})

// THEN custom adapter is used for caching
```

#### Scenario: Opt-out of caching per request

```typescript
await client.get('/users')
await client.get('/users', { cache: false })

// THEN second request made despite cache available
expect(mockAxios.history.get).toHaveLength(2)
```

### Requirement: Error Transformation

The adapter MUST transform axios errors into contract-compliant error taxonomy.

#### Scenario: Network error transformed to NetworkError

```typescript
mockAxios.onGet('/users').networkError()

await expect(client.get('/users')).rejects.toThrow(NetworkError)
```

#### Scenario: Timeout error transformed to TimeoutError

```typescript
mockAxios.onGet('/users').timeout()

await expect(client.get('/users')).rejects.toThrow(TimeoutError)
```

#### Scenario: HTTP error status transformed to ResponseError

```typescript
mockAxios.onGet('/users').reply(404, { message: 'Not found' })

try {
  await client.get('/users')
} catch (error) {
  expect(error).toBeInstanceOf(ResponseError)
  expect(error.statusCode).toBe(404)
  expect(error.response.data).toEqual({ message: 'Not found' })
}
```

#### Scenario: Request cancellation transformed to CancelError

```typescript
const controller = new AbortController()
const promise = client.get('/users', { signal: controller.signal })
controller.abort()

await expect(promise).rejects.toThrow(CancelError)
```

#### Scenario: Original axios error preserved as cause

```typescript
try {
  await client.get('/users')
} catch (error) {
  expect(error.cause).toBeInstanceOf(AxiosError)
  expect(error.cause.config.url).toBe('/users')
}
```

### Requirement: Factory Pattern

The adapter MUST provide a factory for creating pre-configured client instances.

#### Scenario: Factory creates client with shared base config

```typescript
const factory = createHttpClientFactory({
  baseURL: 'https://api.example.com',
  timeout: 5000,
  headers: { 'X-API-Key': 'secret' }
})

const client = factory.createClient()

await client.get('/users')

// THEN baseURL and headers applied
expect(mockAxios.history.get[0].url).toBe('https://api.example.com/users')
expect(mockAxios.history.get[0].headers['X-API-Key']).toBe('secret')
```

#### Scenario: Instance-level config overrides factory config

```typescript
const factory = createHttpClientFactory({
  timeout: 5000
})

const client = factory.createClient({
  timeout: 10000,
  retry: { maxAttempts: 3 }
})

// THEN instance config takes precedence
```

#### Scenario: Multiple clients from same factory are isolated

```typescript
const client1 = factory.createClient()
const client2 = factory.createClient()

client1.addRequestInterceptor({
  onFulfilled: (config) => {
    config.headers['X-Client'] = '1'
    return config
  }
})

await client1.get('/users')
await client2.get('/users')

// THEN interceptor only affects client1
expect(mockAxios.history.get[0].headers['X-Client']).toBe('1')
expect(mockAxios.history.get[1].headers['X-Client']).toBeUndefined()
```

#### Scenario: Factory with environment presets

```typescript
const factory = createHttpClientFactory({
  presets: {
    production: { baseURL: 'https://api.prod.com', timeout: 5000 },
    staging: { baseURL: 'https://api.staging.com', timeout: 10000 }
  }
})

const prodClient = factory.createClient({ preset: 'production' })
const stagingClient = factory.createClient({ preset: 'staging' })

// THEN each client uses correct preset
```

### Requirement: Type Safety

The adapter MUST preserve full generic type information throughout request/response cycle.

#### Scenario: Response data typed correctly

```typescript
interface User {
  id: number
  name: string
}

const response = await client.get<User>('/users/1')

// THEN TypeScript infers response.data as User
const userId: number = response.data.id  // No type error
const userName: string = response.data.name  // No type error
```

#### Scenario: Request body typed correctly

```typescript
interface CreateUserRequest {
  name: string
  email: string
}

const body: CreateUserRequest = { name: 'John', email: 'john@example.com' }
await client.post<User, CreateUserRequest>('/users', body)

// THEN TypeScript validates body structure
```

#### Scenario: Error types are generic

```typescript
interface ApiError {
  code: string
  message: string
}

try {
  await client.get<User, ApiError>('/users/1')
} catch (error) {
  if (error instanceof ResponseError) {
    const apiError: ApiError = error.response.data  // Typed
    console.log(apiError.code)
  }
}
```
