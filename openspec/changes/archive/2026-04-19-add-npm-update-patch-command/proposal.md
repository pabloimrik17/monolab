## Why

Actualizar dependencias npm a mano es fricción recurrente: abrir cada `package.json`, comparar versiones, aplicar bumps, validar catalogs. Los patches son el caso más seguro y frecuente, así que empezar por ellos habilita un flujo incremental (`patch` hoy, `minor`/`major`/`engines` después) compartiendo una skill de escaneo. Cubre MON-134 (spike), MON-135 (skill compartida) y MON-136 (comando patch).

## What Changes

- Añadir comando `/experiments:npm-update-patch` al plugin `experiments` que escanea, presenta y aplica patches confirmados (bump + install).
- Añadir skill compartida `scan-npm-updates` en el plugin `experiments`: detecta package manager y repo type, invoca la herramienta de escaneo, filtra por tipo de update (`patch|minor|major|engines`), respeta `minimumReleaseAge` y entrega resultados estructurados. API diseñada para los 4 niveles aunque solo exponga patch en este change.
- Decisión de herramienta (resultado del spike): `taze` como default, con `ncu` como fallback documentado. Rationale completo y hallazgos de investigación en `design.md`.
- Comportamiento project-agnostic: el comando gestiona bump + install; no commits, no tests, no lint. Delega verificación al dev/agente invocante.
- UI: prompt único "apply all / pick subset / cancel"; en "pick subset" se piden exclusiones por nombre. Patches-friendly default = todo.
- Catalogs: tratados como first-class. Si un paquete está en `catalog:`, la skill actualiza la entrada correspondiente.
- Bump plugin version de `experiments` tras añadir skill + comando.

## Capabilities

### New Capabilities

- ninguna

### Modified Capabilities

- `experiments-plugin`: añade Requirements para la skill `scan-npm-updates` y el comando `npm-update-patch`. El bump de versión del plugin se aplica mecánicamente vía la skill `plugin-version-bump` y no se codifica como Requirement.

## Impact

- Código: nuevos archivos en `claude-plugins/experiments/skills/scan-npm-updates/SKILL.md` y `claude-plugins/experiments/commands/npm-update-patch.md`. Bump en `plugin.json`, `package.json` y `marketplace.json`.
- Deps: ninguna dep npm nueva en el workspace; la herramienta (`taze`/`ncu`) se invoca vía `npx`/`pnpm dlx` on-demand dentro de la skill.
- Superficie externa: dos nuevos puntos de entrada para usuarios del plugin (`/experiments:npm-update-patch` y la skill `scan-npm-updates`). No afecta runtime de apps.
- Desbloquea: MON-137/138/139 (minor/major/engines) y MON-153 (commander cross-project) reutilizarán la misma skill.
- Sin breaking changes.
