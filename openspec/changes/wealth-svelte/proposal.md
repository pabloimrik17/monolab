## Why

Second implementation of wealth tracker UI using SvelteKit. Part of a DX comparison across 4 frameworks. SvelteKit offers compiler-based reactivity and a different mental model worth comparing against signal-based frameworks.

## What Changes

- Scaffold with `pnpm create svelte` (select SvelteKit template)
- New app `@m0n0lab/wealth-svelte` at `apps/wealth-svelte/`
- SvelteKit with file-based routing
- Consumes `@m0n0lab/wealth-tracker-core` for all business logic
- Single page: ticker list with add/remove and live quotes

## Capabilities

### New Capabilities

- `wealth-ui`: Display ticker list with quotes, add/remove tickers, auto-refresh indicator

### Modified Capabilities

(none)

## Impact

- **New app**: `apps/wealth-svelte/`
- **Dependencies**: `@m0n0lab/wealth-tracker-core` (workspace), `svelte`, `@sveltejs/kit`
- **Build**: Vite via SvelteKit
- **Env**: FINNHUB_API_KEY required
