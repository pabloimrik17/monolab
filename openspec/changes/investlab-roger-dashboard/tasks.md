# Implementation Tasks

## 1. Domain

- [ ] 1.1 Create `LiquidityCalculator` domain service: realLiquidity = totalCash - invested - pendingBuys
- [ ] 1.2 Create `PendingOrdersAggregator` domain service: sum(desiredPrice x quantity) for COMPRAR, sum(currentPrice x quantity) for VENDER
- [ ] 1.3 Create `StaleTicker` value object: instrumentId, symbol, entryCount, lastUpdatedAt
- [ ] 1.4 Create `StaleTickerFinder` domain service: find instruments where ALL entries EN_ESPERA with updatedAt < now - 7 days
- [ ] 1.5 Create `RogerSetting` entity: id, key, value, updatedAt
- [ ] 1.6 Create `RogerSettingRepository` interface: get(key), set(key, value)
- [ ] 1.7 Define Inversify tokens for new services and repo
- [ ] 1.8 Add to domain ContainerModule

## 2. Data

- [ ] 2.1 Create Drizzle schema for `roger_settings` table (id, key unique, value, updated_at)
- [ ] 2.2 Generate migration with `drizzle-kit generate`
- [ ] 2.3 Implement `RogerSettingRepositoryImpl` — get/set with upsert semantics
- [ ] 2.4 Create stale ticker query: join entries + instruments, group by instrument, filter ALL entries EN_ESPERA with updatedAt < threshold
- [ ] 2.5 Create orphan instrument query: verify instrument has no foreign-key references in module-owned relations (entries, positions, portfolio_links) before marking orphan
- [ ] 2.6 Bind in data ContainerModule
- [ ] 2.7 Apply migration: `drizzle-kit migrate`

## 3. UI

- [ ] 3.1 Create dashboard metric cards: Real Liquidity, Pending Buys (with count), Pending Sells (with count)
- [ ] 3.2 Color liquidity card: green if positive, red if negative
- [ ] 3.3 Create "Configure Cash" button + modal/form: number input for total cash
- [ ] 3.4 Create "Cleanup Stale Tickers" button: triggers stale ticker finder
- [ ] 3.5 Create cleanup preview dialog: list of stale instruments with symbol, entry count, last updated
- [ ] 3.6 Create cleanup confirmation dialog: confirm/cancel, executes deletion on confirm
- [ ] 3.7 Add route/section for dashboard (under /roger/dashboard or top of /roger)
- [ ] 3.8 Wire metrics: fetch entries, quotes, settings -> compute -> render cards

## 4. Verification

- [ ] 4.1 Run `pnpm nx run investlab-domain:build`
- [ ] 4.2 Run `pnpm nx run investlab-data:build`
- [ ] 4.3 Run `pnpm nx run investlab:build`
- [ ] 4.4 Verify liquidity calculation: set cash, create entries in various states, check liquidity
- [ ] 4.5 Verify pending totals with entries in COMPRAR and VENDER states
- [ ] 4.6 Verify stale cleanup: create stale entries, preview, confirm deletion, check orphan cleanup
- [ ] 4.7 Verify cleanup skips instruments with non-EN_ESPERA entries or recent updates
