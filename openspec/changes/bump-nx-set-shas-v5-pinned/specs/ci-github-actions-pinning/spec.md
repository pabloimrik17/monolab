## ADDED Requirements

### Requirement: Third-party GitHub Actions SHALL be pinned to commit SHA

Toda referencia a una GitHub Action de terceros (cualquier `uses:` cuyo owner no sea `actions/`) en `.github/workflows/**/*.yml` SHALL usar un commit SHA de 40 caracteres como ref, seguido de un comentario `# vX.Y.Z` con la versión semver legible.

Las actions oficiales de GitHub (`actions/checkout`, `actions/setup-node`, `actions/cache`, `actions/upload-artifact`) MAY usar un major tag (`@v4`).

#### Scenario: Pinned third-party action passes review

- **WHEN** un workflow contiene `uses: nrwl/nx-set-shas@afb73a62d26e41464e9254689e1fd6122ee683c1 # v5.0.1`
- **THEN** la referencia es válida y la version legible queda documentada en el comentario

#### Scenario: Mutable tag on third-party action is rejected

- **WHEN** un workflow contiene `uses: codecov/codecov-action@v5` (sin SHA)
- **THEN** se considera no conforme y debe ser convertido a SHA-pinned con comentario `# v5.x.y`

#### Scenario: Official GitHub action keeps major tag

- **WHEN** un workflow contiene `uses: actions/checkout@v4`
- **THEN** la referencia es válida sin SHA pinning

### Requirement: Renovate SHALL maintain pinned action SHAs automatically

`renovate.json` SHALL incluir el preset `helpers:pinGitHubActionDigestsToSemver` (o equivalente) en el array `extends`, de modo que Renovate:

- Pinee a SHA cualquier action nueva que aparezca con un major/minor tag
- Actualice el SHA pineado cuando se publique una nueva versión, conservando el comentario `# vX.Y.Z` actualizado
- Genere PRs separadas por update type (patch/minor/major) respetando los `packageRules` existentes

#### Scenario: Renovate config includes the pin preset

- **WHEN** se inspecciona `renovate.json`
- **THEN** el array `extends` contiene `"helpers:pinGitHubActionDigestsToSemver"`

#### Scenario: Renovate updates a pinned SHA

- **WHEN** se publica `nrwl/nx-set-shas@v5.0.2` upstream
- **THEN** Renovate abre una PR que reemplaza el SHA actual y actualiza el comentario a `# v5.0.2` sin perder el formato

### Requirement: nx-set-shas SHALL run on Node 24 runtime

El step `Set Nx SHA` en `.github/workflows/ci.yml` SHALL usar `nrwl/nx-set-shas@v5` (pineado) ejecutándose sobre el runner ya configurado con Node 24.12.0.

#### Scenario: CI step runs successfully on v5

- **WHEN** se ejecuta el job `main` en el workflow CI
- **THEN** el step `Set Nx SHA` completa sin error y exporta `NX_BASE` y `NX_HEAD` para los steps posteriores de `nx affected`
