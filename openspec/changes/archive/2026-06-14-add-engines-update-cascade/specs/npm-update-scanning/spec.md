## MODIFIED Requirements

### Requirement: Level input validation

El skill SHALL aceptar exactamente uno de `patch`, `minor`, `major` como input `level`. `engines` **ya NO** es un nivel válido para este skill: el bump de toolchain (runtime / package manager) se resuelve mediante `detect-toolchain-surfaces` (capability `engine-surface-scanning`), no mediante el escaneo de dependencias. Cualquier otro valor —incluido `engines`— SHALL abortar con un mensaje de la forma `Error: invalid level "<value>". Expected patch|minor|major.`

#### Scenario: Valid level accepted

- **WHEN** el caller pasa `level=patch`
- **THEN** el skill procede más allá de esta precondición sin error

#### Scenario: Invalid level aborts

- **WHEN** el caller pasa `level=beta`
- **THEN** el skill aborta con el error invalid-level (`Expected patch|minor|major.`) y no invoca ncu

#### Scenario: Engines is no longer a dependency-scan level

- **WHEN** el caller pasa `level=engines`
- **THEN** el skill aborta con `Error: invalid level "engines". Expected patch|minor|major.` y no invoca ncu (el toolchain bump se maneja por `detect-toolchain-surfaces`)

### Requirement: ncu invocation

El skill SHALL invocar `npm-check-updates@21.0.2` (pinned) a través del runner resuelto con los siguientes flags:

- `-p <resolvedPackageManager>` — OBLIGATORIO. Usa el PM resuelto en la precondición 2 en lugar de confiar en la auto-detección de ncu. Esto es necesario porque ncu 21.0.2 con `--packageFile <sub>/package.json` auto-detecta `packageManager: 'deno'` cuando hay un `deno.json` hermano, lo que colapsa `--dep` a `['imports']` e ignora `dependencies`/`devDependencies`.
- `--target <mapped-target>` (ver "level → target mapping").
- `--jsonUpgraded`.
- `--cooldown <value>` sólo cuando corresponda según el lookup de `minimumReleaseAge`.
- `--packageFile <manifest-path>` para cada manifest enumerado.

El skill SHALL NOT depender de la auto-detección de package manager por parte de ncu. El skill SHALL NOT pasar `--enginesNode` (el bump de runtime/toolchain es responsabilidad de `apply-engine-bumps`, no de este escaneo de dependencias).

#### Scenario: -p always present

- **WHEN** ncu es invocado para cualquier manifest
- **THEN** el command line incluye `-p <resolvedPM>` con el valor de la precondición

#### Scenario: PM mis-detection avoided

- **WHEN** un directorio sub-package contiene `package.json` (con deps declaradas) y `deno.json` hermano, y el PM de la precondición se resolvió a `pnpm`
- **THEN** ncu es invocado con `-p pnpm` y reporta updates de `dependencies`/`devDependencies` en lugar de tratar el manifest como un import map de Deno

### Requirement: Level to target mapping

El skill SHALL traducir `level` a `--target` de ncu:

- `patch` → `--target patch` (cap dentro del minor actual).
- `minor` → `--target minor` (cap dentro del major actual).
- `major` → `--target latest`, luego post-filtrar descartando entries cuyo target-major no sea estrictamente mayor que el current-major.

El skill SHALL NOT mapear `engines` a ningún `--target` (no es un nivel válido — ver "Level input validation").

#### Scenario: Patch cap

- **WHEN** `level` es `patch`
- **THEN** ncu es invocado con `--target patch`

#### Scenario: Major post-filter

- **WHEN** `level` es `major` y ncu devuelve un target cuyo major es igual al current-major
- **THEN** el skill descarta esa entry del output
