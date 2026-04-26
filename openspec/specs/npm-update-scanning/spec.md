# npm-update-scanning Specification

## Purpose
TBD - created by archiving change fix-scan-npm-updates-pm-detection. Update Purpose after archive.
## Requirements
### Requirement: Level input validation

El skill SHALL aceptar exactamente uno de `patch`, `minor`, `major`, `engines` como input `level`. Cualquier otro valor SHALL abortar con un mensaje de la forma `Error: invalid level "<value>". Expected patch|minor|major|engines.`

#### Scenario: Valid level accepted

- **WHEN** el caller pasa `level=patch`
- **THEN** el skill procede más allá de esta precondición sin error

#### Scenario: Invalid level aborts

- **WHEN** el caller pasa `level=beta`
- **THEN** el skill aborta con el error invalid-level y no invoca ncu

### Requirement: Package manager detection

El skill SHALL detectar el package manager consultando lockfiles en este orden, devolviendo la primera coincidencia: `pnpm-lock.yaml` → pnpm; `yarn.lock` → yarn; `bun.lock` o `bun.lockb` → bun; `deno.lock` → deno; `package-lock.json` → npm. Si no hay lockfile, el skill SHALL leer `package.json#packageManager` y derivar el PM del token antes de `@`. Si ninguna resolución tiene éxito, el skill SHALL abortar enumerando los lockfiles aceptados.

#### Scenario: Lockfile match wins

- **WHEN** la raíz del repo contiene `pnpm-lock.yaml`
- **THEN** el PM detectado es `pnpm`

#### Scenario: packageManager field fallback

- **WHEN** no existe lockfile pero `package.json#packageManager` es `yarn@4.5.0`
- **THEN** el PM detectado es `yarn`

#### Scenario: Ambiguous abort

- **WHEN** no hay lockfile y `package.json#packageManager` está ausente
- **THEN** el skill aborta con el error de detección y no procede

### Requirement: Repo type detection

El skill SHALL clasificar el repo como `workspace` cuando cualquiera de estos indicadores esté presente: `pnpm-workspace.yaml`, `package.json#workspaces` no-vacío (array u objeto con `packages`), `deno.json#workspace`. En caso contrario, `single`.

#### Scenario: pnpm workspace detected

- **WHEN** la raíz del repo contiene `pnpm-workspace.yaml`
- **THEN** `repoType` es `workspace`

#### Scenario: Single repo when no markers

- **WHEN** no hay indicadores de workspace
- **THEN** `repoType` es `single`

### Requirement: Runner resolution

El skill SHALL resolver el runner dlx-equivalent del PM (`pnpm dlx`, `npx -y`, `yarn dlx`, `bunx`, `deno run --allow-read --allow-net npm:`) y verificar que el binario subyacente (`pnpm`, `npx`, `yarn`, `bunx`, `deno`) esté en `PATH` antes de la primera invocación de ncu. Si falta, el skill SHALL abortar.

#### Scenario: Runner available

- **WHEN** el PM detectado es pnpm y `pnpm` está en PATH
- **THEN** el skill procede a invocar ncu

#### Scenario: Runner missing

- **WHEN** el PM detectado es bun y `bunx` no está en PATH
- **THEN** el skill aborta con un error de runner missing y no invoca ncu

### Requirement: minimumReleaseAge lookup

El skill SHALL resolver un valor de `minimumReleaseAge` por PM usando esta tabla autoritativa:

- **pnpm**: leer `pnpm-workspace.yaml#minimumReleaseAge` → `.npmrc#minimum-release-age` → `package.json#pnpm.minimumReleaseAge`. ncu lee el valor nativamente; el skill SHALL NOT pasar `--cooldown`.
- **npm**: leer `.npmrc#minimum-release-age` (npm 11+) o `npm config get minimum-release-age`; el skill SHALL pasar `--cooldown <value>m` a ncu.
- **yarn / bun / deno**: leer `.npmrc#minimum-release-age` si está presente, si no `0`; el skill SHALL pasar `--cooldown` como en npm (omitirlo si el valor es `0` o unset).

Un PM sin fila en esta tabla SHALL abortar con precondición 3.

#### Scenario: pnpm cooldown native

- **WHEN** el PM es pnpm y `pnpm-workspace.yaml#minimumReleaseAge: 1440`
- **THEN** el skill omite `--cooldown` (ncu lo lee nativamente)

#### Scenario: npm cooldown explicit

- **WHEN** el PM es npm y `.npmrc#minimum-release-age=1440`
- **THEN** el skill pasa `--cooldown 1440m` a ncu

### Requirement: ncu invocation

El skill SHALL invocar `npm-check-updates@21.0.2` (pinned) a través del runner resuelto con los siguientes flags:

- `-p <resolvedPackageManager>` — OBLIGATORIO. Usa el PM resuelto en la precondición 2 en lugar de confiar en la auto-detección de ncu. Esto es necesario porque ncu 21.0.2 con `--packageFile <sub>/package.json` auto-detecta `packageManager: 'deno'` cuando hay un `deno.json` hermano, lo que colapsa `--dep` a `['imports']` e ignora `dependencies`/`devDependencies`.
- `--target <mapped-target>` (ver "level → target mapping").
- `--jsonUpgraded`.
- `--cooldown <value>` sólo cuando corresponda según el lookup de `minimumReleaseAge`.
- `--enginesNode` cuando `level=engines`.
- `--packageFile <manifest-path>` para cada manifest enumerado.

El skill SHALL NOT depender de la auto-detección de package manager por parte de ncu.

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
- `engines` → `--target latest` más `--enginesNode`.

#### Scenario: Patch cap

- **WHEN** `level` es `patch`
- **THEN** ncu es invocado con `--target patch`

#### Scenario: Major post-filter

- **WHEN** `level` es `major` y ncu devuelve un target cuyo major es igual al current-major
- **THEN** el skill descarta esa entry del output

### Requirement: Manifest enumeration

En un repo `single`, el skill SHALL escanear `./package.json` exactamente una vez. En un repo `workspace`, el skill SHALL escanear la root `package.json` más cada sub-manifest resuelto vía la declaración PM-nativa (`pnpm-workspace.yaml#packages`, `package.json#workspaces`, `deno.json#workspace`). Cada manifest SHALL ser escaneado con una invocación de ncu.

#### Scenario: Single repo one invocation

- **WHEN** `repoType` es `single`
- **THEN** ncu es invocado exactamente una vez con `--packageFile ./package.json`

#### Scenario: Workspace invocation per manifest

- **WHEN** `repoType` es `workspace` y el workspace declara 4 sub-packages
- **THEN** ncu es invocado 5 veces (4 sub-manifests + root)

### Requirement: Parsing ncu stdout

El skill SHALL tolerar una línea banner no-JSON precediendo el payload (ej. `Using minimumReleaseAge from pnpm-workspace.yaml: 1 day`). El parser SHALL:

1. Capturar stdout completo.
2. Descartar todo lo anterior a la primera línea que comience con `{` (trimmed).
3. `JSON.parse` del remanente. Ante fallo, empujar el stdout crudo (truncado a 500 chars) a `warnings` y continuar con `{}` para ese manifest.
4. Capturar stderr a `warnings`, una entrada por línea no-vacía.

#### Scenario: Banner stripped

- **WHEN** stdout es `Using minimumReleaseAge from pnpm-workspace.yaml: 1 day\n{"pkg":"1.0.1"}`
- **THEN** el skill parsea `{"pkg":"1.0.1"}` con éxito

#### Scenario: Parse failure falls back

- **WHEN** stdout no es JSON válido tras el strip del banner
- **THEN** el skill empuja el stdout crudo (truncado) a `warnings` y trata los updates de ese manifest como `[]`

### Requirement: Catalog post-processing

Cuando el PM es `pnpm` y `pnpm-workspace.yaml#catalog` está presente, el skill SHALL emitir records de update por cada entry `(name, version)` consultando `npm view <name> versions time --json` una vez por package (un spawn por package del catalog; cache in-memory por scan) y filtrando candidates por:

- El `level` actual (mismo cap semantic que ncu: patch/minor/major-filtrado).
- El umbral resuelto de `minimumReleaseAge`.

Cada record de catalog SHALL tener `location: "catalog:default"` y `sourceFile: "pnpm-workspace.yaml"`. Si la versión máxima filtrada fue retenida por edad, `skippedByReleaseAge: true` SHALL ser set.

Los named catalogs (`catalogs.<name>` o map `catalogs:`) SHALL producir un warning `named catalog "<name>" detected but not yet supported in this iteration` y no emitir records.

#### Scenario: Default catalog bumped

- **WHEN** `pnpm-workspace.yaml#catalog.vitest` es `4.0.18`, `npm view vitest` devuelve `4.0.24` publicada >= `minimumReleaseAge` atrás, y `level` es `patch`
- **THEN** el output contiene `{ name: "vitest", currentVersion: "4.0.18", targetVersion: "4.0.24", location: "catalog:default", sourceFile: "pnpm-workspace.yaml" }`

#### Scenario: Named catalog warning

- **WHEN** `pnpm-workspace.yaml` contiene `catalogs.test`
- **THEN** `warnings` contiene `named catalog "test" detected but not yet supported in this iteration` y no se emiten records para esas entries

### Requirement: Result assembly

Cada record de update SHALL:

- Set `location` a `"root"` para la root manifest (single o workspace), `workspace:<package-name>` para un manifest workspace no-root (usando su campo `name`), o `catalog:default` para entries del default catalog.
- Set `sourceFile` al path relativo a la raíz del repo del manifest a editar (ej. `apps/wealth-react/package.json` o `pnpm-workspace.yaml`).
- Preservar el prefijo de versión del current manifest cuando emita `targetVersion` (ej. `"^19.0.0"` + ncu target `19.0.14` → `"^19.0.14"`; `"~5.4.0"` + `5.4.1` → `"~5.4.1"`; exact `"19.2.4"` + `19.2.5` → `"19.2.5"`).

#### Scenario: Workspace location

- **WHEN** ncu reporta un bump para `apps/wealth-react/package.json` cuyo `#name` es `@m0n0lab/wealth-react`
- **THEN** el record tiene `location: "workspace:@m0n0lab/wealth-react"` y `sourceFile: "apps/wealth-react/package.json"`

#### Scenario: Version prefix preserved

- **WHEN** el manifest current tiene `"vitest": "^4.0.18"` y el target de ncu es `4.0.24`
- **THEN** el `targetVersion` emitido es `"^4.0.24"`

### Requirement: Error paths

El skill SHALL abortar SÓLO por las cuatro preconditions numeradas (invalid level, PM no detectable, PM sin fila de `minimumReleaseAge`, runner missing). Cada fallo runtime posterior (ncu exit no-cero, fallo de parse, fallo de `npm view` en catalog, named catalog encontrado) SHALL degradar a una entrada de `warnings` y continuar; los `updates` de los manifests afectados por defecto `[]`.

#### Scenario: ncu failure is non-fatal

- **WHEN** ncu exit no-cero en uno de N manifests del workspace
- **THEN** el skill continúa con los manifests restantes, empuja un warning, y emite `updates: []` para el manifest fallido

### Requirement: Output contract

El skill SHALL emitir un único JSON object conformando a `ScanResult`:

```ts
{
  packageManager: "pnpm" | "npm" | "yarn" | "bun" | "deno";
  repoType: "single" | "workspace";
  updates: Array<{
    name: string;
    currentVersion: string;
    targetVersion: string;
    location: "root" | `workspace:${string}` | "catalog:default" | `catalog:${string}`;
    sourceFile: string;
    skippedByReleaseAge?: boolean;
  }>;
  warnings: string[];
}
```

El skill SHALL NOT emitir prosa, tablas o formato user-facing. El JSON object es la única salida (más los warnings embebidos en él). `warnings` SHALL ser de-duplicado (strings idénticos repetidos colapsan a una sola entry).

#### Scenario: Raw JSON-only output

- **WHEN** la ejecución del skill completa con éxito
- **THEN** la única salida es el JSON **raw** de `ScanResult` (sin fences Markdown ni prosa adicional)

#### Scenario: Warnings deduped

- **WHEN** dos manifests empujan el mismo warning de stderr verbatim
- **THEN** `warnings` contiene ese string exactamente una vez

