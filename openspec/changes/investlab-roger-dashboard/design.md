# Roger Dashboard Design

## Context

Roger module has entries with states and metrics UI patterns from prior changes. Need aggregate dashboard for quick decision-making: how much cash is really available, what's pending, and cleanup of stale positions.

## Goals / Non-Goals

**Goals:**
- Real liquidity metric from configured total cash
- Pending buy/sell order totals
- Stale ticker cleanup with preview and confirmation
- Cash configuration setting

**Non-Goals:**
- No historical trend tracking
- No automatic cleanup (always user-triggered)
- No portfolio module integration

## Decisions

### 1. Metrics calculations

**Real liquidity:**
```
realLiquidity = totalCash - investedAmount - pendingBuyAmount
```
- `totalCash`: user-configured setting (stored in DB)
- `investedAmount`: sum(currentPrice x quantity) for entries in INVERTIDO state
- `pendingBuyAmount`: sum(desiredPrice x quantity) for entries in COMPRAR state

**Pending buy orders:**
```
pendingBuys = sum(desiredPrice x quantity) for entries WHERE state = COMPRAR
```

**Pending sell orders:**
```
pendingSells = sum(currentPrice x quantity) for entries WHERE state = VENDER
```

**Why desiredPrice for buys, currentPrice for sells**: Buy orders execute at desired price (limit order). Sell value reflects current market price.

### 2. Total cash configuration

```typescript
RogerSetting {
  id: uuid
  key: string         // 'total_cash'
  value: string       // JSON-encoded number
  updatedAt: Date
}
```

Generic key-value settings table. Allows future settings without schema changes.

**Why generic**: Avoids dedicated table for single setting. Dashboard may gain more configurable values later.

### 3. Stale ticker cleanup

Stale criteria: instruments where ALL entries have state = EN_ESPERA AND updatedAt < now - 7 days.

Flow:
1. User clicks "Cleanup stale tickers"
2. System queries and shows preview list: instrument symbol, entry count, last updated date
3. User confirms or cancels
4. On confirm: delete all entries for those instruments
5. Check for orphaned instruments (no entries referencing them from any module) and delete those too

**Why preview**: Prevents accidental deletion. User may see a ticker they forgot about and want to keep.

### 4. Orphan instrument cleanup

After entry deletion, check if instrument has zero entries across ALL modules (not just Roger). Only delete if truly orphaned.

**Why cross-module check**: Portfolio module may reference the same instrument.

### 5. Dashboard layout

Metric cards at top:
- Real Liquidity: $XX,XXX (green if positive, red if negative)
- Pending Buys: $XX,XXX (count of orders)
- Pending Sells: $XX,XXX (count of orders)

Below cards: "Configure Cash" button + "Cleanup Stale Tickers" button

### 6. Route

`/roger/dashboard` as dedicated sub-route. Could also be a collapsible section at top of `/roger`.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Negative liquidity confusing | Show in red with clear label; means over-committed |
| Orphan check across modules adds coupling | Cross-module reference check before deletion; query all module-owned relations (entries, positions, portfolio links) to verify zero references |
| Stale threshold too aggressive or too lenient | 7 days is reasonable default; could make configurable via settings later |
| Generic settings table queried often | Single row for cash; negligible performance impact |
