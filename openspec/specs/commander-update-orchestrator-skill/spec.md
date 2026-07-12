# commander-update-orchestrator-skill Specification

## Purpose

The `commander-update-orchestrator` skill drives multi-project npm dependency-update flows by coordinating `experiments:scan-npm-updates` across every project registered in the user-scoped Commander registry. It is invoked by sibling commands (`/experiments:commander-update-patch`, `-minor`, `-major`, `-engines`, and future deep variants) and produces a single cross-project plan, user confirmation gate, and sequential per-project apply step. The skill never mutates the registry and never commits/pushes/opens PRs autonomously (running read-only checks is permitted but never automatic).
## Requirements
### Requirement: Skill location and structure

The `experiments` plugin SHALL include a skill at `claude-plugins/experiments/skills/commander-update-orchestrator/SKILL.md` with YAML frontmatter declaring a non-empty `description` field. The skill SHALL be invocable by sibling commands (`/experiments:commander-update-patch`, `-minor`, `-major`, `-engines`, and the future deep variants) via the `Skill` tool.

The skill SHALL be implemented entirely with Claude Code built-in tools (`Read`, `Bash`, `AskUserQuestion`, `Agent`, `Skill`, `Edit`, `Write`). The skill SHALL NOT introduce a new runtime dependency, library, or sidecar package.

#### Scenario: Skill file exists

- **WHEN** examining `claude-plugins/experiments/skills/`
- **THEN** the directory `commander-update-orchestrator/` SHALL exist
- **AND** SHALL contain a `SKILL.md` file with non-empty `description` frontmatter

#### Scenario: Skill is invocable

- **WHEN** a sibling command invokes the skill via the `Skill` tool
- **THEN** the skill begins its workflow with the inputs the command provided

---

### Requirement: Skill input contract

The skill SHALL accept exactly these inputs:

- `level` (required) — one of `patch`, `minor`, `major`, `engines`. Passed verbatim to `experiments:scan-npm-updates`.
- `target` (required) — one of `patch`, `minor`, `major`, `engines`. Passed verbatim to `ncu --target` (and matches `level` for the four shipped shallow commands and four future deep commands).
- `mode` (optional) — one of `shallow`, `deep`. Default `shallow`. Selects the deep-research path when `deep`. The shallow path is byte-equivalent across `mode: "shallow"` and an absent `mode` input.
- `overrideRegistryPath` (optional) — repo-relative path to a `pkg-upgrade-overrides.yaml` file. Defaults to `claude-plugins/experiments/skills/scan-npm-updates/data/pkg-upgrade-overrides.yaml`.
- `projectsFilter` (optional) — array of project `name`s. When set, the skill SHALL operate only on registry records whose `name` is in the array. When unset, the skill SHALL prompt the user via `AskUserQuestion` (multi-select) to pick a subset of registered projects.

The skill SHALL reject invocations with an unknown `level`, `target`, or `mode` value before performing any side effect.

#### Scenario: Required inputs validated

- **WHEN** the caller invokes the skill with `level: "junk"`
- **THEN** the skill aborts with `Error: invalid level "junk". Expected patch|minor|major|engines.` and performs no scan or apply

#### Scenario: Unknown mode value aborts before side effects

- **WHEN** the caller invokes the skill with `mode: "deep-research"` (not in the allowed set)
- **THEN** the skill aborts with `Error: invalid mode "deep-research". Expected shallow|deep.` and performs no scan, no research, no apply

#### Scenario: Filter narrows project set

- **WHEN** the caller invokes the skill with `projectsFilter: ["investlab", "qup"]` against a registry containing five projects
- **THEN** the skill operates on exactly those two records and ignores the other three

#### Scenario: Absent mode defaults to shallow

- **WHEN** the caller invokes the skill without a `mode` argument
- **THEN** the skill behaves identically to `mode: "shallow"` — no research step, no changeset gate round, three-option confirmation gate, single bumps-apply step per project

---

### Requirement: Project resolution from registry

The skill SHALL read the user-scoped Commander registry via the `commander-registry` reader contract documented in `claude-plugins/commander/commands/add.md` (path `<HOME>/.claude/commander/projects.json`, lazy-create-aware, version-gate on `version > 2`). The skill SHALL NOT mutate `projects.json` or its temp sibling.

If the registry is missing or `projects` is empty, the skill SHALL print `No projects registered. Use /commander:add to register one.` and exit zero without performing scan or apply.

If the registry is present but every record after applying `projectsFilter` is filtered out (e.g. a name in the filter that does not match any record), the skill SHALL print a one-line warning identifying the unmatched names and proceed with the remaining matched records (if any). If no record matches, the skill SHALL exit zero with a clear "no projects matched the filter" message.

For each record retained after filtering, the skill SHALL classify drift:

- **Missing path drift** — `Bash test -d "<record.path>"` exits non-zero. The skill SHALL skip the record, emit a `Skipped (path missing): <name> — <path>` warning to be included in the final summary, and continue with the remaining records.
- **Legacy v1 drift** — `record.repoType` is absent. The skill SHALL accept the record as-is (no action), since `repoType` is not consumed by scan or apply.

#### Scenario: Empty registry exits cleanly

- **WHEN** the registry file is missing
- **THEN** the skill prints `No projects registered. Use /commander:add to register one.` and exits zero with no scan, no apply, and no summary block

#### Scenario: Missing path skipped with warning

- **WHEN** a registered project's `path` does not exist on disk
- **THEN** the skill skips that project for both scan and apply, records `Skipped (path missing): <name> — <path>` in the summary, and continues with remaining projects

#### Scenario: Filter unmatched name surfaces warning

- **WHEN** `projectsFilter: ["investlab", "ghost"]` is passed but no registered project has `name == "ghost"`
- **THEN** the skill prints a one-line warning `Filter name not found: ghost` and proceeds with the matched records (here `investlab`)

---

### Requirement: Project subset selection via AskUserQuestion

When `projectsFilter` is unset and the registry has at least one project (after path-drift filtering), the skill SHALL present project selection as multi-select. The interface depends on the selectable-project count `N`, because `AskUserQuestion` caps a question at 4 options:

- **`N ≤ 3`** — a single `AskUserQuestion` call, multi-select, one option per project (label `<name> — <path>`) plus a final `"all"` option labeled `All registered projects (<N>)`.
- **`N ≥ 4`** (the project options plus `all` no longer fit the 4-option cap) — the skill SHALL fall back to a free-form selection message (no `AskUserQuestion`): print the selectable projects as a numbered `<name> — <path>` list and ask for a comma-separated list of names (or `all`). Unknown names re-prompt with the valid list; an empty response cancels.

In both interfaces: selecting `all` is equivalent to selecting every individual project; selecting zero projects aborts with `No projects selected. Cancelled.` and exits zero with no side effects. The skill SHALL NOT raise this prompt when `projectsFilter` is provided, and SHALL NOT attempt a single `AskUserQuestion` whose option count exceeds the tool cap (the call fails with invalid parameters, observed in dry-run 2026-07-12 with 4 registered projects).

#### Scenario: Multi-select with subset

- **WHEN** the registry has three projects and the user picks two
- **THEN** the skill operates on exactly those two records for the rest of the run

#### Scenario: All option shortcut

- **WHEN** the user selects the `all` option
- **THEN** the skill operates on every selectable project as if each had been picked individually

#### Scenario: Empty selection aborts

- **WHEN** the user submits the multi-select prompt without selecting any project
- **THEN** the skill prints `No projects selected. Cancelled.` and exits zero with no scan or apply

#### Scenario: Picker overflow falls back to free-form selection

- **WHEN** the registry resolves 4 or more selectable projects
- **THEN** the skill presents the free-form numbered-list selection instead of a single `AskUserQuestion`
- **AND** never issues an `AskUserQuestion` whose option count exceeds the tool's 4-option cap

---

### Requirement: Parallel scan dispatch

For the resolved project set, the skill SHALL invoke `experiments:scan-npm-updates` once per project, dispatched in parallel via the `Agent` tool with one tool-use per project in a single message. Each `Agent` call SHALL:

- Inherit the session model (the skill SHALL NOT force a latency-optimized tier: the agent executes the full `scan-npm-updates` skill, not a JSON echo — a weaker tier returned a fabricated empty `ScanResult` in dry-run 2026-07-12, silently dropping every update for a project).
- Use `subagent_type: "general-purpose"`.
- Run with the agent's working directory set to `<record.path>`.
- Receive the `level` input and instructions to invoke the skill and return the `ScanResult` JSON verbatim, with no additional prose.

The skill SHALL collect each agent's response, parse it as a `ScanResult`, and tag each result with the originating project's `name` and `path`. Results SHALL be combined into a `ScanResultByProject = { [projectName]: ScanResult }` map.

**Empty-scan cross-check (dependency levels only).** For `level ∈ {patch, minor, major}`, when an agent returns a `ScanResult` with zero `updates`, the skill SHALL cross-check with one direct read-only `ncu` invocation (`--jsonUpgraded`, no `--upgrade`, no file writes) in that project before accepting the empty result. On a mismatch the skill SHALL re-dispatch that project's scan agent once; if the re-dispatch still mismatches, mark the project `scan-failed` with reason `scan disagreed with ncu cross-check`. An empty result confirmed by the cross-check is accepted normally. At `level=engines` this cross-check does not apply (the scan is `detect-toolchain-surfaces`, not ncu-based).

If an agent fails to return parseable JSON or aborts with a `scan-npm-updates` precondition error, the skill SHALL mark that project as `scan-failed`, surface the error in the summary block, and exclude the project from aggregation and apply. The skill SHALL continue processing other projects' results normally.

#### Scenario: Parallel dispatch in one message

- **WHEN** three projects are resolved
- **THEN** the skill sends a single message containing exactly three `Agent` tool-use calls in parallel (not sequential)

#### Scenario: Per-agent CWD

- **WHEN** dispatching the scan for project `qup` whose `path` is `/Users/x/qup`
- **THEN** the agent runs with its working directory at `/Users/x/qup` so `scan-npm-updates` detects the local package manager

#### Scenario: Scan failure contained per project

- **WHEN** project `proj-A` returns parseable JSON, `proj-B` returns invalid JSON, and `proj-C` aborts with a precondition error
- **THEN** the skill aggregates only `proj-A`, marks `proj-B` and `proj-C` as `scan-failed` in the summary, and proceeds to apply for `proj-A`

#### Scenario: Falsely-empty scan caught by the cross-check

- **WHEN** a project's scan agent returns zero updates but the direct read-only `ncu` cross-check reports available updates
- **THEN** the skill re-dispatches that project's scan once instead of silently accepting the empty result

---

### Requirement: Cross-project aggregation and deduplication

The skill SHALL aggregate `ScanResultByProject` into a `CrossProjectPlan` with the following shape:

```ts
interface CrossProjectPlan {
  packages: Array<{
    name: string;
    occurrences: Array<{
      projectName: string;
      currentVersion: string;
      targetVersion: string;
      location: string;
      sourceFile: string;
      skippedByReleaseAge?: boolean;
    }>;
    proposedTarget: string; // result of version-alignment policy (see next requirement)
    conflict: boolean; // true when proposedTarget cannot be applied to every occurrence's range
  }>;
  warnings: string[]; // collected from per-project ScanResult.warnings, prefixed with `<projectName>: `
  scanFailed: string[]; // project names where scan failed
  pathMissing: Array<{ name: string; path: string }>; // projects skipped during resolution
}
```

The aggregation step SHALL:

1. Group every update across every project by package `name` (case-sensitive npm name).
2. Preserve insertion order: packages SHALL appear in the order of first occurrence across the iteration of projects (insertion order from `commander-list`).
3. Concatenate `warnings` from each project's `ScanResult` with the project name prefix.

#### Scenario: Same package across projects merged

- **WHEN** `proj-A` and `proj-B` both have an update for `lodash`
- **THEN** the aggregated plan contains one `packages` entry for `lodash` with two `occurrences` (one per project)

#### Scenario: Per-project warnings prefixed

- **WHEN** `proj-A`'s scan produces `warnings: ["ncu failed on package.json"]`
- **THEN** the aggregated plan's `warnings` array contains `proj-A: ncu failed on package.json`

---

### Requirement: Version alignment policy

For each aggregated package, the skill SHALL compute `proposedTarget` as the **maximum semver** across all `occurrences[].targetVersion` (with leading `^`/`~`/`=` prefixes stripped before comparison; the prefix of the highest occurrence is preserved on output).

The skill SHALL flag the package with `conflict: true` when at least one occurrence's declared range (`currentVersion` interpreted as a range) does NOT include the chosen `proposedTarget`. Range admission is determined by standard semver `satisfies(proposedTarget, currentVersion)` semantics.

If any package has `conflict: true`, the skill SHALL prompt the user via `AskUserQuestion` exactly once (regardless of how many packages conflict) with the following options:

- `use-max-where-possible` — apply `proposedTarget` only to occurrences whose range admits it; leave non-admitting occurrences at their per-project `targetVersion`.
- `per-project` — every occurrence retains its per-project `targetVersion`; no max-alignment is applied to the conflicting packages.
- `skip-package` — exclude every conflicting package from the run (their occurrences are removed from the plan); non-conflicting packages proceed normally.

The chosen policy SHALL apply to every conflicting package in the run; the skill SHALL NOT prompt per-package.

The summary section SHALL list, per conflicting package, the chosen resolution (max-applied projects, per-project-applied projects, skipped projects).

#### Scenario: All projects accept the max

- **WHEN** `lodash` is updated in `proj-A` (current `^4.17.20` → target `4.17.22`) and `proj-B` (current `^4.17.21` → target `4.17.22`), and both ranges admit `4.17.22`
- **THEN** `proposedTarget` is `^4.17.22`, `conflict` is `false`, and no policy prompt is raised for this package

#### Scenario: Range mismatch raises one prompt

- **WHEN** `lodash` has `proj-A` (current `^4.17.20`, target `4.17.22`) and `proj-B` (current `~4.17.21`, target `4.17.21`), and `proj-B`'s range does not admit `4.17.22`
- **THEN** `conflict` is `true`, and exactly one `AskUserQuestion` prompt is raised covering all conflicting packages in the run with the three options listed above

#### Scenario: per-project policy disables alignment

- **WHEN** the user selects `per-project` and three packages conflict
- **THEN** every occurrence of those three packages keeps its per-project `targetVersion`; non-conflicting packages still align to their (uncontested) max

#### Scenario: skip-package removes conflicts entirely

- **WHEN** the user selects `skip-package` and two packages conflict
- **THEN** every occurrence of those two packages is removed from the plan and excluded from the apply phase; the summary lists them under `Skipped by conflict policy`

---

### Requirement: Cross-project plan rendering

After aggregation and conflict resolution, the skill SHALL render a single markdown table to the user:

```
| package | proposed target | projects | locations |
| ------- | --------------- | -------- | --------- |
| lodash  | ^4.17.22        | proj-A, proj-B | root, workspace:@scope/foo |
| ...     | ...             | ...      | ...       |
```

- Sort rows alphabetically by `name` (stable).
- `projects` SHALL list the project names where the package will be updated under the chosen policy (deduplicated, comma-separated).
- `locations` SHALL list the unique `location` values across those projects (comma-separated, no per-project duplication).
- Append a `Warnings:` heading with each warning as a bullet, when warnings are non-empty.
- Append a `Skipped (scan-failed):` and `Skipped (path missing):` heading, when respectively non-empty, listing project names.

#### Scenario: Empty plan exits early

- **WHEN** every project either has zero updates, scan-failed, or path-missing — i.e. the aggregated plan has no apply-able packages
- **THEN** the skill prints any warnings and the literal line `No <level> updates available across selected projects.` and exits zero with no apply

#### Scenario: Standard render

- **WHEN** the plan contains three packages across two projects with no warnings
- **THEN** the table is rendered with the three packages alphabetically, no warnings heading, and no skipped headings

---

### Requirement: Override-registry consultation

Before apply, the skill SHALL load the override registry indicated by `overrideRegistryPath` (default `claude-plugins/experiments/skills/scan-npm-updates/data/pkg-upgrade-overrides.yaml`) and resolve matches using the `npm-update-apply` override-resolution procedure (first-win glob matching over package names plus `{version}` resolution via `target-of:<name>` / `max-target-of:<glob>` / `latest` with `fallbackVersionSource`). The procedure supplies the matching and version-resolution algorithm only; the prompt and its cross-project scope are owned by this skill.

Override prompts SHALL be raised exactly once per matched entry across the entire run. When an entry's matches span multiple projects, the chosen action (`run-override`, `skip-matched`, `force-generic`) SHALL apply to every project the matches touch. The skill SHALL NOT raise an override prompt per project.

`{version}` resolution SHALL run against the cross-project aggregated `proposedTarget` set, not per-project sets.

If the override registry is missing or unparseable, the procedure SHALL degrade gracefully and the skill SHALL print a single warning (`Override registry unavailable: <reason>. Proceeding without overrides.`) and continue with no overrides applied.

#### Scenario: Single override prompt across projects

- **WHEN** `@storybook/*` matches updates in three projects
- **THEN** the user is prompted exactly once with the override question; the chosen action applies to all three projects

#### Scenario: Missing registry degrades gracefully

- **WHEN** the override registry file does not exist
- **THEN** the skill prints `Override registry unavailable: ENOENT. Proceeding without overrides.` and continues with the generic flow only

#### Scenario: Matching algorithm sourced from the shared procedure

- **WHEN** the skill resolves overrides
- **THEN** it uses the `npm-update-apply` override-resolution procedure for first-win matching and `{version}` resolution (not an inline copy of the algorithm)
- **AND** still raises its own cross-project `run-override` / `skip-matched` / `force-generic` prompt once per matched entry

---

### Requirement: User confirmation gate

After plan rendering and override resolution, the skill SHALL prompt the user via a single `AskUserQuestion` call with these options:

- `apply-all` — proceed with the entire (possibly conflict-filtered) plan.
- `pick-subset` — accept a free-form package-name list to exclude before apply.
- `cancel` — exit without modifying any file.

The skill SHALL NOT auto-apply without an explicit option selection.

For `pick-subset`, the skill SHALL parse the user's response by splitting on commas and newlines, validate every name is in the plan's `packages[].name` set, and reject invalid names with a re-prompt that lists the valid set. If the resulting set is empty after exclusion, the skill SHALL exit with `All updates excluded; nothing to apply.` and perform no apply.

#### Scenario: Cancel touches no files

- **WHEN** the user selects `cancel` at the confirmation gate
- **THEN** no manifest, no install, and no override command is run; the skill exits with `Cancelled. No files modified.`

#### Scenario: pick-subset narrows the plan

- **WHEN** the plan has 8 packages and the user excludes `lodash`
- **THEN** the skill applies the remaining 7 packages and lists `lodash` in the summary under "Skipped by user"

---

### Requirement: Sequential apply per project with stop-on-fail

After the confirmation gate, the skill SHALL apply updates **sequentially, one project at a time**, in the registry's insertion order (filtered to the resolved project set). For each project, the skill SHALL:

1. Resolve the project's working directory `<record.path>` (passed to `npm-update-apply` as `cwd`).
2. Compute the per-project subset of accepted updates (the package occurrences for that project under the chosen conflict policy and override actions), including each occurrence's `effectiveTarget`.
3. If the per-project subset is empty (every package skipped/overridden out for this project), the skill SHALL skip apply and install for this project and continue to the next.
4. Build the resolved single-project apply spec for this project — generic `package.json` occurrences as `manifestBumps`, `pnpm-workspace.yaml` occurrences as `catalogEdits` (using `effectiveTarget`), interpolated `run-override` commands touching this project as `overrideCommands` (declaration order), and `skipInstall` per the install-skip rule — and invoke the `npm-update-apply` skill **once** with `target: <target>` and `cwd: <record.path>`. The target→ncu mapping (`major→latest`) and the exact-pin write (`--removeRange`) are owned by `npm-update-apply`; the orchestrator passes `target` unchanged. For each `manifestBumps` element, `includeFilter` SHALL be set to `true` whenever the per-project generic subset is a strict subset of the file's ncu candidate set; additionally, when `target` is `major` (it maps to `ncu --target latest`), `includeFilter` SHALL ALWAYS be `true` for every element (the per-project `names` list is authoritative, preventing over-bumping dependencies that `scan-npm-updates` excluded). The skill performs the `ncu` bumps, catalog edits, override commands, and the single install for this project; the orchestrator SHALL NOT restate that recipe inline.

If `npm-update-apply` returns a structured failure for a project (any of `ncu`, `catalog`, `override`, `install`), the skill SHALL **stop the entire run** at that point, format the cross-project abort message (`Stopping the run. Subsequent projects not attempted.`) from the returned `step` and `exitCode`, and SHALL NOT attempt apply on subsequent projects. The skill SHALL fold each project's returned result fragment into the cross-project summary, which SHALL list:

- Projects fully applied (with per-project bumps and overrides).
- The project where the failure occurred (with the failing step and exit code).
- Projects pending (not yet attempted).

The user is responsible for reviewing partial state and re-running the command.

#### Scenario: Sequential order matches registry insertion order

- **WHEN** the resolved set is `[proj-B, proj-A]` (in the registry's insertion order, after filtering)
- **THEN** apply runs `proj-B` to completion first, then `proj-A`; never in parallel and never reordered

#### Scenario: Major forces per-project filter

- **WHEN** the run is at `target: "major"` and a project's per-project generic subset for a `package.json` would otherwise qualify for `includeFilter: false`
- **THEN** the orchestrator builds that `manifestBumps` element with `includeFilter: true`
- **AND** `npm-update-apply` runs `ncu --target latest --filter "<names>"` for that file, bumping only the accepted major packages

#### Scenario: Empty per-project subset skips that project

- **WHEN** every accepted package is bound to a `skip-matched` override for `proj-C`
- **THEN** apply for `proj-C` is skipped (no `npm-update-apply` invocation) and the skill proceeds to the next project

#### Scenario: Failure halts subsequent projects

- **WHEN** apply succeeds for `proj-A` and `proj-B`, then `npm-update-apply` returns an `ncu` failure for `proj-C`
- **THEN** the skill stops; `proj-D` is not attempted; the summary lists `proj-A`/`proj-B` as applied, `proj-C` as failed (with the failing step), and `proj-D` as pending

#### Scenario: One install per project

- **WHEN** apply succeeds for two projects with different package managers
- **THEN** each project's `npm-update-apply` invocation runs that project's install command exactly once (via the skill)

### Requirement: Cross-project summary

After the run completes (success, partial, or cancellation), the skill SHALL print a markdown summary with sections rendered conditionally:

- **`Applied projects (<N>):`** — one line per project listing applied bumps (`name <from> → <to>`) and override entries with their interpolated commands.
- **`Failed project:`** — when a project's apply failed: project name, failing step, exit code, and a one-line guidance to re-run.
- **`Pending projects (<N>):`** — projects in the resolved set that were not attempted because of a prior failure.
- **`Skipped (path missing) (<N>):`** — projects skipped during resolution.
- **`Skipped (scan-failed) (<N>):`** — projects whose scan failed; never attempted for apply.
- **`Skipped by user (<N>):`** — packages excluded under `pick-subset`.
- **`Skipped by conflict policy (<N>):`** — packages dropped under `skip-package` policy.
- **`Skipped by override (<N>):`** — packages bound to a `skip-matched` override entry.
- **`Warnings (<N>):`** — every collected warning bullet.
- **`Suggested next steps (not executed):`** — bullets reading `Run your test suite in each modified project.`, `Run lint / typecheck in each modified project.`, `Review changes (\`git diff\`) and commit per project.`. Always present.

Sections with count zero SHALL be omitted, except `Suggested next steps`, which SHALL always appear.

#### Scenario: Full success summary

- **WHEN** apply succeeded for two projects with three bumps total and no skips
- **THEN** the summary contains `Applied projects (2):`, `Suggested next steps:`, and no other sections

#### Scenario: Partial failure summary

- **WHEN** apply succeeded for one project, failed on the second, and a third was pending
- **THEN** the summary contains `Applied projects (1):`, `Failed project:`, `Pending projects (1):`, and `Suggested next steps:`

---

### Requirement: Hard rules

The skill SHALL preserve every hard rule of `/experiments:npm-update-patch`:

- The skill SHALL NOT create commits, push, or open pull requests autonomously in any project; it stops for human-in-the-loop review before any such outward/VCS action (opt-in isolation branch/worktree creation via `update-isolation` is permitted).
- The skill SHALL NOT modify any file outside the per-project manifests it bumps; in particular, the user-scoped registry `<HOME>/.claude/commander/projects.json` SHALL remain byte-identical before and after the run.
- The skill SHALL NOT mutate any consumer `package.json` entry that is a `catalog:` reference — only `pnpm-workspace.yaml` for those.
- The skill SHALL NOT auto-execute an override command without the user selecting `run-override` for that entry.
- The skill SHALL NOT run `ncu --upgrade` as a fallback after an override command fails (mirrors `npm-update-patch`).

#### Scenario: Registry unchanged

- **WHEN** the skill completes any run (success, partial, cancel)
- **THEN** `<HOME>/.claude/commander/projects.json` SHALL be byte-identical before and after the run (verifiable by `shasum`)

#### Scenario: No autonomous commit/push/PR

- **WHEN** the skill completes apply across multiple projects
- **THEN** no `git commit`, `git push`, or pull-request-creation command has been invoked by the skill in any project

---

### Requirement: Deep-mode research insertion (Step 6.5) between version alignment and override consultation

When `mode === "deep"`, the skill SHALL insert a research step between Step 6 (version alignment) and Step 7 (dossier gate rendering). The research step SHALL:

1. Build a deduplicated package set from the post-policy `CrossProjectPlan.packages` — one `updates[]` record per unique package, carrying the package's `name`, the chosen `effectiveTarget` as `targetVersion`, the most-common `currentVersion` across occurrences as `currentVersion`, a synthetic `location: "cross-project"`, and a synthetic `sourceFile: "cross-project"`. The deduplication SHALL preserve the package set sort order (alphabetical by name) from Step 7.
2. Invoke `experiments:group-packages-for-research` with the deduplicated package set. Capture the `groups[]` and `warnings[]` outputs. Append the warnings to the orchestrator's running list for the summary.
3. Build a synthetic `ScanResult` value for the workflow input (`packageManager` union or `"mixed"`, `repoType: "workspace"`, the deduplicated `updates`, the running `warnings`) — unchanged.
4. Invoke `experiments:parallel-research-workflow` with `{ groups, level, scanResult, mode: "cross-project", slugOverride: "commander-deep-<level>" }`. Capture the absolute plan-dir path emitted by the workflow.

The workflow's phase 0 (stale-cleanup), phase 1 (changelogs), phase 2 (research), phase 3 (integrity), phase 4 (dossier synthesis) all run within this single invocation. The skill SHALL NOT advance the workflow's phases on its behalf.

#### Scenario: Dossier synthesis runs inside the single workflow invocation

- **WHEN** the skill runs in deep mode
- **THEN** phases 0 through 4 — including dossier synthesis — run within the single `parallel-research-workflow` invocation
- **AND** the orchestrator does not advance the workflow's phases on its behalf

---

### Requirement: Deep-mode dossier gate rendering

When `mode === "deep"` and the workflow has successfully produced `dossier.md`, the skill's Step 7 SHALL:

1. Reference `<plan-dir>/dossier.md` by absolute path (so the user can open it).
2. Surface a bounded digest of the dossier — the `Cross-project bump set` table, the improvement/workaround bullet titles with their `affects projects:` tags, the `## Skipped or unavailable` entries, and section presence counts. The digest SHALL NOT include the `## Changelogs` bodies or any full research content; the main conversation SHALL NOT ingest the full dossier (per the experiments-plugin "Main-window context diet" requirement).
3. Append the orchestrator-owned sections in this order after the digest:
    - `**Warnings:**` heading with each warning as a `-` bullet, when the orchestrator's `warnings[]` is non-empty.
    - `**Skipped (scan-failed) (<N>):**` heading with `<name>: <error>` bullets, when `scanFailed[]` is non-empty.
    - `**Skipped (path missing) (<N>):**` heading with `<name> — <path>` bullets, when `pathMissing[]` is non-empty.

If the dossier reports zero bumps AND zero improvements AND zero workarounds, the skill SHALL print `No <level> updates available across selected projects.` and exit zero, preserving the plan-dir on disk (the workflow's end-of-flow cleanup runs separately).

#### Scenario: Dossier referenced by path with a bounded digest

- **WHEN** Step 7 fires in deep mode
- **THEN** the rendered output names the absolute `dossier.md` path and shows the bump-set table plus bullet titles
- **AND** does NOT reproduce the `## Changelogs` bodies or full research content in the conversation

#### Scenario: Deep-mode digest combines workflow output with orchestrator drift sections

- **WHEN** Step 7 fires in deep mode with one path-missing record and one scan-failed record
- **THEN** the digest is followed by `**Skipped (scan-failed) (1):**` and `**Skipped (path missing) (1):**` with their respective bullets

#### Scenario: Empty-dossier early exit in deep mode

- **WHEN** the workflow's `dossier.md` reports zero bumps AND zero improvements AND zero workarounds
- **THEN** the skill prints `No <level> updates available across selected projects.` and exits zero
- **AND** the plan-dir is preserved on disk

---

### Requirement: Deep-mode confirmation gate offers `apply-bumps-only`

When `mode === "deep"`, the skill's confirmation gate (Step 9) SHALL raise an `AskUserQuestion` with **four** options instead of three:

- **Question copy**: `Apply <level> updates across <N> project(s)?`
- `multiSelect: false`
- **Options** (in this exact order):
    - `apply-all` — proceed with the entire (post-policy, post-override) plan, INCLUDING the post-bumps per-project changeset gate round.
    - `apply-bumps-only` — apply bumps + overrides + installs sequentially per project, but SKIP the changeset gate round entirely.
    - `pick-subset` — accept a free-form list of the items **to apply**, combining improvement-bullet titles and package names (substring match for improvements, exact match for bumps). Listed improvements are the only bullets in scope for the changeset gate round; listed packages are the only bumps applied; unlisted items are skipped and recorded in the summary.
    - `cancel` — exit without modifying any file.

Shallow mode (`mode === "shallow"` or absent) preserves its three-option gate (`apply-all` / `pick-subset` / `cancel`) unchanged.

#### Scenario: apply-bumps-only skips the changeset gate round

- **WHEN** the user picks `apply-bumps-only`
- **THEN** Step 10a (per-project bumps loop) executes normally
- **AND** Step 10b (per-project changeset gate round) SHALL NOT execute
- **AND** the summary's `Applied improvements` section is omitted (zero items)

#### Scenario: pick-subset accepts both bullets and package names

- **WHEN** the user picks `pick-subset` and submits `react, "react: useTransition for non-urgent work"`
- **THEN** the skill parses `react` as an accepted bump (exact match against the bump-set names)
- **AND** parses `react: useTransition for non-urgent work` as an accepted improvement (substring match against the dossier's improvement bullet titles)
- **AND** restricts Step 10a to the accepted packages and Step 10b to the accepted improvement bullets, recording unlisted items as skipped

---

### Requirement: Deep-mode Step 10 splits into bumps loop + per-project changeset gate

When `mode === "deep"` and the gate option is `apply-all` or `apply-bumps-only`, Step 10 SHALL be split:

- **Step 10a — Bumps loop**: identical to shallow Step 10 (iterate projects in registry order; generic ncu bumps + catalog edits + override commands + one install per project), with `ncu`/install output redirected to on-disk logs per the `apply-npm-updates` contract (digest + bounded tail-on-failure only). Stop-on-fail pauses the run at the per-project failure gate (stop vs continue is a user decision, per the experiments-plugin "Sequential cross-project apply with stop-on-fail" requirement).
- **Step 10b — Per-project changeset gate round** (fires only when the gate option was `apply-all` AND Step 10a completed without failure for at least one project AND the dossier contains at least one improvement bullet): for each project that successfully applied bumps, sequentially, the skill SHALL run the per-project apply gate defined by the experiments-plugin requirements "Per-project apply gate with turn-boundary pause" and "Human approval gate interface":

    1. Spawn a single apply teammate whose turn-1 task is reconnaissance over the dossier bullets affecting the project (classifying each as applicable, with the concrete edit, or inapplicable, with a one-sentence reason) and writing `changeset.md` under the run directory — with no source-file modification.
    2. Run the deterministic pre-gate check (source untouched); on violation, abort the project without opening the gate.
    3. Present the changeset through the orchestrator-owned human gate. On approval, send the still-alive teammate the proceed instruction; the teammate applies the edits; the orchestrator verifies the applied result on disk. On reject-with-feedback, relay the feedback for revision and re-present.
    4. Tear the teammate down via `TaskStop` when the project's round completes.

The orchestrator SHALL NOT apply improvement edits itself. When the gate is rejected for a project, the skill SHALL print `Improvements rejected at the changeset gate. No improvement edits applied; bumps are preserved.` for that project and continue to the next.

When `mode === "shallow"`, Step 10 behaves as today — a single per-project bumps loop with no changeset gate round.

#### Scenario: Stop-on-fail in Step 10a pauses the deep run

- **WHEN** project 2 of 3 fails its ncu invocation in Step 10a
- **THEN** the run pauses at the per-project failure gate for a stop/continue decision
- **AND** Step 10b does not run for projects that did not apply bumps

#### Scenario: apply-all happy path delegates the apply to the teammate

- **WHEN** Step 10a completes successfully for every applied project AND the dossier has at least one improvement bullet
- **THEN** for each project an apply teammate writes `changeset.md` in turn 1 with no source edit
- **AND** on approval the orchestrator sends proceed and the teammate applies the edits
- **AND** the orchestrator verifies the result on disk and does NOT apply edits itself

#### Scenario: apply-all with no improvement bullets skips Step 10b silently

- **WHEN** Step 10a completes successfully but the dossier's improvements section is `_no improvements identified_`
- **THEN** Step 10b SHALL NOT execute
- **AND** the summary's `Applied improvements` section is omitted
- **AND** the user receives no gate prompt

#### Scenario: Gate rejection preserves bumps and skips improvements

- **WHEN** the user rejects a project's changeset at the gate
- **THEN** the skill prints `Improvements rejected at the changeset gate. No improvement edits applied; bumps are preserved.`
- **AND** no improvement edits are applied for that project
- **AND** applied bumps from Step 10a are NOT reverted

#### Scenario: Reconnaissance discovers adjacent opportunity outside the dossier

- **WHEN** during reconnaissance the apply teammate identifies an improvement opportunity not present in the dossier
- **THEN** the opportunity SHALL NOT be silently added to the changeset
- **AND** it SHALL be surfaced in the Step 11 summary's `Suggested next steps` list with a brief note

---

### Requirement: Deep-mode Step 11 summary additions

When `mode === "deep"`, the summary's H1 SHALL be `## commander-update-deep-<level> summary`. The summary SHALL include, conditionally (omit when count is zero, except `Suggested next steps` which always renders):

- `**Applied projects (<N>):**` and `**Failed project:**` and `**Pending projects (<N>):**` — identical to shallow.
- `**Applied improvements (<N>):**` — one line per applied `(improvement bullet, project)` pair: `- {bullet title} → {project} ({sourceFile or general path hint})`. Only when Step 10b executed and at least one changeset was approved + applied.
- `**Skipped improvements (<N>):**` — one line per improvement excluded via `pick-subset` OR rejected at the changeset gate. The skill SHALL distinguish the two with a parenthetical: `(excluded via pick-subset)` or `(rejected at the changeset gate)`.
- `**Inapplicable improvements (<N>):**` — one line per `(improvement bullet, project)` pair marked inapplicable during the apply teammate's reconnaissance: `- {bullet title} → {project} ({reason})`.
- `**Skipped or unavailable groups (<N>):**` — sourced from `dossier.md`'s `## Skipped or unavailable` section (workflow-owned).
- `**Skipped (path missing) (<N>):**` and `**Skipped (scan-failed) (<N>):**` and `**Skipped by user (<N>):**` and `**Skipped by conflict policy (<N>):**` and `**Skipped by override (<N>):**` and `**Warnings (<N>):**` — identical to shallow.
- `**Suggested next steps (not executed):**` — always renders, with the three baseline bullets (test, lint/typecheck, git diff + commit) plus `Review <plan-dir>/dossier.md before re-running.` when the workflow's end-of-flow cleanup recorded `keep-plan`.

When `mode === "shallow"`, the summary keeps its current shape (no `Applied improvements`, `Skipped improvements`, `Inapplicable improvements`, `Skipped or unavailable groups` sections).

#### Scenario: Suggested next steps gains dossier review bullet when kept

- **WHEN** the workflow's end-of-flow cleanup recorded `keep-plan`
- **THEN** the `Suggested next steps` section includes `- Review <plan-dir>/dossier.md before re-running.` as a fourth bullet

### Requirement: Engines-level scan/apply routing

When the orchestrator's `level` (and `target`) is `engines`, it SHALL route the per-project scan and apply steps to the engine toolchain skills instead of the dependency skills, while reusing the rest of the cross-project skeleton (project resolution, subset selection, plan rendering, sequential apply with stop-on-fail, aggregated summary). Specifically, for `level=engines`:

- The per-project **scan** step SHALL invoke `detect-toolchain-surfaces` (capability `engine-surface-scanning`) instead of `scan-npm-updates`.
- The per-project **apply** step SHALL invoke `apply-engine-bumps` (capability `engine-update-apply`) instead of `npm-update-apply`. No `ncu` is invoked at engines level.
- **Cross-project alignment** SHALL be on the resolved **engine version** (one target per engine, resolved once and reused for every project — Node→latest LTS, pnpm/npm/yarn/bun/deno→latest), rather than per-package max-wins. A project already pinned above the target SHALL be surfaced and left higher unless the user opts to converge.
- The override-registry consultation step (package-name overrides) SHALL be skipped for engines (it has no meaning for runtime/PM surfaces).

For `level ∈ {patch, minor, major}` this requirement is inert — those levels continue to use `scan-npm-updates` / `npm-update-apply` exactly as before.

#### Scenario: Engines routes to the engine skills

- **WHEN** the orchestrator runs with `level: "engines"`
- **THEN** each project is scanned via `detect-toolchain-surfaces` and applied via `apply-engine-bumps`, and `scan-npm-updates`/`npm-update-apply`/`ncu` are not invoked

#### Scenario: Cross-project alignment on engine version

- **WHEN** several projects pin different current Node versions and the resolved target is one LTS
- **THEN** the orchestrator aligns every project's runtime surfaces to that single resolved version (not a per-package max-wins computation)

#### Scenario: Dependency levels unaffected

- **WHEN** the orchestrator runs with `level: "patch"`, `"minor"`, or `"major"`
- **THEN** it behaves exactly as before (dependency scan/apply via `scan-npm-updates`/`npm-update-apply`), with no engine routing

### Requirement: Deep engines-level research routing

When `level=engines` and `mode=deep`, the orchestrator's deep-mode research insertion SHALL invoke `parallel-research-workflow` with `level=engines` (so research targets engine release notes, deduplicated once per engine/version) and SHALL surface the resulting `dossier.md` — including the presence of its `## Breaking changes & migration` and `## Changelogs` sections — through the deep-mode dossier gate rendering (by path + digest, never verbatim bodies). No `## PR plan` / `partition-breaking-changes` section applies at engines level.

#### Scenario: Deep engines uses engine release-note research

- **WHEN** the orchestrator runs with `level: "engines"`, `mode: "deep"`
- **THEN** it invokes `parallel-research-workflow` with `level=engines` and surfaces the dossier digest referencing the `## Breaking changes & migration` + `## Changelogs` sections, with no `## PR plan` section

