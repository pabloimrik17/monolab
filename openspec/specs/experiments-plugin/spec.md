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
- Resolve overrides via the `npm-update-apply` override-resolution procedure against the accepted set (loading the Package Upgrade Override Registry at `claude-plugins/experiments/skills/scan-npm-updates/data/pkg-upgrade-overrides.yaml`). For each matched entry, present the user with an `AskUserQuestion` with options `run-override`, `skip-matched`, `force-generic`, then partition the accepted set into `GENERIC` / `OVERRIDE_RUN` / `OVERRIDE_SKIP` per the chosen actions (`run-override` → handled by the override command and excluded from generic ncu; `skip-matched` → excluded from everything; `force-generic` → bumped generically as if unmatched).
- Build the resolved apply spec and invoke the `npm-update-apply` skill once with `target: patch` to perform the mechanical apply: generic `package.json` updates as `manifestBumps` (with `--filter "<names>"` membership — the per-manifest GENERIC partition, space-separated and literal — whenever that set is a strict subset of ncu's detected candidates, i.e. `pick-subset` or any `OVERRIDE_RUN`/`OVERRIDE_SKIP` touching the manifest); `pnpm-workspace.yaml#catalog` updates as `catalogEdits` (in-memory key edit preserving whitespace and comments); interpolated `run-override` commands as `overrideCommands` (executed once each, skipping generic ncu for their matched packages); and `skipInstall` set when every accepted package was handled by `run-override` and nothing was written outside the override command. The skill runs `npm-check-updates@21.0.2` per manifest (mirroring the `--target` and `--cooldown` flags resolved by the scan), performs the catalog edits, runs the override commands, and runs the single `<pm> install`. The command SHALL NOT restate that recipe inline.
- Display a textual summary composed from the `npm-update-apply` result fragment: what was applied (generic vs. override), what was skipped, what overrides ran (if any), and a message suggesting (not executing) verification steps to the dev/agent (tests, lint, commit).
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

#### Scenario: Apply-all delegates to ncu --upgrade

- **WHEN** the skill returns N updates targeting M distinct `package.json` manifests AND the user selects `apply-all` AND no registry entry matches
- **THEN** the command SHALL run `ncu --target patch --upgrade --packageFile <path>` exactly once per manifest (via `npm-update-apply`)
- **AND** SHALL NOT perform per-entry `Edit` calls on those manifests
- **AND** SHALL reuse the `--cooldown` flag value resolved by the scan (omit when the scan relied on pnpm's native read)

#### Scenario: Pick-subset passes accepted names as ncu --filter

- **WHEN** the skill returns updates AND the user selects `pick-subset` AND excludes one package
- **THEN** the command SHALL invoke `ncu --target patch --upgrade --packageFile <path> --filter "<space-separated accepted names>"` per manifest (via `npm-update-apply`)
- **AND** only the accepted packages SHALL be rewritten in each manifest
- **AND** the excluded packages SHALL remain unchanged

#### Scenario: Pick-subset with invalid exclusion name

- **WHEN** the user submits an exclusion name not present in the updates list
- **THEN** the command SHALL re-prompt with the invalid name(s) highlighted and the list of valid names

#### Scenario: Cancel flow

- **WHEN** the user selects `cancel`
- **THEN** the command SHALL exit without modifying any file

#### Scenario: Catalog update edits pnpm-workspace.yaml

- **WHEN** an applied update has `sourceFile: "pnpm-workspace.yaml"`
- **THEN** the command SHALL bump the version under `catalog:` in `pnpm-workspace.yaml` using the in-memory edit path (via `npm-update-apply`)
- **AND** SHALL NOT invoke `ncu --upgrade` on the catalog file
- **AND** SHALL NOT touch the consumer `package.json`

#### Scenario: Registry entry matches — user selects run-override

- **WHEN** the accepted set contains `storybook@8.1.2` and `@storybook/react@8.1.2` AND the registry matches them to the `storybook` entry AND the user selects `run-override`
- **THEN** the command SHALL execute the interpolated override command (e.g. `npx storybook@8.1.2 upgrade`) exactly once
- **AND** SHALL NOT invoke `ncu --upgrade` for `storybook` or `@storybook/react`
- **AND** the summary SHALL list these packages under "applied via override"

#### Scenario: Registry entry matches — user selects skip-matched

- **WHEN** the accepted set contains `storybook@8.1.2` AND the user selects `skip-matched` for the `storybook` entry
- **THEN** the command SHALL NOT execute the override command
- **AND** SHALL NOT invoke `ncu --upgrade` for packages matched by the entry
- **AND** the summary SHALL list matched packages under "skipped by override policy"

#### Scenario: Registry entry matches — user selects force-generic

- **WHEN** the accepted set contains `storybook@8.1.2` AND the user selects `force-generic` for the `storybook` entry
- **THEN** the command SHALL invoke `ncu --upgrade` for the matched packages as if the registry did not match
- **AND** SHALL NOT execute the override command

#### Scenario: Registry invalid or missing

- **WHEN** the registry file does not exist OR fails to parse as YAML OR lacks an `overrides` top-level key
- **THEN** the command SHALL emit a warning and proceed as if no entries matched
- **AND** SHALL NOT abort the invocation

#### Scenario: Override command fails at runtime

- **WHEN** the override command exits non-zero
- **THEN** the command SHALL report the exit code and the command that failed
- **AND** SHALL NOT run `ncu --upgrade` as a fallback for the matched packages
- **AND** SHALL NOT run the final `<pm> install` if nothing was written outside the override

#### Scenario: Install step skipped when only overrides ran

- **WHEN** every accepted package was handled by `run-override` AND no `ncu --upgrade` invocation or catalog edit was made
- **THEN** the command SHALL NOT run the final `<pm> install`
- **AND** the summary SHALL note that the install was delegated to the override command(s)

#### Scenario: No post-install verification

- **WHEN** the command completes applying updates
- **THEN** the command SHALL NOT invoke tests, lint, build, or create a commit
- **AND** the final message SHALL suggest these as next steps for the dev/agent

### Requirement: Package Upgrade Override Registry

The `experiments` plugin SHALL provide a package upgrade override registry as a YAML data file at `claude-plugins/experiments/skills/scan-npm-updates/data/pkg-upgrade-overrides.yaml`.

The registry SHALL declare an `overrides` top-level key whose value is a list of entries. Each entry SHALL have:

- `id` (string, required): stable identifier for the entry (e.g. `storybook`).
- `matches` (list of strings, required, non-empty): glob patterns over package names. A package matches an entry when its name matches any pattern in the list.
- `command` (string, required): command template with the literal token `{version}` to be interpolated.
- `versionSource` (string, required): resolution strategy for `{version}`. Allowed values:
    - `target-of:<name>` — use the `targetVersion` of the named package from the accepted set.
    - `max-target-of:<glob>` — use the max semver across `targetVersion`s of accepted packages whose names match the glob.
    - `latest` — use the literal string `latest`.
- `fallbackVersionSource` (string, optional): same syntax as `versionSource`, used when the primary source cannot be resolved.
- `reference` (string, optional): URL to official documentation for the upgrade command.
- `notes` (string, optional): human-readable explanation of what the override does, surfaced in the AskUserQuestion prompt.

The registry is a single, level-independent data file. It SHALL be consumed via the `npm-update-apply` override-resolution procedure by the single-project shallow commands (`/experiments:npm-update-patch`, `/experiments:npm-update-minor`) and, cross-project, by the `commander-update-orchestrator` skill; the single-project deep path does not consult it. The `scan-npm-updates` skill SHALL NOT read or emit overrides.

The registry SHALL include a seed entry for Storybook with:

- `id: storybook`
- `matches` covering `storybook`, `@storybook/*`, `eslint-plugin-storybook`, `storybook-addon-*`.
- `command: "npx storybook@{version} upgrade"`
- `versionSource: target-of:storybook`
- `fallbackVersionSource: max-target-of:@storybook/*`
- `reference: https://storybook.js.org/docs/releases/upgrading`

Matching SHALL be first-win ordered: a package matches at most one entry, the first in declaration order whose `matches` patterns coincide.

Glob semantics for `matches`: `*` matches any sequence of characters within a package name segment. No other glob metacharacters are supported in this iteration.

#### Scenario: Registry file exists with seed entry

- **WHEN** examining `claude-plugins/experiments/skills/scan-npm-updates/data/pkg-upgrade-overrides.yaml`
- **THEN** the file SHALL exist and parse as YAML
- **AND** SHALL contain at least one entry under `overrides:` with `id: storybook`

#### Scenario: Entry matches by exact name

- **WHEN** the accepted set includes a package named `storybook`
- **THEN** it SHALL match the `storybook` entry via the exact-name pattern `storybook`

#### Scenario: Entry matches by glob

- **WHEN** the accepted set includes a package named `@storybook/react`
- **THEN** it SHALL match the `storybook` entry via the glob pattern `@storybook/*`

#### Scenario: Entry does not match unrelated package

- **WHEN** the accepted set includes a package named `react`
- **THEN** it SHALL NOT match the `storybook` entry

#### Scenario: First-win match order

- **WHEN** two entries declare overlapping `matches` patterns AND a package would match both
- **THEN** the package SHALL be considered matched by the first entry in declaration order

#### Scenario: Version interpolation with target-of

- **WHEN** the `storybook` entry has `versionSource: target-of:storybook` AND the accepted set contains `storybook` with `targetVersion: "8.1.2"`
- **THEN** the interpolated command SHALL be `npx storybook@8.1.2 upgrade`

#### Scenario: Version interpolation falls back to max-target-of

- **WHEN** the `storybook` entry has `versionSource: target-of:storybook` AND `fallbackVersionSource: max-target-of:@storybook/*` AND the accepted set contains `@storybook/react` `8.1.2` and `@storybook/addon-essentials` `8.1.1` but NO `storybook` package
- **THEN** the interpolated command SHALL use `8.1.2` (the max across matching packages)

#### Scenario: Version interpolation unresolvable

- **WHEN** neither `versionSource` nor `fallbackVersionSource` can be resolved against the accepted set
- **THEN** the command SHALL emit a warning identifying the entry and SHALL skip the override prompt for that entry
- **AND** the matched packages SHALL fall back to generic `ncu --upgrade` treatment

#### Scenario: Adding a new entry requires no command logic change

- **WHEN** a new entry is appended to `overrides:` in the YAML file with valid `id`, `matches`, `command`, and `versionSource`
- **THEN** the consuming commands SHALL pick it up on next invocation without any change to their command files

### Requirement: Commander Update Orchestrator Skill File

The `experiments` plugin SHALL include the directory `skills/commander-update-orchestrator/` with at minimum a `SKILL.md` file. The `SKILL.md` SHALL have YAML frontmatter declaring a non-empty `description` and a non-empty `name` (matching the directory name).

The skill SHALL be discoverable via the standard Claude Code plugin skill loading mechanism (auto-loaded from the plugin's `skills/` directory).

#### Scenario: Skill folder exists

- **WHEN** examining `claude-plugins/experiments/skills/`
- **THEN** the directory `commander-update-orchestrator/` SHALL exist
- **AND** SHALL contain a `SKILL.md` file with non-empty `name` and `description` frontmatter

#### Scenario: Skill is discoverable

- **WHEN** Claude Code loads the experiments plugin
- **THEN** the skill `commander-update-orchestrator` SHALL appear in the available-skills listing

---

### Requirement: Commander Update Patch Command File

The `experiments` plugin SHALL include `commands/commander-update-patch.md`.

The command file SHALL have YAML frontmatter with a non-empty `description` field. The command SHALL be invocable as `/experiments:commander-update-patch`.

#### Scenario: Command file exists

- **WHEN** examining `claude-plugins/experiments/commands/`
- **THEN** `commander-update-patch.md` SHALL exist

#### Scenario: Frontmatter present

- **WHEN** reading `commands/commander-update-patch.md`
- **THEN** the file SHALL have YAML frontmatter with a non-empty `description` field

#### Scenario: Command invocable

- **WHEN** the user types `/experiments:commander-update-patch`
- **THEN** Claude SHALL execute the command instructions

---

### Requirement: README Listing Updated

The plugin's `README.md` SHALL list the new command (`commander-update-patch`) and the new skill (`commander-update-orchestrator`) under their respective sections. Existing entries SHALL be preserved.

#### Scenario: README mentions new artifacts

- **WHEN** reading `claude-plugins/experiments/README.md` after this change
- **THEN** the file SHALL reference `commander-update-patch` in its commands section
- **AND** SHALL reference `commander-update-orchestrator` in its skills section

---

### Requirement: Commander Update Patch Plugin Version Bump

When `commander-update-patch.md` and the `commander-update-orchestrator` skill folder are added (or their behavior modified), the experiments plugin version SHALL be bumped consistently across:

- `claude-plugins/experiments/.claude-plugin/plugin.json`
- `claude-plugins/experiments/package.json`
- `.claude-plugin/marketplace.json` (the `experiments` entry)

All three files SHALL carry the same version number after the change.

#### Scenario: Version consistency post-change

- **WHEN** examining `plugin.json`, `package.json`, and `marketplace.json` (for the `experiments` entry) after this change lands
- **THEN** all three SHALL declare the same version number
- **AND** that version SHALL be strictly greater than the version on the previous commit

---

### Requirement: `commander-update-deep-patch.md` command file present and listed in README

The `experiments` plugin SHALL include a slash command file at `claude-plugins/experiments/commands/commander-update-deep-patch.md` and SHALL list it in `claude-plugins/experiments/README.md` under the commands section adjacent to its shallow sibling `commander-update-patch.md`.

The command file SHALL carry YAML frontmatter with a non-empty `description` field that explicitly states the "deep" research posture and the "patch level only" scope.

#### Scenario: Command file present

- **WHEN** examining `claude-plugins/experiments/commands/`
- **THEN** `commander-update-deep-patch.md` SHALL exist
- **AND** SHALL contain YAML frontmatter with a non-empty `description` field

#### Scenario: README lists the new command

- **WHEN** examining `claude-plugins/experiments/README.md`
- **THEN** the commands section SHALL list `/experiments:commander-update-deep-patch` with a short blurb
- **AND** the listing SHALL appear near `/experiments:commander-update-patch` for discoverability

---

### Requirement: Plugin version bump driven by release-please

The `experiments` plugin version SHALL be bumped on the next release-please PR triggered by the `feat(experiments): /experiments:commander-update-deep-patch command (MON-199)` commit message. No manual edits to `claude-plugins/experiments/.claude-plugin/plugin.json`, `claude-plugins/experiments/package.json`, or `.claude-plugin/marketplace.json` SHALL be made as part of this change — the version bump is the responsibility of the release-please flow adopted in [MON-194](https://linear.app/monolab/issue/MON-194) (commit `3ea84bd feat(plugins)!: adopt claude-plugin-tag release flow`).

#### Scenario: No manual version edits

- **WHEN** examining the diff for this change
- **THEN** `claude-plugins/experiments/.claude-plugin/plugin.json`, `claude-plugins/experiments/package.json`, and `.claude-plugin/marketplace.json` SHALL NOT have manual version edits in any of the change's commits
- **AND** the version bump is deferred to release-please's next PR

