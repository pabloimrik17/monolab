## Why

Step 6 ("Apply bumps") del comando `/experiments:npm-update-patch` edita `package.json` entrada por entrada con llamadas `Edit` secuenciales. Es lento, frágil frente a prefijos (`^`/`~`/exact) y trailing commas, y gasta contexto. Paralelamente, paquetes como Storybook publican su propio comando de upgrade (`storybook upgrade`) que sincroniza toda la familia `@storybook/*` y corre automigrations; bumpear manifest a manifest los desalinea.

Issue origen: GitHub monolab#189 (dos mejoras independientes pero co-localizadas en la fase de apply, por eso se empaquetan en un solo change).

## What Changes

- **MODIFICADO**: Step 6 del comando delega la reescritura de `package.json` a una única invocación `ncu --target patch --upgrade --packageFile <manifest>` por archivo. Para `pick-subset` se añade `--filter "name1 name2 ..."` (lista literal, tras spike que confirma la semántica). Las flags de cooldown/minimumReleaseAge resueltas en el scan se espejan en el apply para evitar drift ncu→ncu.
- **NUEVO**: registry de "package upgrade overrides" en `claude-plugins/experiments/skills/scan-npm-updates/data/pkg-upgrade-overrides.yaml`. Primera entry: Storybook (`storybook`, `@storybook/*`, `eslint-plugin-storybook`, `storybook-addon-*`) con plantilla `npx storybook@{version} upgrade`. Formato trivialmente extensible (añadir entry sin tocar lógica del comando).
- **NUEVO**: antes de aplicar, si `ACCEPTED` contiene paquetes que matchean una entry del registry, el comando lanza un `AskUserQuestion` con opciones `run-override` / `skip-matched` / `force-generic`. Decisión explícita por invocación; nunca se auto-ejecuta una migración.
- **SE MANTIENE**: entradas `pnpm-workspace.yaml#catalog` siguen editándose por el camino actual en memoria (ncu 21.x no reescribe catalogs; un spike lo confirma antes de congelar la decisión).
- Bump del plugin `experiments`: 0.6.0 → 0.7.0 (cambio de comportamiento del comando + data artifact nuevo).

Sin breaking changes a nivel de interfaz: mismas opciones primarias (`apply-all | pick-subset | cancel`), mismo resultado observable en el working tree para paquetes fuera del registry.

## Capabilities

### New Capabilities

- ninguna

### Modified Capabilities

- `experiments-plugin`: reescribe la Requirement "npm-update-patch Command" (sustituye la sección de apply y añade el flujo de override registry), y añade una Requirement "Package Upgrade Override Registry" que codifica el formato del data file y su semántica. El bump de versión del plugin se aplica vía la skill `plugin-version-bump` y no se codifica como Requirement.

## Impact

- Código: edita `claude-plugins/experiments/commands/npm-update-patch.md` (Step 6 + nueva fase de registry prompt). Nuevo archivo `claude-plugins/experiments/skills/scan-npm-updates/data/pkg-upgrade-overrides.yaml` con el seed de Storybook. Bump en `plugin.json`, `package.json` y entry de `marketplace.json`.
- Deps: ninguna dep npm nueva en el workspace. `npm-check-updates@21.0.2` ya invocada vía dlx en la skill; ahora también en la fase de apply.
- Superficie externa: misma interfaz de comando; aparece una pregunta interactiva nueva solo cuando hay paquetes en el registry en el set aceptado.
- Sin breaking changes.
