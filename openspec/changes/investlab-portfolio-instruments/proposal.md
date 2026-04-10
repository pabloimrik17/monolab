## Why

Need to track what's in the portfolio — which instruments the user owns, at which broker, what type (ETF, index fund, stock, crypto), and target weight. Currently no way to represent "I hold X at broker Y with Z% target allocation." This is the base layer for allocations and returns.

## What Changes

- New domain entity `PortfolioItem` in `packages/investlab-domain`: references Instrument (from foundation), adds broker, target weight, current value, notes
- New route `/portfolio` in `apps/investlab`: table view of all holdings with instrument details
- CRUD use cases: CreatePortfolioItem, UpdatePortfolioItem, DeletePortfolioItem, ListPortfolioItems
- Drizzle schema + migration for `portfolio_items` table in `packages/investlab-data`

## Capabilities

### New Capabilities

- `portfolio-holdings`: Manage portfolio items — create, read, update, delete holdings. Each item references an Instrument, has a broker (free text), target weight (%), current value (manual entry), and optional notes. Table view with instrument type, asset class, replicates info

### Modified Capabilities

- None. Builds on `investlab-instrument-management` from foundation but doesn't modify it

## Impact

- **New entity**: `PortfolioItem` in `packages/investlab-domain`
- **New schema**: `portfolio_items` table in `packages/investlab-data`
- **New route**: `/portfolio` in `apps/investlab`
- **New components**: PortfolioTable, PortfolioItemForm, PortfolioItemRow
- **Prereq**: `investlab-foundation` must be complete (Instrument entity, DB, repos)
