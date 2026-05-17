## MODIFIED Requirements

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

## ADDED Requirements

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
