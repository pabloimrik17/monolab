# npm-update-deep-patch-command Specification

## Purpose
TBD - created by archiving change add-npm-update-deep-patch. Update Purpose after archive.
## Requirements
### Requirement: Command entry point and scope

The command SHALL be invokable as `/experiments:npm-update-deep-patch` with no positional arguments. The command SHALL operate exclusively at patch level — it SHALL pass `level=patch` to the scan skill and SHALL NOT accept a different level via flags or prompts.

#### Scenario: Invocation with no arguments

- **WHEN** the user runs `/experiments:npm-update-deep-patch`
- **THEN** the command begins the workflow at the scan step using `level=patch`

#### Scenario: Level is fixed

- **WHEN** the user attempts to pass arguments such as `level=minor`
- **THEN** the command ignores the argument and still scans at `level=patch`

### Requirement: Scan delegation

The command SHALL invoke the `experiments:scan-npm-updates` skill exactly once with `level=patch` and consume the resulting `ScanResult` JSON verbatim. The command SHALL NOT mutate the scan output. If the scan skill aborts (any of its four preconditions), the command SHALL surface the scan error verbatim and exit without creating a plan directory.

#### Scenario: Scan failure surfaces verbatim

- **WHEN** `scan-npm-updates` aborts with `Error: invalid level "patch". Expected ...`
- **THEN** the command prints that exact message and exits without creating a plan dir

#### Scenario: ScanResult passed unchanged

- **WHEN** `scan-npm-updates` returns a ScanResult containing 12 updates
- **THEN** the workflow stage receives those 12 updates with no fields added, removed, or modified

### Requirement: Empty-result short-circuit

If the scan returns `updates.length === 0`, the command SHALL:

1. Print every non-empty `warnings` entry as a bullet list under the heading `Warnings:`.
2. Print the literal line `No patch updates available.`
3. Exit without creating a plan directory and without invoking grouping or research workflow.

#### Scenario: Empty updates exits early

- **WHEN** the scan returns `updates: []` and `warnings: []`
- **THEN** the command prints `No patch updates available.` and exits with no plan dir created

#### Scenario: Warnings printed before empty message

- **WHEN** the scan returns `updates: []` and `warnings: ["ncu failed on package.json"]`
- **THEN** the command prints the `Warnings:` heading followed by the warning bullet, then `No patch updates available.`, then exits

### Requirement: Workflow orchestration

When the scan returns one or more updates, the command SHALL invoke the `dependency-grouping-strategy` skill with object input `{ updates: ScanResult.updates }` (and `maxPerGroup` only when explicitly overridden), then invoke the `recall-run-knowledge` skill at Step 3.5 with the emitted `groups`, the `level` `patch`, and `mode: single-project`, then invoke the `parallel-research-workflow` skill with the resulting groups, the level `patch`, the verbatim `ScanResult` (so the workflow can persist `scan.json`), and the recall result as the workflow's optional `priorKnowledge` input only when `baseAbsent` is false, `error` is absent, and a hit or related entry exists. The command SHALL surface progress messages emitted by the workflow but SHALL NOT advance phases on the workflow's behalf.

Step 3.5 SHALL sit after grouping — it consumes the emitted groups' `bucketKey` — and before the workflow dispatch, because `priorKnowledge` reaches the research subagents through the workflow and not around it. A recall hit SHALL NOT remove a package from its group; the package still fetches its changelog and still appears in the bump set. The command SHALL NOT open a run note or a package hub itself: it SHALL surface only the recall digest `Knowledge: <e> exact, <o> overlap, <p> prior, <r> related of <n> packages`.

When the knowledge base is absent, Step 3.5 SHALL be a no-op: recall SHALL preserve the complete `{ root, baseAbsent: true, hits: [], related: [], summary }` result, SHALL emit the digest `Knowledge: no base at <root>`, and the command SHALL invoke `parallel-research-workflow` without a `priorKnowledge` input, leaving the rest of the run byte-for-byte as it was before this step existed. A complete result carrying `error` likewise remains available to the caller but SHALL produce `Knowledge: recall failed (<reason>)` and no `priorKnowledge`.

This command is the anchor of the single-project deep family: the recall step here and the phase and persist steps below belong to the shared deep contract, so `/experiments:npm-update-deep-minor`, `/experiments:npm-update-deep-major`, and `/experiments:npm-update-deep-engines` inherit them under the experiments-plugin `Deep command family consolidation` rule and SHALL NOT restate them per level.

#### Scenario: Grouping precedes workflow dispatch

- **WHEN** the scan returns 3 updates
- **THEN** the command first calls `dependency-grouping-strategy` with those updates, then calls `parallel-research-workflow` with the resulting groups

#### Scenario: Recall precedes workflow dispatch

- **WHEN** the grouping skill emits 2 groups for the scanned updates
- **THEN** the command invokes `recall-run-knowledge` with those 2 groups, `level` `patch`, and `mode: single-project` BEFORE it invokes `parallel-research-workflow`
- **AND** a non-error recall output with at least one hit or related entry is passed unchanged to the workflow as its `priorKnowledge` input
- **AND** no package is removed from its group because of a hit

#### Scenario: Absent knowledge base leaves the run unchanged

- **WHEN** the resolved knowledge root does not exist
- **THEN** the command emits `Knowledge: no base at <root>` and invokes `parallel-research-workflow` with no `priorKnowledge` input
- **AND** every group is dispatched for fresh research exactly as it would be with Step 3.5 absent

#### Scenario: Workflow drives phases

- **WHEN** the workflow is in phase `changelogs`
- **THEN** the command does not dispatch subagents itself; it relies on the workflow skill to do so

---

### Requirement: Pre-scan stale-cleanup is delegated

The command SHALL NOT perform stale-cleanup itself; it SHALL rely on the `parallel-research-workflow` skill's stale-cleanup requirement to handle that prompt before any new plan dir is created.

#### Scenario: No double cleanup

- **WHEN** the command runs and stale dirs exist
- **THEN** the cleanup prompt is shown exactly once (by the workflow skill, not the command)

### Requirement: Execution prompt after dossier synthesis

When the workflow finishes phase 4 (dossier synthesis) successfully, the command SHALL surface the dossier by absolute path plus a bounded digest (bump-set table, improvement bullet titles, skipped groups — never the `## Changelogs` bodies), then prompt the user via `AskUserQuestion` with these options, in this order:

- `apply-all` — execute every item in the dossier: bump every package in the `Patch bump set` table AND take every bullet in the `Improvements (applicable to this codebase)` section through the changeset gate.
- `apply-bumps-only` — bump every package in the `Patch bump set` table; skip improvements entirely.
- `pick-subset` — accept a free-form list of dossier items (improvement bullets and/or specific bumps) to apply.
- `cancel` — exit without modifying any file.

The command SHALL show the prompt exactly once per invocation. The command SHALL NOT auto-apply any dossier item without an explicit option selection.

If the workflow returns an early-exit signal before phase 4 completes (stale-cleanup `cancel` or integrity-verification `abort`), the command SHALL NOT call `AskUserQuestion` for the execution prompt. The command SHALL exit immediately without applying any dossier items and SHALL emit a short summary indicating the early-exit reason (e.g. `Cancelled by stale-cleanup. No files modified.` or `Aborted on integrity check. No files modified.`) before delegating to the workflow's cleanup prompt.

#### Scenario: Prompt order

- **WHEN** dossier synthesis completes
- **THEN** the prompt options are presented in the order `apply-all`, `apply-bumps-only`, `pick-subset`, `cancel`

#### Scenario: Cancel preserves files and plan dir

- **WHEN** the user selects `cancel`
- **THEN** no file in the workspace is modified and the plan dir remains on disk pending the cleanup prompt

#### Scenario: Early-exit skips the execution prompt

- **WHEN** the workflow returns an early-exit signal from stale-cleanup `cancel` or integrity-verification `abort` before phase 4 completes
- **THEN** the command does NOT call `AskUserQuestion` for the execution prompt, applies no dossier items, and prints a short summary identifying the early-exit reason before the workflow's cleanup prompt fires

### Requirement: Bump application reuses existing infrastructure

For `apply-all`, `apply-bumps-only`, and `pick-subset` (when bumps are included), the command SHALL apply patch-level bumps by invoking the `npm-update-apply` skill (the single source of truth for the single-project apply mechanism) with `target: "patch"`. The command SHALL build the resolved apply spec from the accepted set — `package.json` manifests as `manifestBumps` (with `includeFilter` set when the accepted set for a file is a strict subset, i.e. `pick-subset` partial inclusion) and `pnpm-workspace.yaml#catalog` entries as `catalogEdits` — and SHALL pass an empty `overrideCommands` set: the deep path consults NO override registry (the override flow remains the shallow `/experiments:npm-update-patch` path's responsibility). The skill runs `npm-check-updates@21.0.2` per manifest, performs the in-memory catalog edits, and runs exactly one install at the end; the command SHALL NOT restate that recipe inline.

#### Scenario: Bumps delegated to npm-update-apply

- **WHEN** the package manager is pnpm and 12 bumps are applied across 3 manifests
- **THEN** the command invokes `npm-update-apply` once with `target: "patch"`, which runs `pnpm install` exactly once after all manifests are written
- **AND** the command does not invoke `npm-check-updates` directly

#### Scenario: Catalog entries handled in-memory via the apply spec

- **WHEN** an update has `sourceFile: "pnpm-workspace.yaml"`
- **THEN** the command passes it as a `catalogEdits` entry to `npm-update-apply`, which edits the `catalog:` block in place and does NOT invoke `npm-check-updates` for that file

#### Scenario: Deep path passes no overrides

- **WHEN** the command builds the apply spec
- **THEN** `overrideCommands` is empty and no override registry is loaded (the deep single-project path does not consult overrides)

### Requirement: Improvement application via the changeset gate

For `apply-all` and `pick-subset` (when improvements are included), the command SHALL apply improvements through the per-project apply gate defined by the experiments-plugin requirements "Per-project apply gate with turn-boundary pause" and "Human approval gate interface" — never via blind edits and never by the main agent. The flow SHALL be:

1. **Teammate reconnaissance (turn 1)**: a single apply teammate reads each in-scope improvement bullet's area hints and the relevant files, classifies each bullet as `applicable` (with the concrete edit: file path, brief description, before/after snippet for non-trivial edits) or `inapplicable` (with a one-sentence reason), and writes `changeset.md` under the run directory — with no source-file modification. A summary footer counts applicable vs inapplicable.
2. **Pre-gate check**: the command runs the deterministic source-untouched check; on violation, the improvement round aborts without opening the gate.
3. **Human gate**: the changeset is presented through the orchestrator-owned gate. On approval the command sends the still-alive teammate the proceed instruction; the teammate applies the edits; the command verifies the applied result on disk. On reject-with-feedback the feedback is relayed for revision and the changeset re-presented. On rejection the command prints `Improvements rejected at the changeset gate. No improvement edits applied; bumps are preserved.` and skips to the summary step. Bumps applied in the prior step are NOT reverted.

After the gated edits are applied, the command may run read-only verification over those edits and surface the result in the final summary (read-only, no `--fix`). The command SHALL NOT create commits or PRs as part of improvement application; it stops for human-in-the-loop review before any such outward/VCS action. The command SHALL NOT expand scope beyond bullets present in `dossier.md`; adjacent opportunities identified during reconnaissance or gate review SHALL be surfaced as suggestions in the final summary, never silently added to the changeset.

#### Scenario: Changeset written before any improvement edit

- **WHEN** the user selects `apply-all` after the bumps install completes
- **THEN** the apply teammate writes `changeset.md` listing the proposed edits per improvement bullet, BEFORE any `Edit` or `Write` call against a workspace file
- **AND** the gate opens only after the pre-gate check confirms the source is untouched

#### Scenario: Inapplicable bullets are explicit

- **WHEN** the dossier contains 10 improvement bullets and reconnaissance finds that 7 do not land in this codebase
- **THEN** `changeset.md` lists those 7 explicitly with one-sentence reasons each, alongside the 3 applicable bullets with their concrete edits

#### Scenario: Approval delegates the apply to the teammate

- **WHEN** the user approves the changeset
- **THEN** the main agent does NOT apply the edits itself
- **AND** the still-alive teammate applies exactly the approved edits
- **AND** the command verifies the applied result on disk

#### Scenario: Gate rejection preserves bumps

- **WHEN** the user rejects the changeset after bumps already landed
- **THEN** the command prints `Improvements rejected at the changeset gate. No improvement edits applied; bumps are preserved.` and proceeds to the summary; no improvement edits are made and no bumps are reverted

#### Scenario: Improvements scoped to dossier content

- **WHEN** the user selects `apply-all` and the dossier contains 4 improvement bullets
- **THEN** improvement application proceeds against exactly those 4 bullets, with no expansion to items outside `dossier.md`

#### Scenario: No autonomous commit/push/PR

- **WHEN** improvement application completes
- **THEN** no `git commit`, `git push`, or pull-request-creation command has been invoked by the command

### Requirement: Final summary

After execution (or after `cancel`), the command SHALL print a markdown summary that lists, conditionally:

- `Applied bumps ({N}):` — one line per bumped package with `name`, `currentVersion → targetVersion`, `location`.
- `Applied improvements ({N}):` — one line per improvement bullet successfully applied.
- `Skipped improvements ({N}):` — one line per improvement bullet declined under `pick-subset` or rejected at the changeset gate.
- `Skipped or unavailable groups ({N}):` — sourced from `dossier.md`'s corresponding section.
- `Install:` — `<pm> install executed` if any bump was applied, otherwise `skipped (no bumps applied)`.
- `Knowledge:` — the one-line digest returned by `persist-run-knowledge` at Step 7.5, reproduced verbatim: `Knowledge: persisted <runId> → <root> (<p> packages, <h> hubs, <d> distilled, status <ok|draft>)` when the run was persisted, or `Knowledge: not persisted (<reason>)` when it was not.
- `Suggested next steps (not executed):` — bullets reading `Run your test suite.`, `Run lint / typecheck.`, `Review changes (\`git diff\`) and commit.`

The `Knowledge:` line SHALL render immediately after `Install:` and before `Suggested next steps`.

Sections with count zero SHALL be omitted, except `Knowledge:` and `Suggested next steps`, which SHALL always be present.

#### Scenario: Skipped groups sourced from the dossier

- **WHEN** the summary renders with skipped groups present
- **THEN** the `Skipped or unavailable groups ({N}):` section is sourced from `dossier.md`'s corresponding section

#### Scenario: Knowledge line always renders

- **WHEN** the summary renders on any terminal path of the flow
- **THEN** exactly one `Knowledge:` line is present, immediately after `Install:`
- **AND** its text is the `persist-run-knowledge` digest verbatim, with no rewording or truncation

#### Scenario: Knowledge line states the skip reason

- **WHEN** the user selected `cancel` and the summary renders
- **THEN** the `Knowledge:` line reads `Knowledge: not persisted (<reason>)` naming the skip reason
- **AND** the conditional apply sections render exactly as they would without this line

---

### Requirement: Hard rules

The command SHALL preserve every hard rule of `/experiments:npm-update-patch`:

- The command SHALL NOT create commits, push, or open pull requests autonomously; it stops for human-in-the-loop review before any such outward/VCS action.
- The command SHALL NOT modify any file when the user selects `cancel`.
- The command SHALL NOT mutate any consumer `package.json` entry that is a `catalog:` reference — only `pnpm-workspace.yaml` for those.
- The command SHALL write to the knowledge root only on the `apply-*` paths — `apply-all`, `apply-bumps-only`, and `pick-subset`, that is every execution-prompt option other than `cancel` — and only through the `persist-run-knowledge` skill invoked at Step 7.5. On `cancel` and on every `abort` (stale-cleanup `cancel`, integrity-verification `abort`), the command SHALL NOT invoke `persist-run-knowledge`, SHALL NOT create the knowledge root, and SHALL NOT write any file under it.

#### Scenario: Cancel touches no files

- **WHEN** the user selects `cancel` at any prompt in the flow
- **THEN** no file outside `~/.claude/experiments/plans/` has been modified

#### Scenario: Cancel leaves the knowledge root untouched

- **WHEN** the user selects `cancel` at the execution prompt
- **THEN** `persist-run-knowledge` is NOT invoked
- **AND** no file under the resolved knowledge root is created or modified, and a previously absent knowledge root SHALL still be absent

#### Scenario: Catalog reference preserved

- **WHEN** a workspace package's `package.json` declares a dependency as `catalog:`
- **THEN** that `package.json` is NOT modified during bump application

---

### Requirement: Run phase written at apply boundaries

The command SHALL write `_meta.json.phase` in the run directory at both apply boundaries instead of leaving the field to a consumer that never writes it:

- `"executing"` SHALL be written when Step 6 (apply) begins, before the first manifest write, the install, or the changeset gate.
- `"done"` SHALL be written when apply completes on every `apply-*` path, before the Step 7.5 persistence step reads the run directory.

Both writes SHALL be atomic — write a temp sibling, then rename — matching the convention `parallel-research-workflow` already uses for `_meta.json`. Neither value SHALL be written when the user selects `cancel` or when the run ends in any `abort`. Persistence SHALL NOT depend on either value being present in a run directory the command did not write.

#### Scenario: Executing written when apply begins

- **WHEN** the user selects `apply-all` and Step 6 begins
- **THEN** `_meta.json.phase` is `"executing"` before the first manifest write or install
- **AND** the write is atomic

#### Scenario: Done written before persistence

- **WHEN** apply completes under `apply-bumps-only`
- **THEN** `_meta.json.phase` is `"done"` before `persist-run-knowledge` is invoked at Step 7.5

#### Scenario: Cancel writes no phase

- **WHEN** the user selects `cancel` at the execution prompt
- **THEN** `_meta.json.phase` is left exactly as the workflow last wrote it, with neither `"executing"` nor `"done"` written by the command

---

### Requirement: Run knowledge persistence after apply

At Step 7.5 — after the Step 7 final-summary data is computed and before the Step 8 cleanup prompt — the command SHALL persist the run into the knowledge store:

1. Assemble the outcome object (the store's `outcome.json` shape, without `recordedAt`) from the apply result fragments already in hand: `runId`, `level`, `mode`, the selected `gateOption`, and one `projects[]` entry per Step 6 apply round. Each entry carries the run slug as `projectName`, the level's mechanism (`apply-npm-updates`, or `apply-engine-bumps` for `engines`), and the gate `status`, run-dir-relative changeset `path` (or `null`), and applicable and inapplicable counts (`null` when absent). When Step 6a ran, `bumps` is its returned fragment verbatim. When a `pick-subset` round selected only improvements, `bumps` is the canonical clean no-bump fragment: `{ appliedGeneric: [], appliedOverrides: [], installRan: false, logPath: null, failure: null }` for dependency levels, or `{ resolvedTargets: {}, applied: [], skipped: [], droppedHashes: [] }` for `engines`.
2. Invoke `persist-run-knowledge` with `{ runDir, outcome }`; the skill stamps `recordedAt` and writes `<run-dir>/outcome.json` — the command SHALL NOT write it.
3. Surface the skill's one-line digest and carry it verbatim into the summary's `Knowledge:` line.

The command SHALL skip persistence — emitting `Knowledge: not persisted (<reason>)` and nothing else — when the user selected `cancel`, when the run ended in any `abort`, or when the run-level `outcome` derived from the assembled outcome object is `failed`. A run whose changeset reconnaissance reported `Applicable (0)` SHALL be persisted: its run-level `outcome` is `applied`, and the fact that nothing was applicable at this range is itself reusable.

Persistence SHALL NOT alter any part of the final summary other than the `Knowledge:` line. A failure inside `persist-run-knowledge` SHALL surface as `Knowledge: not persisted (<reason>)`, SHALL NOT abort the run, and SHALL NOT prevent the Step 8 cleanup prompt from firing.

#### Scenario: Persist sits between the summary data and the cleanup prompt

- **WHEN** apply completes under `apply-all`
- **THEN** the command computes the Step 7 summary data, assembles the outcome object, invokes `persist-run-knowledge` (which writes `outcome.json`), and only then reaches the Step 8 cleanup prompt

#### Scenario: Outcome fragments are recorded verbatim

- **WHEN** the apply skill returns its result fragment for the run
- **THEN** `outcome.json` carries that fragment verbatim as the single `projects[]` entry's `bumps`, with `mechanism` `apply-npm-updates` and the changeset status, path, and counts alongside it

#### Scenario: Improvement-only round is recorded

- **WHEN** `pick-subset` selects improvements but no bumps and the changeset round completes
- **THEN** `outcome.json` carries one `projects[]` entry for that round with its changeset result
- **AND** `bumps` is the level's canonical clean no-bump fragment
- **AND** the run is eligible for persistence as `applied`

#### Scenario: Cancelled run is not persisted

- **WHEN** the user selects `cancel`
- **THEN** `persist-run-knowledge` is NOT invoked and the summary's `Knowledge:` line reads `Knowledge: not persisted (<reason>)`

#### Scenario: Failed run is not persisted

- **WHEN** the run-level `outcome` derived from the assembled outcome object is `failed`
- **THEN** the command skips persistence with `Knowledge: not persisted (<reason>)` and still reaches the Step 8 cleanup prompt

#### Scenario: Applicable (0) run is persisted

- **WHEN** the bumps applied cleanly and the changeset reported `Applicable (0)`
- **THEN** the run is persisted with run-level `outcome` `applied` and the summary's `Knowledge:` line reports the persist digest

#### Scenario: Persist failure never masks the apply result

- **WHEN** `persist-run-knowledge` fails after a successful apply
- **THEN** the summary's `Applied bumps`, `Applied improvements`, `Skipped improvements`, and `Install:` sections are unchanged
- **AND** the `Knowledge:` line reads `Knowledge: not persisted (<reason>)` and the Step 8 cleanup prompt still fires
