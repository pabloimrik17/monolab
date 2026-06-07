# npm-update-deep-minor-command Specification

## Purpose

The `/experiments:npm-update-deep-minor` command is the deep single-project sibling of `/experiments:npm-update-deep-patch`, operating exclusively at **minor** level. It scans, groups, runs the parallel-research workflow, gates execution, delegates bumps to the `npm-update-apply` skill (generic-only, no override registry), and applies improvements via plan mode — identical in flow to the deep-patch command except for the level.

## Requirements

### Requirement: Command entry point and scope

The `experiments` plugin SHALL provide the `/experiments:npm-update-deep-minor` command at `claude-plugins/experiments/commands/npm-update-deep-minor.md` with YAML frontmatter declaring a non-empty `description`. The command SHALL operate exclusively at **minor** level — it SHALL pass `level=minor` to the scan skill and to `parallel-research-workflow`, and SHALL NOT accept a different level. It is the deep single-project sibling of `/experiments:npm-update-deep-patch`, identical in flow except for the level.

#### Scenario: Invocation scans at minor

- **WHEN** the user runs `/experiments:npm-update-deep-minor`
- **THEN** the command begins the workflow at the scan step using `level=minor`

#### Scenario: Level argument ignored

- **WHEN** the user passes `level=patch`
- **THEN** the command ignores it and still scans at `level=minor`

---

### Requirement: Scan, empty short-circuit, and workflow orchestration

The command SHALL invoke `experiments:scan-npm-updates` with `level=minor`, surfacing scan precondition errors verbatim and creating no plan dir on abort. If `updates.length === 0`, the command SHALL print any warnings then the literal line `No minor updates available.` and exit without invoking grouping or the research workflow. Otherwise it SHALL invoke `dependency-grouping-strategy` with `{ updates }`, then `parallel-research-workflow` with `{ groups, level: "minor", scanResult }` (single-project mode), surfacing the workflow's progress and early-exit signals without advancing phases on its behalf.

#### Scenario: Empty result prints minor-specific copy

- **WHEN** the scan returns `updates: []`
- **THEN** the command prints `No minor updates available.` and exits with no plan dir created

#### Scenario: Workflow invoked at minor level

- **WHEN** the scan returns updates
- **THEN** the command invokes `parallel-research-workflow` with `level: "minor"`, producing a plan dir slug suffixed `-minor-<ts>`

---

### Requirement: Execution prompt, bump delegation, and improvements

When the workflow finishes phase 4 successfully, the command SHALL raise a single `AskUserQuestion` with `apply-all`, `apply-bumps-only`, `pick-subset`, `cancel` (same order as `npm-update-deep-patch`). For any path that applies bumps, the command SHALL delegate the bump mechanism to the `npm-update-apply` skill (`target: "minor"`, generic-only — the deep path consults NO override registry, preserving the single-project deep divergence). Improvements SHALL be applied via Claude Code plan mode (reconnaissance → mandatory `EnterPlanMode` → user approval/rejection), scoped strictly to bullets present in `plan.md`. On rejection, the command SHALL print `Improvements rejected at plan-mode review. No improvement edits applied; bumps are preserved.` and preserve applied bumps.

#### Scenario: Bumps delegated to npm-update-apply, generic-only

- **WHEN** the user selects `apply-bumps-only`
- **THEN** the command invokes `npm-update-apply` with `target: "minor"` and an empty `overrideCommands` set (the deep single-project path does not consult the override registry)

#### Scenario: Improvements require plan mode

- **WHEN** the user selects `apply-all` after bumps land
- **THEN** the command invokes `EnterPlanMode` with the proposed edits before any improvement `Edit`/`Write`

#### Scenario: Plan-mode rejection preserves bumps

- **WHEN** the user rejects the plan-mode round
- **THEN** the command prints the rejection line and the already-applied bumps are NOT reverted

---

### Requirement: Final summary, changelog plan section, and hard rules

The command SHALL print a summary headed `## npm-update-deep-minor summary` with the same conditional sections as `npm-update-deep-patch` (applied bumps, applied improvements, skipped improvements, skipped-or-unavailable groups, install line, always-present `Suggested next steps`). The `plan.md` the command surfaces SHALL include the `## Changelogs` chronology section produced by `parallel-research-workflow`. The command SHALL delegate end-of-flow cleanup to the workflow (one `delete-plan` / `keep-plan` prompt). The command SHALL NOT run tests, lint, or build; SHALL NOT create commits/PRs; SHALL NOT consult the override registry; and SHALL NOT mutate `catalog:` consumer `package.json` entries.

#### Scenario: Summary heading is deep-minor-namespaced

- **WHEN** a run completes
- **THEN** the summary starts with `## npm-update-deep-minor summary`

#### Scenario: Plan includes the changelog section

- **WHEN** the workflow produces `plan.md` for a minor run
- **THEN** `plan.md` includes a `## Changelogs` section (per the `parallel-research-workflow` spec)

#### Scenario: Override registry not consulted on the deep path

- **WHEN** the command applies bumps
- **THEN** it does NOT load or match the override registry (the override flow remains the shallow `/experiments:npm-update-minor` path's responsibility)
