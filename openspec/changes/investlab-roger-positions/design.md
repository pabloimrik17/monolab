# Roger Positions Design

## Context

Roger module tracks active stock positions following a trader's methodology. Each position (Entry) follows a strict 6-state lifecycle. The foundation layer (Instrument entity, PostgreSQL, Drizzle) already exists from `investlab-foundation`.

## Goals / Non-Goals

**Goals:**
- Entry entity with full state machine in domain layer
- CRUD operations with state-aware validation
- `/roger` route with grouped entry table
- Transition UI with pre-filled forms
- Cleanup stale EN_ESPERA entries

**Non-Goals:**
- No metrics/calculations (separate change: `investlab-roger-metrics-ui`)
- No real-time price fetching in this change
- No portfolio integration

## Decisions

### 1. Entry entity in investlab-domain

```typescript
Entry {
  id: uuid
  instrumentId: uuid
  state: RogerState        // EN_ESPERA | OPERATIVA | ROGER | COMPRAR | INVERTIDO | VENDER
  desiredPrice: number     // always required
  quantity?: number         // required from COMPRAR onward
  commission?: number       // required from INVERTIDO onward
  createdAt: Date
  updatedAt: Date
}
```

One Instrument can have many Entries (multiple positions at different price points).

**Why**: Matches domain reality. Trader may have multiple entries in same ticker at different prices.

### 2. State machine as pure domain logic

StateTransition value object encapsulates the transition matrix:

```
To EN_ESPERA:   from ANY
To OPERATIVA:   from ANY
To ROGER:       ONLY from OPERATIVA
To COMPRAR:     from ALL EXCEPT INVERTIDO
To INVERTIDO:   ONLY from COMPRAR or VENDER
To VENDER:      ONLY from INVERTIDO
```

Data requirements per target state:
| Field | EN_ESPERA | OPERATIVA | ROGER | COMPRAR | INVERTIDO | VENDER |
|-------|:---------:|:---------:|:-----:|:-------:|:---------:|:------:|
| desired_price | R | R | R | R | R | R |
| quantity | - | - | - | R | R | R |
| commission | - | - | - | - | R | R |

R = required, - = not applicable

**Why pure domain**: No framework dependencies. Testable in isolation. Same logic whether called from UI or API.

### 3. Transition data rules

- **Price**: Can change when entering COMPRAR from EN_ESPERA/OPERATIVA. Otherwise preserved from current value.
- **Quantity**: Doesn't change once set. Pre-filled from current if transitioning between states that require it.
- **Commission**: Doesn't change once set. Pre-filled from current.
- **Clearing**: Transitioning to EN_ESPERA/OPERATIVA clears quantity and commission (those states don't use them).

On transition, UI pre-fills form with current entry values. Only requests missing required fields.

### 4. Transition handler

```typescript
transitionEntry(entry: Entry, targetState: RogerState, data: TransitionData): Result<Entry, TransitionError>
```

Steps: validate transition allowed -> check required fields present -> apply data rules (preserve/clear) -> return updated Entry.

TransitionError variants: `InvalidTransition`, `MissingRequiredField`.

### 5. UI: /roger route

Table of entries grouped by instrument symbol. Columns: symbol, state (badge), desired price, quantity, commission, updated_at. Sortable by column. Filterable by state.

State badges with distinct colors per state for quick scanning.

### 6. Cleanup stale entries

Button triggers: find instruments where ALL entries have state=EN_ESPERA AND updated_at < now - 7 days. Delete those entries (and optionally the instrument if no other references).

**Why button not automatic**: User should control when cleanup happens. Avoids accidental data loss.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| State machine complexity in UI | Pre-fill form reduces user friction; only valid transitions shown |
| Multiple entries per instrument complicates table | Group by instrument, collapsible rows |
| Cleanup could delete entries user still cares about | 7-day threshold + manual trigger; confirm dialog |
| State enum may need extension later | Enum in domain layer, easy to extend; migration adds new values |
