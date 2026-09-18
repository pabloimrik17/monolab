## MODIFIED Requirements

### Requirement: Deep-mode research insertion (Step 6.5) between version alignment and override consultation

When `mode === "deep"`, the skill SHALL insert a research step between Step 6 (version alignment) and Step 7 (dossier gate rendering). The research step SHALL:

1. Build a deduplicated package set from the post-policy `CrossProjectPlan.packages` — one `updates[]` record per unique package, carrying the package's `name`, the chosen `effectiveTarget` as `targetVersion`, the most-common `currentVersion` across occurrences as `currentVersion`, a synthetic `location: "cross-project"`, and a synthetic `sourceFile: "cross-project"`. The deduplication SHALL preserve the package set sort order (alphabetical by name) from Step 7.
2. Invoke `experiments:group-packages-for-research` with the deduplicated package set. Capture the `groups[]` and `warnings[]` outputs. Append the warnings to the orchestrator's running list for the summary.
3. Build a synthetic `ScanResult` value for the workflow input (`packageManager` union or `"mixed"`, `repoType: "workspace"`, the deduplicated `updates`, the running `warnings`) — unchanged.

**Step 6.5.3b — Recall prior run knowledge.** Between 6.5.3 and 6.5.4 the skill SHALL invoke `recall-run-knowledge` with the `groups[]` emitted by 6.5.2, the `level`, and `mode: cross-project`, and SHALL pass its output into 6.5.4 as the workflow's optional `priorKnowledge` input. The step SHALL sit after grouping — it consumes the emitted groups' `bucketKey` — and before the workflow invocation, because `priorKnowledge` reaches the research subagents through the workflow and not around it. A hit SHALL NOT remove a package from its group; the package still fetches its changelog and still appears in the cross-project bump set. The skill SHALL NOT open a run note or a package hub: it SHALL surface only the recall digest `Knowledge: <e> exact, <o> overlap, <p> prior, <r> related of <n> packages`. When the knowledge base is absent, recall SHALL return `{ hits: [] }`, SHALL emit `Knowledge: no base at <root>`, and 6.5.4 SHALL be invoked with no `priorKnowledge` input, leaving the rest of the deep run byte-for-byte as it was before this step existed.

4. Invoke `experiments:parallel-research-workflow` with `{ groups, level, scanResult, priorKnowledge, mode: "cross-project", slugOverride: "commander-deep-<level>" }`, omitting `priorKnowledge` when the knowledge base is absent. Capture the absolute plan-dir path emitted by the workflow.

The workflow's phase 0 (stale-cleanup), phase 1 (changelogs), phase 2 (research), phase 3 (integrity), phase 4 (dossier synthesis) all run within this single invocation. The skill SHALL NOT advance the workflow's phases on its behalf.

#### Scenario: Dossier synthesis runs inside the single workflow invocation

- **WHEN** the skill runs in deep mode
- **THEN** phases 0 through 4 — including dossier synthesis — run within the single `parallel-research-workflow` invocation
- **AND** the orchestrator does not advance the workflow's phases on its behalf

#### Scenario: Recall precedes the workflow invocation

- **WHEN** 6.5.2 emits the groups for the deduplicated cross-project package set
- **THEN** the skill invokes `recall-run-knowledge` with those groups, the `level`, and `mode: cross-project` BEFORE invoking `experiments:parallel-research-workflow`
- **AND** the recall output is passed to the workflow as its `priorKnowledge` input
- **AND** no package is removed from its group because of a hit

#### Scenario: Absent knowledge base leaves the deep run unchanged

- **WHEN** the resolved knowledge root does not exist
- **THEN** the skill emits `Knowledge: no base at <root>` and invokes the workflow with no `priorKnowledge` input
- **AND** every group is dispatched for fresh research exactly as it would be with Step 6.5.3b absent

---

### Requirement: Deep-mode Step 10 splits into bumps loop + per-project changeset gate

When `mode === "deep"` and the gate option is `apply-all` or `apply-bumps-only`, Step 10 SHALL be split:

- **Step 10a — Bumps loop**: identical to shallow Step 10 (iterate projects in registry order; generic ncu bumps + catalog edits + override commands + one install per project), with `ncu`/install output redirected to on-disk logs per the `apply-npm-updates` contract (digest + bounded tail-on-failure only). Stop-on-fail pauses the run at the per-project failure gate (stop vs continue is a user decision, per the experiments-plugin "Sequential cross-project apply with stop-on-fail" requirement).
- **Step 10b — Per-project changeset gate round** (fires only when the gate option was `apply-all` AND Step 10a completed without failure for at least one project AND the dossier contains at least one improvement bullet): for each project that successfully applied bumps, sequentially, the skill SHALL run the per-project apply gate defined by the experiments-plugin requirements "Per-project apply gate with turn-boundary pause" and "Human approval gate interface":

  1. Spawn a single apply teammate whose turn-1 task is reconnaissance over the dossier bullets affecting the project (classifying each as applicable, with the concrete edit, or inapplicable, with a one-sentence reason) and writing `changeset.md` under the run directory — with no source-file modification.
  2. Run the deterministic pre-gate check (source untouched); on violation, abort the project without opening the gate.
  3. Present the changeset through the orchestrator-owned human gate. On approval, send the still-alive teammate the proceed instruction; the teammate applies the edits; the orchestrator verifies the applied result on disk. On reject-with-feedback, relay the feedback for revision and re-present.
  4. Tear the teammate down via `TaskStop` when the project's round completes.

- **Step 10b.5 — Run knowledge persistence** (fires whenever Step 10a ran: after the last project's Step 10b round, or directly after Step 10a when no changeset round applied, and always before Step 10c end-of-flow cleanup): the skill SHALL

  1. Write `_meta.json.phase` as `"done"` atomically (temp sibling, then rename); `"executing"` SHALL have been written the same way when Step 10a began, before the first project's manifests were touched.
  2. Assemble the outcome object (the store's `outcome.json` shape, without `recordedAt`) carrying `runId`, `level`, `mode`, the selected `gateOption`, and **one `projects[]` entry per project** that reached apply — `projectName`, `mechanism` `apply-npm-updates` (dependency levels) or `apply-engine-bumps` (`level=engines`), `bumps` set to that project's returned result fragment verbatim, and `changeset` recording that project's gate `status` (`approved`, `verification-failed`, `rejected`, `skipped`, `not-run`, `unknown`), its run-dir-relative `path` (or `null`), and its applicable and inapplicable counts (`null` when the project has no changeset).
  3. Invoke `persist-run-knowledge` with `{ runDir, outcome }` **exactly once for the whole run** — one run note covering every project, never one invocation per project; the skill stamps `recordedAt` and writes `<plan-dir>/outcome.json`, the orchestrator SHALL NOT write it — and surface its one-line digest for the Step 11 `Knowledge:` line.

  The skill SHALL skip persistence, emitting `Knowledge: not persisted (<reason>)` and nothing else, when the user selected `cancel`, when the run ended in any `abort`, or when the run-level `outcome` derived from the assembled outcome object is `failed` (no project's `bumps.failure` is absent or `null`). A project whose changeset reported `Applicable (0)` SHALL still be persisted. Persistence SHALL NOT alter any apply, changeset, or skip section of the Step 11 summary; a failure inside `persist-run-knowledge` SHALL surface as `Knowledge: not persisted (<reason>)`, SHALL NOT abort the run, and SHALL NOT prevent Step 10c from firing.

The orchestrator SHALL NOT apply improvement edits itself. When the gate is rejected for a project, the skill SHALL print `Improvements rejected at the changeset gate. No improvement edits applied; bumps are preserved.` for that project and continue to the next.

When `mode === "shallow"`, Step 10 behaves as today — a single per-project bumps loop with no changeset gate round and no Step 10b.5 persistence.

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

#### Scenario: Persist runs once, after the last changeset round and before cleanup

- **WHEN** the gate option was `apply-all` and three projects completed their Step 10b rounds
- **THEN** the skill invokes `persist-run-knowledge` exactly once, after the third project's round and before Step 10c end-of-flow cleanup
- **AND** the run is represented by a single run note covering all three projects

#### Scenario: Phase written at both apply boundaries

- **WHEN** Step 10a begins and later completes
- **THEN** `_meta.json.phase` is `"executing"` before the first project's manifests are written and `"done"` at Step 10b.5 before `persist-run-knowledge` reads the run directory
- **AND** both writes are atomic

#### Scenario: Run where every project failed is not persisted

- **WHEN** every project in the resolved set failed its Step 10a apply, making the run-level `outcome` `failed`
- **THEN** `persist-run-knowledge` is NOT invoked and the Step 11 `Knowledge:` line reads `Knowledge: not persisted (<reason>)`
- **AND** Step 10c end-of-flow cleanup still fires

#### Scenario: apply-bumps-only run is persisted with changeset not-run

- **WHEN** the gate option was `apply-bumps-only` and two projects applied bumps cleanly
- **THEN** Step 10b.5 fires directly after Step 10a and the run is persisted
- **AND** each project's `outcome.json` entry carries `changeset.status` `not-run` with a `null` `path`

---

### Requirement: Deep-mode Step 11 summary additions

When `mode === "deep"`, the summary's H1 SHALL be `## commander-update-deep-<level> summary`. The summary SHALL include, conditionally (omit when count is zero, except `Knowledge:` and `Suggested next steps`, which always render):

- `**Applied projects (<N>):**` and `**Failed project:**` and `**Pending projects (<N>):**` — identical to shallow.
- `**Applied improvements (<N>):**` — one line per applied `(improvement bullet, project)` pair: `- {bullet title} → {project} ({sourceFile or general path hint})`. Only when Step 10b executed and at least one changeset was approved + applied.
- `**Skipped improvements (<N>):**` — one line per improvement excluded via `pick-subset` OR rejected at the changeset gate. The skill SHALL distinguish the two with a parenthetical: `(excluded via pick-subset)` or `(rejected at the changeset gate)`.
- `**Inapplicable improvements (<N>):**` — one line per `(improvement bullet, project)` pair marked inapplicable during the apply teammate's reconnaissance: `- {bullet title} → {project} ({reason})`.
- `**Skipped or unavailable groups (<N>):**` — sourced from `dossier.md`'s `## Skipped or unavailable` section (workflow-owned).
- `**Skipped (path missing) (<N>):**` and `**Skipped (scan-failed) (<N>):**` and `**Skipped by user (<N>):**` and `**Skipped by conflict policy (<N>):**` and `**Skipped by override (<N>):**` and `**Warnings (<N>):**` — identical to shallow.
- `**Knowledge:**` — the one-line digest returned by `persist-run-knowledge` at Step 10b.5, reproduced verbatim: `Knowledge: persisted <runId> → <root> (<p> packages, <h> hubs, <d> distilled, status <ok|draft>)` when the run was persisted, or `Knowledge: not persisted (<reason>)` when it was not. Always renders in deep mode, immediately before `Suggested next steps`.
- `**Suggested next steps (not executed):**` — always renders, with the three baseline bullets (test, lint/typecheck, git diff + commit) plus `Review <plan-dir>/dossier.md before re-running.` when the workflow's end-of-flow cleanup recorded `keep-plan`.

When `mode === "shallow"`, the summary keeps its current shape (no `Applied improvements`, `Skipped improvements`, `Inapplicable improvements`, `Skipped or unavailable groups`, `Knowledge:` sections).

#### Scenario: Suggested next steps gains dossier review bullet when kept

- **WHEN** the workflow's end-of-flow cleanup recorded `keep-plan`
- **THEN** the `Suggested next steps` section includes `- Review <plan-dir>/dossier.md before re-running.` as a fourth bullet

#### Scenario: Knowledge line always renders in deep mode

- **WHEN** the Step 11 summary renders on any terminal path of a deep run
- **THEN** exactly one `Knowledge:` line is present, immediately before `Suggested next steps`
- **AND** its text is the `persist-run-knowledge` digest verbatim, with no rewording or truncation

#### Scenario: Knowledge line states the skip reason

- **WHEN** the user selected `cancel` at the confirmation gate of a deep run
- **THEN** the `Knowledge:` line reads `Knowledge: not persisted (<reason>)` naming the skip reason
- **AND** every other summary section renders exactly as it would without this line

---

### Requirement: Hard rules

The skill SHALL preserve every hard rule of `/experiments:npm-update-patch`:

- The skill SHALL NOT create commits, push, or open pull requests autonomously in any project; it stops for human-in-the-loop review before any such outward/VCS action (opt-in isolation branch/worktree creation via `update-isolation` is permitted).
- The skill SHALL NOT modify any file outside the per-project manifests it bumps, the deep-mode run directory under `~/.claude/experiments/plans/`, and the knowledge root written at Step 10b.5; in particular, the user-scoped registry `<HOME>/.claude/commander/projects.json` SHALL remain byte-identical before and after the run.
- The skill SHALL NOT mutate any consumer `package.json` entry that is a `catalog:` reference — only `pnpm-workspace.yaml` for those.
- The skill SHALL NOT auto-execute an override command without the user selecting `run-override` for that entry.
- The skill SHALL NOT run `ncu --upgrade` as a fallback after an override command fails (mirrors `npm-update-patch`).
- The skill SHALL write to the knowledge root only on the `apply-*` paths — `apply-all`, `apply-bumps-only`, and `pick-subset`, that is every confirmation-gate option other than `cancel` — and only through the `persist-run-knowledge` skill invoked at Step 10b.5. On `cancel` and on every `abort` the skill SHALL NOT invoke `persist-run-knowledge`, SHALL NOT create the knowledge root, and SHALL NOT write any file under it.

#### Scenario: Registry unchanged

- **WHEN** the skill completes any run (success, partial, cancel)
- **THEN** `<HOME>/.claude/commander/projects.json` SHALL be byte-identical before and after the run (verifiable by `shasum`)

#### Scenario: No autonomous commit/push/PR

- **WHEN** the skill completes apply across multiple projects
- **THEN** no `git commit`, `git push`, or pull-request-creation command has been invoked by the skill in any project

#### Scenario: Cancel leaves the knowledge root untouched

- **WHEN** the user selects `cancel` at the confirmation gate
- **THEN** `persist-run-knowledge` is NOT invoked
- **AND** no file under the resolved knowledge root is created or modified, and a previously absent knowledge root SHALL still be absent
- **AND** `<HOME>/.claude/commander/projects.json` remains byte-identical
