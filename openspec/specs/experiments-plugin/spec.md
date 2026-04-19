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

### Requirement: Commander Add Command File

The `experiments` plugin SHALL include `commands/commander-add.md`.

The command file SHALL have YAML frontmatter with a `description` field. The command SHALL be invocable as `/experiments:commander-add`.

#### Scenario: Command file exists

- **WHEN** examining `claude-plugins/experiments/commands/`
- **THEN** `commander-add.md` SHALL exist

#### Scenario: Frontmatter present

- **WHEN** reading `commands/commander-add.md`
- **THEN** the file SHALL have YAML frontmatter with a non-empty `description` field

#### Scenario: Command invocable

- **WHEN** user types `/experiments:commander-add`
- **THEN** Claude SHALL execute the command instructions

---

### Requirement: Commander Add Metadata Capture Priority

The `commander-add` command SHALL collect project metadata (name, path, keywords, description, special rules) using priority A→B→C:

- **A) Explicit arguments**: fields provided by the user as command arguments are taken as-is.
- **B) Auto-detection**: fields not provided by A are inferred by dispatching a subagent with `model: "haiku"` that inspects the target directory. Detected values SHALL be shown to the user for confirmation or edit before persisting.
- **C) Prompt**: fields still missing after B SHALL be requested from the user field-by-field via `AskUserQuestion`.

#### Scenario: All fields provided as arguments

- **WHEN** the user invokes `/experiments:commander-add` with all metadata fields supplied as arguments
- **THEN** the command SHALL NOT dispatch the Haiku subagent
- **AND** SHALL NOT prompt the user for any field except the final save confirmation

#### Scenario: Auto-detection confirmation step

- **WHEN** the command auto-detects any field
- **THEN** it SHALL present the detected values to the user before writing
- **AND** SHALL allow the user to confirm, edit, or reject each field

#### Scenario: Prompted field when undetectable

- **WHEN** a required field cannot be supplied by A or B
- **THEN** the command SHALL prompt the user explicitly for that field

---

### Requirement: Commander Add Monorepo Handling

When the target directory is a monorepo, the `commander-add` command SHALL classify it as single-project or multi-project.

- **Single-project monorepo**: keywords and description SHALL be extracted from the entire repository.
- **Multi-project monorepo**: the command SHALL ask the user which subproject to register. The `path` field SHALL record the chosen subproject directory (not the monorepo root). Keywords AND description SHALL be scoped to the chosen subproject (the auto-detection subagent emits a per-subproject `description`; the top-level monorepo description is used only as a fallback when the subagent omits it, and the user SHALL be invited to edit it in the confirmation step). The optional `monorepoRoot` field SHALL record the monorepo root path.

#### Scenario: Multi-project monorepo prompts for subproject

- **WHEN** the target directory contains workspace markers (e.g., `pnpm-workspace.yaml`, `nx.json`, `turbo.json`, `lerna.json`) with multiple independent projects
- **AND** the user did not indicate a subproject via arguments
- **THEN** the command SHALL present the detected subprojects via `AskUserQuestion` for the user to choose one

#### Scenario: Keywords and description scoped to chosen subproject

- **WHEN** the user picks a subproject in a multi-project monorepo
- **THEN** the persisted `keywords` SHALL be extracted from that subproject only
- **AND** the persisted `description` SHALL be the subproject-level summary emitted by the auto-detection subagent (or, if absent, the monorepo-level description flagged for user edit at confirmation)
- **AND** the persisted `path` SHALL be the subproject's absolute directory

#### Scenario: Single-project monorepo aggregates keywords

- **WHEN** the target directory is a monorepo with a single coherent project
- **THEN** keywords SHALL be aggregated across the repository

---

### Requirement: Commander Add Registration Flow

The `commander-add` command SHALL, before persisting:

1. Validate that `path` exists on disk.
2. Validate that `name` is not already present in the registry.
3. Show the final record to the user and require an explicit confirmation.

On confirmation the command SHALL invoke the `commander-registry` `add` operation.

#### Scenario: User cancels at final confirmation

- **WHEN** the user declines the final confirmation
- **THEN** the registry file SHALL remain unchanged
- **AND** the command SHALL exit without error

#### Scenario: Duplicate name blocked before prompt

- **WHEN** the proposed `name` already exists in the registry
- **THEN** the command SHALL inform the user and SHALL NOT proceed to write
- **AND** SHALL offer the user the option to pick a different name or abort

#### Scenario: Path does not exist

- **WHEN** the resolved `path` does not exist on disk
- **THEN** the command SHALL abort with a clear message identifying the invalid path

### Requirement: scan-npm-updates Skill

The `experiments` plugin SHALL provide a `scan-npm-updates` skill at `claude-plugins/experiments/skills/scan-npm-updates/SKILL.md` that scans for available dependency updates and returns structured results filtered by update type.

The skill SHALL:

- Accept a `level` parameter with values `patch`, `minor`, `major`, or `engines`.
- Detect the project's package manager by inspecting lockfiles and `package.json#packageManager` in this order: `pnpm-lock.yaml` → pnpm, `yarn.lock` → yarn, `bun.lock`/`bun.lockb` → bun, `deno.lock` → deno, `package-lock.json` → npm.
- Detect whether the project is a single-repo or workspace (presence of `pnpm-workspace.yaml`, `workspaces` field in `package.json`, `deno.json#workspace`).
- Invoke the scanning tool (`npm-check-updates` by default, with version pinned in SKILL.md) without adding a dependency to the user's workspace, using the runner corresponding to the detected PM:
    - pnpm → `pnpm dlx npm-check-updates@<pinned>`
    - npm → `npx -y npm-check-updates@<pinned>`
    - yarn → `yarn dlx npm-check-updates@<pinned>`
    - bun → `bunx npm-check-updates@<pinned>`
    - deno → `deno run --allow-read --allow-net npm:npm-check-updates@<pinned>` (read-only scan: `--jsonUpgraded` does not write, spawn, or read env; same runtime whose install step in the command is `deno install`)
- Invoke the tool with `--jsonUpgraded` and an ncu target mapped from `level`: `patch` → `--target patch`, `minor` → `--target minor`, `major` → `--target latest` (followed by a skill-side post-filter that keeps only packages whose target major > current major, since ncu has no native `major` target), `engines` → `--target latest --enginesNode` (ncu filters to candidates whose `engines.node` satisfies the project's own `engines.node`; `@engines` is not a valid ncu target). Strip any stdout line preceding the first `{` before parsing (ncu emits an informational banner about `minimumReleaseAge` when it detects the config).
- For `level=patch`, report the patch versions the tool returns (ncu's "cap" semantic: packages whose only available upgrade is minor/major do not appear). For `minor` and `major`, the same semantic applies within their band.
- Respect `minimumReleaseAge` when declared in the package manager's config. The skill SHALL:
    - pnpm: ncu reads it natively from `pnpm-workspace.yaml#minimumReleaseAge` (verified in spike). The skill does not pass `--cooldown` for pnpm; it delegates to the tool.
    - npm/yarn/bun/deno: the skill SHALL resolve the value and pass it as `--cooldown <period>` to ncu. The authoritative table of config files and keys per PM lives in SKILL.md (task 1.4.1); any PM whose lookup is not yet documented SHALL cause the skill to fail with an explicit message.
- Treat pnpm `catalog:` entries as first-class: a package referenced via `"dep": "catalog:"` with an entry in `pnpm-workspace.yaml#catalog` SHALL be reported with `location: "catalog:default"` and `sourceFile` pointing to `pnpm-workspace.yaml`.
- Return a JSON object with the following shape (TypeScript-style):

    ```ts
    interface ScanResult {
      packageManager: "pnpm" | "npm" | "yarn" | "bun" | "deno";
      repoType: "single" | "workspace";
      updates: Array<{
        name: string;                   // npm package name
        currentVersion: string;         // semver declared in the manifest
        targetVersion: string;          // semver proposed by the tool
        location: string;               // see enumeration below
        sourceFile: string;             // path relative to repo root of the manifest that would be edited
        skippedByReleaseAge?: boolean;  // true if a lower version was chosen due to minimumReleaseAge
      }>;
      warnings: string[];               // non-fatal messages (tool stderr, unsupported catalogs, etc.)
    }
    ```

    Semantics of `location` (allowed values):
    - `"root"` — dependency declared in the root `package.json` of a single-repo.
    - `"workspace:<package-name>"` — dependency in the `package.json` of a workspace package (e.g. `"workspace:@m0n0lab/react-hooks"`). `sourceFile` points to that package's `package.json`.
    - `"catalog:default"` — entry in pnpm's default catalog (declared in `pnpm-workspace.yaml`). `sourceFile` is `pnpm-workspace.yaml`.
    - `"catalog:<name>"` — reserved for future iterations; MUST NOT be emitted in `updates` in this iteration (named catalogs surface only via `warnings`).
- Emit a warning and continue (do not abort) if non-default named catalogs are detected (`catalog:test`, etc.); list them as unsupported and exclude them from `updates` in this iteration.
- Abort with a clear message if the detected PM runner is not available on PATH.

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
- **THEN** the skill SHALL select the highest version that satisfies `minimumReleaseAge` (if any) and include only that selected target in `updates`
- **AND** when a newer candidate is skipped solely due to `minimumReleaseAge`, the returned update entry SHALL include `skippedByReleaseAge: true`
- **AND** if no candidate satisfies `minimumReleaseAge`, the package SHALL be omitted from `updates`

#### Scenario: No updates available

- **WHEN** invoked and no dependencies have updates matching the level and release-age constraints
- **THEN** the skill SHALL return `{ ..., updates: [] }` without error

#### Scenario: Package manager runner missing

- **WHEN** the detected package manager runner is not on PATH
- **THEN** the skill SHALL abort with a message stating which runner is missing and how to install it

---

### Requirement: npm-update-patch Command

The `experiments` plugin SHALL provide the `/experiments:npm-update-patch` command at `claude-plugins/experiments/commands/npm-update-patch.md`, invocable as a Claude Code slash command.

The command SHALL:

- Have YAML frontmatter with at least `description`.
- Invoke the `scan-npm-updates` skill with `level=patch`.
- If there are no updates, show an informational message and terminate.
- Render a table with columns: `name`, `currentVersion → targetVersion`, `location`.
- Present the user with a single `AskUserQuestion` with options `apply-all`, `pick-subset`, `cancel`.
- If `pick-subset`: ask for names to exclude (comma-separated or one package per line; empty = include all); validate that names exist in the list and re-prompt if not.
- Apply bumps by editing the `sourceFile` corresponding to each accepted update (`package.json` or `pnpm-workspace.yaml`).
- Execute a single install invocation for the detected PM (`pnpm install` / `npm install` / `yarn install` / `bun install` / `deno install`) at the end.
- Display a textual summary: what was applied, what was skipped, and a message suggesting (not executing) verification steps to the dev/agent (tests, lint, commit).
- Not execute tests, lint, build, or create commits.

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

