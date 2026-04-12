## 1. Domain

- [ ] 1.1 Add investedAmount and quantity fields to PortfolioItem entity — investedAmount (number, default 0), quantity (optional number)
- [ ] 1.2 Implement `ReturnCalculator` domain service — calculateItemReturn(item): number | null, calculateGlobalReturn(items): number | null
- [ ] 1.3 Implement `ValueResolver` domain service — resolveCurrentValue(item, instrument, cachedPrice?): number. Quotable + price → price x quantity. Otherwise → manual currentValue
- [ ] 1.4 Define tokens for ReturnCalculator, ValueResolver
- [ ] 1.5 Implement `GetPortfolioReturnsUseCase` (@injectable) — resolves values for all items, calculates per-item and global returns
- [ ] 1.6 Write unit tests for ReturnCalculator — positive, negative, zero invested, break-even, weighted global
- [ ] 1.7 Write unit tests for ValueResolver — quotable with price, quotable without price, non-quotable
- [ ] 1.8 Write unit tests for GetPortfolioReturnsUseCase with mock repos and cache
- [ ] 1.9 Export new public API from domain index.ts

## 2. Data

- [ ] 2.1 Add invested_amount and quantity columns to portfolio_items schema
- [ ] 2.2 Generate migration for new columns
- [ ] 2.3 Update PortfolioItem toDomain/toRow mappers for investedAmount and quantity fields

## 3. UI

- [ ] 3.1 Implement `ReturnBadge` component — green for positive, red for negative, gray for null. Format: "+X.XX%" / "-X.XX%" / "—"
- [ ] 3.2 Add "Invested" and "Return %" columns to PortfolioTable
- [ ] 3.3 Implement `GlobalReturnKpi` component — KPI card with portfolio return % (color-coded) and total value
- [ ] 3.4 Add GlobalReturnKpi above portfolio table on /portfolio route
- [ ] 3.5 Add investedAmount and quantity fields to PortfolioItemForm
- [ ] 3.6 Update PortfolioViewModel to use GetPortfolioReturnsUseCase for return data

## 4. Integration

- [ ] 4.1 Wire ValueResolver to QuoteCache via Inversify token
- [ ] 4.2 Batch price resolution — fetch cached prices for all quotable items in single pass on portfolio load
- [ ] 4.3 Subscribe to QuoteCache update callback; on update, re-resolve prices and rerender returns in-place (no full-page reload)

## 5. Verification

- [ ] 5.1 Verify `nx run investlab-domain:build` succeeds with return types
- [ ] 5.2 Verify `nx run investlab-data:build` succeeds with updated schema
- [ ] 5.3 Verify `nx run investlab-domain:test` passes — ReturnCalculator, ValueResolver tests
- [ ] 5.4 Verify `nx run investlab:build` succeeds with updated portfolio view
- [ ] 5.5 Manual test: set invested amounts, verify return % displays correctly, verify quotable instruments resolve from cache
