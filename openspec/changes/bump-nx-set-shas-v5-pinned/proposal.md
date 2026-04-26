## Why

`nrwl/nx-set-shas@v4` está desactualizado: v5 (2026-03-20) actualiza runtime a Node 24 y deps internas. Además, usar tags mutables (`@v4`, `@v5`) en GitHub Actions es un riesgo de supply chain: un compromiso del repo de la action ejecutaría código arbitrario con `NX_CLOUD_ACCESS_TOKEN` y `CODECOV_TOKEN`. Resolver ambos a la vez: bump + pin a commit SHA + dejar Renovate a cargo del mantenimiento.

## What Changes

- Bump `nrwl/nx-set-shas@v4` → SHA pinned `@afb73a62d26e41464e9254689e1fd6122ee683c1 # v5.0.1` en `.github/workflows/ci.yml`
- Configurar Renovate con preset `helpers:pinGitHubActionDigestsToSemver` para que: (a) pinee automáticamente nuevas actions a SHA, (b) actualice los SHA pineados manteniendo el comentario `# vX.Y.Z` legible, (c) genere PRs minor/major según semver del comentario
- Política: pinning a SHA solo aplica a actions de terceros (`nrwl/*`, `pnpm/*`, `codecov/*`). Actions oficiales de GitHub (`actions/*`) quedan en major tag (`@v4`) — son confiables y reducen ruido de PRs

## Capabilities

### New Capabilities
- `ci-github-actions-pinning`: política y mecánica de versionado de GitHub Actions de terceros en CI workflows (pin a commit SHA con comentario semver, mantenimiento vía Renovate)

### Modified Capabilities
<!-- Ninguno. No hay spec previo de CI workflows. -->

## Impact

- `.github/workflows/ci.yml` (1 step modificado)
- `renovate.json` (1 entrada en `extends`)
- Sin cambios funcionales en CI: v5 mantiene mismos inputs/outputs que v4; runner ya usa Node 24.12.0
- Riesgo bajo: si v5 falla, revert es 1 línea
