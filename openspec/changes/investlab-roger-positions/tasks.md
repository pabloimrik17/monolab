# Implementation Tasks

## 1. Domain

- [ ] 1.1 Define RogerState enum (EN_ESPERA, OPERATIVA, ROGER, COMPRAR, INVERTIDO, VENDER) in investlab-domain
- [ ] 1.2 Define Entry entity (id, instrumentId, state, desiredPrice, quantity?, commission?, createdAt, updatedAt)
- [ ] 1.3 Define StateTransition value object with transition matrix (allowed from->to map)
- [ ] 1.4 Implement transition validator: `isAllowed(from: RogerState, to: RogerState): boolean`
- [ ] 1.5 Implement data requirements resolver: `getRequiredFields(targetState: RogerState): Field[]`
- [ ] 1.6 Implement transitionEntry handler: validate transition + check required data + apply preserve/clear rules -> Result<Entry, TransitionError>
- [ ] 1.7 Define EntryRepository interface (create, findById, findByInstrumentId, findAll, update, delete, findStaleEnEspera)
- [ ] 1.8 Define TransitionError variants (InvalidTransition, MissingRequiredField)

## 2. Data

- [ ] 2.1 Create Drizzle schema for entries table (id uuid PK, instrument_id FK, state enum, desired_price numeric, quantity numeric nullable, commission numeric nullable, created_at, updated_at)
- [ ] 2.2 Generate and apply migration
- [ ] 2.3 Implement EntryRepository with Drizzle (all interface methods)
- [ ] 2.4 Implement toDomain/toRow mappers for Entry
- [ ] 2.5 Register EntryRepository in Inversify container module

## 3. State Machine

- [ ] 3.1 Unit test transition matrix: all 36 from->to combinations (6x6), verify allowed/blocked
- [ ] 3.2 Unit test data requirements per target state
- [ ] 3.3 Unit test transitionEntry handler: pre-fill logic, preserve/clear rules
- [ ] 3.4 Unit test edge cases: transition to same state, missing required field, invalid transition error messages

## 4. UI - Route

- [ ] 4.1 Create /roger route in apps/investlab
- [ ] 4.2 Build entry table component: grouped by instrument, columns (symbol, state, price, qty, commission, updated)
- [ ] 4.3 Add state badges with distinct colors per RogerState
- [ ] 4.4 Add column sorting (within instrument groups)
- [ ] 4.5 Add state filter (dropdown or toggle chips)

## 5. UI - Entry CRUD

- [ ] 5.1 Create entry form: instrument lookup (search existing) or create new, initial state, desired price
- [ ] 5.2 Instrument autocomplete: search by symbol/name, option to create new if not found
- [ ] 5.3 Dynamic form fields: show quantity/commission fields based on selected initial state
- [ ] 5.4 Edit entry: inline or modal edit of editable fields per current state
- [ ] 5.5 Delete entry: confirm dialog, remove from table
- [ ] 5.6 Cleanup button: find and delete tickers where ALL entries are EN_ESPERA with updated_at > 7 days, confirm dialog showing affected tickers

## 6. UI - Transitions

- [ ] 6.1 Transition buttons per entry: only show valid transitions from current state
- [ ] 6.2 Transition modal: show target state, pre-filled fields, editable fields for missing required data
- [ ] 6.3 Field editability rules: price editable only when entering COMPRAR from EN_ESPERA/OPERATIVA; quantity/commission read-only when already set
- [ ] 6.4 Validation: block submit if required fields missing, show inline errors
- [ ] 6.5 On successful transition: update entry in table, show updated state badge

## 7. Verification

- [ ] 7.1 `pnpm nx run investlab-domain:build` passes
- [ ] 7.2 `pnpm nx run investlab-data:build` passes
- [ ] 7.3 `pnpm nx run investlab:build` passes
- [ ] 7.4 All state machine unit tests pass
- [ ] 7.5 Manual test: create entry, transition through full lifecycle EN_ESPERA -> OPERATIVA -> COMPRAR -> INVERTIDO -> VENDER -> INVERTIDO
- [ ] 7.6 Manual test: invalid transitions blocked (INVERTIDO -> COMPRAR, EN_ESPERA -> ROGER)
- [ ] 7.7 Manual test: cleanup deletes only fully-stale tickers
