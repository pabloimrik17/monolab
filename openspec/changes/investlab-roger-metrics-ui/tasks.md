# Implementation Tasks

## 1. Domain

- [ ] 1.1 Implement `avgBuyPrice(entries: Entry[]): number` — filter to COMPRAR/INVERTIDO/VENDER, weighted average by quantity
- [ ] 1.2 Implement `breakeven(entry: Entry, avgPrice: number): number` — avgPrice if > 0, else (price*qty + 2*commission) / qty
- [ ] 1.3 Implement `trailingStop(breakeven: number, pct: number): number` — breakeven / (1 - pct)
- [ ] 1.4 Unit test avgBuyPrice: multiple entries, single entry, no active entries, mixed states
- [ ] 1.5 Unit test breakeven: with avg price, without avg price, without commission
- [ ] 1.6 Unit test trailingStop: 5%, 10%, 15% levels

## 2. UI - Metrics

- [ ] 2.1 Add calculated columns to entry table: avg buy price, breakeven, trailing stop 5%, 10%, 15%
- [ ] 2.2 Compute metrics per instrument group (avgBuyPrice shared across entries of same instrument)
- [ ] 2.3 Show dash for entries in non-active states (EN_ESPERA, OPERATIVA, ROGER)
- [ ] 2.4 Format prices to 2 decimal places

## 3. UI - Indicators

- [ ] 3.1 State badges: distinct color per RogerState in table rows
- [ ] 3.2 Price comparison indicator: green (current >= desired), red (current < desired), dash (unavailable)
- [ ] 3.3 Trailing stop readiness: check mark (reached), warning (within 2%), dash (far)
- [ ] 3.4 Responsive layout: collapsible metrics columns on narrow viewports

## 4. UI - Actions

- [ ] 4.1 Render valid transition buttons per entry based on current state
- [ ] 4.2 Hide (not disable) invalid transition buttons
- [ ] 4.3 Wire action buttons to transition modal from roger-positions

## 5. Integration

- [ ] 5.1 Batch fetch current prices from quote cache on /roger page load
- [ ] 5.2 Handle missing quotes gracefully (quotable=false, cache miss) — show dash indicators
- [ ] 5.3 Show "last updated" timestamp for price data

## 6. Verification

- [ ] 6.1 All calculation unit tests pass
- [ ] 6.2 `pnpm nx run investlab:build` passes
- [ ] 6.3 Manual test: verify avgBuyPrice, breakeven, trailing stops match hand calculations
- [ ] 6.4 Manual test: indicators change color correctly based on mock price data
- [ ] 6.5 Manual test: action buttons match state machine transition matrix exactly
