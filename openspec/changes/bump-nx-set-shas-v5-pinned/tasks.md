## 1. Workflow update

- [x] 1.1 Reemplazar en `.github/workflows/ci.yml` la línea 43 `uses: nrwl/nx-set-shas@v4` por `uses: nrwl/nx-set-shas@afb73a62d26e41464e9254689e1fd6122ee683c1 # v5.0.1`
- [x] 1.2 Verificar que la indentación YAML se mantiene (4 espacios) y que no hay otros usos de `nrwl/nx-set-shas` en `.github/workflows/`

## 2. Renovate config

- [x] 2.1 En `renovate.json`, añadir `"helpers:pinGitHubActionDigestsToSemver"` al array `extends` (después de `:enableVulnerabilityAlertsWithLabel(security)`)
- [x] 2.2 Validar el JSON (sin trailing commas, schema correcto): `pnpm dlx --package=renovate -- renovate-config-validator renovate.json` o equivalente
- [x] 2.3 Confirmar que los `customManagers` y `packageRules` existentes siguen aplicándose (el preset solo afecta a `github-actions` manager)

## 3. Verificación

- [ ] 3.1 Push branch y abrir PR draft contra `develop`
- [ ] 3.2 Verificar que el step `Set Nx SHA` completa exitosamente en CI (logs muestran `NX_BASE`/`NX_HEAD` exportados)
- [ ] 3.3 Verificar que el resto del pipeline pasa (lint, test, build) sin regresiones
- [x] 3.4 Validar artifacts del change: `pnpm dlx @fission-ai/openspec@1.2.0 validate --changes --no-interactive`

## 4. Post-merge (informativo, no bloqueante)

- [ ] 4.1 Tras merge a `develop`, comprobar en el siguiente ciclo de Renovate que aparecen PRs proponiendo pin a SHA para otras actions de terceros (`pnpm/action-setup`, `codecov/codecov-action`, `codecov/test-results-action`)
- [ ] 4.2 Si Renovate no abre las PRs esperadas, revisar logs en Mend dashboard y abrir issue de seguimiento
