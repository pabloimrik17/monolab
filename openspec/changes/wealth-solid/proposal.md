## Why

First implementation of wealth tracker UI using SolidStart. Part of a DX comparison across 4 frameworks. SolidStart chosen first because Solid is already used in the monorepo (demo app) and its fine-grained reactivity is ideal for frequent quote updates.

## What Changes

- Scaffold with `pnpm create solid` (select SolidStart template)
- New app `@m0n0lab/wealth-solid` at `apps/wealth-solid/`
- SolidStart with file-based routing
- Consumes `@m0n0lab/wealth-tracker-core` for all business logic
- Single page: ticker list with add/remove and live quotes

## Capabilities

### New Capabilities

- `wealth-ui`: Display ticker list with quotes, add/remove tickers, auto-refresh indicator

### Modified Capabilities

(none)

## Impact

- **New app**: `apps/wealth-solid/`
- **Dependencies**: `@m0n0lab/wealth-tracker-core` (workspace), `solid-js`, `@solidjs/start`, `@solidjs/router`
- **Build**: Vite via SolidStart
- **Env**: FINNHUB_API_KEY required
