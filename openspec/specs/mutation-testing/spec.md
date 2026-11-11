# mutation-testing Specification

## Purpose
TBD - created by archiving change add-mutation-testing. Update Purpose after archive.

## Requirements

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

The system SHALL upload mutation testing reports to Stryker Dashboard with per-package module tracking for monorepo visibility. Uploads SHALL happen on pushes to main and develop only, so pull request runs never overwrite branch reports.

#### Scenario: Dashboard configured in base config

- **WHEN** base configuration is loaded
- **THEN** dashboard project and baseUrl are configured
- **AND** version is set to current branch name
- **AND** the dashboard reporter is enabled when the dashboard API key is present

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

#### Scenario: Pull request run

- **WHEN** mutation testing runs on a pull request
- **THEN** no report is uploaded to the dashboard

### Requirement: CI Integration

The system SHALL run mutation testing in CI on pull requests, for the affected packages that have a Stryker configuration, and on pushes to main and develop, for every such package. A run below a package's break threshold SHALL fail CI.

#### Scenario: Pull request with mutation testing

- **WHEN** pull request CI runs
- **THEN** mutation testing runs on the affected packages that have a Stryker configuration
- **AND** uses the incremental cache restored from the branch or, failing that, from develop
- **AND** a package scoring below its break threshold fails the run

#### Scenario: Push to develop with mutation testing

- **WHEN** code is pushed to develop branch
- **THEN** mutation testing runs on all packages
- **AND** uses incremental cache from previous runs

#### Scenario: Push to main with mutation testing

- **WHEN** code is pushed to main branch
- **THEN** mutation testing runs on all packages
- **AND** enforces mutation score thresholds

### Requirement: Mutation Score Target and Floors

The system SHALL enforce mutation score thresholds that follow the test policy's target: break at 80, low at 80 and high at 90 by default. A package scoring below 80 SHALL set its break and low thresholds to its measured score rounded down to a multiple of 5. Its thresholds SHALL NOT be lowered, and SHALL be raised when its score passes the next multiple of 5.

#### Scenario: Package meeting the target

- **WHEN** mutation testing runs on a package whose score is 90.9%, such as react-clean
- **THEN** high threshold is 90%, low is 80%, break is 80%
- **AND** build fails if mutation score < 80%

#### Scenario: Package below the target

- **WHEN** mutation testing runs on a package whose score is 76.1%, such as qup-domain
- **THEN** low and break thresholds are 75%
- **AND** build fails if mutation score < 75%

#### Scenario: Thresholds only rise

- **WHEN** a package below the target scores 81% on develop
- **THEN** its break and low thresholds are raised to 80% in the next change that touches its Stryker configuration

### Requirement: Mutation runs over every non-e2e test

Stryker SHALL run every Vitest project of a package except e2e, so a mutant in a use case or adapter can be killed by an integration or integration-platform test. Test files of every kind, legacy tests included, SHALL be excluded from mutation.

#### Scenario: Use case covered only by integration tests

- **WHEN** Stryker mutates a use case whose only tests are integration tests
- **THEN** those integration tests run against the mutant and can kill it

#### Scenario: Test files are never mutated

- **WHEN** Stryker collects files to mutate
- **THEN** `*.test.*`, `*.legacy.test.*`, `*.integration.*`, `*.integration-platform.*` and `*.test-d.ts` files are excluded
