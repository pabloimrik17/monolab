## Why

Third implementation of wealth tracker UI using React Router v7 (framework mode). Part of a DX comparison across 4 frameworks. React Router v7 represents the mature Remix-derived approach with loaders/actions pattern.

## What Changes

- Scaffold with `pnpm create react-router` (framework mode template)
- New app `@m0n0lab/wealth-react` at `apps/wealth-react/`
- React Router v7 in framework mode with typed routes (codegen)
- Consumes `@m0n0lab/wealth-tracker-core` for all business logic
- Single page: ticker list with add/remove and live quotes

## Capabilities

### New Capabilities

- `wealth-ui`: Display ticker list with quotes, add/remove tickers, auto-refresh indicator

### Modified Capabilities

(none)

## Impact

- **New app**: `apps/wealth-react/`
- **Dependencies**: `@m0n0lab/wealth-tracker-core` (workspace), `react`, `react-dom`, `react-router`
- **Build**: Vite via React Router
- **Env**: FINNHUB_API_KEY required
