## MODIFIED Requirements

### Requirement: Renovate SHALL maintain pinned action SHAs automatically

`renovate.json` SHALL habilitar el pinning de digests de GitHub Actions a semver, ya sea de forma explícita con el preset `helpers:pinGitHubActionDigestsToSemver` en `extends`, o de forma transitiva al extender `config:best-practices` (que ya incluye dicho preset). NO se requiere que el string literal `"helpers:pinGitHubActionDigestsToSemver"` aparezca explícitamente en `extends` cuando `config:best-practices` está presente. En cualquiera de los dos casos, Renovate:

- Pinea a SHA cualquier action nueva que aparezca con un major/minor tag (incluidas `actions/*`)
- Actualiza el SHA pineado cuando se publique una nueva versión, conservando el comentario `# vX.Y.Z` actualizado
- Genera PRs separadas por update type (patch/minor/major) respetando los `packageRules` existentes

`renovate.json` SHALL NOT contener `packageRules` que pongan `pinDigests: false` para `actions/*` u otros owners.

#### Scenario: Pin preset enabled via config:best-practices

- **WHEN** se inspecciona `renovate.json`
- **THEN** `extends` contiene `"config:best-practices"` (que aporta `helpers:pinGitHubActionDigestsToSemver` transitivamente)
- **AND** no hay `packageRules` que excluyan `actions/*` del pinning

#### Scenario: Pin preset enabled explicitly

- **WHEN** un `renovate.json` lista `"helpers:pinGitHubActionDigestsToSemver"` explícitamente en `extends`
- **THEN** la referencia sigue siendo válida y conforme

#### Scenario: Renovate updates a pinned SHA

- **WHEN** se publica `nrwl/nx-set-shas@v5.0.2` upstream
- **THEN** Renovate abre una PR que reemplaza el SHA actual y actualiza el comentario a `# v5.0.2` sin perder el formato

### Requirement: Renovate SHALL stagger PR creation across update types

`renovate.json` SHALL definir schedules separados por `matchUpdateTypes` para evitar spikes de PRs cuando ciclos coinciden:

- `patch` → primer día del mes
- `minor` → día 8 del mes cada 2 meses
- `major` → día 15 del mes cada 3 meses

Adicionalmente, el `minimumReleaseAge` efectivo SHALL ser de al menos `14 days` para reducir exposición a paquetes comprometidos recientemente publicados. Al extender `config:best-practices`, que incluye `security:minimumReleaseAgeNpm` (ventana de 3 días para npm), la configuración SHALL preservar el piso de 14 días para paquetes npm — es decir, el preset NO SHALL reducir silenciosamente la ventana npm por debajo de 14 días; si fuese necesario, se reafirma con un `packageRule` o con el `minimumReleaseAge` top-level vigente.

#### Scenario: Schedules are staggered

- **WHEN** se inspecciona `renovate.json`
- **THEN** los `packageRules` con `matchUpdateTypes: ["patch"|"minor"|"major"]` tienen `schedule` distintos por día/mes

#### Scenario: Release age window enforced

- **WHEN** se publica una nueva versión de un paquete
- **AND** han pasado menos de 14 días desde la publicación
- **THEN** Renovate NO abre PR para esa versión hasta que la ventana se cumpla (excepto vulnerabilidades cubiertas por `:enableVulnerabilityAlertsWithLabel(security)`)

#### Scenario: best-practices npm window does not undercut the 14-day floor

- **WHEN** `renovate.json` extiende `config:best-practices` (que aporta `security:minimumReleaseAgeNpm` con 3 días)
- **THEN** el `minimumReleaseAge` efectivo para paquetes npm permanece en al menos 14 días
