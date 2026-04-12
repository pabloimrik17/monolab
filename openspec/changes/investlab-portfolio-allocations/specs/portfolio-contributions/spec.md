## ADDED Requirements

### Requirement: Contribution configuration on PortfolioItem

The system SHALL extend PortfolioItem with optional contribution fields: contributionType ('weekly' | 'monthly' | 'annual', nullable), contributionAmount (number, nullable). Both must be set together or both null.

#### Scenario: Set weekly contribution
- **WHEN** a PortfolioItem is updated with contributionType "weekly" and contributionAmount 50
- **THEN** the item stores the contribution config

#### Scenario: Clear contribution
- **WHEN** a PortfolioItem contribution is cleared (both fields set to null)
- **THEN** contributionType and contributionAmount are both null

#### Scenario: Partial contribution config rejected
- **WHEN** contributionType is set but contributionAmount is null
- **THEN** `Err<ValidationError>` is returned

### Requirement: Contribution normalization

The system SHALL calculate normalized monthly and annual contribution from the configured type and amount. Weekly: monthly = amount x 4.33, annual = amount x 52. Monthly: monthly = amount, annual = amount x 12. Annual: monthly = amount / 12, annual = amount. Items without contribution config return 0.

#### Scenario: Normalize weekly contribution
- **WHEN** item has contributionType "weekly" and contributionAmount 100
- **THEN** monthlyContribution = 433 and annualContribution = 5200

#### Scenario: Normalize monthly contribution
- **WHEN** item has contributionType "monthly" and contributionAmount 200
- **THEN** monthlyContribution = 200 and annualContribution = 2400

#### Scenario: Normalize annual contribution
- **WHEN** item has contributionType "annual" and contributionAmount 1200
- **THEN** monthlyContribution = 100 and annualContribution = 1200

#### Scenario: No contribution configured
- **WHEN** item has no contribution config (both null)
- **THEN** monthlyContribution = 0 and annualContribution = 0

### Requirement: AllocationConfig entity

The system SHALL model AllocationConfig as an entity with: id (UUID), targetRvPercent (number, 0-100), targetRfPercent (derived: 100 - targetRvPercent), monthlyIncome (optional number), investmentPercent (optional number, 0-100). Single row per user.

#### Scenario: Create default config
- **WHEN** AllocationConfig is created with targetRvPercent 80
- **THEN** targetRfPercent is 20, monthlyIncome and investmentPercent are null

#### Scenario: Invalid targetRvPercent
- **WHEN** AllocationConfig is created with targetRvPercent 150
- **THEN** `Err<ValidationError>` is returned

### Requirement: RF/RV distribution calculation

The system SHALL calculate actual RF vs RV split from portfolio items and their instruments. AssetClass mapping to RF/RV: fixed_income → RF; equity, commodity, crypto → RV. The result SHALL include actual percentages and comparison against AllocationConfig target.

#### Scenario: Calculate actual split
- **WHEN** portfolio has equity items worth 8000 and fixed_income items worth 2000
- **THEN** actual RV = 80%, actual RF = 20%

#### Scenario: Compare against target
- **WHEN** actual split is 75% RV / 25% RF and target is 80% RV / 20% RF
- **THEN** distribution shows RV is 5% under target and RF is 5% over target

#### Scenario: Empty portfolio
- **WHEN** no portfolio items exist
- **THEN** actual split returns 0% for both, comparison shows full delta from target

### Requirement: Weight distribution calculation

The system SHALL calculate per-item actual weight as: item.currentValue / totalPortfolioValue x 100. Display alongside targetWeight for comparison.

#### Scenario: Calculate actual weights
- **WHEN** portfolio has 3 items worth 5000, 3000, 2000 (total 10000)
- **THEN** actual weights are 50%, 30%, 20% respectively

#### Scenario: Single item portfolio
- **WHEN** portfolio has 1 item
- **THEN** actual weight is 100%

### Requirement: Total contribution calculation

The system SHALL calculate total monthly contribution and total annual contribution by summing normalized contributions across all portfolio items.

#### Scenario: Sum contributions
- **WHEN** 3 items have monthly contributions of 100, 200, 150
- **THEN** total monthly = 450, total annual = 5400

### Requirement: Allocation config persistence

The system SHALL define an `allocation_config` table: `id` (UUID PK), `target_rv_percent` (NUMERIC 5,2, NOT NULL, default 80), `target_rf_percent` (NUMERIC 5,2, NOT NULL, default 20), `monthly_income` (NUMERIC 10,2, nullable), `investment_percent` (NUMERIC 5,2, nullable).

#### Scenario: Table schema
- **WHEN** the allocation_config table is inspected
- **THEN** it has the specified columns with correct types and defaults

### Requirement: Portfolio items contribution columns

The system SHALL add columns to `portfolio_items`: `contribution_type` (VARCHAR 10, nullable), `contribution_amount` (NUMERIC 10,2, nullable).

#### Scenario: Migration adds columns
- **WHEN** the migration runs
- **THEN** portfolio_items gains contribution_type and contribution_amount columns, both nullable

### Requirement: Allocations route and dashboard

The system SHALL render a `/portfolio/allocations` route with: RF/RV bar or donut chart (actual vs target), per-asset-class breakdown, contribution summary (total monthly, total annual, per-item), weight comparison table (instrument, target %, actual %, delta %). Global config form for RF/RV target and income data.

#### Scenario: View allocations dashboard
- **WHEN** user navigates to `/portfolio/allocations`
- **THEN** dashboard displays RF/RV chart, contribution totals, and weight comparison

#### Scenario: Configure RF/RV target
- **WHEN** user sets target to 70% RV / 30% RF
- **THEN** config is saved and chart updates to reflect new target

#### Scenario: Edit item contribution
- **WHEN** user sets a portfolio item's contribution to weekly / 75
- **THEN** the item's contribution is saved and totals recalculate
