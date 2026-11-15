## MODIFIED Requirements

### Requirement: Pinned validator version SHALL be auto-maintained by Renovate

`renovate.json` SHALL include custom (regex) managers that match the `pnpx --package <pkg>@<ver> <cmd>` invocation form so Renovate bumps the pinned `renovate` version used by the validator. The `managerFilePatterns` of those managers SHALL cover the validator workflow file(s) under `.github/workflows/` and `lint-staged.config.ts`. The same managers SHALL also match the `pnpx <pkg>@<ver>` form.

#### Scenario: Custom manager matches the --package form

- **WHEN** `renovate.json` is inspected
- **THEN** custom managers exist whose `matchStrings` capture `depName` and `currentValue` from `pnpx --package <pkg>@<ver>`
- **AND** their `managerFilePatterns` include the validator workflow path and `lint-staged.config.ts`

#### Scenario: Custom manager matches the bare form

- **WHEN** `renovate.json` is inspected
- **THEN** the same custom managers capture `depName` and `currentValue` from `pnpx <pkg>@<ver>`

#### Scenario: Renovate proposes a validator bump

- **WHEN** a newer `renovate` version is published upstream
- **THEN** Renovate opens a PR updating the pinned `renovate@<ver>` in both the workflow and `lint-staged.config.ts`
