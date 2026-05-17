## ADDED Requirements

### Requirement: Return calculation per portfolio item

The system SHALL calculate return percentage per PortfolioItem as: (currentValue - investedAmount) / investedAmount x 100. Returns null if investedAmount is 0 or undefined.

#### Scenario: Positive return
- **WHEN** item has currentValue 1200 and investedAmount 1000
- **THEN** returnPercent = 20%

#### Scenario: Negative return
- **WHEN** item has currentValue 800 and investedAmount 1000
- **THEN** returnPercent = -20%

#### Scenario: Zero invested amount
- **WHEN** item has investedAmount 0
- **THEN** returnPercent = null

#### Scenario: Break-even
- **WHEN** item has currentValue 1000 and investedAmount 1000
- **THEN** returnPercent = 0%

### Requirement: Global portfolio return

The system SHALL calculate global portfolio return as weighted average: sum of (itemReturnPercent x itemCurrentValue) / sum of (itemCurrentValue) across all items with non-null returns.

#### Scenario: Weighted global return
- **WHEN** item A has return 20% and value 6000, item B has return -10% and value 4000
- **THEN** globalReturn = (20*6000 + -10*4000) / (6000+4000) = 8%

#### Scenario: No items with returns
- **WHEN** all items have investedAmount 0
- **THEN** globalReturn = null

### Requirement: PortfolioItem investedAmount and quantity fields

The system SHALL extend PortfolioItem with: investedAmount (number, >= 0, total capital invested), quantity (optional number, units held for quotable instruments). These fields are manually set by the user.

#### Scenario: Set invested amount
- **WHEN** PortfolioItem is updated with investedAmount 5000
- **THEN** the field is persisted and return calculation uses it

#### Scenario: Set quantity for quotable instrument
- **WHEN** PortfolioItem is updated with quantity 0.5 for a BTC holding
- **THEN** the quantity is persisted with full decimal precision

### Requirement: Value resolution for quotable instruments

The system SHALL resolve currentValue for quotable instruments using cached Finnhub price x quantity. For non-quotable instruments or when cache miss occurs, the system SHALL use the manually entered currentValue.

#### Scenario: Quotable instrument with cached price
- **WHEN** instrument is quotable, quantity is 10, and cached price is 150
- **THEN** resolved currentValue = 1500

#### Scenario: Quotable instrument without cached price
- **WHEN** instrument is quotable but no cached price exists
- **THEN** resolved currentValue falls back to manual currentValue field

#### Scenario: Non-quotable instrument
- **WHEN** instrument.quotable is false
- **THEN** resolved currentValue uses manual currentValue field

### Requirement: Return display in portfolio table

The system SHALL add a "Return %" column to the portfolio table. Each cell SHALL display a ReturnBadge component: green background for positive return, red for negative, neutral/gray for zero or null. Format as "+X.XX%" or "-X.XX%".

#### Scenario: Positive return display
- **WHEN** item has returnPercent 15.5
- **THEN** cell displays "+15.50%" with green styling

#### Scenario: Negative return display
- **WHEN** item has returnPercent -3.2
- **THEN** cell displays "-3.20%" with red styling

#### Scenario: No return data
- **WHEN** item has returnPercent null
- **THEN** cell displays "—" with neutral styling

### Requirement: Global return KPI

The system SHALL display a KPI card above the portfolio table showing the global portfolio return percentage with color coding (green/red) and the total portfolio value.

#### Scenario: Display global return
- **WHEN** global return is 12.5% and total value is 50000
- **THEN** KPI card shows "Portfolio Return: +12.50%" in green and "Total Value: 50,000.00" 

#### Scenario: No return data available
- **WHEN** no items have return data
- **THEN** KPI card shows "Portfolio Return: —"

### Requirement: Schema migration for return fields

The system SHALL add columns to `portfolio_items`: `invested_amount` (NUMERIC 12,2, NOT NULL, default 0), `quantity` (NUMERIC 16,8, nullable).

#### Scenario: Migration adds columns
- **WHEN** the migration runs
- **THEN** portfolio_items gains invested_amount (default 0) and quantity (nullable) columns

### Requirement: Return refresh on quote update

The system SHALL recalculate returns for quotable instruments when the quote cache is refreshed. The portfolio view SHALL reflect updated values without full-page reload.

#### Scenario: Quote cache updates
- **WHEN** Finnhub cache refreshes with new price for a held instrument while portfolio view is open
- **THEN** the portfolio view updates currentValue and recalculated return % in-place without full-page reload
