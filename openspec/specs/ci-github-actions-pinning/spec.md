# ci-github-actions-pinning Specification

## Purpose
TBD - created by archiving change bump-nx-set-shas-v5-pinned. Update Purpose after archive.
## Requirements
### Requirement: All GitHub Actions SHALL be pinned to commit SHA

Toda referencia `uses:` a una GitHub Action en `.github/workflows/**/*.yml` SHALL usar un commit SHA de 40 caracteres como ref, seguido de un comentario `# vX.Y.Z` con la versión semver legible. La regla aplica por igual a actions de terceros (`nrwl/*`, `pnpm/*`, `codecov/*`, etc.) y a las actions oficiales de GitHub (`actions/*`).

#### Scenario: Pinned third-party action passes review

- **WHEN** un workflow contiene `uses: nrwl/nx-set-shas@afb73a62d26e41464e9254689e1fd6122ee683c1 # v5.0.1`
- **THEN** la referencia es válida y la versión legible queda documentada en el comentario

#### Scenario: Pinned official GitHub action passes review

- **WHEN** un workflow contiene `uses: actions/checkout@<40-char-sha> # v4.2.2`
- **THEN** la referencia es válida; no hay carve-out para `actions/*`

#### Scenario: Mutable tag on any action is rejected

- **WHEN** un workflow contiene `uses: codecov/codecov-action@v5` o `uses: actions/checkout@v4` (sin SHA)
- **THEN** se considera no conforme y debe ser convertido a SHA-pinned con comentario `# vX.Y.Z`

### Requirement: Renovate SHALL maintain pinned action SHAs automatically

`renovate.json` SHALL enable pinning of GitHub Action digests to semver, either explicitly via the `helpers:pinGitHubActionDigestsToSemver` preset in `extends`, or transitively by extending `config:best-practices` (which already bundles that preset). The literal string `"helpers:pinGitHubActionDigestsToSemver"` is NOT required to appear explicitly in `extends` when `config:best-practices` is present. In either case, Renovate:

- Pins to SHA any new action that appears with a major/minor tag (including `actions/*`)
- Updates the pinned SHA when a new version is published, keeping the `# vX.Y.Z` comment current
- Generates separate PRs per update type (patch/minor/major) honoring the existing `packageRules`

`renovate.json` SHALL NOT contain `packageRules` that set `pinDigests: false` for `actions/*` or other owners.

#### Scenario: Pin preset enabled via config:best-practices

- **WHEN** `renovate.json` is inspected
- **THEN** `extends` contains `"config:best-practices"` (which provides `helpers:pinGitHubActionDigestsToSemver` transitively)
- **AND** there are no `packageRules` excluding `actions/*` from pinning

#### Scenario: Pin preset enabled explicitly

- **WHEN** a `renovate.json` lists `"helpers:pinGitHubActionDigestsToSemver"` explicitly in `extends`
- **THEN** the reference is still valid and compliant

#### Scenario: Renovate updates a pinned SHA

- **WHEN** `nrwl/nx-set-shas@v5.0.2` is published upstream
- **THEN** Renovate opens a PR replacing the current SHA and updating the comment to `# v5.0.2` without losing the format

### Requirement: Renovate SHALL stagger PR creation across update types

`renovate.json` SHALL define separate schedules per `matchUpdateTypes` to avoid PR spikes when cycles coincide:

- `patch` → first day of the month
- `minor` → 8th day of the month every 2 months
- `major` → 15th day of the month every 3 months

Additionally, the effective `minimumReleaseAge` SHALL be at least `14 days` to reduce exposure to recently published, potentially compromised packages. When extending `config:best-practices`, which bundles `security:minimumReleaseAgeNpm` (a shorter window for npm), the configuration SHALL preserve the 14-day floor for npm packages — that is, the preset SHALL NOT silently lower the npm window below 14 days; if needed, it is re-asserted with a trailing `packageRule` or via the existing top-level `minimumReleaseAge`.

#### Scenario: Schedules are staggered

- **WHEN** `renovate.json` is inspected
- **THEN** the `packageRules` with `matchUpdateTypes: ["patch"|"minor"|"major"]` have distinct `schedule` values by day/month

#### Scenario: Release age window enforced

- **WHEN** a new version of a package is published
- **AND** fewer than 14 days have passed since publication
- **THEN** Renovate does NOT open a PR for that version until the window is met (except vulnerabilities covered by `:enableVulnerabilityAlertsWithLabel(security)`)

#### Scenario: best-practices npm window does not undercut the 14-day floor

- **WHEN** `renovate.json` extends `config:best-practices` (which provides `security:minimumReleaseAgeNpm` with a shorter window)
- **THEN** the effective `minimumReleaseAge` for npm packages remains at least 14 days

### Requirement: nx-set-shas SHALL run on Node 24 runtime

El step `Set Nx SHA` en `.github/workflows/ci.yml` SHALL usar `nrwl/nx-set-shas` pineado a un commit SHA de 40 caracteres con comentario `# vX.Y.Z`, ejecutándose sobre el runner ya configurado con Node 24.12.0.

#### Scenario: CI step runs successfully on v5

- **WHEN** se ejecuta el job `main` en el workflow CI
- **THEN** el step `Set Nx SHA` completa sin error y exporta `NX_BASE` y `NX_HEAD` para los steps posteriores de `nx affected`

