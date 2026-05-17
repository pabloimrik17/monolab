## Context

Building a wealth tracker that will be implemented in 4 different frameworks to compare DX. The core logic must be framework-agnostic to enable code reuse and future mobile migration.

Constraints:
- 150-200 tickers max
- Refresh interval 15-30 seconds
- Finnhub API (60 req/min free tier)
- No runtime dependencies (pure TypeScript)
- Persistence via Storage abstraction (localStorage in browsers)

## Goals / Non-Goals

**Goals:**
- Framework-agnostic core with zero runtime dependencies
- Type-safe API for ticker management and quote fetching
- Batch API calls to handle 200 tickers efficiently
- Configurable polling with start/stop control
- Storage abstraction for persistence (browser, mobile, etc.)

**Non-Goals:**
- UI components (handled by framework apps)
- Real-time WebSocket streaming (future enhancement)
- Portfolio tracking (shares owned, P&L)
- Historical data or charts
- Authentication

## Decisions

### 1. Pure functions + factory pattern over classes

```typescript
// Factory returns interface, implementation hidden
export function createTickerStore(storage: Storage): TickerStore
export function createFinnhubClient(apiKey: string): FinnhubClient
export function createQuotePoller(client: FinnhubClient): QuotePoller
```

**Rationale**: Easier to test, no `this` binding issues, tree-shakeable, works with any framework's DI approach.

**Alternative considered**: Class-based with decorators - rejected due to decorator instability and framework coupling.

### 2. Storage abstraction via interface

```typescript
interface Storage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
```

**Rationale**: Matches Web Storage API, works with localStorage, sessionStorage, AsyncStorage (React Native), or any custom implementation.

**Alternative considered**: Direct localStorage - rejected, would break mobile/SSR.

### 3. Callback-based polling over RxJS

```typescript
interface QuotePoller {
  start(tickers: string[], onUpdate: (quotes: Map<string, Quote>) => void): void;
  stop(): void;
  setInterval(ms: number): void;
}
```

**Rationale**: Zero dependencies, framework-agnostic. Frameworks can wrap in their reactive primitives (signals, stores, state).

**Alternative considered**: RxJS Observable - rejected, adds ~30kb dependency and couples to RxJS ecosystem.

### 4. Finnhub batch endpoint for efficiency

```
GET /api/v1/quote?symbol=AAPL
```

Note: Finnhub doesn't have true batch endpoint. Will fetch in parallel with concurrency limit.

```typescript
// Fetch up to 10 quotes in parallel, queue the rest
async function fetchQuotesBatch(symbols: string[]): Promise<Map<string, Quote>>
```

**Rationale**: 200 tickers / 10 parallel = 20 sequential batches. At 60 req/min limit, completes in ~20 seconds worst case. Acceptable for 30s refresh.

**Alternative considered**: Single sequential requests - rejected, would take 200+ seconds.

### 5. File structure

```
packages/wealth-tracker-core/
├── src/
│   ├── index.ts              # Public exports
│   ├── types.ts              # Ticker, Quote, TickerWithQuote
│   ├── ticker-store.ts       # createTickerStore
│   ├── finnhub-client.ts     # createFinnhubClient
│   ├── quote-poller.ts       # createQuotePoller
│   └── utils/
│       └── batch.ts          # Batch execution utility
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Finnhub rate limit exceeded | Concurrency limit (10), configurable interval (min 15s) |
| API key exposed in client | Document that key should be proxied via server in production |
| Stale quotes during heavy load | Show last-updated timestamp in UI, skip failed fetches gracefully |
| Storage quota exceeded | Tickers only (not quotes), ~200 symbols = ~2kb max |

## Open Questions

1. **Error handling strategy**: Throw vs return Result type vs callback with error param?
   - Leaning toward: callbacks with `onError` for polling, throw for one-shot operations

2. **API key injection**: Constructor param vs environment variable vs config object?
   - Leaning toward: Constructor param for flexibility
