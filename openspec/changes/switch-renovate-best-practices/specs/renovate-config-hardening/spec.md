## ADDED Requirements

### Requirement: Base preset SHALL be config:best-practices

`renovate.json` SHALL extend `config:best-practices` as its base preset and SHALL NOT list `config:recommended` separately in `extends` (it is included transitively by `config:best-practices`).

#### Scenario: best-practices is the base preset

- **WHEN** `renovate.json` is inspected
- **THEN** the `extends` array contains `"config:best-practices"`
- **AND** the `extends` array does NOT contain `"config:recommended"`

### Requirement: Redundant subsumed presets and keys SHALL be removed

The `extends` array SHALL NOT list presets already bundled by `config:best-practices`, and `renovate.json` SHALL NOT set top-level keys that the preset already sets. Specifically, `helpers:pinGitHubActionDigestsToSemver` SHALL NOT appear explicitly in `extends`, and `configMigration: true` SHALL NOT be set explicitly (both are provided by `config:best-practices`).

#### Scenario: Action-digest pin preset is not duplicated

- **WHEN** `renovate.json` is inspected
- **THEN** `"helpers:pinGitHubActionDigestsToSemver"` does NOT appear as an explicit entry in `extends`
- **AND** action-digest pinning behavior is still active via `config:best-practices`

#### Scenario: configMigration not set explicitly

- **WHEN** `renovate.json` is inspected
- **THEN** the top-level `configMigration` key is absent (its `true` value comes from `config:best-practices`)

### Requirement: Hardening presets SHALL be enabled

`renovate.json` `extends` SHALL include `security:openssf-scorecard`, `docker:enableMajor`, `customManagers:githubActionsVersions`, `customManagers:dockerfileVersions`, and `:maintainLockFilesWeekly`. `renovate.json` SHALL NOT include `:enablePreCommit` while the repository has no `.pre-commit-config.yaml` (the repo uses Husky + lint-staged, making the preset inert).

#### Scenario: Hardening presets present

- **WHEN** `renovate.json` is inspected
- **THEN** `extends` contains `"security:openssf-scorecard"`, `"docker:enableMajor"`, `"customManagers:githubActionsVersions"`, `"customManagers:dockerfileVersions"`, and `":maintainLockFilesWeekly"`

#### Scenario: enablePreCommit omitted absent a pre-commit config

- **WHEN** the repository contains no `.pre-commit-config.yaml`
- **THEN** `renovate.json` `extends` does NOT contain `":enablePreCommit"`

### Requirement: Existing vulnerability-alert and repo presets SHALL be preserved

`renovate.json` `extends` SHALL retain `:enableVulnerabilityAlertsWithLabel(security)`, `:dependencyDashboard` (or its transitive equivalent), and `:semanticCommits`, and SHALL retain repo-specific top-level settings `rangeStrategy: "pin"`, `baseBranchPatterns`, `reviewers`, `labels`, `timezone`, and the existing `packageRules` and `customManagers`.

#### Scenario: Vulnerability alerts remain enabled

- **WHEN** `renovate.json` is inspected
- **THEN** `extends` contains `":enableVulnerabilityAlertsWithLabel(security)"`

#### Scenario: Repo-specific settings untouched

- **WHEN** `renovate.json` is inspected after the migration
- **THEN** `rangeStrategy` is `"pin"`, `baseBranchPatterns` is `["develop"]`, and the existing patch/minor/major `packageRules` schedules are unchanged

### Requirement: Vulnerability PRs SHALL be exempt from global throttling

`renovate.json` SHALL define a `vulnerabilityAlerts` object with `prHourlyLimit: 0` and `prConcurrentLimit: 0` so that security-update PRs are not rate-limited behind routine update PRs. The global `prHourlyLimit` / `prConcurrentLimit` SHALL remain in effect for non-vulnerability PRs.

#### Scenario: vulnerabilityAlerts overrides global limits

- **WHEN** `renovate.json` is inspected
- **THEN** `vulnerabilityAlerts.prHourlyLimit` is `0` and `vulnerabilityAlerts.prConcurrentLimit` is `0`

#### Scenario: Global limits unchanged for routine PRs

- **WHEN** `renovate.json` is inspected
- **THEN** top-level `prHourlyLimit` and `prConcurrentLimit` retain their existing values (`2` and `10`)
