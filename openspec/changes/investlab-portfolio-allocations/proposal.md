## Why

Need to plan contribution strategy and track asset distribution. User's Excel tracks: contribution type (weekly/monthly/annual) and amount per instrument, calculated monthly/annual totals, fixed vs variable income split with target vs actual percentages. This data drives investment decisions.

## What Changes

- Extend PortfolioItem with contribution configuration (type, amount) or separate ContributionConfig value object
- Calculated fields: normalized monthly contribution, annual contribution per item and totals
- RF/RV (fixed/variable income) distribution view: actual split from current values vs target split
- New route or sub-section `/portfolio/allocations` with allocation dashboard

## Capabilities

### New Capabilities

- `portfolio-contributions`: Configure contribution per holding (weekly/monthly/annual + amount). System normalizes to monthly and annual figures. Global RF/RV target config (e.g., 80% RV / 20% RF). Dashboard shows actual vs target distribution by asset class, per-instrument weight actual vs target, total monthly/annual investment

### Modified Capabilities

- `portfolio-holdings`: Extended with contribution data fields

## Impact

- **Modified entity**: `PortfolioItem` gains contribution fields (or new ContributionConfig VO)
- **New entity**: `AllocationConfig` for global RF/RV target split
- **Schema changes**: `portfolio_items` migration adding contribution columns, new `allocation_config` table
- **New route**: `/portfolio/allocations`
- **New components**: ContributionForm, AllocationDashboard, RfRvChart, WeightComparison
- **Prereq**: `investlab-portfolio-instruments` must be complete
