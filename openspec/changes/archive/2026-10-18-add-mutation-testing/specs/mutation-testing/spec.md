# Mutation Testing Specification

## ADDED Requirements

### Requirement: Stryker Integration

The system SHALL integrate Stryker mutation testing framework with the existing Vitest test infrastructure to validate test quality beyond code coverage.

#### Scenario: Mutation testing executable via Nx

- **WHEN** developer runs `nx run @monolab/is-odd:test:mutation`
- **THEN** Stryker executes mutation testing for that package
- **AND** results are displayed in terminal

#### Scenario: Mutation testing on all packages

- **WHEN** developer runs `nx run-many -t test:mutation`
- **THEN** Stryker executes mutation testing for all packages
- **AND** respects dependency graph order

#### Scenario: Affected packages only

- **WHEN** developer runs `nx affected -t test:mutation`
- **THEN** Stryker executes only on packages affected by code changes

### Requirement: Shared Configuration with Overrides

The system SHALL provide a base Stryker configuration that all packages extend, with ability to override settings per package.

#### Scenario: Base configuration applied

- **WHEN** package uses default configuration
- **THEN** settings from `stryker.config.base.ts` are applied
- **AND** includes testRunner, reporters, incremental mode, and default thresholds

#### Scenario: Package-specific overrides

- **WHEN** package defines `stryker.config.ts` with custom thresholds
- **THEN** package-specific thresholds override base configuration
- **AND** other base settings remain intact

#### Scenario: Mutation patterns per package

- **WHEN** package specifies `mutate` patterns in config
- **THEN** Stryker only mutates files matching those patterns
- **AND** excludes test files from mutation

### Requirement: Incremental Mode with Caching

The system SHALL use Stryker's incremental mode to cache mutation results and only re-test changed code.

#### Scenario: First run without cache

- **WHEN** mutation testing runs for the first time
- **THEN** Stryker tests all mutants
- **AND** stores results in `reports/stryker-incremental.json`

#### Scenario: Subsequent run with unchanged code

- **WHEN** mutation testing runs and code hasn't changed
- **THEN** Stryker reuses cached results
- **AND** execution completes quickly without retesting

#### Scenario: Subsequent run with code changes

- **WHEN** mutation testing runs and code has changed
- **THEN** Stryker only tests mutants in changed files
- **AND** reuses cached results for unchanged files

### Requirement: CI Integration on Main Branches

The system SHALL run mutation testing in CI only on pushes to main and develop branches, not on pull requests.

#### Scenario: Pull request without mutation testing

- **WHEN** pull request CI runs
- **THEN** mutation testing is skipped
- **AND** PR feedback remains fast

#### Scenario: Push to develop with mutation testing

- **WHEN** code is pushed to develop branch
- **THEN** mutation testing runs on all packages
- **AND** uses incremental cache from previous runs

#### Scenario: Push to main with mutation testing

- **WHEN** code is pushed to main branch
- **THEN** mutation testing runs on all packages
- **AND** enforces mutation score thresholds

### Requirement: GitHub Actions Cache Strategy

The system SHALL cache Stryker incremental files between CI runs using GitHub Actions cache with appropriate fallback strategy.

#### Scenario: Cache hit on same branch

- **WHEN** CI runs on same branch with same dependencies
- **THEN** exact cache is restored from previous run
- **AND** Stryker uses cached results

#### Scenario: Cache fallback to same branch

- **WHEN** CI runs on same branch with different dependencies
- **THEN** cache from same branch (different dependency hash) is restored
- **AND** Stryker still benefits from incremental mode

#### Scenario: Cache fallback to develop

- **WHEN** CI runs on new feature branch without cache
- **THEN** cache from develop branch is restored
- **AND** provides baseline for incremental testing

#### Scenario: Cache fallback to any branch

- **WHEN** no cache exists for branch or develop
- **THEN** cache from any recent branch is restored
- **AND** Stryker detects code differences automatically

### Requirement: Mutation Score Thresholds

The system SHALL enforce mutation score thresholds that vary by package type and complexity.

#### Scenario: Utility package thresholds

- **WHEN** mutation testing runs on utility packages (is-even, is-odd)
- **THEN** high threshold is 90%, low is 75%, break is 75%
- **AND** build fails if mutation score < 75%

#### Scenario: React package thresholds

- **WHEN** mutation testing runs on React packages (react-hooks, react-clean)
- **THEN** high threshold is 80%, low is 65%, break is 60%
- **AND** build fails if mutation score < 60%

#### Scenario: Config package thresholds

- **WHEN** mutation testing runs on config packages (ts-configs)
- **THEN** high threshold is 70%, low is 50%, break is 50%
- **AND** build fails if mutation score < 50%

### Requirement: Report Generation

The system SHALL generate mutation testing reports in multiple formats for different consumption scenarios.

#### Scenario: HTML report for local viewing

- **WHEN** mutation testing completes
- **THEN** HTML report is generated in `reports/mutation/index.html`
- **AND** developer can open it with `nx run <package>:test:mutation:report`

#### Scenario: JSON report for tooling

- **WHEN** mutation testing completes
- **THEN** JSON report is generated in `reports/mutation-report.json`
- **AND** contains machine-readable mutation scores

#### Scenario: Terminal output

- **WHEN** mutation testing runs
- **THEN** progress and clear-text results display in terminal
- **AND** shows mutation score summary

### Requirement: Generated Files Exclusion

The system SHALL exclude Stryker generated files from linters, formatters, and version control.

#### Scenario: Git ignores reports

- **WHEN** Stryker generates reports
- **THEN** reports are listed in `.gitignore`
- **AND** not committed to repository

#### Scenario: Linters skip reports

- **WHEN** ESLint or Prettier runs
- **THEN** reports directory is ignored
- **AND** linting performance is not impacted

#### Scenario: Reports excluded from formatters

- **WHEN** Prettier runs
- **THEN** mutation reports are listed in `.prettierignore`
- **AND** formatting does not process report files

### Requirement: Documentation

The system SHALL document mutation testing usage, interpretation, and CI behavior.

#### Scenario: Root README includes mutation testing

- **WHEN** developer reads root README
- **THEN** mutation testing commands are documented
- **AND** explains when tests run in CI

#### Scenario: Mutation score interpretation documented

- **WHEN** developer views mutation testing documentation
- **THEN** score ranges are explained (high/medium/low)
- **AND** provides guidance on improving scores

#### Scenario: Per-package configuration documented

- **WHEN** developer reviews package-specific thresholds
- **THEN** rationale for threshold values is documented
- **AND** explains differences between package types

### Requirement: Dashboard Integration

The system SHALL upload mutation testing reports to Stryker Dashboard with per-package module tracking for monorepo visibility.

#### Scenario: Dashboard configured in base config

- **WHEN** base configuration is loaded
- **THEN** dashboard project and baseUrl are configured
- **AND** version is set to current branch name

#### Scenario: Per-package module identifier

- **WHEN** package runs mutation testing
- **THEN** results upload with package-specific module name
- **AND** dashboard separates reports by module

#### Scenario: Combined dashboard view

- **WHEN** all packages complete mutation testing
- **THEN** dashboard aggregates module reports into project view
- **AND** shows overall mutation score across all packages

#### Scenario: Per-module badges available

- **WHEN** mutation testing completes and uploads to dashboard
- **THEN** global badge URL shows combined mutation score
- **AND** per-module badge URLs show individual package scores

#### Scenario: Branch-specific reporting

- **WHEN** mutation testing runs on develop branch
- **THEN** results upload with version="develop"
- **AND** dashboard tracks scores per branch over time
