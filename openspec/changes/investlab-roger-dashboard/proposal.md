## Why

Roger tracks individual positions but lacks aggregate metrics for quick decision-making. The trader needs at-a-glance liquidity, pending order totals, and a way to clean up stale tickers — currently requires manual scanning through the entry table.

## What Changes

- Dashboard metrics: real liquidity (configured cash - invested - pending buys), pending buy/sell order totals
- Total cash configuration: user-set available cash amount stored in DB
- Cleanup tool: find instruments where ALL entries are EN_ESPERA for >7 days, preview and delete with confirmation
- Orphan cleanup: delete instruments with no remaining entries after cleanup

## Capabilities

### New Capabilities

- `roger-dashboard-metrics`: Aggregate calculations and maintenance actions. Real liquidity from configured cash minus active positions, pending buy/sell order totals from COMPRAR/VENDER entries, stale ticker identification and batch cleanup with preview/confirmation

### Modified Capabilities

None

## Impact

- **New route**: `/roger/dashboard` or summary section at top of `/roger` in `apps/investlab`
- **New data**: cash configuration setting in DB
- **New domain**: liquidity calculator, pending aggregator, stale ticker finder in `packages/investlab-domain`
- **Prereq**: `investlab-roger-positions` (entries with states), `investlab-roger-metrics-ui` (metrics display patterns)
