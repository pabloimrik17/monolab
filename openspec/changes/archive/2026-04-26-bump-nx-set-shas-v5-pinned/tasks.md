## 1. Workflow update

- [x] 1.1 Reemplazar en `.github/workflows/ci.yml` la línea 43 `uses: nrwl/nx-set-shas@v4` por `uses: nrwl/nx-set-shas@afb73a62d26e41464e9254689e1fd6122ee683c1 # v5.0.1`
- [x] 1.2 Verificar que la indentación YAML se mantiene (4 espacios) y que no hay otros usos de `nrwl/nx-set-shas` en `.github/workflows/`
- [x] 1.3 Pinear el resto de actions en `.github/workflows/ci.yml` a SHA + `# vX.Y.Z`: `actions/checkout` (v4.3.1), `pnpm/action-setup` (v4.4.0), `actions/setup-node` (v4.4.0), `actions/cache/{restore,save}` (v4.3.0), `actions/upload-artifact` (v4.6.2), `codecov/codecov-action` (v5.5.4), `codecov/test-results-action` (v1.2.1)
- [x] 1.4 Pinear actions en `.github/workflows/release-please.yml` a SHA + `# vX.Y.Z`: `googleapis/release-please-action` (v4.4.1), `actions/checkout` (v4.3.1), `pnpm/action-setup` (v4.4.0), `actions/setup-node` (v4.4.0), `denoland/setup-deno` (v2.0.4)
- [x] 1.5 Verificar que `grep -nE 'uses: [^@]+@v[0-9]+(\.[0-9]+)?(\.[0-9]+)?$' .github/workflows/*.yml` no devuelve coincidencias (cero tags mutables restantes)

## 2. Renovate config

- [x] 2.1 En `renovate.json`, añadir `"helpers:pinGitHubActionDigestsToSemver"` al array `extends` (después de `:enableVulnerabilityAlertsWithLabel(security)`)
- [x] 2.2 Validar el JSON (sin trailing commas, schema correcto): `pnpm dlx --package=renovate -- renovate-config-validator renovate.json` o equivalente
- [x] 2.3 Confirmar que los `customManagers` y `packageRules` existentes siguen aplicándose (el preset solo afecta a `github-actions` manager)

## 3. Verificación

- [x] 3.1 Push branch y abrir PR draft contra `develop`
- [x] 3.2 Verificar que el step `Set Nx SHA` completa exitosamente en CI (logs muestran `NX_BASE`/`NX_HEAD` exportados)
- [x] 3.3 Verificar que el resto del pipeline pasa (lint, test, build) sin regresiones
- [x] 3.4 Validar artifacts del change: `pnpm dlx @fission-ai/openspec@1.2.0 validate --changes --no-interactive`
