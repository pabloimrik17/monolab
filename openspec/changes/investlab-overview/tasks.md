# Implementation Tasks

## 1. Domain

- [ ] 1.1 Create `OverviewKPIs` value object: totalPatrimony, portfolioValue, rogerActiveValue, monthlyIncome?, monthlyContributions?, investmentPercent?, rfAmount, rvAmount, rfPercent, rvPercent
- [ ] 1.2 Create `OverviewAggregator` domain service: fetches portfolio + roger data, computes all KPIs
- [ ] 1.3 Create `GlobalSetting` entity: id, key, value, updatedAt
- [ ] 1.4 Create `GlobalSettingRepository` interface: get(key), set(key, value)
- [ ] 1.5 Define Inversify tokens for OverviewAggregator and GlobalSettingRepository
- [ ] 1.6 Add to domain ContainerModule

## 2. Data

- [ ] 2.1 Create Drizzle schema for `global_settings` table (id, key unique, value, updated_at)
- [ ] 2.2 Generate migration with `drizzle-kit generate`
- [ ] 2.3 Implement `GlobalSettingRepositoryImpl` — get/set with upsert semantics
- [ ] 2.4 Bind in data ContainerModule
- [ ] 2.5 Apply migration: `drizzle-kit migrate`

## 3. UI

- [ ] 3.1 Create overview page component at `/` route
- [ ] 3.2 Create KPI cards: Total Patrimony (with portfolio/roger breakdown), Monthly Income, % to Investment
- [ ] 3.3 Create RF/RV distribution widget: bar or donut with $ amounts and percentages
- [ ] 3.4 Create module quick-link cards: "Go to Portfolio" -> /portfolio, "Go to Roger" -> /roger
- [ ] 3.5 Create settings modal/form for monthly income and monthly contributions
- [ ] 3.6 Wire aggregation: fetch portfolio items, roger entries, quotes, settings -> compute KPIs -> render
- [ ] 3.7 Handle missing data gracefully: "--" for unconfigured values, $0 for empty modules

## 4. Migration

- [ ] 4.1 Move current ticker-list index page to sub-route (e.g., /tickers) if still needed
- [ ] 4.2 Update root `/` route to render overview page
- [ ] 4.3 Update navigation to include overview link

## 5. Verification

- [ ] 5.1 Run `pnpm nx run investlab-domain:build`
- [ ] 5.2 Run `pnpm nx run investlab-data:build`
- [ ] 5.3 Run `pnpm nx run investlab:build`
- [ ] 5.4 Verify total patrimony aggregation from both modules
- [ ] 5.5 Verify investment % calculation with configured income and contributions
- [ ] 5.6 Verify RF/RV distribution with mixed asset classes
- [ ] 5.7 Verify graceful handling when modules have no data or settings unconfigured
- [ ] 5.8 Verify navigation links to /portfolio and /roger
