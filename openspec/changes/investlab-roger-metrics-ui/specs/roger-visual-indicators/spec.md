# Roger Visual Indicators Specification

## ADDED Requirements

### Requirement: State badges

The system SHALL display distinct colored badges for each RogerState.

#### Scenario: Each state has unique badge

- **WHEN** entries in all 6 states are displayed
- **THEN** each state shows a visually distinct badge (unique color per state)
- **AND** the badge text shows the state name

#### Scenario: State badge in table row

- **WHEN** an entry row is rendered
- **THEN** the state column shows the colored badge
- **AND** the badge is the primary visual identifier for the row

### Requirement: Price comparison indicator

The system SHALL indicate how current market price compares to the entry's desired price.

#### Scenario: Current price above desired price

- **WHEN** currentPrice (from quote cache) >= desiredPrice
- **THEN** indicator shows green (target reached or exceeded)

#### Scenario: Current price below desired price

- **WHEN** currentPrice < desiredPrice
- **THEN** indicator shows red (still a buying opportunity)

#### Scenario: Quote unavailable

- **WHEN** current price is not available (instrument not quotable or cache miss)
- **THEN** indicator shows neutral/dash state
- **AND** no color coding applied

### Requirement: Trailing stop readiness indicators

The system SHALL show trailing stop readiness for each level (5%, 10%, 15%).

#### Scenario: Price above trailing stop level (reached)

- **WHEN** currentPrice > trailingStopPrice for a given level
- **THEN** indicator shows check mark (trailing stop at this level would lock in profit at or above breakeven)

#### Scenario: Price within 2% of trailing stop level (approaching)

- **WHEN** currentPrice is within 2% below trailingStopPrice
- **THEN** indicator shows warning symbol (approaching the level)

#### Scenario: Price far below trailing stop level

- **WHEN** currentPrice is more than 2% below trailingStopPrice
- **THEN** indicator shows dash (not relevant yet)

#### Scenario: No trailing stop for observational entries

- **WHEN** an entry is in EN_ESPERA, OPERATIVA, or ROGER
- **THEN** trailing stop indicators show dash (no calculation applicable)

### Requirement: Action buttons

The system SHALL display transition action buttons per entry showing only valid transitions.

#### Scenario: EN_ESPERA entry actions

- **WHEN** an entry is in EN_ESPERA
- **THEN** buttons shown: OPERATIVA, COMPRAR
- **AND** buttons NOT shown: ROGER, INVERTIDO, VENDER (invalid from EN_ESPERA)
- **AND** EN_ESPERA button shown (re-enter/refresh timestamp)

#### Scenario: OPERATIVA entry actions

- **WHEN** an entry is in OPERATIVA
- **THEN** buttons shown: EN_ESPERA, ROGER, COMPRAR
- **AND** buttons NOT shown: INVERTIDO, VENDER

#### Scenario: ROGER entry actions

- **WHEN** an entry is in ROGER
- **THEN** buttons shown: EN_ESPERA, OPERATIVA, COMPRAR
- **AND** buttons NOT shown: INVERTIDO, VENDER

#### Scenario: COMPRAR entry actions

- **WHEN** an entry is in COMPRAR
- **THEN** buttons shown: EN_ESPERA, OPERATIVA, INVERTIDO
- **AND** buttons NOT shown: ROGER, VENDER

#### Scenario: INVERTIDO entry actions

- **WHEN** an entry is in INVERTIDO
- **THEN** buttons shown: EN_ESPERA, OPERATIVA, VENDER
- **AND** buttons NOT shown: ROGER, COMPRAR

#### Scenario: VENDER entry actions

- **WHEN** an entry is in VENDER
- **THEN** buttons shown: EN_ESPERA, OPERATIVA, COMPRAR, INVERTIDO
- **AND** buttons NOT shown: ROGER

#### Scenario: Action button triggers transition modal

- **WHEN** user clicks a valid transition button
- **THEN** the transition modal opens (from roger-positions) pre-filled with current values
- **AND** modal requests any missing required fields for the target state
