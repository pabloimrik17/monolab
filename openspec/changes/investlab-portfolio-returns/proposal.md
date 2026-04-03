## Why

Need visibility into profitability — how much each instrument has returned and global portfolio performance. User's Excel tracks current return % per instrument. Without this, portfolio tracking is incomplete: you know what you own and contribute, but not whether it's working.

## What Changes

- Return calculation logic: per-instrument and global portfolio return %
- Invested amount tracking: sum of contributions to date or manually set baseline
- Current value resolution: quotable instruments use cached Finnhub price x quantity, non-quotable (index funds) use manual entry
- Return display integrated into `/portfolio` view — not a separate route

## Capabilities

### New Capabilities

- `portfolio-returns`: Calculate return % per holding = (currentValue - investedAmount) / investedAmount x 100. Global portfolio return weighted by value. Color-coded display (green positive, red negative). Handles both quotable (auto-price) and non-quotable (manual) instruments. Refreshes when quote cache updates

### Modified Capabilities

- `portfolio-holdings`: Table gains return % column and invested amount field

## Impact

- **Modified entity**: `PortfolioItem` gains investedAmount, quantity fields
- **New domain logic**: ReturnCalculator service
- **Modified route**: `/portfolio` table gains return % column, global return KPI card
- **New components**: ReturnBadge, GlobalReturnKpi
- **Integration**: Connects to Finnhub quote cache from foundation for quotable instrument prices
- **Prereq**: `investlab-portfolio-instruments` must be complete, `investlab-foundation` quote cache available
