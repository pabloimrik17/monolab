# Roger Dashboard Metrics Specification

## ADDED Requirements

### Requirement: Display real liquidity

The system SHALL display real liquidity calculated as configured total cash minus invested amount minus pending buy amount.

#### Scenario: Positive liquidity

- **WHEN** total cash is configured as $50,000
- **AND** invested amount (INVERTIDO entries: currentPrice x quantity) is $30,000
- **AND** pending buy amount (COMPRAR entries: desiredPrice x quantity) is $10,000
- **THEN** real liquidity displays $10,000

#### Scenario: Negative liquidity

- **WHEN** total cash is $50,000, invested is $35,000, pending buys is $20,000
- **THEN** real liquidity displays -$5,000 with red indicator (over-committed)

#### Scenario: No cash configured

- **WHEN** total cash has not been configured
- **THEN** liquidity shows "--" by default; configure-cash prompt only surfaces after user clicks "Configure Cash" button

#### Scenario: No active entries

- **WHEN** total cash is $50,000 and no entries are in INVERTIDO or COMPRAR states
- **THEN** real liquidity displays $50,000

### Requirement: Display pending buy orders total

The system SHALL display the total dollar amount of pending buy orders from entries in COMPRAR state.

#### Scenario: Multiple pending buys

- **WHEN** there are 3 entries in COMPRAR state with values: $5,000, $3,000, $2,000
- **THEN** pending buys total displays $10,000 with count "(3 orders)"

#### Scenario: No pending buys

- **WHEN** no entries are in COMPRAR state
- **THEN** pending buys displays $0

### Requirement: Display pending sell orders total

The system SHALL display the total dollar amount of pending sell orders from entries in VENDER state.

#### Scenario: Multiple pending sells

- **WHEN** there are 2 entries in VENDER state with currentPrice x quantity values: $8,000, $4,000
- **THEN** pending sells total displays $12,000 with count "(2 orders)"

#### Scenario: No pending sells

- **WHEN** no entries are in VENDER state
- **THEN** pending sells displays $0

### Requirement: Cleanup stale tickers

The system SHALL identify instruments where ALL entries are in EN_ESPERA state with updatedAt <= now_utc() - interval '7 days' (system UTC clock), and allow batch deletion with preview.

#### Scenario: Identify stale tickers

- **WHEN** user clicks "Cleanup stale tickers"
- **AND** instrument "AAPL" has 2 entries, both EN_ESPERA, both updated 10 days ago
- **THEN** "AAPL" appears in the preview list with entry count and last updated date

#### Scenario: Exclude partially active instruments

- **WHEN** instrument "MSFT" has 1 entry EN_ESPERA (stale) and 1 entry COMPRAR
- **THEN** "MSFT" does NOT appear in the stale preview

#### Scenario: Exclude recently updated EN_ESPERA

- **WHEN** instrument "GOOG" has 1 entry EN_ESPERA updated 3 days ago
- **THEN** "GOOG" does NOT appear in the stale preview

### Requirement: Cleanup preview and confirmation

The system SHALL show a preview list before deletion and require explicit confirmation.

#### Scenario: Preview before delete

- **WHEN** 3 stale instruments are identified
- **THEN** a preview dialog shows each instrument symbol, entry count, and last updated date
- **AND** user can confirm or cancel

#### Scenario: Confirm deletion

- **WHEN** user confirms cleanup of 3 stale instruments with 7 total entries
- **THEN** all 7 entries are deleted
- **AND** dashboard metrics recalculate

#### Scenario: Cancel cleanup

- **WHEN** user cancels the cleanup dialog
- **THEN** no entries are deleted

### Requirement: Delete orphaned instruments

The system SHALL delete instruments only when, after cleanup, they have no remaining references across the system (including entries and portfolio items).

#### Scenario: Orphaned instrument deleted

- **WHEN** stale entries for "AAPL" are deleted
- **AND** no other entries or portfolio items reference that instrument
- **THEN** the "AAPL" instrument is deleted

#### Scenario: Instrument retained if referenced elsewhere

- **WHEN** stale entries for "MSFT" are deleted
- **AND** a portfolio item still references that instrument
- **THEN** the "MSFT" instrument is NOT deleted

### Requirement: Configure total available cash

The system SHALL allow the user to set and update total available cash.

#### Scenario: Set initial cash

- **WHEN** user configures total cash as $50,000
- **THEN** the value is persisted
- **AND** liquidity metric recalculates immediately

#### Scenario: Update cash amount

- **WHEN** user changes total cash from $50,000 to $60,000
- **THEN** the updated value is persisted
- **AND** liquidity recalculates with new total
