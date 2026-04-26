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

`renovate.json` SHALL incluir el preset `helpers:pinGitHubActionDigestsToSemver` (o equivalente) en el array `extends`, de modo que Renovate:

- Pinee a SHA cualquier action nueva que aparezca con un major/minor tag (incluidas `actions/*`)
- Actualice el SHA pineado cuando se publique una nueva versión, conservando el comentario `# vX.Y.Z` actualizado
- Genere PRs separadas por update type (patch/minor/major) respetando los `packageRules` existentes

`renovate.json` SHALL NOT contener `packageRules` que pongan `pinDigests: false` para `actions/*` u otros owners.

#### Scenario: Renovate config includes the pin preset

- **WHEN** se inspecciona `renovate.json`
- **THEN** el array `extends` contiene `"helpers:pinGitHubActionDigestsToSemver"` y no hay `packageRules` que excluyan `actions/*` del pinning

#### Scenario: Renovate updates a pinned SHA

- **WHEN** se publica `nrwl/nx-set-shas@v5.0.2` upstream
- **THEN** Renovate abre una PR que reemplaza el SHA actual y actualiza el comentario a `# v5.0.2` sin perder el formato

### Requirement: Renovate SHALL stagger PR creation across update types

`renovate.json` SHALL definir schedules separados por `matchUpdateTypes` para evitar spikes de PRs cuando ciclos coinciden:

- `patch` → primer día del mes
- `minor` → día 8 del mes cada 2 meses
- `major` → día 15 del mes cada 3 meses

Adicionalmente, `minimumReleaseAge` SHALL ser de al menos `14 days` para reducir exposición a paquetes comprometidos recientemente publicados.

#### Scenario: Schedules are staggered

- **WHEN** se inspecciona `renovate.json`
- **THEN** los `packageRules` con `matchUpdateTypes: ["patch"|"minor"|"major"]` tienen `schedule` distintos por día/mes

#### Scenario: Release age window enforced

- **WHEN** se publica una nueva versión de un paquete
- **AND** han pasado menos de 14 días desde la publicación
- **THEN** Renovate NO abre PR para esa versión hasta que la ventana se cumpla (excepto vulnerabilidades cubiertas por `:enableVulnerabilityAlertsWithLabel(security)`)

### Requirement: nx-set-shas SHALL run on Node 24 runtime

El step `Set Nx SHA` en `.github/workflows/ci.yml` SHALL usar `nrwl/nx-set-shas` pineado a un commit SHA de 40 caracteres con comentario `# vX.Y.Z`, ejecutándose sobre el runner ya configurado con Node 24.12.0.

#### Scenario: CI step runs successfully on v5

- **WHEN** se ejecuta el job `main` en el workflow CI
- **THEN** el step `Set Nx SHA` completa sin error y exporta `NX_BASE` y `NX_HEAD` para los steps posteriores de `nx affected`

