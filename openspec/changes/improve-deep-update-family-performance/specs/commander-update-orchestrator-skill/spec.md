## MODIFIED Requirements

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

### Requirement: Deep-mode confirmation gate offers `apply-bumps-only`

When `mode === "deep"`, the skill's confirmation gate (Step 9) SHALL raise an `AskUserQuestion` with **four** options instead of three:

- **Question copy**: `Apply <level> updates across <N> project(s)?`
- `multiSelect: false`
- **Options** (in this exact order):
    - `apply-all` — proceed with the entire (post-policy, post-override) plan, INCLUDING the post-bumps per-project changeset gate round.
    - `apply-bumps-only` — apply bumps + overrides + installs sequentially per project, but SKIP the changeset gate round entirely.
    - `pick-subset` — accept a free-form list combining improvement-bullet titles and package names (substring match for improvements, exact match for bumps). Excluded improvements are excluded from the changeset gate round; excluded packages skip the bumps for those names.
    - `cancel` — exit without modifying any file.

Shallow mode (`mode === "shallow"` or absent) preserves its three-option gate (`apply-all` / `pick-subset` / `cancel`) unchanged.

#### Scenario: apply-bumps-only skips the changeset gate round

- **WHEN** the user picks `apply-bumps-only`
- **THEN** Step 10a (per-project bumps loop) executes normally
- **AND** Step 10b (per-project changeset gate round) SHALL NOT execute
- **AND** the summary's `Applied improvements` section is omitted (zero items)

#### Scenario: pick-subset accepts both bullets and package names

- **WHEN** the user picks `pick-subset` and submits `react, "react: useTransition for non-urgent work"`
- **THEN** the skill parses `react` as a bump exclusion (exact match against the bump-set names)
- **AND** parses `react: useTransition for non-urgent work` as an improvement exclusion (substring match against the dossier's improvement bullet titles)
- **AND** applies both exclusions to Step 10a (bumps) and Step 10b (improvements) respectively

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

### Requirement: Deep engines-level research routing

When `level=engines` and `mode=deep`, the orchestrator's deep-mode research insertion SHALL invoke `parallel-research-workflow` with `level=engines` (so research targets engine release notes, deduplicated once per engine/version) and SHALL surface the resulting `dossier.md` — including the presence of its `## Breaking changes & migration` and `## Changelogs` sections — through the deep-mode dossier gate rendering (by path + digest, never verbatim bodies). No `## PR plan` / `partition-breaking-changes` section applies at engines level.

#### Scenario: Deep engines uses engine release-note research

- **WHEN** the orchestrator runs with `level: "engines"`, `mode: "deep"`
- **THEN** it invokes `parallel-research-workflow` with `level=engines` and surfaces the dossier digest referencing the `## Breaking changes & migration` + `## Changelogs` sections, with no `## PR plan` section

## REMOVED Requirements

### Requirement: Deep-mode plan rendering reads workflow `plan.md`

**Reason**: Replaced by "Deep-mode dossier gate rendering" (added below). The main no longer ingests or surfaces the full research document (main-window context diet); the artifact is renamed `dossier.md`.

### Requirement: Deep-mode Step 10 splits into bumps loop + plan-mode round

**Reason**: Replaced by "Deep-mode Step 10 splits into bumps loop + per-project changeset gate" (added below). Improvements are no longer applied by the main agent after an in-main plan-mode round; a per-project apply teammate applies them behind the orchestrator-owned gate.

## ADDED Requirements

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

### Requirement: Deep-mode Step 10 splits into bumps loop + per-project changeset gate

When `mode === "deep"` and the gate option is `apply-all` or `apply-bumps-only`, Step 10 SHALL be split:

- **Step 10a — Bumps loop**: identical to shallow Step 10 (iterate projects in registry order; generic ncu bumps + catalog edits + override commands + one install per project), with `ncu`/install output redirected to on-disk logs per the `npm-update-apply` contract (digest + bounded tail-on-failure only). Stop-on-fail pauses the run at the per-project failure gate (stop vs continue is a user decision, per the experiments-plugin "Sequential cross-project apply with stop-on-fail" requirement).
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
