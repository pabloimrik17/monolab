# InvestLab Overview Design

## Context

InvestLab has Portfolio module (holdings, allocations, returns) and Roger module (active trading positions). Need a unified landing page with high-level KPIs aggregating both modules. Current index page is a simple ticker list.

## Goals / Non-Goals

**Goals:**
- Total patrimony KPI aggregating both modules
- Monthly income configuration and investment allocation %
- RF/RV (Renta Fija / Renta Variable) distribution summary
- Quick links to module sub-pages
- Replace current ticker-list homepage

**Non-Goals:**
- No detailed drill-down (each module handles that)
- No historical patrimony tracking
- No investment recommendations
- No real-time push updates

## Decisions

### 1. KPI definitions

**Total patrimony:**
```
totalPatrimony = portfolioValue + rogerActiveValue
```
- `portfolioValue`: sum of all portfolio items' currentValue
- `rogerActiveValue`: sum(currentPrice x quantity) for roger entries in COMPRAR/INVERTIDO/VENDER states

**Monthly income:**
User-configured setting. No calculation, just stored value.

**% to investment:**
```
investmentPercent = (monthlyContributions / monthlyIncome) x 100
```
- `monthlyContributions`: user-configured setting (how much they invest per month)
- Alternative: derive from recent portfolio additions, but too complex for v1. Simple configured value.

**RF/RV distribution:**
```
RF = sum of portfolio items where instrument.assetClass = 'fixed_income'
RV = sum of portfolio items where instrument.assetClass in ('equity', 'commodity', 'crypto')
```
Show as percentage split and $ amounts.

**Why portfolio-only for RF/RV**: Roger positions are speculative/short-term. Portfolio represents long-term allocation where RF/RV split matters.

### 2. Global settings entity

```typescript
GlobalSetting {
  id: uuid
  key: string         // 'monthly_income', 'monthly_contributions'
  value: string       // JSON-encoded
  updatedAt: Date
}
```

Reuses key-value pattern from roger-dashboard's RogerSetting. Could share the same table or be separate.

**Decision**: Separate `global_settings` table. These are app-wide, not roger-specific.

### 3. Aggregation service

```typescript
OverviewAggregator {
  getOverviewKPIs(): ResultAsync<OverviewKPIs, AggregationError>
}

OverviewKPIs {
  totalPatrimony: number
  portfolioValue: number
  rogerActiveValue: number
  monthlyIncome: number | null
  monthlyContributions: number | null
  investmentPercent: number | null   // null if income not configured
  rfAmount: number
  rvAmount: number
  rfPercent: number
  rvPercent: number
}
```

Fetches from both module repos in parallel. Pure aggregation, no writes.

### 4. Route and layout

Route: `/` (root index). Replaces current ticker-list page.

Layout:
- Row 1: KPI cards (Total Patrimony, Monthly Income, % to Investment)
- Row 2: RF/RV distribution (simple bar or donut + amounts)
- Row 3: Quick links — "Go to Portfolio" and "Go to Roger" cards

### 5. Data freshness

Pull-based on page load. Uses quote cache for prices. No real-time subscriptions.

**Why**: Overview is consulted on app open, not watched continuously. Cache TTL provides acceptable freshness.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Portfolio module not fully implemented | Show available KPIs; gracefully handle missing data with "--" |
| Monthly income/contributions manual entry | Simple config; could integrate with bank APIs later |
| RF/RV excludes roger positions | Documented as design choice; roger is short-term speculative |
| Replacing ticker-list loses existing functionality | Ticker list moves to a sub-route if still needed; overview is more valuable as landing |
