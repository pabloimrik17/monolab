## MODIFIED Requirements

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

## REMOVED Requirements

### Requirement: Execution prompt after plan synthesis

**Reason**: Replaced by "Execution prompt after dossier synthesis" (added below) under the D1 artifact glossary (phase renamed `synthesis`, artifact renamed `dossier.md`).

### Requirement: Improvement application via plan mode

**Reason**: Replaced by "Improvement application via the changeset gate" (added below). Improvements are applied by an apply teammate behind the orchestrator-owned gate, not by the main agent after an in-main plan-mode round.

## ADDED Requirements

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
