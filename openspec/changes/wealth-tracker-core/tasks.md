## 1. Package Setup

- [x] 1.1 Create `packages/wealth-tracker-core/` directory structure
- [x] 1.2 Configure package.json with name `@m0n0lab/wealth-tracker-core`, ESM-only
- [x] 1.3 Setup tsconfig.json extending workspace ts-configs
- [x] 1.4 Configure tsdown for bundling
- [x] 1.5 Setup vitest.config.ts for testing
- [x] 1.6 Add package to pnpm-workspace.yaml

## 2. Types

- [x] 2.1 Create `src/types.ts` with Ticker, Quote, TickerWithQuote interfaces
- [x] 2.2 Export types from `src/index.ts`
- [x] 2.3 Validate exports with `attw --pack`

## 3. Ticker Management

- [x] 3.1 Create Storage interface in `src/types.ts`
- [x] 3.2 Implement `createTickerStore()` in `src/ticker-store.ts`
- [x] 3.3 Implement add ticker with uppercase normalization
- [x] 3.4 Implement remove ticker
- [x] 3.5 Implement getTickers with alphabetical sorting
- [x] 3.6 Implement persistence (load/save to Storage)
- [x] 3.7 Write tests for ticker-store (nx run @m0n0lab/wealth-tracker-core:test)

## 4. Quote Fetching

- [x] 4.1 Create batch utility in `src/utils/batch.ts`
- [x] 4.2 Write tests for batch utility
- [x] 4.3 Implement `createFinnhubClient()` in `src/finnhub-client.ts`
- [x] 4.4 Implement getQuote for single ticker
- [x] 4.5 Implement getQuotes with batched parallel requests
- [x] 4.6 Add concurrency configuration
- [x] 4.7 Write tests for finnhub-client (mock fetch)

## 5. Quote Polling

- [x] 5.1 Implement `createQuotePoller()` in `src/quote-poller.ts`
- [x] 5.2 Implement start/stop polling
- [x] 5.3 Implement setInterval with min/max clamping (15s-60s)
- [x] 5.4 Implement setTickers for dynamic updates
- [x] 5.5 Implement error handling with onError callback
- [x] 5.6 Implement isPolling state
- [x] 5.7 Write tests for quote-poller (mock timers)

## 6. Final Validation

- [x] 6.1 Export all public API from `src/index.ts`
- [x] 6.2 Validate exports with `attw --pack`
- [x] 6.3 Run full test suite (nx run @m0n0lab/wealth-tracker-core:test)
- [x] 6.4 Run lint (nx run @m0n0lab/wealth-tracker-core:lint:eslint)
- [x] 6.5 Verify build (nx run @m0n0lab/wealth-tracker-core:build)
