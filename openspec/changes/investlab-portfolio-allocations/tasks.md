## 1. Domain

- [ ] 1.1 Add contributionType and contributionAmount fields to PortfolioItem entity — both optional, validated together (both set or both null)
- [ ] 1.2 Implement contribution normalization logic — monthlyContribution(), annualContribution() methods on PortfolioItem
- [ ] 1.3 Define `AllocationConfig` entity — targetRvPercent, targetRfPercent (derived), monthlyIncome, investmentPercent. `create()` validates targetRvPercent 0-100
- [ ] 1.4 Define `AllocationConfigRepository` interface — save, get (single row), update. Returns `ResultAsync`
- [ ] 1.5 Implement `AllocationCalculator` domain service — calculateActualRfRvSplit (map fixed_income → RF; equity/commodity/crypto → RV), calculateWeightDistribution, calculateTotalContributions. Pure functions
- [ ] 1.6 Define tokens for AllocationConfigRepository, AllocationCalculator, and new use cases
- [ ] 1.7 Implement `UpdateContributionUseCase` (@injectable) — update contribution config on portfolio item
- [ ] 1.8 Implement `GetAllocationConfigUseCase` (@injectable) — returns config, creates default if none exists
- [ ] 1.9 Implement `UpdateAllocationConfigUseCase` (@injectable) — updates RF/RV target and income data
- [ ] 1.10 Implement `GetAllocationOverviewUseCase` (@injectable) — aggregates: actual RF/RV split, weight distribution, contribution totals, config comparison
- [ ] 1.11 Write unit tests for contribution normalization — weekly, monthly, annual, null
- [ ] 1.12 Write unit tests for AllocationCalculator — RF/RV split, weight distribution, totals
- [ ] 1.13 Write unit tests for use cases with mock repos
- [ ] 1.14 Export new public API from domain index.ts

## 2. Data

- [ ] 2.1 Add contribution_type and contribution_amount columns to portfolio_items schema
- [ ] 2.2 Define Drizzle schema: `allocation_config` table
- [ ] 2.3 Generate migration for new columns and new table
- [ ] 2.4 Update PortfolioItem toDomain/toRow mappers for contribution fields
- [ ] 2.5 Implement `PgAllocationConfigRepository` (@injectable) with Drizzle queries
- [ ] 2.6 Update portfolioDataModule with AllocationConfigRepository binding
- [ ] 2.7 Export updated API from data index.ts

## 3. UI

- [ ] 3.1 Create `/portfolio/allocations` route in `apps/investlab`
- [ ] 3.2 Implement `AllocationDashboard` component — layout for charts, contributions, weight table
- [ ] 3.3 Implement `RfRvChart` component — bar or donut chart showing actual vs target RF/RV split
- [ ] 3.4 Implement `WeightComparison` component — table with instrument, target %, actual %, delta %
- [ ] 3.5 Implement `ContributionSummary` component — total monthly, total annual, per-item breakdown
- [ ] 3.6 Implement `AllocationConfigForm` component — RF/RV target slider, monthly income, investment % inputs
- [ ] 3.7 Implement `ContributionForm` component — per-item contribution type selector and amount input
- [ ] 3.8 Implement `AllocationViewModel` — loads overview data, handles config and contribution updates
- [ ] 3.9 Wire new modules in app composition root
- [ ] 3.10 Add navigation link to /portfolio/allocations in portfolio layout

## 4. Calculations

- [ ] 4.1 Verify contribution normalization accuracy — weekly x 4.33, weekly x 52, monthly x 12, annual / 12
- [ ] 4.2 Verify RF/RV split correctly maps asset classes — equity/commodity/crypto → RV, fixed_income → RF
- [ ] 4.3 Verify weight percentages sum to 100% (or handle rounding)
- [ ] 4.4 Verify total contributions aggregate correctly across all items

## 5. Verification

- [ ] 5.1 Verify `nx run investlab-domain:build` succeeds with new allocation types
- [ ] 5.2 Verify `nx run investlab-data:build` succeeds with new schema
- [ ] 5.3 Verify `nx run investlab-domain:test` passes — contribution, allocation calculator tests
- [ ] 5.4 Verify `nx run investlab:build` succeeds with new route
- [ ] 5.5 Manual test: set contributions, view allocation dashboard, configure RF/RV target
