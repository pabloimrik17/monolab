## Why

InvestLab needs the Roger trading module's core capability: managing stock positions through a defined lifecycle. Positions follow Roger's methodology with 6 states (EN_ESPERA, OPERATIVA, ROGER, COMPRAR, INVERTIDO, VENDER), each requiring specific data and enforcing strict transition rules. Without this, there's no foundation for the metrics, indicators, or decision-support features.

## What Changes

- Entry entity in `investlab-domain`: id, instrumentId, state (RogerState enum), desiredPrice, quantity?, commission?, createdAt, updatedAt
- State machine as pure domain logic: StateTransition value object validates from->to, returns required fields per target state
- Transition handler: validates allowed transition, checks required data present, pre-fills defaults from current state values
- New `/roger` route: table of entries grouped by instrument, sortable, filterable by state
- Transition UI: modal/form pre-filled with current values, requesting only missing required fields
- Entry CRUD: create (select/create instrument, initial state + desired price), update fields (when state allows), delete
- Cleanup: button to delete tickers where ALL entries in EN_ESPERA > 1 week (based on updated_at)

## Capabilities

### New Capabilities

- `roger-entry-management`: Entry CRUD with instrument association. Create entry (select or auto-create instrument), list entries grouped by instrument, update fields per state rules, delete entries. Multiple entries per instrument supported
- `roger-state-machine`: State transitions with validation and data rules. 6-state enum, transition matrix enforcement, data requirements per target state (desired_price always, quantity for COMPRAR+, commission for INVERTIDO+), pre-filling from current values on transition

### Modified Capabilities

None

## Impact

- **New route**: `/roger` in `apps/investlab`
- **New domain entities**: Entry entity, RogerState enum, StateTransition VO in `packages/investlab-domain`
- **New data layer**: Entry Drizzle schema, migration, EntryRepository in `packages/investlab-data`
- **Prereq**: `investlab-foundation` (Instrument entity, DB, repos)
