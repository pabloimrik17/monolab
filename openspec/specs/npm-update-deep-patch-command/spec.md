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

When the scan returns one or more updates, the command SHALL invoke the `dependency-grouping-strategy` skill with object input `{ updates: ScanResult.updates }` (and `maxPerGroup` only when explicitly overridden), then invoke the `parallel-research-workflow` skill with the resulting groups, the level `patch`, and the verbatim `ScanResult` (so the workflow can persist `scan.json`). The command SHALL surface progress messages emitted by the workflow but SHALL NOT advance phases on the workflow's behalf.

#### Scenario: Grouping precedes workflow dispatch

- **WHEN** the scan returns 3 updates
- **THEN** the command first calls `dependency-grouping-strategy` with those updates, then calls `parallel-research-workflow` with the resulting groups

#### Scenario: Workflow drives phases

- **WHEN** the workflow is in phase `changelogs`
- **THEN** the command does not dispatch subagents itself; it relies on the workflow skill to do so

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
- `Suggested next steps (not executed):` — bullets reading `Run your test suite.`, `Run lint / typecheck.`, `Review changes (\`git diff\`) and commit.`

Sections with count zero SHALL be omitted, except `Suggested next steps`, which SHALL always be present.

#### Scenario: Skipped groups sourced from the dossier

- **WHEN** the summary renders with skipped groups present
- **THEN** the `Skipped or unavailable groups ({N}):` section is sourced from `dossier.md`'s corresponding section

### Requirement: Hard rules

The command SHALL preserve every hard rule of `/experiments:npm-update-patch`:

- The command SHALL NOT create commits, push, or open pull requests autonomously; it stops for human-in-the-loop review before any such outward/VCS action.
- The command SHALL NOT modify any file when the user selects `cancel`.
- The command SHALL NOT mutate any consumer `package.json` entry that is a `catalog:` reference — only `pnpm-workspace.yaml` for those.

#### Scenario: Cancel touches no files

- **WHEN** the user selects `cancel` at any prompt in the flow
- **THEN** no file outside `~/.claude/experiments/plans/` has been modified

#### Scenario: Catalog reference preserved

- **WHEN** a workspace package's `package.json` declares a dependency as `catalog:`
- **THEN** that `package.json` is NOT modified during bump application

