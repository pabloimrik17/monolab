# experiments-plugin Specification

## Purpose

Beta skills and commands staging area for the monolab Claude Code marketplace.

## Requirements

### Requirement: Experiments Plugin Structure

The `experiments` plugin SHALL exist at `claude-plugins/experiments/` and follow standard Claude Code plugin structure.

The plugin directory SHALL contain:
- `.claude-plugin/plugin.json` manifest
- `commands/` directory for slash commands
- `package.json` with `"private": true`
- `README.md` documenting the plugin

#### Scenario: Plugin directory exists

- **WHEN** navigating to `claude-plugins/experiments/`
- **THEN** the directory SHALL exist with `.claude-plugin/plugin.json` manifest

#### Scenario: Plugin manifest valid

- **WHEN** examining `.claude-plugin/plugin.json`
- **THEN** it SHALL include `name: "experiments"`, `version`, `description`, and `keywords`

#### Scenario: Skills directory exists

- **WHEN** examining the plugin structure
- **THEN** `skills/` directory SHALL exist at the plugin root

#### Scenario: package.json is private

- **WHEN** examining `package.json` at the plugin root
- **THEN** it SHALL contain `"private": true`

#### Scenario: README exists

- **WHEN** examining the plugin root at `claude-plugins/experiments/`
- **THEN** `README.md` SHALL exist

---

### Requirement: Plugin Manifest Content

The plugin manifest SHALL include:
- `name`: "experiments"
- `version`: Starting at "0.1.0"
- `description`: "Beta skills and commands staging area for monolab"
- `keywords`: ["experiments", "beta", "staging", "skills"]

#### Scenario: Manifest has required fields

- **WHEN** parsing `plugin.json`
- **THEN** all required fields SHALL be present and valid

---

### Requirement: Hello Experiments Command

The plugin SHALL provide `/experiments:hello-experiments` command.

When invoked, the command SHALL:
- Explain the plugin's purpose as a staging area for beta features
- List any experimental skills/commands currently available (or state none if empty)
- Mention that features here may graduate to production plugins

#### Scenario: Command invocation

- **WHEN** user types `/experiments:hello-experiments`
- **THEN** Claude SHALL respond with the plugin purpose explanation

#### Scenario: Command file location

- **WHEN** examining the plugin structure
- **THEN** `commands/hello-experiments.md` SHALL exist

---

### Requirement: Marketplace Registration

The experiments plugin SHALL be registered in `.claude-plugin/marketplace.json`.

#### Scenario: Plugin in marketplace

- **WHEN** examining `.claude-plugin/marketplace.json` plugins array
- **THEN** it SHALL include an entry for `experiments` with name, source, version, description

#### Scenario: Plugin installable

- **WHEN** user runs `/plugin install experiments@monolab`
- **THEN** the experiments plugin SHALL install successfully

---

### Requirement: Workspace Integration

The plugin SHALL be recognized as a pnpm workspace member.

#### Scenario: Package.json exists

- **WHEN** examining `claude-plugins/experiments/package.json`
- **THEN** it SHALL have `name: "@m0n0lab/plugin-experiments"` and `"private": true`

#### Scenario: Workspace recognition

- **WHEN** running `pnpm install` from root
- **THEN** the experiments plugin SHALL be recognized as workspace member

---

### Requirement: Plugin Version Bump Skill

The experiments plugin SHALL include a `plugin-version-bump` skill at `skills/plugin-version-bump/SKILL.md`.

The skill SHALL:
- Guide the AI agent to bump plugin versions after completing plugin modifications
- Provide a semver classification table for determining bump level
- Instruct synchronization of version across plugin.json, package.json, and marketplace.json

#### Scenario: Skill directory exists

- **WHEN** examining `claude-plugins/experiments/skills/`
- **THEN** `plugin-version-bump/SKILL.md` SHALL exist

#### Scenario: Skill discoverable by Claude Code

- **WHEN** the experiments plugin is installed
- **THEN** the `plugin-version-bump` skill SHALL appear in the available skills list

---

### Requirement: npm-changelog Command File

The experiments plugin SHALL include `commands/npm-changelog.md` as a skill file.

The command file SHALL have YAML frontmatter with a `description` field.

The command SHALL be invocable as `/experiments:npm-changelog`.

#### Scenario: Command file exists

- **WHEN** examining `claude-plugins/experiments/commands/`
- **THEN** `npm-changelog.md` SHALL exist

#### Scenario: Command invocable

- **WHEN** user types `/experiments:npm-changelog react 18.0.0..19.0.0`
- **THEN** Claude SHALL execute the npm-changelog skill instructions

#### Scenario: Frontmatter present

- **WHEN** reading `commands/npm-changelog.md`
- **THEN** the file SHALL have YAML frontmatter with `description` field

---

### Requirement: Version Bump

When adding the npm-changelog command, the plugin version SHALL be bumped in both:
- `claude-plugins/experiments/.claude-plugin/plugin.json`
- `claude-plugins/experiments/package.json`

Both files SHALL have matching version numbers.

#### Scenario: Version consistency

- **WHEN** examining `plugin.json` and `package.json` after adding npm-changelog
- **THEN** both SHALL have the same version number, incremented from the previous version

---

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
    - npm/yarn/bun/deno: la skill SHALL resolver el valor y pasarlo como `--cooldown <period>` a ncu. La tabla autorizada de config files y claves por PM vive en la SKILL.md; cualquier PM cuya lookup aún no esté documentada SHALL hacer fallar la skill con mensaje explícito.
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
