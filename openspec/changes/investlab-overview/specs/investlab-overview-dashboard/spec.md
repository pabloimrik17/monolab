# InvestLab Overview Dashboard Specification

## ADDED Requirements

### Requirement: Display total patrimony

The system SHALL display total patrimony as the sum of portfolio value and roger active positions value.

#### Scenario: Both modules have value

- **WHEN** portfolio items total $80,000 and roger active entries (COMPRAR/INVERTIDO/VENDER) total $20,000
- **THEN** total patrimony displays $100,000
- **AND** breakdown shows Portfolio: $80,000, Roger: $20,000

#### Scenario: Only portfolio has value

- **WHEN** portfolio items total $50,000 and no roger entries are in active states
- **THEN** total patrimony displays $50,000

#### Scenario: No data in either module

- **WHEN** no portfolio items exist and no roger active entries exist
- **THEN** total patrimony displays $0

### Requirement: Display monthly income

The system SHALL display the user-configured monthly income.

#### Scenario: Income configured

- **WHEN** monthly income is set to $5,000
- **THEN** the KPI card displays $5,000

#### Scenario: Income not configured

- **WHEN** monthly income has not been set
- **THEN** the KPI card displays "--" with a prompt to configure

### Requirement: Display investment allocation percentage

The system SHALL display the percentage of monthly income allocated to investments.

#### Scenario: Both values configured

- **WHEN** monthly contributions is $1,500 and monthly income is $5,000
- **THEN** investment allocation displays 30%

#### Scenario: Income not configured

- **WHEN** monthly income has not been set
- **THEN** investment allocation displays "--" (cannot calculate without income)

#### Scenario: Zero income

- **WHEN** monthly income is configured as $0
- **THEN** investment allocation displays "--" (avoid division by zero)

### Requirement: Display RF/RV distribution

The system SHALL display the fixed income (RF) vs variable income (RV) distribution from portfolio allocations.

#### Scenario: Mixed portfolio

- **WHEN** portfolio has $30,000 in fixed_income instruments and $70,000 in equity/commodity/crypto instruments
- **THEN** RF shows $30,000 (30%) and RV shows $70,000 (70%)

#### Scenario: All equity

- **WHEN** portfolio has only equity instruments totaling $50,000
- **THEN** RF shows $0 (0%) and RV shows $50,000 (100%)

#### Scenario: Empty portfolio

- **WHEN** no portfolio items exist
- **THEN** RF and RV both show $0 (0%)

### Requirement: Quick navigation to modules

The system SHALL provide navigation links to portfolio and roger modules.

#### Scenario: Navigate to portfolio

- **WHEN** user clicks the portfolio link/card
- **THEN** user is navigated to /portfolio

#### Scenario: Navigate to roger

- **WHEN** user clicks the roger link/card
- **THEN** user is navigated to /roger

### Requirement: Configure monthly income

The system SHALL allow the user to set and update monthly income and monthly contributions.

#### Scenario: Set monthly income

- **WHEN** user configures monthly income as $5,000
- **THEN** the value is persisted
- **AND** KPI cards recalculate

#### Scenario: Update monthly contributions

- **WHEN** user changes monthly contributions from $1,000 to $1,500
- **THEN** investment allocation % recalculates with new value

#### Scenario: Reject negative monthly income (ADDED)

- **WHEN** user sets monthly income to -$1,000
- **THEN** a validation error is shown
- **AND** the previous value is not changed
- **AND** KPI cards remain unchanged

#### Scenario: Reject negative monthly contributions (ADDED)

- **WHEN** user sets monthly contributions to -$500
- **THEN** a validation error is shown
- **AND** the previous value is not changed
- **AND** investment allocation % remains unchanged

### Requirement: Auto-refresh on data changes

The system SHALL recalculate KPIs when the overview page is loaded or navigated to.

#### Scenario: Return to overview after changes

- **WHEN** user adds a portfolio item worth $10,000 in /portfolio
- **AND** navigates back to /
- **THEN** total patrimony reflects the new portfolio item

#### Scenario: Price updates reflected

- **WHEN** quote cache returns updated prices
- **AND** user loads the overview page
- **THEN** patrimony and RF/RV values reflect current prices
