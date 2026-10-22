## ADDED Requirements

### Requirement: OSV vulnerability alerts SHALL be enabled

`renovate.json` SHALL set top-level `osvVulnerabilityAlerts` to `true` so Renovate opens fix PRs from the OSV feed independently of Dependabot alerts.

#### Scenario: OSV alerts on

- **WHEN** `renovate.json` is inspected
- **THEN** `osvVulnerabilityAlerts` is `true`
- **AND** `renovate-config-validator --strict` passes

### Requirement: npm major and minor updates SHALL wait 14 days

`renovate.json` SHALL keep the top-level `minimumReleaseAge` at `"14 days"` and SHALL define a `packageRules` entry matching `matchDatasources: ["npm"]` and `matchUpdateTypes: ["major", "minor"]` with `minimumReleaseAge: "14 days"`, overriding the 3-day npm rule of `security:minimumReleaseAgeNpm`. The rule SHALL NOT match `pin`, `replacement`, `bump`, `lockfileUpdate`, `rollback` or `lockFileMaintenance` updates.

#### Scenario: npm major and minor keep 14 days

- **WHEN** Renovate resolves the age for an npm `major` or `minor` update
- **THEN** the effective `minimumReleaseAge` is `"14 days"`

#### Scenario: Unverifiable-age updates stay exempt

- **WHEN** Renovate resolves the age for an npm `pin`, `replacement` or `lockfileUpdate` update
- **THEN** no `minimumReleaseAge` applies

### Requirement: Patch updates SHALL wait 3 days

`renovate.json` SHALL define a `packageRules` entry with `matchUpdateTypes: ["patch"]` and `minimumReleaseAge: "3 days"`, without a datasource filter.

#### Scenario: Patch age on any datasource

- **WHEN** Renovate resolves the age for a `patch` update on npm, docker or github-actions
- **THEN** the effective `minimumReleaseAge` is `"3 days"`

### Requirement: Vulnerability fixes SHALL bypass Renovate's release age

`renovate.json` SHALL NOT set `minimumReleaseAge` inside `vulnerabilityAlerts`, so vulnerability-fix PRs skip Renovate's age and wait only for the package manager's age.

#### Scenario: Fix PR not held by Renovate

- **WHEN** Renovate resolves the age for a vulnerability-fix update
- **THEN** no Renovate `minimumReleaseAge` applies

### Requirement: Renovate age SHALL NOT be below the package manager age

Every non-null `minimumReleaseAge` in `renovate.json` SHALL be greater than or equal to the `minimumReleaseAge` in `pnpm-workspace.yaml`.

#### Scenario: Renovate ages cover pnpm's age

- **WHEN** the smallest `minimumReleaseAge` in `renovate.json` (3 days) is compared with `pnpm-workspace.yaml` `minimumReleaseAge` (1440 minutes)
- **THEN** the Renovate value is greater than or equal to the pnpm value
