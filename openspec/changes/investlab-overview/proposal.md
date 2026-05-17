## Why

InvestLab has two independent modules (Portfolio and Roger) but no unified view. The user has no landing page showing total patrimony, investment allocation relative to income, or global asset distribution. Currently lands on a ticker list with no high-level KPIs.

## What Changes

- Overview page at / replacing current ticker-list homepage
- KPI cards: total patrimony (portfolio + roger), monthly income (configured), % to investment, RF/RV distribution
- Global settings entity for monthly income
- Quick navigation links to /portfolio and /roger

## Capabilities

### New Capabilities

- `investlab-overview-dashboard`: Aggregated KPIs from both modules. Total patrimony combining portfolio items and roger active positions, investment allocation percentage relative to configured monthly income, RF/RV (fixed income/variable) distribution summary, module quick links

### Modified Capabilities

None

## Impact

- **Modified route**: `/` in `apps/investlab` — replaces current ticker-list index
- **New domain**: aggregation service in `packages/investlab-domain`
- **New data**: global settings (monthly income) in `packages/investlab-data`
- **Prereq**: portfolio and roger modules (at least partially implemented)
