# Roger Sectors Design

## Context

Roger module tracks positions through a 6-state lifecycle. Instruments have an optional `sector` field (Technology, Healthcare, Financial, Energy, Consumer, Industrial, Materials, Utilities, Real Estate, Communication). Need visibility into sector diversification of active positions vs desired targets.

## Goals / Non-Goals

**Goals:**
- SectorTarget config entity: sector -> target percentage
- Actual allocation calculator from active entries
- Comparison view: actual vs target with deviation indicators
- Configuration UI for sector targets

**Non-Goals:**
- No historical allocation tracking
- No automatic rebalancing suggestions
- No portfolio module integration (roger-only)

## Decisions

### 1. SectorTarget configuration entity

```typescript
SectorTarget {
  id: uuid
  sector: Sector       // from predefined enum
  targetPercent: number // 0-100, all must sum to 100
  createdAt: Date
  updatedAt: Date
}
```

Stored as individual rows per sector. Validation: sum of all targetPercent must equal 100%.

**Why individual rows**: Easier to query, update individual sectors, and extend later vs a single JSON blob.

### 2. Actual allocation calculation

Active entries = entries in COMPRAR, INVERTIDO, or VENDER states. For each:
- Position value = currentPrice x quantity (both required in these states)
- Group by instrument.sector
- Instruments without sector -> "Unclassified" bucket

```typescript
SectorAllocation {
  sector: Sector | 'Unclassified'
  actualAmount: number    // sum of position values
  actualPercent: number   // (actualAmount / totalActiveValue) x 100
  targetPercent: number   // from SectorTarget config
  difference: number      // actualPercent - targetPercent
}
```

**Why currentPrice x quantity**: These states guarantee quantity is set. currentPrice comes from quote cache.

### 3. Deviation thresholds and color coding

| Condition | Color | Meaning |
|-----------|-------|---------|
| difference > +2% | Red | Over-allocated |
| difference < -2% | Yellow | Under-allocated |
| -2% <= difference <= +2% | Green | On target |

Threshold of +/-2% is hardcoded initially. Can be made configurable later.

### 4. View layout

Table with columns: Sector | Actual $ | Actual % | Target % | Difference | Status (color indicator)

Sorted by sector name. "Unclassified" always last row.

### 5. Target configuration UI

Form with one row per known sector. Number input for target %. Submit validates sum = 100%. Error shown if sum != 100%.

Pre-populated with current targets or 0% for unconfigured sectors.

### 6. Recalculation triggers

Allocation recalculates on:
- Page load / navigation to sector view
- Entry state changes (fetched fresh each render)
- No real-time push; pull-based on render

**Why pull-based**: Simpler. Sector view is consulted periodically, not watched continuously.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Instruments without sector skew percentages | "Unclassified" bucket makes it visible; user can update instrument sectors |
| Target sum validation annoying UX | Show running total as user edits; highlight when != 100% |
| Price staleness affects actual allocation | Uses quote cache with TTL; acceptable for allocation overview |
| Many sectors with 0% target clutter config UI | Only show sectors with active positions + any with existing targets |
