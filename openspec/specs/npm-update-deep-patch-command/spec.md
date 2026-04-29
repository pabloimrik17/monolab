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

- **WHEN** the scan returns `updates: []` and `warnings: ["named catalog \"test\" detected but not yet supported in this iteration"]`
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

### Requirement: Execution prompt after plan synthesis

When the workflow finishes phase 4 (plan-mode synthesis) successfully, the command SHALL prompt the user via `AskUserQuestion` with these options, in this order:

- `apply-all` — execute every item in the plan: bump every package in the `Patch bump set` table AND apply every bullet in the `Improvements (applicable to this codebase)` section.
- `apply-bumps-only` — bump every package in the `Patch bump set` table; skip improvements entirely.
- `pick-subset` — accept a free-form list of plan items (improvement bullets and/or specific bumps) to apply.
- `cancel` — exit without modifying any file.

The command SHALL show the prompt exactly once per invocation. The command SHALL NOT auto-apply any plan item without an explicit option selection.

If the workflow returns an early-exit signal before phase 4 completes (stale-cleanup `cancel` or integrity-verification `abort`), the command SHALL NOT call `AskUserQuestion` for the execution prompt. The command SHALL exit immediately without applying any plan items and SHALL emit a short summary indicating the early-exit reason (e.g. `Cancelled by stale-cleanup. No files modified.` or `Aborted on integrity check. No files modified.`) before delegating to the workflow's cleanup prompt.

#### Scenario: Prompt order

- **WHEN** plan synthesis completes
- **THEN** the prompt options are presented in the order `apply-all`, `apply-bumps-only`, `pick-subset`, `cancel`

#### Scenario: Cancel preserves files and plan dir

- **WHEN** the user selects `cancel`
- **THEN** no file in the workspace is modified and the plan dir remains on disk pending the cleanup prompt

#### Scenario: Early-exit skips the execution prompt

- **WHEN** the workflow returns an early-exit signal from stale-cleanup `cancel` or integrity-verification `abort` before phase 4 completes
- **THEN** the command does NOT call `AskUserQuestion` for the execution prompt, applies no plan items, and prints a short summary identifying the early-exit reason before the workflow's cleanup prompt fires

### Requirement: Bump application reuses existing infrastructure

For `apply-all`, `apply-bumps-only`, and `pick-subset` (when bumps are included), the command SHALL apply patch-level bumps using the same mechanism as `/experiments:npm-update-patch` — `npm-check-updates@21.0.2` for `package.json` files via the resolved runner prefix, and in-memory edits for `pnpm-workspace.yaml#catalog`. The command SHALL run exactly one install command after all bumps complete, mirroring the package-manager mapping of `npm-update-patch`.

#### Scenario: pnpm install once

- **WHEN** the package manager is pnpm and 12 bumps are applied across 3 manifests
- **THEN** the command invokes `pnpm install` exactly once after all manifests are written

#### Scenario: Catalog entries handled in-memory

- **WHEN** an update has `sourceFile: "pnpm-workspace.yaml"`
- **THEN** the command edits the `catalog:` block in place and does NOT invoke `npm-check-updates` for that file

### Requirement: Improvement application via plan mode

For `apply-all` and `pick-subset` (when improvements are included), the command SHALL apply improvements via Claude Code plan mode — never via blind edits. The flow SHALL be:

1. **Reconnaissance**: the main agent reads each in-scope improvement bullet's area hints and the relevant files to determine the concrete edits the bullet translates into in this codebase. Bullets whose opportunity does not actually land here are flagged as `inapplicable` with a one-sentence reason.
2. **Plan-mode entry (mandatory)**: the main agent invokes the `EnterPlanMode` tool with a markdown plan listing every applicable improvement (file path, brief description, and before/after snippet for non-trivial edits) and every inapplicable improvement (with the reason). A summary footer counts applicable vs inapplicable.
3. **User review**: plan mode pauses until the user accepts or rejects the plan. On approval, edits are executed via `Edit` / `Write`. On rejection, the command prints `Improvements rejected at plan-mode review. No improvement edits applied; bumps are preserved.` and skips to the summary step. Bumps applied in the prior step are NOT reverted.

The command SHALL NOT execute tests, lint, or build, and SHALL NOT create commits or PRs as part of improvement application. The command SHALL NOT expand scope beyond bullets present in `plan.md`; adjacent opportunities the agent identifies during reconnaissance or plan-mode review SHALL be surfaced as suggestions in the final summary, never silently added to the plan-mode plan.

#### Scenario: Plan mode is entered before any improvement edit

- **WHEN** the user selects `apply-all` after the bumps install completes
- **THEN** the command invokes `EnterPlanMode` with a markdown plan listing the proposed edits per improvement bullet, BEFORE any `Edit` or `Write` call against a workspace file

#### Scenario: Inapplicable bullets are explicit

- **WHEN** the plan contains 10 improvement bullets and reconnaissance finds that 7 do not land in this codebase
- **THEN** the plan-mode plan lists those 7 explicitly with one-sentence reasons each, alongside the 3 applicable bullets with their concrete edits

#### Scenario: Plan-mode rejection preserves bumps

- **WHEN** the user rejects the plan-mode plan after bumps already landed in Step 6a
- **THEN** the command prints `Improvements rejected at plan-mode review. No improvement edits applied; bumps are preserved.` and proceeds to the summary; no improvement edits are made and no bumps are reverted

#### Scenario: Improvements scoped to plan content

- **WHEN** the user selects `apply-all` and the plan contains 4 improvement bullets
- **THEN** improvement application proceeds against exactly those 4 bullets, with no expansion to items outside `plan.md`

#### Scenario: No tests run

- **WHEN** improvement application completes
- **THEN** no `vitest`, `nx test`, lint, build, or commit command has been invoked by the command

### Requirement: Final summary

After execution (or after `cancel`), the command SHALL print a markdown summary that lists, conditionally:

- `Applied bumps ({N}):` — one line per bumped package with `name`, `currentVersion → targetVersion`, `location`.
- `Applied improvements ({N}):` — one line per improvement bullet successfully applied.
- `Skipped improvements ({N}):` — one line per improvement bullet declined under `pick-subset`.
- `Skipped or unavailable groups ({N}):` — copied from `plan.md`'s corresponding section.
- `Install:` — `<pm> install executed` if any bump was applied, otherwise `skipped (no bumps applied)`.
- `Suggested next steps (not executed):` — bullets reading `Run your test suite.`, `Run lint / typecheck.`, `Review changes (\`git diff\`) and commit.`

Sections with count zero SHALL be omitted, except `Suggested next steps`, which SHALL always be present.

#### Scenario: All sections shown

- **WHEN** `apply-all` produced 5 bumps and 2 improvements with no skips
- **THEN** the summary contains `Applied bumps (5):`, `Applied improvements (2):`, `Install:`, and `Suggested next steps:`; the skipped sections are omitted

#### Scenario: Cancel summary

- **WHEN** the user selected `cancel` after plan synthesis
- **THEN** the summary contains `Cancelled. No files modified.` followed by `Suggested next steps:` only

### Requirement: Hard rules

The command SHALL preserve every hard rule of `/experiments:npm-update-patch`:

- The command SHALL NOT run tests, lint, or build at any point.
- The command SHALL NOT create git commits or open pull requests.
- The command SHALL NOT modify any file when the user selects `cancel`.
- The command SHALL NOT mutate any consumer `package.json` entry that is a `catalog:` reference — only `pnpm-workspace.yaml` for those.

#### Scenario: Cancel touches no files

- **WHEN** the user selects `cancel` at any prompt in the flow
- **THEN** no file outside `~/.claude/experiments/plans/` has been modified

#### Scenario: Catalog reference preserved

- **WHEN** a workspace package's `package.json` declares a dependency as `catalog:`
- **THEN** that `package.json` is NOT modified during bump application

