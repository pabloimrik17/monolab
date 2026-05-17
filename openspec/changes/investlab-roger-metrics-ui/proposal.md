## Why

Trader needs pre-calculated reference prices to make informed sell/hold decisions. Raw position data from roger-positions isn't enough — need breakeven, trailing stop levels, and visual indicators comparing current price to targets. Without this, user has to manually calculate these values every review session.

## What Changes

- Calculation functions in domain: avgBuyPrice, breakeven, trailingStop (5/10/15%)
- Calculated columns added to /roger entry table: avg price, breakeven, trailing stops
- Visual indicators: state badges with colors, current price vs desired price comparison, trailing stop readiness (reached/near/far)
- Action buttons per entry showing only valid transitions from current state
- Integration with investlab-quote-cache for current price data

## Capabilities

### New Capabilities

- `roger-calculations`: Pure domain functions for breakeven and trailing stop formulas. avgBuyPrice across active entries per instrument, breakeven with commission doubling, trailing stops at 5/10/15%. Only applies to entries in COMPRAR/INVERTIDO/VENDER states
- `roger-visual-indicators`: Price comparison indicators and action UX. Row styling per state, current vs desired price indicator (green/red), trailing stop readiness indicators, transition action buttons with disabled states for invalid transitions

### Modified Capabilities

- `roger-entry-management` (from roger-positions): Entry table extended with calculated columns and visual indicators

## Impact

- **Modified route**: `/roger` gains metrics columns, indicators, action buttons
- **New domain functions**: Calculation layer in `packages/investlab-domain`
- **Integration**: Depends on `investlab-quote-cache` (from foundation) for current prices
- **Prereq**: `investlab-roger-positions` (Entry entity, state machine, /roger route)
