# @m0n0lab/http-client

[![npm version](https://img.shields.io/npm/v/@m0n0lab/http-client.svg)](https://www.npmjs.com/package/@m0n0lab/http-client)
[![http-client coverage](https://codecov.io/gh/pabloimrik17/monolab/badge.svg?flag=http-client)](https://codecov.io/gh/pabloimrik17/monolab?flag=http-client)
[![http-client bundle](https://codecov.io/gh/pabloimrik17/monolab/graph/bundle/http-client/badge.svg)](https://codecov.io/gh/pabloimrik17/monolab/bundle/http-client)

Type-safe HTTP client contracts for web and Node.js environments.

## Overview

This package provides TypeScript interfaces and types that define the contract for HTTP client implementations. It enables:

-   **Abstraction over implementation**: Write code once, swap HTTP libraries (axios, ky) without changes
-   **Type safety**: Full generic support for request/response/error types
-   **Extensibility**: Interceptors, retry hooks, and cache plugins for customization
-   **Familiar patterns**: onFulfilled/onRejected pattern mirrors Promise.then() for easy adoption

**Note**: This is a **contract-only package** (pure TypeScript types and interfaces). Concrete implementations (axios adapter, ky adapter) are provided in separate packages.

## Installation

### npm

```bash
npm install @m0n0lab/http-client
```

### pnpm

```bash
pnpm add @m0n0lab/http-client
```

### JSR

```bash
npx jsr add @m0n0lab/http-client
```

## Contracts

The package defines interfaces for all aspects of HTTP communication:

### Core Interfaces

-   `HttpClient` - Main client interface with HTTP methods (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS)
-   `HttpRequestConfig` - Request configuration with headers, timeout, retry, cache, etc.
-   `HttpResponse<T>` - Typed response with data, status, headers, and metadata
-   `HttpClientFactory` - Factory function for creating client instances

### Error Hierarchy

-   `HttpError` - Base error class
-   `HttpNetworkError` - Network-level failures (connection refused, DNS, timeout)
-   `HttpResponseError<T>` - HTTP error responses with typed data
-   Specific error classes: `HttpBadRequestError`, `HttpUnauthorizedError`, `HttpNotFoundError`, etc.

### Advanced Features

-   **Interceptors**: Transform requests/responses using onFulfilled/onRejected pattern
-   **Retry**: Configurable retry logic with exponential/linear/jitter backoff
-   **Deduplication**: Prevent redundant concurrent requests
-   **Cache**: Pluggable cache layer with stale-while-revalidate support

## Usage Examples

### Creating a Typed Client

```typescript
import type { HttpClient, HttpClientFactory } from "@m0n0lab/http-client";

interface User {
    id: number;
    name: string;
    email: string;
}

interface CreateUserDto {
    name: string;
    email: string;
}

// Assuming you have an axios or ky adapter
declare const createHttpClient: HttpClientFactory;

const client: HttpClient = createHttpClient({
    baseUrl: "https://api.example.com",
    timeout: 5000,
    headers: {
        "Content-Type": "application/json",
    },
});

// GET with type inference
const response = await client.get<User>("/users/1");
console.log(response.data.name); // Type-safe access

// POST with typed body
const newUser = await client.post<User, CreateUserDto>("/users", {
    name: "Alice",
    email: "alice@example.com",
});

// PATCH with partial update
await client.patch<User, Partial<User>>("/users/1", {
    name: "Bob",
});

// DELETE
await client.delete("/users/1");
```

### Error Handling with Typed Errors

```typescript
import {
    HttpError,
    HttpNetworkError,
    HttpUnauthorizedError,
    HttpNotFoundError,
    HttpResponseError,
} from "@m0n0lab/http-client";

try {
    const user = await client.get<User>("/users/123");
    console.log(user.data);
} catch (error) {
    if (error instanceof HttpNetworkError) {
        console.error("Network failure:", error.code);
        // Handle connection issues
    } else if (error instanceof HttpUnauthorizedError) {
        console.error("Authentication required");
        // Redirect to login
    } else if (error instanceof HttpNotFoundError) {
        console.error("User not found");
        // Show 404 page
    } else if (error instanceof HttpResponseError) {
        console.error("Server error:", error.status, error.data);
        // Handle other HTTP errors
    }
}
```

### Interceptor Usage

```typescript
import type {
    RequestOnFulfilled,
    ResponseOnRejected,
} from "@m0n0lab/http-client";

// Add authentication to all requests
const authInterceptor: RequestOnFulfilled = async (config) => ({
    ...config,
    headers: {
        ...config.headers,
        Authorization: `Bearer ${await getAuthToken()}`,
    },
});

client.addRequestInterceptor(authInterceptor);

// Handle 401 errors by refreshing token
const refreshInterceptor: ResponseOnRejected = async (error) => {
    if (error instanceof HttpUnauthorizedError) {
        await refreshAuthToken();
        return client.request(error.request); // Retry original request
    }
    throw error;
};

client.addResponseInterceptor((response) => response, refreshInterceptor);

// Remove interceptor when done
const handle = client.addRequestInterceptor(authInterceptor);
client.removeInterceptor(handle);
```

### Retry Configuration

```typescript
import { exponentialBackoff } from "@m0n0lab/http-client";

declare const createHttpClient: HttpClientFactory;

const client = createHttpClient({
    baseUrl: "https://api.example.com",
    retry: {
        attempts: 3,
        delay: exponentialBackoff(1000, 10000), // Start at 1s, max 10s
        condition: (error) => {
            // Retry on network errors and 5xx server errors
            return (
                error instanceof HttpNetworkError ||
                (error instanceof HttpResponseError && error.status >= 500)
            );
        },
        onRetry: (error, attempt) => {
            console.log(`Retrying request (attempt ${attempt})`);
        },
        respectRetryAfter: true, // Honor server's Retry-After header
    },
});
```

### Cache Configuration

```typescript
import type { HttpCache, CacheEntry } from "@m0n0lab/http-client";

// Implement custom cache backend
class MemoryCache implements HttpCache {
    private store = new Map<string, CacheEntry>();

    async get(key: string): Promise<CacheEntry | null> {
        const entry = this.store.get(key);
        if (!entry) return null;

        // Check if expired
        if (Date.now() - entry.timestamp > entry.ttl) {
            this.store.delete(key);
            return null;
        }

        return entry;
    }

    async set(key: string, value: CacheEntry): Promise<void> {
        this.store.set(key, value);
    }

    async delete(key: string): Promise<void> {
        this.store.delete(key);
    }

    async clear(): Promise<void> {
        this.store.clear();
    }
}

declare const createHttpClient: HttpClientFactory;

const client = createHttpClient({
    baseUrl: "https://api.example.com",
    cache: {
        cache: new MemoryCache(),
        ttl: 60000, // 1 minute
        respectCacheHeaders: true,
        staleWhileRevalidate: true, // Return stale data while refreshing
        invalidatePatterns: (config) => {
            // Invalidate user cache after mutations
            if (config.baseUrl?.includes("/users")) {
                return ["/users/*"];
            }
            return [];
        },
    },
});
```

## Migration from Raw axios/fetch

### Before (axios)

```typescript
import axios from "axios";

const response = await axios.get("https://api.example.com/users/1");
const user = response.data;
```

### After (with adapter)

```typescript
import { createAxiosHttpClient } from "@m0n0lab/http-client-axios";

const client = createAxiosHttpClient({
    baseUrl: "https://api.example.com",
});

const response = await client.get<User>("/users/1");
const user = response.data; // Type-safe!
```

## Axios Adapter (Fully Implemented)

The axios adapter provides a complete HTTP client with all features:

### Axios Installation

```bash
pnpm add @m0n0lab/http-client axios
```

### Quick Start

```typescript
import axios from "axios";
import { createAxiosHttpClient, exponentialBackoff } from "@m0n0lab/http-client";

// Basic client
const client = createAxiosHttpClient({
    axiosInstance: axios.create({ baseURL: "https://api.example.com" }),
});

// Client with all features
const advancedClient = createAxiosHttpClient({
    axiosInstance: axios.create({ baseURL: "https://api.example.com" }),
    retry: {
        attempts: 3,
        delay: exponentialBackoff(1000, 10000),
    },
    cache: {
        cache: new Map(),
        ttl: 60000,
    },
    deduplication: {
        enabled: true,
        criticalHeaders: ["Authorization"],
    },
});

// Use it!
const response = await client.get<User>("/users/1");
```

### Factory Pattern (Recommended)

The factory provides the easiest way to create clients:

```typescript
import { createHttpClientFactory, exponentialBackoff } from "@m0n0lab/http-client";

const client = createHttpClientFactory({
    baseUrl: "https://api.example.com",
    timeout: 5000,
    headers: {
        "X-API-Key": "secret",
    },
    retry: {
        attempts: 3,
        delay: exponentialBackoff(1000, 10000),
    },
    cache: {
        cache: new Map(),
        ttl: 60000,
    },
    deduplication: {
        enabled: true,
    },
    interceptors: {
        request: [{
            onFulfilled: async (config) => {
                // Add dynamic auth
                return {
                    ...config,
                    headers: {
                        ...config.headers,
                        Authorization: `Bearer ${await getToken()}`,
                    },
                };
            },
        }],
    },
});
```

### Axios Adapter Features

- ✅ All HTTP methods (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS)
- ✅ Request/response interceptors
- ✅ Automatic retry with exponential/linear backoff
- ✅ Request deduplication (prevents duplicate concurrent requests)
- ✅ Response caching with TTL and automatic invalidation
- ✅ Type-safe error handling
- ✅ Full TypeScript support with generics
- ✅ 147 tests with 100% coverage

## Roadmap

-   ✅ Package foundation and infrastructure
-   ✅ Core HTTP client contracts (types and interfaces)
-   ✅ Axios adapter implementation (COMPLETE)
-   🚧 Ky adapter implementation
-   🚧 neverthrow (ResultAsync) wrapper for functional error handling
-   🚧 effect-ts integration for advanced effect systems

## Features

-   🎯 Clean abstraction over popular HTTP libraries (axios, ky)
-   ✅ Fully typed with TypeScript
-   🔄 Pluggable HTTP client implementations
-   🛡️ Type-safe error handling
-   ⚡ Interceptors with onFulfilled/onRejected pattern
-   🔁 Configurable retry with backoff strategies
-   🚫 Request deduplication
-   💾 Pluggable cache layer
-   🌐 Works in browser and Node.js environments
-   📦 Zero runtime dependencies (pure types)
-   🧪 Comprehensive type-level tests
-   📘 Well documented

## License

MIT
