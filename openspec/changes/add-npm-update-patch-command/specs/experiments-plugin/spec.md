## ADDED Requirements

### Requirement: scan-npm-updates Skill

El plugin `experiments` SHALL proveer una skill `scan-npm-updates` en `claude-plugins/experiments/skills/scan-npm-updates/SKILL.md` que escanea dependencias actualizables y devuelve resultados estructurados, filtrados por tipo de update.

La skill SHALL:

- Aceptar un parámetro `level` con valores `patch`, `minor`, `major`, o `engines`.
- Detectar el package manager del proyecto inspeccionando lockfiles y `package.json#packageManager` en este orden: `pnpm-lock.yaml` → pnpm, `yarn.lock` → yarn, `bun.lock`/`bun.lockb` → bun, `deno.lock` → deno, `package-lock.json` → npm.
- Detectar si es single-repo o workspace (presencia de `pnpm-workspace.yaml`, `workspaces` field en `package.json`, `deno.json#workspace`).
- Invocar la herramienta de escaneo (`npm-check-updates` por defecto, con pin de versión en la SKILL.md) sin añadir dependencia al workspace del usuario, usando el runner correspondiente al PM detectado:
    - pnpm → `pnpm dlx npm-check-updates@<pinned>`
    - npm → `npx npm-check-updates@<pinned>`
    - yarn → `yarn dlx npm-check-updates@<pinned>`
    - bun → `bunx npm-check-updates@<pinned>`
    - deno → `deno run --allow-read --allow-write --allow-net --allow-env --allow-run npm:npm-check-updates@<pinned>` (el mismo runtime cuyo install step en el comando es `deno install`)
- Invocar la herramienta con `--target <level>` y `--jsonUpgraded`, y strippear cualquier línea de stdout previa al primer `{` antes de parsear (ncu emite banner informativo sobre `minimumReleaseAge` cuando detecta la config).
- Para `level=patch`, reportar las versiones patch que la herramienta devuelve (semántica "cap" de ncu: paquetes cuyo upgrade disponible sea sólo minor/major no aparecen). Para `minor` y `major` aplica la misma semántica en su banda.
- Respetar `minimumReleaseAge` cuando esté declarado en la config del package manager. La skill SHALL:
    - pnpm: ncu lo lee nativamente desde `pnpm-workspace.yaml#minimumReleaseAge` (verificado en spike). La skill no pasa `--cooldown` para pnpm; delega en la herramienta.
    - npm/yarn/bun/deno: la skill SHALL resolver el valor y pasarlo como `--cooldown <period>` a ncu. La tabla autorizada de config files y claves por PM vive en la SKILL.md (tarea 1.4.1); cualquier PM cuya lookup aún no esté documentada SHALL hacer fallar la skill con mensaje explícito.
- Tratar entradas `catalog:` de pnpm como first-class: un paquete referenciado vía `"dep": "catalog:"` con entry en `pnpm-workspace.yaml#catalog` SHALL reportarse con `location: "catalog:default"` y `sourceFile` apuntando a `pnpm-workspace.yaml`.
- Devolver un objeto JSON con la siguiente shape (TypeScript-style):

    ```ts
    interface ScanResult {
      packageManager: "pnpm" | "npm" | "yarn" | "bun" | "deno";
      repoType: "single" | "workspace";
      updates: Array<{
        name: string;                   // nombre del paquete npm
        currentVersion: string;         // semver declarado en el manifest
        targetVersion: string;          // semver propuesto por la herramienta
        location: string;               // ver enumeración abajo
        sourceFile: string;             // path relativo al repo root del manifest que se editaría
        skippedByReleaseAge?: boolean;  // true si se eligió una versión inferior por minimumReleaseAge
      }>;
      warnings: string[];               // mensajes no fatales (stderr de la tool, catalogs no soportados, etc.)
    }
    ```

    Semántica de `location` (valores permitidos):
    - `"root"` — dependencia declarada en el `package.json` raíz de un single-repo.
    - `"workspace:<package-name>"` — dependencia en el `package.json` de un paquete workspace (p. ej. `"workspace:@m0n0lab/react-hooks"`). `sourceFile` apunta al `package.json` de ese paquete.
    - `"catalog:default"` — entry en el catalog por defecto de pnpm (declarado en `pnpm-workspace.yaml`). `sourceFile` es `pnpm-workspace.yaml`.
    - `"catalog:<name>"` — entry en un catalog nombrado (`catalog:test`, etc.). Reportado con warning; no aplicable en esta iteración.
- Emitir un warning y continuar (no abort) si detecta catalogs nombrados no-default (`catalog:test`, etc.); listarlos como no soportados en esta iteración.
- Abortar con mensaje claro si el PM detectado no tiene el dlx runner disponible en PATH.

#### Scenario: Skill file exists and is discoverable

- **WHEN** the `experiments` plugin is installed
- **THEN** `claude-plugins/experiments/skills/scan-npm-updates/SKILL.md` SHALL exist with YAML frontmatter including `name` and `description`
- **AND** the skill SHALL appear in the available skills list as `experiments:scan-npm-updates`

#### Scenario: Filter by patch level (cap semantic)

- **WHEN** invoked with `level=patch` on a project where package `foo` has `1.2.5`, `1.3.0`, and `2.0.0` available over current `1.2.3`
- **THEN** the skill SHALL report `foo` with `targetVersion: 1.2.5` (the highest patch in the current minor band)
- **AND** when package `bar` has only `2.0.0` (a major) available over current `1.2.3` with no patch in the `1.2.x` band
- **THEN** the skill SHALL NOT include `bar` in `updates`

#### Scenario: pnpm catalog entry detection

- **WHEN** invoked on a pnpm workspace with `vitest: "catalog:"` in a consumer `package.json` and `vitest: 4.0.18` under `catalog:` in `pnpm-workspace.yaml`, with `4.0.24` available
- **THEN** the skill SHALL report `vitest` with `location: "catalog:default"` and `sourceFile: "pnpm-workspace.yaml"`

#### Scenario: minimumReleaseAge filtering

- **WHEN** invoked on a project with `minimumReleaseAge: 1440` and a target patch was published 10 minutes ago
- **THEN** the skill SHALL exclude that version from `updates` or include it with `skippedByReleaseAge: true` and select the next acceptable version if any

#### Scenario: No updates available

- **WHEN** invoked and no dependencies have updates matching the level and release-age constraints
- **THEN** the skill SHALL return `{ ..., updates: [] }` without error

#### Scenario: Package manager missing dlx runner

- **WHEN** the detected package manager's dlx runner is not on PATH
- **THEN** the skill SHALL abort with a message stating which runner is missing and how to install it

---

### Requirement: npm-update-patch Command

El plugin `experiments` SHALL proveer el comando `/experiments:npm-update-patch` en `claude-plugins/experiments/commands/npm-update-patch.md`, invocable como slash command de Claude Code.

El comando SHALL:

- Tener YAML frontmatter con al menos `description`.
- Invocar la skill `scan-npm-updates` con `level=patch`.
- Si no hay updates, mostrar mensaje informativo y terminar.
- Renderizar una tabla con columnas: `name`, `currentVersion → targetVersion`, `location`.
- Presentar al usuario una única `AskUserQuestion` con opciones `apply-all`, `pick-subset`, `cancel`.
- Si `pick-subset`: preguntar nombres a excluir (coma-separados o línea por paquete; vacío = incluir todos); validar que los nombres existan en la lista y re-preguntar si no.
- Aplicar bumps editando el `sourceFile` correspondiente a cada update aceptado (`package.json` o `pnpm-workspace.yaml`).
- Ejecutar una única invocación de install del PM detectado (`pnpm install` / `npm install` / `yarn install` / `bun install` / `deno install`) al final.
- Mostrar un resumen textual: qué se aplicó, qué se saltó, y un mensaje sugiriendo (no ejecutando) pasos de verificación al dev/agente (tests, lint, commit).
- No ejecutar tests, lint, build, ni crear commits.

#### Scenario: Command file exists with frontmatter

- **WHEN** examining `claude-plugins/experiments/commands/`
- **THEN** `npm-update-patch.md` SHALL exist with YAML frontmatter containing a `description` field

#### Scenario: Command invocable as slash command

- **WHEN** user types `/experiments:npm-update-patch`
- **THEN** Claude SHALL execute the command instructions

#### Scenario: No patch updates available

- **WHEN** the skill returns an empty `updates` array
- **THEN** the command SHALL print a message like "No patch updates available" and terminate without prompting

#### Scenario: Apply-all flow

- **WHEN** the skill returns N updates AND the user selects `apply-all`
- **THEN** the command SHALL bump all N entries in their respective `sourceFile` and run a single install
- **AND** SHALL print a summary listing all applied updates

#### Scenario: Pick-subset with exclusions

- **WHEN** the skill returns 3 updates `[a, b, c]` AND the user selects `pick-subset` AND excludes `b`
- **THEN** the command SHALL bump only `a` and `c`
- **AND** the summary SHALL list `a, c` as applied and `b` as skipped

#### Scenario: Pick-subset with invalid exclusion name

- **WHEN** the user submits an exclusion name not present in the updates list
- **THEN** the command SHALL re-prompt with the invalid name(s) highlighted and the list of valid names

#### Scenario: Cancel flow

- **WHEN** the user selects `cancel`
- **THEN** the command SHALL exit without modifying any file

#### Scenario: Catalog update edits pnpm-workspace.yaml

- **WHEN** an applied update has `sourceFile: "pnpm-workspace.yaml"`
- **THEN** the command SHALL bump the version under `catalog:` in `pnpm-workspace.yaml` and NOT touch the consumer `package.json`

#### Scenario: No post-install verification

- **WHEN** the command completes applying updates
- **THEN** the command SHALL NOT invoke tests, lint, build, or create a commit
- **AND** the final message SHALL suggest these as next steps for the dev/agent
