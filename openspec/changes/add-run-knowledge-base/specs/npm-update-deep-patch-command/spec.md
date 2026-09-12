## MODIFIED Requirements

### Requirement: Workflow orchestration

When the scan returns one or more updates, the command SHALL invoke the `dependency-grouping-strategy` skill with object input `{ updates: ScanResult.updates }` (and `maxPerGroup` only when explicitly overridden), then invoke the `recall-run-knowledge` skill at Step 3.5 with the emitted `groups`, the `level` `patch`, and `mode: single-project`, then invoke the `parallel-research-workflow` skill with the resulting groups, the level `patch`, the verbatim `ScanResult` (so the workflow can persist `scan.json`), and the recall skill's output as the workflow's optional `priorKnowledge` input. The command SHALL surface progress messages emitted by the workflow but SHALL NOT advance phases on the workflow's behalf.

Step 3.5 SHALL sit after grouping — it consumes the emitted groups' `bucketKey` — and before the workflow dispatch, because `priorKnowledge` reaches the research subagents through the workflow and not around it. A recall hit SHALL NOT remove a package from its group; the package still fetches its changelog and still appears in the bump set. The command SHALL NOT open a run note or a package hub itself: it SHALL surface only the recall digest `Knowledge: <e> exact, <o> overlap, <p> prior, <r> related of <n> packages`.

When the knowledge base is absent, Step 3.5 SHALL be a no-op: recall SHALL return `{ hits: [] }`, SHALL emit the digest `Knowledge: no base at <root>`, and the command SHALL invoke `parallel-research-workflow` without a `priorKnowledge` input, leaving the rest of the run byte-for-byte as it was before this step existed.

This command is the anchor of the single-project deep family: the recall step here and the phase and persist steps below belong to the shared deep contract, so `/experiments:npm-update-deep-minor`, `/experiments:npm-update-deep-major`, and `/experiments:npm-update-deep-engines` inherit them under the experiments-plugin `Deep command family consolidation` rule and SHALL NOT restate them per level.

#### Scenario: Grouping precedes workflow dispatch

- **WHEN** the scan returns 3 updates
- **THEN** the command first calls `dependency-grouping-strategy` with those updates, then calls `parallel-research-workflow` with the resulting groups

#### Scenario: Recall precedes workflow dispatch

- **WHEN** the grouping skill emits 2 groups for the scanned updates
- **THEN** the command invokes `recall-run-knowledge` with those 2 groups, `level` `patch`, and `mode: single-project` BEFORE it invokes `parallel-research-workflow`
- **AND** the recall output is passed to the workflow as its `priorKnowledge` input
- **AND** no package is removed from its group because of a hit

#### Scenario: Absent knowledge base leaves the run unchanged

- **WHEN** the resolved knowledge root has no `index.json`
- **THEN** the command emits `Knowledge: no base at <root>` and invokes `parallel-research-workflow` with no `priorKnowledge` input
- **AND** every group is dispatched for fresh research exactly as it would be with Step 3.5 absent

#### Scenario: Workflow drives phases

- **WHEN** the workflow is in phase `changelogs`
- **THEN** the command does not dispatch subagents itself; it relies on the workflow skill to do so

---

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

## ADDED Requirements

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

1. Assemble the outcome object (the store's `outcome.json` shape, without `recordedAt`) from the apply result fragments already in hand: `runId`, `level`, `mode`, the selected `gateOption`, and exactly one `projects[]` entry whose `projectName` is the run slug, whose `mechanism` is `apply-npm-updates`, whose `bumps` is the apply skill's returned result fragment verbatim, and whose `changeset` records the gate `status`, the run-dir-relative `path` (or `null` when there is no changeset), and the applicable and inapplicable counts parsed from `changeset.md` (`null` when absent).
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
