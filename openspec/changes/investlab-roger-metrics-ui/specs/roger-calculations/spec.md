# Roger Calculations Specification

## ADDED Requirements

### Requirement: Average buy price

The system SHALL calculate the weighted average buy price across active entries for the same instrument.

#### Scenario: Average of multiple active entries

- **WHEN** instrument "AAPL" has entries: COMPRAR at price=150 qty=10, INVERTIDO at price=160 qty=5
- **THEN** avgBuyPrice = (150*10 + 160*5) / (10 + 5) = 153.33

#### Scenario: Single active entry

- **WHEN** instrument "MSFT" has one entry: INVERTIDO at price=400 qty=20
- **THEN** avgBuyPrice = 400.00

#### Scenario: No active entries

- **WHEN** instrument "GOOG" has only entries in EN_ESPERA and OPERATIVA
- **THEN** avgBuyPrice is not calculated and returns `undefined`
- **AND** consumers must render this as dash/empty

#### Scenario: Only active states included

- **WHEN** instrument "TSLA" has entries: EN_ESPERA at price=200, COMPRAR at price=210 qty=10, INVERTIDO at price=220 qty=5
- **THEN** avgBuyPrice uses only COMPRAR and INVERTIDO entries: (210*10 + 220*5) / (10 + 5) = 213.33
- **AND** the EN_ESPERA entry is excluded from calculation

### Requirement: Breakeven calculation

The system SHALL calculate breakeven price accounting for commission costs.

#### Scenario: Breakeven with avg price available

- **WHEN** an entry has avgBuyPrice > 0 for its instrument
- **THEN** breakeven = avgBuyPrice

#### Scenario: Breakeven without avg price (single entry)

- **WHEN** an entry in INVERTIDO has desiredPrice=100, quantity=50, commission=9.99, and avgBuyPrice=0
- **THEN** breakeven = (100 * 50 + 2 * 9.99) / 50 = 100.40
- **AND** commission is doubled to account for both buy and sell

#### Scenario: Breakeven with invalid quantity

- **WHEN** quantity <= 0
- **THEN** breakeven is not calculated
- **AND** the system returns undefined and renders dash/empty

#### Scenario: Breakeven for entry without commission

- **WHEN** an entry in COMPRAR has desiredPrice=100, quantity=50, commission=null
- **THEN** breakeven cannot be fully calculated (commission unknown)
- **AND** the system shows desiredPrice as approximate breakeven

### Requirement: Trailing stop calculations

The system SHALL calculate trailing stop reference prices at 5%, 10%, and 15% levels.

#### Scenario: Trailing stop 5%

- **WHEN** breakeven = 100.00
- **THEN** trailingStop5 = 100.00 / 0.95 = 105.26
- **AND** this is the price at which a 5% trailing stop would trigger at breakeven

#### Scenario: Trailing stop 10%

- **WHEN** breakeven = 100.00
- **THEN** trailingStop10 = 100.00 / 0.90 = 111.11

#### Scenario: Trailing stop 15%

- **WHEN** breakeven = 100.00
- **THEN** trailingStop15 = 100.00 / 0.85 = 117.65

#### Scenario: Trailing stops only for active entries

- **WHEN** an entry is in EN_ESPERA
- **THEN** trailing stop values are not calculated
- **AND** the columns show dash or empty

### Requirement: Calculation scope

The system SHALL only compute metrics for entries in states COMPRAR, INVERTIDO, or VENDER.

#### Scenario: COMPRAR entry gets calculations

- **WHEN** an entry is in COMPRAR with desiredPrice and quantity set
- **THEN** breakeven and trailing stops are calculated (commission-based breakeven approximate without commission)

#### Scenario: INVERTIDO entry gets full calculations

- **WHEN** an entry is in INVERTIDO with desiredPrice, quantity, and commission set
- **THEN** all calculations are fully computed

#### Scenario: VENDER entry gets full calculations

- **WHEN** an entry is in VENDER with desiredPrice, quantity, and commission set
- **THEN** all calculations are fully computed

#### Scenario: EN_ESPERA entry skipped

- **WHEN** an entry is in EN_ESPERA
- **THEN** no calculations are performed, metric columns show dash
