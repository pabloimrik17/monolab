# Roger Metrics UI Design

## Context

The /roger route from roger-positions shows raw entry data. Trader needs calculated metrics (breakeven, trailing stops) and visual indicators to make trading decisions during weekly review. Current prices come from the Finnhub quote cache established in investlab-foundation.

## Goals / Non-Goals

**Goals:**
- Pure domain calculation functions (no side effects, fully testable)
- Calculated columns in entry table: avg buy price, breakeven, trailing stops
- Visual indicators: state colors, price comparisons, trailing stop readiness
- Action buttons per entry: only valid transitions visible

**Non-Goals:**
- No actual order placement
- No real-time price streaming (weekly review cadence)
- No alerts or notifications

## Decisions

### 1. Calculation layer as pure domain functions

```typescript
avgBuyPrice(entries: Entry[]): number
// Filter to COMPRAR/INVERTIDO/VENDER, then: sum(price_i * qty_i) / sum(qty_i)

breakeven(entry: Entry, avgPrice: number): number
// IF avgPrice > 0 THEN avgPrice
// ELSE (price * qty + 2 * commission) / qty
// Commission doubled: accounts for buy + sell (assumed equal)

trailingStop(breakeven: number, pct: number): number
// breakeven / (1 - pct)
// pct = 0.05, 0.10, 0.15
```

**Why pure functions**: No dependencies, trivially testable, composable. Calculation logic lives in domain package, not in UI components.

### 2. Active states for calculations

Only entries in COMPRAR, INVERTIDO, or VENDER participate in calculations. EN_ESPERA, OPERATIVA, and ROGER are observational — no quantity/commission data to calculate with.

avgBuyPrice aggregates across all active entries for the same instrument.

### 3. Visual indicators

**State badges**: Each RogerState gets a distinct color. Quick scan of table reveals position mix.

**Price comparison (current vs desired)**:
- Green: currentPrice >= desiredPrice (buy opportunity may have passed or target reached)
- Red: currentPrice < desiredPrice (still a buying opportunity)

**Trailing stop readiness** (per stop level):
- Check mark: currentPrice > trailingStopPrice (stop would profit)
- Warning: currentPrice within 2% of trailingStopPrice (approaching)
- Dash: currentPrice far below trailingStopPrice (not relevant yet)

### 4. Action buttons per entry

Each entry row shows buttons for valid transitions from its current state. Invalid transitions not rendered (not disabled — absent). Keeps UI clean, prevents confusion.

Example: entry in INVERTIDO shows buttons for EN_ESPERA, OPERATIVA, VENDER only. No COMPRAR button (blocked by matrix).

**Why hide vs disable**: Fewer buttons = less cognitive load. State machine already prevents invalid transitions server-side.

### 5. Current price from quote cache

Use investlab-quote-cache to fetch current prices for all instruments visible on /roger. Batch fetch on page load. Cache TTL handles freshness.

If quote unavailable for an instrument (quotable=false or cache miss), indicators show dash/neutral state.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| avgBuyPrice wrong if entries span different time periods | Document: it's a simple weighted average, not time-weighted |
| Breakeven formula assumes equal buy/sell commission | Good enough for weekly reference; document assumption |
| Quote cache may be stale | Acceptable for weekly review; show "last updated" timestamp |
| Too many columns making table wide | Responsive design; collapsible metrics columns on mobile |
