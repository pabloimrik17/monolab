# commander-update-orchestrator-skill Specification

## Purpose

The `commander-update-orchestrator` skill drives multi-project npm dependency-update flows by coordinating `experiments:scan-npm-updates` across every project registered in the user-scoped Commander registry. It is invoked by sibling commands (`/experiments:commander-update-patch`, `-minor`, `-major`, `-engines`, and future deep variants) and produces a single cross-project plan, user confirmation gate, and sequential per-project apply step. The skill never mutates the registry, never runs tests/lint/build, and never creates commits.

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
- **THEN** the skill behaves identically to `mode: "shallow"` — no research step, no plan-mode round, three-option confirmation gate, single bumps-apply step per project

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

When `projectsFilter` is unset and the registry has at least one project (after path-drift filtering), the skill SHALL present project selection via a single `AskUserQuestion` call configured as multi-select with one option per project plus an explicit "all" option.

- **Option labels**: `<name> — <path>` per project, plus a final `"all"` option labeled `All registered projects (<N>)` where `<N>` is the count of selectable projects.
- **Behavior**: selecting `all` is equivalent to selecting every individual project. Selecting zero options aborts with `No projects selected. Cancelled.` and exits zero with no side effects.

The skill SHALL NOT raise this prompt when `projectsFilter` is provided.

#### Scenario: Multi-select with subset

- **WHEN** the registry has three projects and the user picks two
- **THEN** the skill operates on exactly those two records for the rest of the run

#### Scenario: All option shortcut

- **WHEN** the user selects the `all` option
- **THEN** the skill operates on every selectable project as if each had been picked individually

#### Scenario: Empty selection aborts

- **WHEN** the user submits the multi-select prompt without selecting any project
- **THEN** the skill prints `No projects selected. Cancelled.` and exits zero with no scan or apply

---

### Requirement: Parallel scan dispatch

For the resolved project set, the skill SHALL invoke `experiments:scan-npm-updates` once per project, dispatched in parallel via the `Agent` tool with one tool-use per project in a single message. Each `Agent` call SHALL:

- Use `model: "haiku"` (latency-optimized; scan-npm-updates output is small JSON).
- Use `subagent_type: "general-purpose"`.
- Run with the agent's working directory set to `<record.path>`.
- Receive the `level` input and instructions to invoke the skill and return the `ScanResult` JSON verbatim, with no additional prose.

The skill SHALL collect each agent's response, parse it as a `ScanResult`, and tag each result with the originating project's `name` and `path`. Results SHALL be combined into a `ScanResultByProject = { [projectName]: ScanResult }` map.

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

- **WHEN** `proj-A`'s scan produces `warnings: ["pnpm catalog 'test' unsupported"]`
- **THEN** the aggregated plan's `warnings` array contains `proj-A: pnpm catalog 'test' unsupported`

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

Before apply, the skill SHALL load the override registry indicated by `overrideRegistryPath` (default `claude-plugins/experiments/skills/scan-npm-updates/data/pkg-upgrade-overrides.yaml`) and apply the same first-win matching logic documented in `npm-update-patch.md` (Step 5.5 — "Compute matches" and "Resolve `{version}`").

Override prompts SHALL be raised exactly once per matched entry across the entire run. When an entry's matches span multiple projects, the chosen action (`run-override`, `skip-matched`, `force-generic`) SHALL apply to every project the matches touch. The skill SHALL NOT raise an override prompt per project.

`{version}` resolution (`target-of:<name>`, `max-target-of:<glob>`, `latest`) SHALL run against the cross-project aggregated `proposedTarget` set, not per-project sets.

If the override registry is missing or unparseable, the skill SHALL print a single warning (`Override registry unavailable: <reason>. Proceeding without overrides.`) and continue with no overrides applied.

#### Scenario: Single override prompt across projects

- **WHEN** `@storybook/*` matches updates in three projects
- **THEN** the user is prompted exactly once with the override question; the chosen action applies to all three projects

#### Scenario: Missing registry degrades gracefully

- **WHEN** the override registry file does not exist
- **THEN** the skill prints `Override registry unavailable: ENOENT. Proceeding without overrides.` and continues with the generic flow only

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

1. Set the working directory to `<record.path>` (via `Bash cd "<path>" && ...` or equivalent absolute-path invocations).
2. Compute the per-project subset of accepted updates (the package occurrences for that project under the chosen policy and override actions).
3. If the per-project subset is empty (every package skipped/overridden out for this project), the skill SHALL skip apply and install for this project and continue to the next.
4. Apply bumps following the same recipe as `/experiments:npm-update-patch` Step 6:
   - For each `package.json` `sourceFile`: invoke `npm-check-updates@21.0.2` with `--target <target>`, `-p <pm>` (the per-project package manager), `--upgrade`, `--packageFile <sourceFile>`, and `--filter "<names>"` whenever the per-project subset is a strict subset of the project's full ncu candidate set.
   - For `pnpm-workspace.yaml`: in-memory edit of the matching `catalog:` keys, preserving formatting.
5. Run override commands (when their action is `run-override`) for the matched package set in this project, in declaration order.
6. Run exactly one install command (`<pm> install`) using this project's package manager.

If any step (bump, override, install) fails for a project, the skill SHALL **stop the entire run** at that point. The skill SHALL NOT attempt apply on subsequent projects. The summary SHALL list:

- Projects fully applied (with per-project bumps and overrides).
- The project where the failure occurred (with the failing step and exit code).
- Projects pending (not yet attempted).

The user is responsible for reviewing partial state and re-running the command.

#### Scenario: Sequential order matches registry insertion order

- **WHEN** the resolved set is `[proj-B, proj-A]` (in the registry's insertion order, after filtering)
- **THEN** apply runs `proj-B` to completion first, then `proj-A`; never in parallel and never reordered

#### Scenario: Empty per-project subset skips that project

- **WHEN** every accepted package is bound to a `skip-matched` override for `proj-C`
- **THEN** apply for `proj-C` is skipped (no bump, no install) and the skill proceeds to the next project

#### Scenario: Failure halts subsequent projects

- **WHEN** apply succeeds for `proj-A` and `proj-B`, then `ncu --upgrade` fails on `proj-C`
- **THEN** the skill stops; `proj-D` is not attempted; the summary lists `proj-A`/`proj-B` as applied, `proj-C` as failed (with the failing step), and `proj-D` as pending

#### Scenario: One install per project

- **WHEN** apply succeeds for two projects with different package managers
- **THEN** each project's install command (`<pm-of-project> install`) runs exactly once after that project's bumps

---

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

- The skill SHALL NOT run tests, lint, or build at any point in any project.
- The skill SHALL NOT create git commits, branches, or pull requests in any project.
- The skill SHALL NOT modify any file outside the per-project manifests it bumps; in particular, the user-scoped registry `<HOME>/.claude/commander/projects.json` SHALL remain byte-identical before and after the run.
- The skill SHALL NOT mutate any consumer `package.json` entry that is a `catalog:` reference — only `pnpm-workspace.yaml` for those.
- The skill SHALL NOT auto-execute an override command without the user selecting `run-override` for that entry.
- The skill SHALL NOT run `ncu --upgrade` as a fallback after an override command fails (mirrors `npm-update-patch`).

#### Scenario: Registry unchanged

- **WHEN** the skill completes any run (success, partial, cancel)
- **THEN** `<HOME>/.claude/commander/projects.json` SHALL be byte-identical before and after the run (verifiable by `shasum`)

#### Scenario: No tests run

- **WHEN** the skill completes apply across multiple projects
- **THEN** no `vitest`, `nx test`, lint, build, or git commit command has been invoked by the skill in any project

---

### Requirement: Deep-mode research insertion (Step 6.5) between version alignment and override consultation

When `mode === "deep"`, the skill SHALL insert a research step between Step 6 (version alignment) and Step 7 (plan rendering). The research step SHALL:

1. Build a deduplicated package set from the post-policy `CrossProjectPlan.packages` — one `updates[]` record per unique package, carrying the package's `name`, the chosen `effectiveTarget` as `targetVersion`, the most-common `currentVersion` across occurrences as `currentVersion`, a synthetic `location: "cross-project"`, and a synthetic `sourceFile: "cross-project"`. The deduplication SHALL preserve the package set sort order (alphabetical by name) from Step 7.
2. Invoke `experiments:group-packages-for-research` with the deduplicated package set. Capture the `groups[]` and `warnings[]` outputs. Append the warnings to the orchestrator's running list for the summary.
3. Build a synthetic `ScanResult` value for the workflow input:
    - `packageManager`: the union of project package managers; if every project shares the same package manager, use that value; otherwise use the literal `"mixed"`.
    - `repoType`: the literal `"workspace"` (cross-project is workspace-shaped by construction).
    - `updates`: the deduplicated set from step 1 of this requirement.
    - `warnings`: the orchestrator's running warnings list at this point.
4. Invoke `experiments:parallel-research-workflow` with `{ groups, level, scanResult, mode: "cross-project", slugOverride: "commander-deep-<level>" }`. Capture the absolute plan-dir path emitted by the workflow.

The workflow's phase 0 (stale-cleanup), phase 1 (changelogs), phase 2 (research), phase 3 (integrity), phase 4 (plan-mode synthesis) all run within this single invocation. The skill SHALL NOT advance the workflow's phases on its behalf.

#### Scenario: Research fires only in deep mode

- **WHEN** the skill runs with `mode: "shallow"` (or absent)
- **THEN** Step 6.5 SHALL NOT execute
- **AND** no plan-dir is created under `~/.claude/experiments/plans/`
- **AND** `group-packages-for-research` and `parallel-research-workflow` are not invoked

#### Scenario: Research dedup is package-level, not project-level

- **WHEN** the skill runs in deep mode against a registry where `react` is bumped from `^19.0.0` to `^19.0.14` in three projects
- **THEN** the workflow's groups contain exactly one record for `react` (not three)
- **AND** the changelog for `react@19.0.0..19.0.14` is fetched exactly once across the run

#### Scenario: Mixed package managers across projects

- **WHEN** the registry has proj-A using pnpm and proj-B using npm
- **THEN** the synthetic `scanResult.packageManager` passed to the workflow is `"mixed"`
- **AND** the orchestrator's warnings list gains an entry like `Mixed package managers across selected projects: pnpm, npm.`
- **AND** the workflow proceeds normally (it does not consume `packageManager` for routing)

#### Scenario: Workflow stale-cleanup cancellation short-circuits the orchestrator

- **WHEN** the workflow's phase 0 returns `cancel` (user picked cancel at the stale-cleanup prompt)
- **THEN** the orchestrator prints exactly `Cancelled. No files modified.` and exits zero
- **AND** Steps 7–11 are not executed
- **AND** no plan-dir is created for this run

#### Scenario: Workflow abort at hard-wall preserves the plan dir without applying

- **WHEN** the workflow's phase 1 returns `abort` (user picked abort at the hard-wall fallback)
- **THEN** the orchestrator surfaces the abort reason verbatim
- **AND** Steps 8–10 are skipped (no override prompts, no gate, no apply)
- **AND** the plan-dir under `~/.claude/experiments/plans/commander-deep-<level>-<ts>/` is preserved on disk

#### Scenario: Workflow abort at integrity gate preserves the plan dir without applying

- **WHEN** the workflow's phase 3 returns `abort` (user picked abort at the integrity gate)
- **THEN** the orchestrator surfaces the abort reason verbatim
- **AND** Steps 8–10 are skipped
- **AND** the plan-dir is preserved

---

### Requirement: Deep-mode plan rendering reads workflow `plan.md`

When `mode === "deep"` and the workflow has successfully produced `plan.md`, the skill's Step 7 SHALL:

1. Read `<plan-dir>/plan.md` from the workflow's output.
2. Surface its content as the run plan: `## Improvements (universal — applicability checked per project at apply time)`, `## Workarounds resolved`, `## Skipped or unavailable`, `## Cross-project bump set`.
3. Append the orchestrator-owned sections in this order after the plan content:
    - `**Warnings:**` heading with each warning as a `-` bullet, when the orchestrator's `warnings[]` is non-empty.
    - `**Skipped (scan-failed) (<N>):**` heading with `<name>: <error>` bullets, when `scanFailed[]` is non-empty.
    - `**Skipped (path missing) (<N>):**` heading with `<name> — <path>` bullets, when `pathMissing[]` is non-empty.

The `Cross-project bump set` table in deep mode uses the columns `package | proposed target | projects (locations)` — the same shape as shallow Step 7, just with the workflow generating it inside `plan.md` instead of the orchestrator generating it inline.

#### Scenario: Deep-mode plan combines workflow output with orchestrator drift sections

- **WHEN** Step 7 fires in deep mode with one path-missing record and one scan-failed record
- **THEN** the rendered output contains the workflow's four H2 sections in order
- **AND** appends `**Skipped (scan-failed) (1):**` and `**Skipped (path missing) (1):**` with their respective bullets

#### Scenario: Empty-plan early exit in deep mode

- **WHEN** the workflow's `plan.md` reports zero bumps AND zero improvements AND zero workarounds
- **THEN** the skill prints `No <level> updates available across selected projects.` and exits zero
- **AND** the plan-dir is preserved on disk (the workflow's end-of-flow cleanup runs separately)

---

### Requirement: Deep-mode confirmation gate offers `apply-bumps-only`

When `mode === "deep"`, the skill's confirmation gate (Step 9) SHALL raise an `AskUserQuestion` with **four** options instead of three:

- **Question copy**: `Apply <level> updates across <N> project(s)?`
- `multiSelect: false`
- **Options** (in this exact order):
    - `apply-all` — proceed with the entire (post-policy, post-override) plan, INCLUDING the post-bumps plan-mode improvements round.
    - `apply-bumps-only` — apply bumps + overrides + installs sequentially per project, but SKIP the plan-mode improvements round entirely.
    - `pick-subset` — accept a free-form list combining improvement-bullet titles and package names (substring match for improvements, exact match for bumps). Excluded improvements skip the plan-mode round for those bullets; excluded packages skip the bumps for those names.
    - `cancel` — exit without modifying any file.

Shallow mode (`mode === "shallow"` or absent) preserves its three-option gate (`apply-all` / `pick-subset` / `cancel`) unchanged.

#### Scenario: Deep-mode gate offers four options

- **WHEN** the skill reaches Step 9 in deep mode with a non-empty plan
- **THEN** the `AskUserQuestion` raised contains exactly four options in the order `apply-all`, `apply-bumps-only`, `pick-subset`, `cancel`

#### Scenario: apply-bumps-only skips plan-mode round

- **WHEN** the user picks `apply-bumps-only`
- **THEN** Step 10a (per-project bumps loop) executes normally
- **AND** Step 10b (plan-mode round) SHALL NOT execute
- **AND** the summary's `Applied improvements` section is omitted (zero items)

#### Scenario: pick-subset accepts both bullets and package names

- **WHEN** the user picks `pick-subset` and submits `react, "react: useTransition for non-urgent work"`
- **THEN** the skill parses `react` as a bump exclusion (exact match against the bump-set names)
- **AND** parses `react: useTransition for non-urgent work` as an improvement exclusion (substring match against the plan's improvement bullet titles)
- **AND** applies both exclusions to Step 10a (bumps) and Step 10b (improvements) respectively

#### Scenario: pick-subset re-prompts on unknown selection

- **WHEN** the user submits a selection that matches neither a bump name nor an improvement bullet title
- **THEN** the skill prints `Unknown selection(s): {invalid items}. Valid improvements: {titles}. Valid bumps: {names}.`
- **AND** re-prompts for selection input

---

### Requirement: Deep-mode Step 10 splits into bumps loop + plan-mode round

When `mode === "deep"` and the gate option is `apply-all` or `apply-bumps-only`, Step 10 SHALL be split:

- **Step 10a — Bumps loop**: identical to shallow Step 10. Iterate projects in registry order; for each project, run generic ncu bumps + catalog edits + override commands + one install. Stop-on-fail aborts the entire run, including any planned Step 10b.
- **Step 10b — Plan-mode round** (fires only when the gate option was `apply-all` AND Step 10a completed without failure for at least one project AND the workflow's `plan.md` contains at least one improvement bullet):

    1. For each improvement bullet in `plan.md`, for each project in the bullet's `affects projects:` tag intersected with the projects that successfully applied bumps in Step 10a:
        - **Reconnaissance**: the main agent reads the project's hinted areas (file globs, directory hints, framework names) and classifies the bullet as `applicable` (here is the concrete edit, with path + before/after snippet for non-trivial edits) or `inapplicable` (with a one-sentence reason).
    2. **Plan-mode entry**: the main agent invokes the `EnterPlanMode` tool with a unified markdown document containing:
        - All applicable (improvement × project) pairs with their concrete edits.
        - All inapplicable (improvement × project) pairs with their reasons.
        - A summary footer counting `applicable: <N>` and `inapplicable: <M>`.
    3. **User review**:
        - **Approved** → exit plan-mode and execute edits across projects via `Edit` / `Write`. Continue to Step 11.
        - **Rejected** → print `Improvements rejected at plan-mode review. No improvement edits applied; bumps are preserved.` and continue to Step 11.

When `mode === "shallow"`, Step 10 behaves as today — a single per-project bumps loop with no plan-mode round.

#### Scenario: Stop-on-fail in Step 10a aborts the entire deep run

- **WHEN** project 2 of 3 fails its ncu invocation in Step 10a
- **THEN** the bumps loop stops immediately; project 3 is not attempted; project 3 is marked `pending`
- **AND** Step 10b SHALL NOT execute
- **AND** the summary lists `Applied projects: proj-1`, `Failed project: proj-2`, `Pending projects: proj-3`
- **AND** the plan-mode round's reconnaissance and `EnterPlanMode` are not invoked

#### Scenario: apply-all happy path runs both 10a and 10b

- **WHEN** Step 10a completes successfully for every applied project AND `plan.md` has at least one improvement bullet
- **THEN** the main agent runs reconnaissance per (improvement × affected, applied project)
- **AND** invokes `EnterPlanMode` with the unified edit set
- **AND** on user approval, executes edits via `Edit` / `Write`

#### Scenario: apply-all with no improvement bullets in plan.md skips Step 10b silently

- **WHEN** Step 10a completes successfully but `plan.md`'s improvements section is `_no improvements identified_`
- **THEN** Step 10b SHALL NOT execute
- **AND** the summary's `Applied improvements` section is omitted
- **AND** the user receives no plan-mode prompt

#### Scenario: Plan-mode rejection preserves bumps and skips improvements

- **WHEN** the user rejects the plan-mode round
- **THEN** the skill prints `Improvements rejected at plan-mode review. No improvement edits applied; bumps are preserved.`
- **AND** no `Edit` / `Write` invocations execute for improvements
- **AND** the summary's `Applied improvements` section reports zero items
- **AND** applied bumps from Step 10a are NOT reverted

#### Scenario: Reconnaissance discovers adjacent opportunity outside plan.md

- **WHEN** during reconnaissance the main agent identifies an improvement opportunity not present in `plan.md`
- **THEN** the opportunity SHALL NOT be silently added to the plan-mode edit set
- **AND** it SHALL be surfaced in the Step 11 summary's `Suggested next steps` list with a brief note

---

### Requirement: Deep-mode Step 11 summary additions

When `mode === "deep"`, the summary's H1 SHALL be `## commander-update-deep-<level> summary`. The summary SHALL include, conditionally (omit when count is zero, except `Suggested next steps` which always renders):

- `**Applied projects (<N>):**` and `**Failed project:**` and `**Pending projects (<N>):**` — identical to shallow.
- `**Applied improvements (<N>):**` — one line per applied `(improvement bullet, project)` pair: `- {bullet title} → {project} ({sourceFile or general path hint})`. Only when Step 10b executed and at least one edit was approved + applied.
- `**Skipped improvements (<N>):**` — one line per improvement excluded via `pick-subset` OR rejected at plan-mode review. The skill SHALL distinguish the two with a parenthetical: `(excluded via pick-subset)` or `(rejected at plan-mode review)`.
- `**Inapplicable improvements (<N>):**` — one line per `(improvement bullet, project)` pair marked inapplicable during reconnaissance: `- {bullet title} → {project} ({reason})`.
- `**Skipped or unavailable groups (<N>):**` — copied verbatim from `plan.md`'s `## Skipped or unavailable` section (workflow-owned).
- `**Skipped (path missing) (<N>):**` and `**Skipped (scan-failed) (<N>):**` and `**Skipped by user (<N>):**` and `**Skipped by conflict policy (<N>):**` and `**Skipped by override (<N>):**` and `**Warnings (<N>):**` — identical to shallow.
- `**Suggested next steps (not executed):**` — always renders, with the three baseline bullets (test, lint/typecheck, git diff + commit) plus `Review <plan-dir>/plan.md before re-running.` when the workflow's end-of-flow cleanup recorded `keep-plan`.

When `mode === "shallow"`, the summary keeps its current shape (no `Applied improvements`, `Skipped improvements`, `Inapplicable improvements`, `Skipped or unavailable groups` sections).

#### Scenario: Deep summary H1 is namespaced

- **WHEN** the run completes in deep mode for `level: "patch"`
- **THEN** the summary starts with `## commander-update-deep-patch summary` (not `## commander-update-patch summary`)

#### Scenario: Applied improvements section shows per-project edits

- **WHEN** plan-mode applied two edits — `react: useTransition for non-urgent updates` to proj-A and `@tanstack/react-query: persistQueryClient new API` to proj-B
- **THEN** the summary's `Applied improvements (2):` section lists exactly those two bullets with their target projects

#### Scenario: Inapplicable improvements surfaced with reason

- **WHEN** during reconnaissance the main agent marks `react: useTransition for non-urgent updates` as inapplicable to proj-C with reason `Project uses Solid, not React`
- **THEN** the summary's `Inapplicable improvements (≥1):` section lists `- react: useTransition for non-urgent updates → proj-C (Project uses Solid, not React)`

#### Scenario: Suggested next steps gains plan-dir review bullet when kept

- **WHEN** the workflow's end-of-flow cleanup recorded `keep-plan`
- **THEN** the `Suggested next steps` section includes `- Review <plan-dir>/plan.md before re-running.` as a fourth bullet
