## Context

El skill `scan-npm-updates` vive en `claude-plugins/experiments/skills/scan-npm-updates/SKILL.md` pero no está versionado en `openspec/specs/`. El spike del 2026-04-24 aisló un fallo silencioso: en repos con `deno.json` vecino a `package.json` (JSR + npm dual-publish), ncu 21.0.2 con `--packageFile <sub>/package.json` auto-detecta `packageManager: 'deno'`, lo que colapsa `--dep` a `['imports']` y devuelve `{}`, ignorando bumps reales de `dependencies`/`devDependencies`.

Evidencia reproducible en la raíz del repo:

```
ncu --packageFile packages/react-clean/package.json     → packageManager: 'deno', {}
ncu -p pnpm --packageFile packages/react-clean/package.json
                                                         → packageManager: 'pnpm', {"@types/react":"18.3.28","tsdown":"0.15.12"}
ncu --deep (desde raíz)                                  → packageManager: 'pnpm', bumps en todos
```

`--deep` "funciona" por accidente de cwd; `--help` confirma que es alias literal de `--packageFile '**/package.json'` y no respeta `package.json#workspaces` ni `deno.json#workspace`.

## Goals / Non-Goals

**Goals:**
- Restaurar correctness en repos donde coexisten `deno.json` y `package.json`.
- Anclar el contrato del skill en `openspec/specs/npm-update-scanning/` para que futuros cambios puedan diffear limpio.
- Cambio mínimo y reviewable en aislamiento de cualquier optimización posterior.

**Non-Goals:**
- Adoptar `--deep` o reducir spawn count (diferido: overscan por no respetar workspace declarations).
- Reescribir catalog post-processing, cambiar output shape, o tocar consumers (`/experiments:npm-update-patch` et al.).
- Añadir unit tests del skill (no existen; fuera de scope para este seed).

## Decisions

### Decision 1: `-p <resolvedPM>` explícito en cada invocación ncu

**Chosen**: propagar el PM resuelto en la precondición 2 de `SKILL.md` al CLI de ncu en cada invocación.

**Rationale**: el spike aisló el bug en el paso de auto-detección de ncu, que es sensible al directorio y prefiere Deno cuando hay `deno.json` hermano. Pasar `-p <pm>` salta la auto-detección por completo. Verificado en vivo devolviendo el bump esperado.

**Alternatives considered**:
- *`ncu --deep`*: rechazado para este change. Alias de `--packageFile '**/package.json'` según `--help`; no respeta `package.json#workspaces`/`deno.json#workspace` → overscan. Además es un cambio mayor (parser nuevo, enumeración nueva, fallo all-or-nothing). Queda como posible optimización futura con su propio costo/beneficio.
- *Pre-validar detección corriendo `ncu --loglevel silly` e inspeccionando Options*: frágil y ruidoso; `-p` es el fix directo.
- *Quitar `deno.json` de los sub-packages*: no opción, son requisito de JSR publish.

### Decision 2: Seed del spec completo, no delta estrecho

**Chosen**: emitir todos los requirements del skill bajo `## ADDED Requirements` en `specs/npm-update-scanning/spec.md`.

**Rationale**: el skill no tenía spec previo; no hay contra qué delta. Seedear el contrato completo ahora mantiene el spec verídico y desbloquea cambios futuros para diffear limpio contra algo real. Además espeja la estructura de `SKILL.md`, lo que facilita la reconciliación en archival.

**Alternatives considered**:
- *Spec sólo del fix (1 requirement de "ncu invocation with -p")*: deja la capability permanentemente infradocumentada; cambios futuros tendrían que retro-seedear.
- *Sin spec, sólo editar `SKILL.md`*: viola el principio contract-before-code de OpenSpec y deja al skill sin especificación.

### Decision 3: Enumeración per-manifest intacta

**Chosen**: no modificar la lógica de enumeración en este change.

**Rationale**: la enumeración funciona correctamente en repos sin `deno.json` co-localizado; el miss era PM-detection, no enumeración. Cambiarla ahora conflaciona dos concerns e infla la superficie de review.

## Risks / Trade-offs

- **[Risk] `-p` podría sobreescribir silenciosamente una futura heurística mejor de ncu**
  → Mitigation: la precondición 2 del skill ya resuelve el PM desde lockfiles, que son fuente autoritativa del proyecto; la auto-detección de ncu no lo es. Si ncu mejora su heurística, el spec puede revisitarse.

- **[Risk] Seed grande del spec (~11 requirements) puede divergir de `SKILL.md`**
  → Mitigation: en archival el spec y `SKILL.md` se pairean por convención OpenSpec. Ediciones futuras del skill pasan por specs. `SKILL.md` queda como guía prescriptiva de implementación referenciando el spec.

- **[Risk] Verificación sólo manual (sin unit tests)**
  → Mitigation: reproducción en vivo capturada en proposal y en `followup-scan-deep-finding.md`. El check de aceptación en `tasks.md` exige reproducir el fix y confirmar que `ncu --loglevel silly` muestra `packageManager: '<pm>'`, no `'deno'`.

- **[Trade-off] Spawn count sin cambiar (22 en monolab)**
  → Aceptado. Correctness primero; optimización después con wall-clock real y estrategia para overscan.

## Migration Plan

1. Merge del edit a `SKILL.md` (prepender `-p <pm>` al comando ncu en "Tool invocation" + nota breve del por qué).
2. Sin migración de consumers — output contract sin cambios.
3. Re-correr `/experiments:npm-update-patch` en monolab; confirmar que `@types/react 18.3.27 → 18.3.28` y `tsdown 0.15.9 → 0.15.12` aparecen en la tabla del scan para `packages/react-clean` y `packages/react-hooks`.
4. Archivar el change cuando la re-corrida confirme correctness.

Rollback: revertir la edición de `SKILL.md`. Sin estado que desarmar.

## Open Questions

- ¿`SKILL.md` debe linkear a `openspec/specs/npm-update-scanning/spec.md` una vez seedado? Lean sí, pero ancillary — puede añadirse en el commit de archival.
- ¿Vale una regresión fixture-backed (repo mínimo con `deno.json` + `package.json` + bump conocido)? No en este change; candidato para `research/` de un change futuro si aterriza un harness de tests del skill.
