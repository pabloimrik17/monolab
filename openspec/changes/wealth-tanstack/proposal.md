## Why

Fourth implementation of wealth tracker UI using TanStack Start. Part of a DX comparison across 4 frameworks. TanStack Start has native TanStack Query integration, making auto-refresh trivial with `refetchInterval`.

## What Changes

- Scaffold with `pnpm create @tanstack/app` (TanStack Start template)
- New app `@m0n0lab/wealth-tanstack` at `apps/wealth-tanstack/`
- TanStack Start with TanStack Router (typed routes native)
- Consumes `@m0n0lab/wealth-tracker-core` for all business logic
- Single page: ticker list with add/remove and live quotes
- May use TanStack Query instead of core's polling (compare approaches)

## Capabilities

### New Capabilities

- `wealth-ui`: Display ticker list with quotes, add/remove tickers, auto-refresh indicator

### Modified Capabilities

(none)

## Impact

- **New app**: `apps/wealth-tanstack/`
- **Dependencies**: `@m0n0lab/wealth-tracker-core` (workspace), `react`, `react-dom`, `@tanstack/start`, `@tanstack/react-router`, `@tanstack/react-query`
- **Build**: Vite via TanStack Start
- **Env**: FINNHUB_API_KEY required
