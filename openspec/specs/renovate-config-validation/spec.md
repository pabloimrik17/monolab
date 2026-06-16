# renovate-config-validation Specification

## Purpose
TBD - created by archiving change switch-renovate-best-practices. Update Purpose after archive.
## Requirements
### Requirement: CI SHALL validate Renovate config on pull requests

A GitHub Actions workflow SHALL run `renovate-config-validator` against the repository's Renovate config files. The workflow SHALL be triggered only when a Renovate config file changes (a `pull_request` `paths` filter covering `renovate.json`, `renovate.json5`, `.renovaterc*`, and `.github/renovate.json*`). The validator SHALL be invoked with a pinned Renovate version (no floating `npx renovate-config-validator`) and SHALL run in `--strict` mode. Action `uses:` references in the workflow SHALL be SHA-pinned per the `ci-github-actions-pinning` capability.

#### Scenario: Validator workflow runs on renovate config change

- **WHEN** a pull request modifies `renovate.json`
- **THEN** the `renovate-config-validator` workflow runs and invokes the validator with `--strict`

#### Scenario: Validator workflow skipped on unrelated changes

- **WHEN** a pull request modifies only source files (no Renovate config file)
- **THEN** the `renovate-config-validator` workflow does NOT run

#### Scenario: Validator version is pinned

- **WHEN** the validator workflow is inspected
- **THEN** the Renovate version is pinned to an explicit `renovate@<version>` (not a floating or implicit-latest reference)

#### Scenario: Invalid config fails the workflow

- **WHEN** a pull request introduces an invalid Renovate config (e.g., unknown option or malformed JSON)
- **THEN** the validator exits non-zero and the workflow fails

### Requirement: Pre-commit SHALL validate Renovate config via Husky/lint-staged

The repository's lint-staged configuration (`lint-staged.config.ts`) SHALL run `renovate-config-validator` when a Renovate config file is staged, using the same pinned Renovate version as CI. The validator entry SHALL be scoped to Renovate config files so it does NOT run when unrelated files are staged. No `.pre-commit-config.yaml` / prek tooling SHALL be introduced.

#### Scenario: Validator runs when renovate config is staged

- **WHEN** `renovate.json` is staged and a commit is attempted
- **THEN** lint-staged runs `renovate-config-validator` against the Renovate config

#### Scenario: Validator skipped for unrelated staged files

- **WHEN** only non-Renovate files are staged for commit
- **THEN** the `renovate-config-validator` lint-staged entry does NOT execute

#### Scenario: No prek tooling added

- **WHEN** the repository is inspected after the change
- **THEN** no `.pre-commit-config.yaml` exists and the pre-commit gate is provided by Husky + lint-staged

### Requirement: Pinned validator version SHALL be auto-maintained by Renovate

`renovate.json` SHALL include a custom (regex) manager that matches the `pnpm dlx --package <pkg>@<ver> <cmd>` invocation form so Renovate bumps the pinned `renovate` version used by the validator. The manager `managerFilePatterns` SHALL cover the validator workflow file(s) under `.github/workflows/` and `lint-staged.config.ts`. The existing custom manager that matches `pnpm dlx|bunx|npx <pkg>@<ver>` SHALL be retained (the new manager complements, not replaces, it).

#### Scenario: Custom manager matches the --package form

- **WHEN** `renovate.json` is inspected
- **THEN** a custom manager exists whose `matchStrings` capture `depName` and `currentValue` from `pnpm dlx --package <pkg>@<ver>`
- **AND** its `managerFilePatterns` includes the validator workflow path and `lint-staged.config.ts`

#### Scenario: Renovate proposes a validator bump

- **WHEN** a newer `renovate` version is published upstream
- **THEN** Renovate opens a PR updating the pinned `renovate@<ver>` in both the workflow and `lint-staged.config.ts`

### Requirement: Validator SHALL pass on the migrated config before merge

The migrated `renovate.json` SHALL pass `renovate-config-validator --strict` with zero errors before the change is merged.

#### Scenario: Migrated config is valid

- **WHEN** `renovate-config-validator --strict` is run against the migrated `renovate.json`
- **THEN** it reports no errors and exits zero

