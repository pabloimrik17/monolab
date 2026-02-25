## Why

Create shared foundation for a wealth tracker to be implemented across multiple frameworks (SolidStart, SvelteKit, React Router v7, TanStack Start) as a DX comparison exercise. Extracting logic into a framework-agnostic package enables reuse across all apps and facilitates future mobile migration.

## What Changes

- New package `@m0n0lab/wealth-tracker-core` at `packages/wealth-tracker-core/`
- Shared types: `Ticker`, `Quote`, `TickerWithQuote`
- Finnhub client for batch quotes of US stocks
- Ticker store with persistence via Storage abstraction
- Polling service for auto-refresh of quotes

## Capabilities

### New Capabilities

- `ticker-management`: CRUD operations for tickers with persistence and alphabetical sorting
- `quote-fetching`: Batch quote retrieval via Finnhub API
- `quote-polling`: Periodic auto-refresh of quotes (15-30s configurable)

### Modified Capabilities

(none - new package)

## Impact

- **New package**: `packages/wealth-tracker-core/`
- **Dependencies**: None at runtime (pure types and logic)
- **Peer deps**: None (framework-agnostic)
- **Build**: tsdown, ESM-only, publishable to JSR/npm
- **Tests**: Vitest for business logic
