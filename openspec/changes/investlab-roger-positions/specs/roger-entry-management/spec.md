# Roger Entry Management Specification

## ADDED Requirements

### Requirement: Create entry

The system SHALL allow creating an Entry associated with an Instrument, with an initial state and desired price.

#### Scenario: Create entry with existing instrument

- **WHEN** user creates an entry selecting an existing instrument, state EN_ESPERA, and desired price 150.00
- **THEN** an Entry is persisted with the selected instrumentId, state EN_ESPERA, desiredPrice 150.00, quantity null, commission null
- **AND** createdAt and updatedAt are set to current timestamp

#### Scenario: Create entry with new instrument

- **WHEN** user creates an entry typing a ticker symbol that doesn't exist in the system
- **THEN** a new Instrument is auto-created via upsert
- **AND** the Entry is persisted linked to the new Instrument

#### Scenario: Create entry with initial state COMPRAR

- **WHEN** user creates an entry with initial state COMPRAR
- **THEN** the form requires both desiredPrice and quantity
- **AND** the Entry is persisted with all required fields

#### Scenario: Create entry with initial state INVERTIDO

- **WHEN** user creates an entry with initial state INVERTIDO
- **THEN** the form requires desiredPrice, quantity, and commission
- **AND** the Entry is persisted with all required fields

### Requirement: List entries

The system SHALL display entries grouped by instrument, sortable and filterable.

#### Scenario: List entries grouped by instrument

- **WHEN** user navigates to /roger
- **THEN** entries are displayed in a table grouped by instrument symbol
- **AND** each group shows the instrument symbol as header

#### Scenario: Sort entries by column

- **WHEN** user clicks a column header (state, desired price, updated_at)
- **THEN** entries are sorted by that column within their instrument group

#### Scenario: Filter entries by state

- **WHEN** user selects a state filter (e.g., COMPRAR)
- **THEN** only entries in that state are displayed
- **AND** instrument groups with no matching entries are hidden

#### Scenario: Multiple entries per instrument

- **WHEN** an instrument has 3 entries at different prices (EN_ESPERA at 100, COMPRAR at 105, INVERTIDO at 110)
- **THEN** all 3 entries appear under the same instrument group
- **AND** each shows its own state, price, and data

### Requirement: Update entry fields

The system SHALL allow updating entry fields when the current state permits it.

#### Scenario: Update desired price in EN_ESPERA

- **WHEN** user edits desiredPrice of an entry in EN_ESPERA
- **THEN** desiredPrice is updated and updatedAt refreshed

#### Scenario: Update quantity in COMPRAR

- **WHEN** user edits quantity of an entry in COMPRAR
- **THEN** quantity is updated and updatedAt refreshed

#### Scenario: Cannot set quantity in EN_ESPERA

- **WHEN** user tries to set quantity on an entry in EN_ESPERA
- **THEN** the field is not editable (state doesn't require quantity)

#### Scenario: Cannot set commission in COMPRAR

- **WHEN** user tries to set commission on an entry in COMPRAR
- **THEN** the field is not editable (state doesn't require commission)

### Requirement: Delete entry

The system SHALL allow deleting individual entries.

#### Scenario: Delete single entry

- **WHEN** user deletes an entry
- **THEN** the entry is removed from persistence
- **AND** the table updates to reflect the deletion

#### Scenario: Delete last entry for instrument

- **WHEN** user deletes the only entry for an instrument
- **THEN** the instrument group disappears from the table
- **AND** the Instrument entity is NOT deleted (may be referenced elsewhere)

### Requirement: Cleanup stale entries

The system SHALL provide a cleanup action for stale EN_ESPERA entries.

#### Scenario: Cleanup removes stale tickers

- **WHEN** user triggers cleanup
- **AND** instrument "AAPL" has 2 entries, both in EN_ESPERA with updated_at > 7 days ago
- **THEN** both entries for "AAPL" are deleted

#### Scenario: Cleanup preserves partially active tickers

- **WHEN** user triggers cleanup
- **AND** instrument "MSFT" has 2 entries: one EN_ESPERA (stale) and one COMPRAR
- **THEN** no entries for "MSFT" are deleted (not ALL entries are stale EN_ESPERA)

#### Scenario: Cleanup preserves recent EN_ESPERA

- **WHEN** user triggers cleanup
- **AND** instrument "GOOG" has 1 entry in EN_ESPERA with updated_at 3 days ago
- **THEN** the entry is NOT deleted (within 7-day threshold)
