## Context

Portfolio items and contributions exist. Final piece: profitability. User needs to know "is this instrument making money?" per holding and globally.

User's Excel has a "current return %" column per instrument. Need to replicate this plus add weighted global return.

## Goals / Non-Goals

**Goals:**

- Per-instrument return % calculation
- Global portfolio return % (weighted by current value)
- Color-coded return display (green positive, red negative)
- Support both quotable (auto-price from Finnhub cache) and non-quotable (manual) instruments
- Refresh returns when quote cache updates

**Non-Goals:**

- Time-weighted return (TWR) or money-weighted return (MWR) — simple return % is enough for v1
- Historical return charting / performance over time
- Dividend tracking
- Tax lot accounting
- Real-time price streaming — uses existing cache TTL from foundation

## Decisions

### 1. Return calculation — simple percentage

```
returnPercent = (currentValue - investedAmount) / investedAmount * 100
```

New fields on PortfolioItem:
```
PortfolioItem (extended) {
  ...existing fields
  investedAmount: number     // total amount invested (sum of contributions or manual baseline)
  quantity?: number          // units held (needed for quotable instruments: currentValue = price * quantity)
}
```

**Why investedAmount as explicit field, not derived from contribution history**: no transaction log yet. User may have legacy positions where they don't know exact contribution timeline. Manual baseline covers all cases.

### 2. Current value resolution strategy

`ValueResolver` domain service:
- For quotable instruments (`instrument.quotable === true`): `currentValue = cachedPrice * quantity`
- For non-quotable instruments: `currentValue` from manual entry (already on PortfolioItem)
- If quotable but no cached price available: fall back to manual currentValue

**Why not always auto-update**: index funds (e.g., MyInvestor funds) have no public API price. Must support manual entry as first-class path.

### 3. ReturnCalculator domain service

```typescript
ReturnCalculator {
  calculateItemReturn(item: PortfolioItem): number | null
  // null if investedAmount is 0 or undefined

  calculateGlobalReturn(items: PortfolioItem[]): number | null
  // weighted average: sum(itemReturn * itemValue) / sum(itemValue)
}
```

Pure domain logic, no IO. ValueResolver handles price fetching separately.

### 4. UI integration — extends /portfolio, no new route

Add to existing portfolio table:
- New column: "Return %" with `ReturnBadge` component (green/red/neutral)
- New column: "Invested" showing investedAmount
- Global KPI card above table: "Portfolio Return: X%"

**Why not separate route**: returns are per-item data, naturally lives in the portfolio table. Allocations is a different analytical view; returns is a column.

### 5. Schema migration — add return-related columns

```sql
ALTER TABLE portfolio_items
  ADD COLUMN invested_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN quantity NUMERIC(16,8);
```

Quantity uses 8 decimal places to support crypto fractional holdings (e.g., 0.00145 BTC).

### 6. Quote cache integration

ValueResolver depends on QuoteCache (from foundation) via Inversify token. On `/portfolio` load:
1. Fetch all portfolio items with instruments
2. For quotable instruments, batch-resolve prices from cache
3. Calculate currentValue = price * quantity for quotable items
4. Calculate returns using resolved values

No new API calls — uses existing cache. If cache is stale, prices are stale. Acceptable for weekly review use case.

## Risks / Trade-offs

- **[Simple return vs TWR]** — Simple return doesn't account for contribution timing. Good enough for "am I up or down" but misleading for instruments with irregular contributions. Document this limitation in UI.
- **[investedAmount can drift from reality]** — If user forgets to update after contributions. Future: derive from transaction log once that exists.
- **[Quantity for non-quotable is meaningless]** — Index funds might not have a meaningful "quantity." Field is nullable, only used for quotable price resolution.
- **[Quote cache miss = stale manual value]** — If Finnhub cache is empty for a quotable instrument, falls back to last manual value which could be very stale. UI should indicate "last updated" timestamp.
