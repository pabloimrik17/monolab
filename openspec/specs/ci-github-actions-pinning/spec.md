# ci-github-actions-pinning Specification

## Purpose
TBD - created by archiving change bump-nx-set-shas-v5-pinned. Update Purpose after archive.
## Requirements
### Requirement: All GitHub Actions SHALL be pinned to commit SHA

Every `uses:` reference to a GitHub Action in `.github/workflows/**/*.yml` SHALL use a 40-character commit SHA as the ref, followed by a `# vX.Y.Z` comment with the human-readable semver version. The rule applies equally to third-party actions (`nrwl/*`, `pnpm/*`, `codecov/*`, etc.) and to official GitHub actions (`actions/*`).

#### Scenario: Pinned third-party action passes review

- **WHEN** a workflow contains `uses: nrwl/nx-set-shas@afb73a62d26e41464e9254689e1fd6122ee683c1 # v5.0.1`
- **THEN** the reference is valid and the human-readable version is documented in the comment

#### Scenario: Pinned official GitHub action passes review

- **WHEN** a workflow contains `uses: actions/checkout@<40-char-sha> # v4.2.2`
- **THEN** the reference is valid; there is no carve-out for `actions/*`

#### Scenario: Mutable tag on any action is rejected

- **WHEN** a workflow contains `uses: codecov/codecov-action@v5` or `uses: actions/checkout@v4` (without a SHA)
- **THEN** it is considered non-conformant and must be converted to SHA-pinned with a `# vX.Y.Z` comment

### Requirement: Renovate SHALL maintain pinned action SHAs automatically

`renovate.json` SHALL include the `helpers:pinGitHubActionDigestsToSemver` preset (or equivalent) in the `extends` array, so that Renovate:

- Pins to a SHA any new action that appears with a major/minor tag (including `actions/*`)
- Updates the pinned SHA when a new version is published, keeping the `# vX.Y.Z` comment up to date
- Generates separate PRs by update type (patch/minor/major), respecting the existing `packageRules`

`renovate.json` SHALL NOT contain `packageRules` that set `pinDigests: false` for `actions/*` or other owners.

#### Scenario: Renovate config includes the pin preset

- **WHEN** `renovate.json` is inspected
- **THEN** the `extends` array contains `"helpers:pinGitHubActionDigestsToSemver"` and there are no `packageRules` excluding `actions/*` from pinning

#### Scenario: Renovate updates a pinned SHA

- **WHEN** `nrwl/nx-set-shas@v5.0.2` is published upstream
- **THEN** Renovate opens a PR that replaces the current SHA and updates the comment to `# v5.0.2` without losing the formatting

### Requirement: Renovate SHALL stagger PR creation across update types

`renovate.json` SHALL define separate schedules by `matchUpdateTypes` to avoid PR spikes when cycles coincide:

- `patch` → first day of the month
- `minor` → day 8 of the month every 2 months
- `major` → day 15 of the month every 3 months

Additionally, `minimumReleaseAge` SHALL be at least `14 days` to reduce exposure to recently published, compromised packages.

#### Scenario: Schedules are staggered

- **WHEN** `renovate.json` is inspected
- **THEN** the `packageRules` with `matchUpdateTypes: ["patch"|"minor"|"major"]` have distinct `schedule` values by day/month

#### Scenario: Release age window enforced

- **WHEN** a new version of a package is published
- **AND** fewer than 14 days have passed since publication
- **THEN** Renovate does NOT open a PR for that version until the window is met (except for vulnerabilities covered by `:enableVulnerabilityAlertsWithLabel(security)`)

### Requirement: nx-set-shas SHALL run on Node 24 runtime

The `Set Nx SHA` step in `.github/workflows/ci.yml` SHALL use `nrwl/nx-set-shas` pinned to a 40-character commit SHA with a `# vX.Y.Z` comment, running on the runner already configured with Node 24.12.0.

#### Scenario: CI step runs successfully on v5

- **WHEN** the `main` job in the CI workflow runs
- **THEN** the `Set Nx SHA` step completes without error and exports `NX_BASE` and `NX_HEAD` for the subsequent `nx affected` steps
