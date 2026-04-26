## 1. Edit SKILL.md

- [x] 1.1 Abrir `claude-plugins/experiments/skills/scan-npm-updates/SKILL.md`, sección "Tool invocation", y prepender `-p <pm>` al comando ncu documentado (antes de `--target`). El token `<pm>` corresponde al PM resuelto en la precondición 2.
- [x] 1.2 Añadir una nota breve (≤3 líneas) justo debajo del comando explicando por qué `-p` es obligatorio: ncu 21.0.2 auto-detecta `packageManager: 'deno'` cuando hay `deno.json` hermano de `package.json`, lo que colapsa `--dep` a `['imports']` y pierde bumps. Referenciar el change `fix-scan-npm-updates-pm-detection`.
- [x] 1.3 Revisar el resto de `SKILL.md` para eliminar cualquier redacción que sugiera "ncu detecta el PM automáticamente"; dejar claro que el skill resuelve el PM y lo pasa explícito. — _No-op: el doc ya atribuye la detección al skill; grep sin hits._

## 2. Verify live

- [x] 2.1 Desde la raíz del repo, correr: `pnpm dlx npm-check-updates@21.0.2 -p pnpm --packageFile packages/react-clean/package.json --target patch --jsonUpgraded`. Confirmar output `{"@types/react":"18.3.28","tsdown":"0.15.12"}` (o los bumps vigentes en esa fecha, respetando `minimumReleaseAge`).
- [x] 2.2 Correr el mismo comando con `--loglevel silly` y confirmar que `Options` muestra `packageManager: 'pnpm'` (no `'deno'`) y `dep: ['prod','dev','optional','packageManager']`.
- [x] 2.3 Re-correr `/experiments:npm-update-patch` end-to-end en monolab; confirmar que la tabla del scan incluye `@types/react` y `tsdown` para `packages/react-clean` y `packages/react-hooks`.

## 3. Cross-check scope

- [x] 3.1 Releer proposal y design: confirmar que ningún edit toca catalog post-processing, enumeración de manifests, parsing, output shape, ni consumers. El diff de `SKILL.md` debería ser una línea efectiva + la nota.
- [x] 3.2 Confirmar que `openspec/changes/refine-npm-update-patch-apply/research/followup-scan-deep-finding.md` ya contiene la sección "Spike follow-up (2026-04-24)" apuntando a este change (si no, añadirla).

## 4. OpenSpec validation & archive

- [x] 4.1 Correr `openspec validate fix-scan-npm-updates-pm-detection` y resolver cualquier error (deltas, scenarios, capability paths).
- [x] 4.2 Commit conventional: `docs(openspec): propose fix-scan-npm-updates-pm-detection (seed npm-update-scanning spec)`.
- [x] 4.3 Commit del edit de skill cuando se implemente: `fix(skills): pass -p <pm> explicit to ncu in scan-npm-updates (avoid deno auto-detect)`.
- [x] 4.4 Tras merge, correr `/opsx:archive fix-scan-npm-updates-pm-detection` (o equivalente) para mover el delta a `openspec/specs/npm-update-scanning/spec.md`.
