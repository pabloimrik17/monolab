## Why

El skill `scan-npm-updates` pierde silently bumps reales en workspaces donde coexisten `deno.json` y `package.json` (típico en dual-publish JSR + npm). En monolab, a fecha 2026-04-24, se pierden al menos `@types/react 18.3.27 → 18.3.28` y `tsdown 0.15.9 → 0.15.12` en `packages/react-clean` y `packages/react-hooks`. Parches de seguridad podrían omitirse sin aviso.

Spike (2026-04-24, `--loglevel silly`) estableció la causa raíz: ncu 21.0.2 con `--packageFile <sub>/package.json` auto-detecta `packageManager: 'deno'` por el `deno.json` vecino, lo que colapsa el default de `--dep` a `['imports']` (import map de Deno) e ignora `dependencies`/`devDependencies`. Una hipótesis previa (`--deep` vs per-manifest, registrada en `openspec/changes/refine-npm-update-patch-apply/research/followup-scan-deep-finding.md`) queda descartada: `--deep` funciona sólo por accidente de cwd (gana `pnpm-lock.yaml` al arrancar en la raíz).

## What Changes

- Pasar `-p <resolvedPackageManager>` explícito en cada invocación ncu del skill (per-manifest y single-repo). El PM ya está resuelto por la precondición 2 de `SKILL.md`; la skill debe propagarlo al CLI en lugar de confiar en la auto-detección.
- Documentar en `SKILL.md` por qué `-p` es obligatorio, referenciando el escenario JSR/Deno coexistente como ejemplo.

Fuera de scope explícito (cambios posteriores, separables):

- Migrar la enumeración de manifests a `--deep`. `--deep` es alias literal de `--packageFile '**/package.json'` (confirmado en `ncu --help`); no respeta `package.json#workspaces` de npm/yarn/bun ni `deno.json#workspace`, por lo que introduce overscan de manifests fuera del workspace declarado.
- Reducción de spawns (22 → 1) y cambios de shape del parser.
- Benchmark de wall-clock.

No cambia: output contract (`ScanResult`), enumeración de manifests, catalog post-process (pnpm), lookup de `minimumReleaseAge`, consumers (`/experiments:npm-update-patch` y comandos hermanos).

## Capabilities

### New Capabilities

- `npm-update-scanning`: contrato del skill `scan-npm-updates` (detección de package manager y repo type, runner resolution, invocación de ncu con `-p` obligatorio, level→target mapping, enumeración per-manifest, parsing defensivo del stdout de ncu, `minimumReleaseAge` lookup, catalog post-processing pnpm, assembling de `ScanResult`, output JSON, error paths). El skill no estaba versionado en `openspec/specs/`; este change seed-ea el spec completo para anclar la corrección y servir de base a cambios futuros (incluida la posible optimización con `--deep`).

### Modified Capabilities

Ninguna.

## Impact

- **Código**: `claude-plugins/experiments/skills/scan-npm-updates/SKILL.md`, sección "Tool invocation" (prepender `-p <pm>` al comando ncu y añadir nota de por qué).
- **Consumers**: `/experiments:npm-update-patch` y cualquier comando que invoque el skill — sin cambio de contrato; simplemente dejan de perder bumps en repos con `deno.json` coexistiendo con `package.json`.
- **Dependencias**: ncu pinned sigue siendo `npm-check-updates@21.0.2`; mismo runner por PM; misma versión del flag `-p`.
- **Registro histórico**: `openspec/changes/refine-npm-update-patch-apply/research/followup-scan-deep-finding.md` ya se actualizó (2026-04-24) con el hallazgo del spike y el pointer a este change; no es parte del delta de este proposal.
- **Riesgo**: mínimo. Verificado en vivo: `pnpm dlx npm-check-updates@21.0.2 -p pnpm --packageFile packages/react-clean/package.json --target patch --jsonUpgraded` devuelve `{"@types/react":"18.3.28","tsdown":"0.15.12"}`. `-p <pm>` con el PM ya resuelto por el skill reproduce el comportamiento correcto sin side effects detectables.
