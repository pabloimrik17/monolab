# npm-update-apply Specification

## Purpose

The `npm-update-apply` skill is the single source of truth for the single-project npm apply mechanism. It accepts a fully-resolved, single-project apply spec and performs the mechanical apply (generic `ncu` bumps, `pnpm-workspace.yaml` catalog edits, override commands, and a single install), returning a structured, composable result. It is level-agnostic — behavior is parameterized solely by `target` — and leaves all consumer-facing messaging and conflict/override resolution to the caller.

## Requirements

### Requirement: Skill location and structure

The `experiments` plugin SHALL include a skill at `claude-plugins/experiments/skills/apply-npm-updates/SKILL.md` with YAML frontmatter declaring a non-empty `description` field. The skill SHALL be invocable via the `Skill` tool by the single-project update commands (`/experiments:npm-update-patch`, `/experiments:npm-update-minor`, and their deep variants) and, once per project, by the `commander-update-orchestrator` skill.

The skill SHALL be implemented entirely with Claude Code built-in tools (`Read`, `Bash`, `Edit`, `Write`) and SHALL NOT introduce a new runtime dependency, library, or sidecar package. The skill is the single source of truth for the single-project npm apply mechanism; consumers SHALL NOT restate the `ncu` / catalog-edit / install recipe inline.

#### Scenario: Skill file exists

- **WHEN** examining `claude-plugins/experiments/skills/`
- **THEN** the directory `apply-npm-updates/` SHALL exist
- **AND** SHALL contain a `SKILL.md` file with non-empty `description` frontmatter

#### Scenario: Skill is invocable by consumers

- **WHEN** a consumer command or the orchestrator invokes the skill via the `Skill` tool with a resolved apply spec
- **THEN** the skill performs the mechanical apply for that one project and returns its structured result

---

### Requirement: Mechanical apply input contract

The skill SHALL accept a fully-resolved, single-project apply spec with exactly these inputs (the caller resolves conflict policy, override decisions, and `--filter` membership before invoking):

- `packageManager` (required) — one of `pnpm`, `npm`, `yarn`, `bun`, `deno`.
- `cwd` (required) — absolute path of the project whose manifests are bumped. Every `Bash` invocation SHALL run with this working directory (or use absolute `--packageFile` paths); the skill SHALL NOT mutate the caller's shell state across invocations.
- `target` (required) — one of `patch`, `minor`, `major`, `engines`. Passed verbatim to `ncu --target`.
- `cooldown` (optional) — release-age period to pass as `ncu --cooldown`; omitted for `pnpm` (ncu reads `pnpm-workspace.yaml` natively).
- `manifestBumps` (optional) — array of `{ sourceFile, names: string[], includeFilter: boolean }`; one `package.json` manifest per element.
- `catalogEdits` (optional) — array of `{ name, targetVersion }` for `pnpm-workspace.yaml` catalog keys.
- `overrideCommands` (optional) — array of `{ id, command }`, the already-interpolated override commands in declaration order.
- `skipInstall` (optional, default `false`) — when `true`, the final install is skipped (every accepted package was handled by an override that runs its own install).

The skill SHALL reject an unknown `packageManager` or `target` before any side effect.

#### Scenario: Unknown target rejected before side effects

- **WHEN** the caller invokes the skill with `target: "junk"`
- **THEN** the skill aborts with an invalid-target error and performs no `ncu`, catalog edit, override command, or install

#### Scenario: Resolved spec is consumed as-is

- **WHEN** the caller passes `manifestBumps`, `catalogEdits`, and `overrideCommands` already partitioned
- **THEN** the skill applies exactly those, performing no override matching, no conflict resolution, and no `pick-subset` parsing of its own

---

### Requirement: Generic package.json bumps via npm-check-updates

For each `manifestBumps` element (a `package.json` `sourceFile`), the skill SHALL invoke `npm-check-updates@21.0.2` exactly once via the package-manager runner prefix (`pnpm dlx`, `npx -y`, `yarn dlx`, `bunx`, `deno run --allow-read --allow-net npm:`):

```bash
<runner-prefix> npm-check-updates@21.0.2 -p <packageManager> --target <target> --upgrade --packageFile <sourceFile> [--cooldown <period>] [--filter "<names>"]
```

`-p <packageManager>` SHALL always be passed (mirror scan semantics, prevent ncu auto-detect drift). `--cooldown` SHALL be included when `cooldown` is set and omitted for `pnpm`. `--filter "<names>"` (the element's `names`, space-separated, double-quoted) SHALL be included when `includeFilter` is `true` and omitted otherwise. The skill SHALL stream `ncu` stdout/stderr to the user verbatim.

If `ncu` exits non-zero for a manifest, the skill SHALL stop immediately and return a structured failure `{ step: "ncu", sourceFile, exitCode, appliedSoFar }` without printing any consumer-specific abort message.

#### Scenario: One ncu invocation per manifest

- **WHEN** the spec has two distinct `package.json` source files
- **THEN** the skill invokes `npm-check-updates@21.0.2` exactly once per file, with `-p <pm> --target <target> --upgrade --packageFile <sourceFile>`

#### Scenario: Filter included only when requested

- **WHEN** a `manifestBumps` element has `includeFilter: true` with `names: ["lodash", "zod"]`
- **THEN** the ncu invocation for that file includes `--filter "lodash zod"`
- **AND** an element with `includeFilter: false` is invoked without `--filter`

#### Scenario: ncu failure returns structured failure, not consumer copy

- **WHEN** `ncu` exits non-zero on a manifest
- **THEN** the skill stops, returns `{ step: "ncu", sourceFile, exitCode, appliedSoFar }`, and does NOT run the install or any override command
- **AND** the skill does NOT print a `Re-run /experiments:...` or `Stopping the run...` line (the caller owns that copy)

---

### Requirement: pnpm-workspace.yaml catalog edits

For each `catalogEdits` element (`sourceFile === "pnpm-workspace.yaml"` semantics), the skill SHALL locate the matching key under the top-level `catalog:` block and replace its value with `targetVersion`, preserving surrounding whitespace, comments, and other keys' order. The skill SHALL NOT touch any consumer `package.json` entry that is a `catalog:` reference.

If a catalog key is unexpectedly missing, the skill SHALL stop and return `{ step: "catalog", name, exitCode: null, appliedSoFar }`.

#### Scenario: Catalog value edited in place

- **WHEN** `catalogEdits` includes `{ name: "zod", targetVersion: "^3.24.1" }`
- **THEN** the skill rewrites the `zod` key under `catalog:` in `pnpm-workspace.yaml` to `^3.24.1`
- **AND** does NOT invoke `npm-check-updates` for the catalog file

#### Scenario: Consumer catalog reference untouched

- **WHEN** a consumer `package.json` declares `"zod": "catalog:"`
- **THEN** the skill does NOT modify that `package.json`

---

### Requirement: Override command execution

After every generic manifest write and catalog edit for the project has succeeded, the skill SHALL execute each `overrideCommands` element's `command` exactly once, in declaration order, streaming stdout/stderr. If any override exits non-zero, the skill SHALL stop and return `{ step: "override", entryId, exitCode, appliedSoFar }`. The skill SHALL NOT run `ncu --upgrade` as a fallback after an override fails, and SHALL NOT run the final install on this path.

#### Scenario: Overrides run after generic writes in declaration order

- **WHEN** the spec has generic manifest bumps and two override commands
- **THEN** the skill writes all manifests first, then runs the two override commands in declaration order

#### Scenario: Override failure stops with no fallback

- **WHEN** an override command exits non-zero
- **THEN** the skill returns `{ step: "override", entryId, exitCode, appliedSoFar }`
- **AND** does NOT run `ncu --upgrade` for the matched packages and does NOT run the install

---

### Requirement: Single install with skip rule

After all generic bumps, catalog edits, and override commands for the project land successfully, the skill SHALL run exactly one install command for the project's package manager (`pnpm install` / `npm install` / `yarn install` / `bun install` / `deno install`), unless `skipInstall` is `true`. The skill SHALL skip the install when `skipInstall` is `true` (every accepted package was handled by an override that ran its own install). If the install exits non-zero, the skill SHALL return `{ step: "install", exitCode, appliedSoFar }`.

#### Scenario: One install per invocation

- **WHEN** the spec applies bumps across three manifests with `skipInstall: false` and `packageManager: "pnpm"`
- **THEN** the skill runs `pnpm install` exactly once after all manifests are written

#### Scenario: Install skipped when overrides handled everything

- **WHEN** `skipInstall: true` and no generic manifest write or catalog edit occurred
- **THEN** the skill runs no install command
- **AND** the result records that the install was delegated to the override command(s)

---

### Requirement: Structured result and caller-owned messaging

On success the skill SHALL return a structured result `{ appliedGeneric: [{ name, location }], appliedOverrides: [{ id, command, matchedNames }], installRan: boolean, failure: null }`. On failure the skill SHALL return the same shape with `failure` populated per the failing-step requirements above. The skill SHALL stream `ncu` / install / override stdout/stderr verbatim (observability), but SHALL NOT print the consumer-facing summary block or the consumer-specific abort copy — the caller composes those so that single-project and cross-project consumers each preserve their own wording and exit semantics.

#### Scenario: Success returns a composable fragment

- **WHEN** the apply completes successfully
- **THEN** the result lists every generically-bumped package (with `location`) and every override that ran (with command and matched names) and `installRan`
- **AND** the skill prints no `## ...-<level> summary` heading of its own

#### Scenario: Failure leaves messaging to the caller

- **WHEN** any step fails
- **THEN** the structured `failure` carries the step, identifiers, exit code, and `appliedSoFar`
- **AND** the skill does NOT print a consumer-specific abort message; the caller formats and prints it

---

### Requirement: Override-resolution procedure (caller-invoked)

The skill SHALL document a reusable override-resolution procedure that callers invoke when they opt into overrides: load the override registry from the caller-supplied path (default `claude-plugins/experiments/skills/scan-npm-updates/data/pkg-upgrade-overrides.yaml`); match each candidate package against `overrides[].matches` with first-win glob semantics (`*` matches any run of characters within a name; no other metacharacters); resolve `{version}` via `target-of:<name>`, `max-target-of:<glob>`, or `latest`, falling back to `fallbackVersionSource` when the primary is unresolved; interpolate `{version}` into `command`; and partition candidates into `GENERIC` / `OVERRIDE_RUN` / `OVERRIDE_SKIP`. If the registry is missing or unparseable, the procedure SHALL degrade gracefully (treat as empty, emit a one-line warning) and SHALL NOT abort.

The interactive `run-override` / `skip-matched` / `force-generic` prompt and the *scope* of resolution (which packages, single-project vs. cross-project) remain caller-owned — the single-project commands and the orchestrator prompt with their own copy and scope. The procedure is the matching/resolution algorithm only.

#### Scenario: First-win glob match

- **WHEN** a candidate set includes `@storybook/react` and the registry's first matching entry is `storybook` (patterns include `@storybook/*`)
- **THEN** the package binds to the `storybook` entry and to no later entry

#### Scenario: Version resolution with fallback

- **WHEN** an entry has `versionSource: target-of:storybook` and `fallbackVersionSource: max-target-of:@storybook/*`, and no `storybook` package is present but `@storybook/react` resolves to `8.1.2`
- **THEN** the procedure interpolates `8.1.2` into the command

#### Scenario: Missing registry degrades gracefully

- **WHEN** the override registry file does not exist
- **THEN** the procedure treats the registry as empty, emits `Override registry unavailable: <reason>. Proceeding without overrides.`, and does NOT abort

#### Scenario: Prompt and scope are not part of the procedure

- **WHEN** a caller uses the procedure
- **THEN** the procedure returns matches/partitions only and does NOT raise the override `AskUserQuestion` itself

---

### Requirement: Level-agnostic operation

The skill SHALL contain no level-specific logic. Behavior is parameterized solely by `target` (passed to `ncu --target`); the same skill serves `patch`, `minor`, `major`, and `engines` callers identically.

#### Scenario: Minor target threads through unchanged

- **WHEN** the skill is invoked with `target: "minor"`
- **THEN** every `ncu` invocation uses `--target minor` and no other behavior differs from a `patch` invocation

---

### Requirement: Hard rules

The skill SHALL preserve the family hard rules:

- SHALL NOT run tests, lint, or build.
- SHALL NOT create git commits, branches, or pull requests.
- SHALL NOT mutate any consumer `package.json` entry that is a `catalog:` reference — only `pnpm-workspace.yaml` for those.
- SHALL NOT run `ncu --upgrade` as a fallback after an override command fails.
- SHALL NOT read or write the override registry data file except via the read-only resolution procedure.

#### Scenario: No verification steps executed

- **WHEN** an apply completes
- **THEN** no `vitest`, `nx test`, lint, build, or git commit command has been invoked by the skill

#### Scenario: No ncu fallback after override failure

- **WHEN** an override command fails
- **THEN** the skill SHALL NOT invoke `ncu --upgrade` for the matched packages
