# Spec Delta

## Purpose

Defines how the CI workflow splits its work into parallel jobs and exposes one stable check that branch protection can require.

## ADDED Requirements

### Requirement: Checks run in parallel jobs

The CI workflow SHALL run its checks in separate jobs that start at the same time: a lint job (workspace integrity, export checks, config checks, OpenSpec validation, lint and the fallow audit), a tests job (every test target, type checks and coverage artifacts) and a build job (build, bundle analysis and mutation testing).

#### Scenario: Pull request run

- **WHEN** a pull request triggers CI
- **THEN** the lint, tests and build jobs start without waiting for each other
- **AND** each job runs the affected variant of its targets

#### Scenario: Push run

- **WHEN** a push to `main`, `pre` or `develop` triggers CI
- **THEN** the same three jobs start in parallel
- **AND** each job runs its targets for every project

### Requirement: A single main check gates merges

The workflow SHALL end with a job named `main` that depends on every check job and succeeds only when all of them succeed, so the branch-protection ruleset requires one stable check whatever the job layout.

#### Scenario: Every job passes

- **WHEN** the lint, tests and build jobs succeed
- **THEN** the `main` job succeeds

#### Scenario: One job fails

- **WHEN** any of the lint, tests or build jobs fails or is cancelled
- **THEN** the `main` job fails
- **AND** the pull request cannot be merged under the protected-branch ruleset

### Requirement: Coverage uploads come from the tests job

The `upload-codecov` job SHALL depend on the tests job and SHALL take its coverage and test-result artifacts and its package matrix from it.

#### Scenario: Pull request touching a covered package

- **WHEN** a pull request changes a package that produces coverage
- **THEN** `upload-codecov` runs after the tests job with a matrix entry for that package

#### Scenario: Pull request touching no covered package

- **WHEN** a pull request changes only docs, OpenSpec or plugin prompts
- **THEN** the tests job emits an empty matrix and `upload-codecov` is skipped

### Requirement: CI steps without a purpose are absent

The workflow SHALL NOT contain debug-only steps, caches for tools no project uses, or two caches for the same dependencies.

#### Scenario: Workflow inspection

- **WHEN** `.github/workflows/ci.yml` is read
- **THEN** it has no step that only prints variables, no `~/.cache/Cypress` cache path and no `NX_NO_CLOUD` switch
- **AND** dependencies are cached once, either as the pnpm store or as `node_modules`, not both
