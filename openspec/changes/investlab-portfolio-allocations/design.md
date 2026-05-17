## Context

Portfolio items exist (from instruments change). Now need to model the contribution strategy: how much goes into each holding and how often, plus tracking the balance between fixed income (RF) and variable income (RV) assets.

User's Excel columns: contribution type (weekly/monthly/annual), contribution amount, calculated monthly contribution, calculated annual contribution, target RF/RV % split vs actual.

## Goals / Non-Goals

**Goals:**

- Per-item contribution config: type (weekly/monthly/annual) and amount
- System-calculated normalized monthly and annual contribution per item
- Total monthly and annual investment across all holdings
- Global RF/RV target configuration (e.g., 80% RV / 20% RF)
- Distribution view: actual RF vs RV split (from current values) vs configured target
- Per-instrument weight: actual % (from current values) vs target % (configured)

**Non-Goals:**

- Automatic contribution execution or bank integration
- Historical contribution tracking / transaction log (future change)
- Per-asset-class targets beyond RF/RV (e.g., target % in commodity)
- Rebalancing recommendations

## Decisions

### 1. Contribution as value object on PortfolioItem

Extend PortfolioItem with contribution fields rather than separate entity:

```
PortfolioItem (extended) {
  ...existing fields
  contributionType?: 'weekly' | 'monthly' | 'annual'   // null = no active contribution
  contributionAmount?: number                            // amount per period
}
```

**Why VO on entity, not separate table**: contribution config is 1:1 with portfolio item, always queried together, no independent lifecycle. Separate table adds joins with no benefit.

Calculated fields (not persisted):
- `monthlyContribution`: normalize by type (weekly x 4.33, monthly x 1, annual / 12)
- `annualContribution`: normalize by type (weekly x 52, monthly x 12, annual x 1)

### 2. AllocationConfig entity for global targets

```
AllocationConfig {
  id: uuid
  targetRvPercent: number    // e.g., 80
  targetRfPercent: number    // e.g., 20 (derived: 100 - targetRvPercent)
  monthlyIncome?: number     // user's monthly income for context
  investmentPercent?: number // % of income allocated to investment
}
```

Single row — only one config per user. Could be key-value store but typed entity is cleaner for this small set.

**Why not just derive from target weights?** RF/RV target is a portfolio-level strategic decision independent of individual instrument weights. User might target 80/20 RV/RF but have instruments not yet reaching that split.

### 3. Distribution calculation — domain service

`AllocationCalculator` service:

- `calculateActualRfRvSplit(items: PortfolioItem[], instruments: Instrument[])`: groups by instrument.assetClass, sums currentValue per group, returns { rvPercent, rfPercent, commodityPercent, cryptoPercent }
- `calculateWeightDistribution(items: PortfolioItem[])`: returns per-item { targetWeight, actualWeight } where actualWeight = item.currentValue / totalPortfolioValue x 100
- `calculateTotalContributions(items: PortfolioItem[])`: returns { totalMonthly, totalAnnual }

Pure functions, no IO. Testable in isolation.

### 4. Route — /portfolio/allocations

Separate sub-route, not merged into main /portfolio table:

- RF/RV bar chart: target vs actual split
- Per-asset-class breakdown pie chart
- Contribution summary: total monthly, total annual, per-item contribution list
- Weight comparison table: instrument, target %, actual %, delta

### 5. Schema migration — add contribution columns

```sql
ALTER TABLE portfolio_items
  ADD COLUMN contribution_type VARCHAR(10),
  ADD COLUMN contribution_amount NUMERIC(10,2);

CREATE TABLE allocation_config (
  id UUID PK DEFAULT gen_random_uuid(),
  target_rv_percent NUMERIC(5,2) NOT NULL DEFAULT 80,
  target_rf_percent NUMERIC(5,2) NOT NULL DEFAULT 20,
  monthly_income NUMERIC(10,2),
  investment_percent NUMERIC(5,2)
);
```

## Risks / Trade-offs

- **[RF/RV is simplified view]** — Real portfolios have more than 2 asset classes. Using assetClass enum (equity, fixed_income, commodity, crypto) for actual split but RF/RV target is the user's primary decision axis. Commodities and crypto default to RV bucket for target comparison.
- **[No contribution history]** — Only stores current config, not past changes. If user changes contribution amount, old value lost. Acceptable for v1; transaction log is a separate future change.
- **[Contribution normalization assumes calendar math]** — Weekly x 4.33 is approximate. Good enough for planning purposes.
