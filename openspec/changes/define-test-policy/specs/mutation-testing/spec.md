# Spec Delta

## REMOVED Requirements

### Requirement: CI Integration on Main Branches

**Reason**: Mutation testing now gates pull requests too, so a requirement that skips it on pull requests no longer holds.

**Migration**: Replaced by "CI Integration" (added below), which runs mutation on the affected packages of a pull request and on every package on pushes to main and develop.

### Requirement: Mutation Score Thresholds

**Reason**: Thresholds no longer vary by package type. Every package follows the test policy's target, with floors for packages below it.

**Migration**: Replaced by "Mutation Score Target and Floors" (added below). Packages drop their per-type overrides; qup-domain and solid-clean keep a floor of 75.

## MODIFIED Requirements

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

## ADDED Requirements

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
