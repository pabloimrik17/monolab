# Roger Sector Allocation Specification

## ADDED Requirements

### Requirement: Configure sector targets

The system SHALL allow the user to configure a target percentage per sector, with all targets summing to 100%.

#### Scenario: Set sector targets

- **WHEN** user configures targets: Technology 30%, Healthcare 20%, Financial 15%, Energy 10%, Consumer 25%
- **THEN** all targets are persisted
- **AND** the sum equals 100%

#### Scenario: Reject invalid target sum

- **WHEN** user submits targets that sum to 95%
- **THEN** the configuration is rejected with an error indicating the sum must equal 100%

#### Scenario: Update existing target

- **WHEN** user changes Technology target from 30% to 25% and Consumer from 25% to 30%
- **THEN** both targets are updated
- **AND** the sum remains 100%

#### Scenario: No targets configured

- **WHEN** no sector targets have been configured
- **THEN** the allocation view shows actual distribution only with target, difference, and status columns showing "--"

### Requirement: Calculate actual allocation per sector

The system SHALL calculate actual sector allocation from entries in COMPRAR, INVERTIDO, or VENDER states, using position value = currentPrice × quantity for each active entry.

#### Scenario: Single sector allocation

- **WHEN** there are 2 active entries for Technology instruments with values $5,000 and $3,000
- **AND** total active portfolio value is $20,000
- **THEN** Technology actual allocation shows $8,000 and 40%

#### Scenario: Multiple sectors

- **WHEN** active entries span Technology ($8,000), Healthcare ($6,000), Financial ($6,000)
- **THEN** allocations show Technology 40%, Healthcare 30%, Financial 30%

#### Scenario: Entry not in active state excluded

- **WHEN** an entry is in EN_ESPERA state with desiredPrice 100 and no quantity
- **THEN** it is excluded from allocation calculation

#### Scenario: No active entries

- **WHEN** no entries are in COMPRAR, INVERTIDO, or VENDER states
- **THEN** all sectors show $0 and 0%

### Requirement: Display actual vs target comparison

The system SHALL display a table comparing actual allocation against configured targets with $ amounts and percentages.

#### Scenario: On-target allocation

- **WHEN** Technology actual is 31% and target is 30%
- **THEN** difference shows +1% with green indicator (within +/-2%)

#### Scenario: Over-allocated sector

- **WHEN** Technology actual is 38% and target is 30%
- **THEN** difference shows +8% with red indicator

#### Scenario: Under-allocated sector

- **WHEN** Healthcare actual is 12% and target is 20%
- **THEN** difference shows -8% with yellow indicator

### Requirement: Handle instruments without sector

The system SHALL group instruments without a sector as "Unclassified" in the allocation view.

#### Scenario: Unclassified instruments

- **WHEN** 2 active entries have instruments with no sector assigned
- **AND** their combined value is $4,000 out of $20,000 total
- **THEN** "Unclassified" row shows $4,000 and 20%

#### Scenario: All instruments have sectors

- **WHEN** every active entry's instrument has a sector assigned
- **THEN** no "Unclassified" row appears

### Requirement: Recalculate on data changes

The system SHALL recalculate allocations when the view is rendered.

#### Scenario: Entry state change affects allocation

- **WHEN** an entry transitions from EN_ESPERA to COMPRAR (with quantity set)
- **AND** user navigates to sector allocation view
- **THEN** the allocation reflects the newly active entry

#### Scenario: Price update affects allocation

- **WHEN** quote cache returns updated prices for instruments
- **AND** user refreshes sector allocation view
- **THEN** actual $ amounts and percentages reflect current prices
