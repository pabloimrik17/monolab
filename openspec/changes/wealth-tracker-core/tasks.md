## 1. Package Setup

- [ ] 1.1 Create `packages/wealth-tracker-core/` directory structure
- [ ] 1.2 Configure package.json with name `@m0n0lab/wealth-tracker-core`, ESM-only
- [ ] 1.3 Setup tsconfig.json extending workspace ts-configs
- [ ] 1.4 Configure tsdown for bundling
- [ ] 1.5 Setup vitest.config.ts for testing
- [ ] 1.6 Add package to pnpm-workspace.yaml

## 2. Types

- [ ] 2.1 Create `src/types.ts` with Ticker, Quote, TickerWithQuote interfaces
- [ ] 2.2 Export types from `src/index.ts`
- [ ] 2.3 Validate exports with `attw --pack`

## 3. Ticker Management

- [ ] 3.1 Create Storage interface in `src/types.ts`
- [ ] 3.2 Implement `createTickerStore()` in `src/ticker-store.ts`
- [ ] 3.3 Implement add ticker with uppercase normalization
- [ ] 3.4 Implement remove ticker
- [ ] 3.5 Implement getTickers with alphabetical sorting
- [ ] 3.6 Implement persistence (load/save to Storage)
- [ ] 3.7 Write tests for ticker-store (nx run @m0n0lab/wealth-tracker-core:test)

## 4. Quote Fetching

- [ ] 4.1 Create batch utility in `src/utils/batch.ts`
- [ ] 4.2 Write tests for batch utility
- [ ] 4.3 Implement `createFinnhubClient()` in `src/finnhub-client.ts`
- [ ] 4.4 Implement getQuote for single ticker
- [ ] 4.5 Implement getQuotes with batched parallel requests
- [ ] 4.6 Add concurrency configuration
- [ ] 4.7 Write tests for finnhub-client (mock fetch)

## 5. Quote Polling

- [ ] 5.1 Implement `createQuotePoller()` in `src/quote-poller.ts`
- [ ] 5.2 Implement start/stop polling
- [ ] 5.3 Implement setInterval with min/max clamping (15s-60s)
- [ ] 5.4 Implement setTickers for dynamic updates
- [ ] 5.5 Implement error handling with onError callback
- [ ] 5.6 Implement isPolling state
- [ ] 5.7 Write tests for quote-poller (mock timers)

## 6. Final Validation

- [ ] 6.1 Export all public API from `src/index.ts`
- [ ] 6.2 Validate exports with `attw --pack`
- [ ] 6.3 Run full test suite (nx run @m0n0lab/wealth-tracker-core:test)
- [ ] 6.4 Run lint (nx run @m0n0lab/wealth-tracker-core:lint:eslint)
- [ ] 6.5 Verify build (nx run @m0n0lab/wealth-tracker-core:build)
