# commander-update-deep-minor-command Specification

## Purpose

The `/experiments:commander-update-deep-minor` command is the deep cross-project sibling of `/experiments:commander-update-deep-patch`, operating at **minor** level. It is a thin wrapper that invokes the `commander-update-orchestrator` skill exactly once with the deep-minor input set and surfaces the orchestrator's output (including the workflow-produced `plan.md`) verbatim. It inherits every orchestrator hard rule plus the single-project deep flow's plan-mode semantics.

## Requirements

### Requirement: Command location, frontmatter, and invocation contract

The `experiments` plugin SHALL include a slash command at `claude-plugins/experiments/commands/commander-update-deep-minor.md` with YAML frontmatter declaring a non-empty `description` field. The command SHALL be invocable as `/experiments:commander-update-deep-minor`.

The command SHALL accept no positional arguments and no flags. The `ARGUMENTS` token is preserved only for handling stray user input (a one-line warning, not an early exit).

#### Scenario: Command file exists with frontmatter

- **WHEN** examining `claude-plugins/experiments/commands/`
- **THEN** the file `commander-update-deep-minor.md` SHALL exist
- **AND** SHALL contain YAML frontmatter with a non-empty `description` field

#### Scenario: Stray arguments are reported and ignored, not fatal

- **WHEN** the user invokes `/experiments:commander-update-deep-minor foo bar`
- **THEN** the command prints exactly one line `commander-update-deep-minor takes no arguments; ignoring: foo bar` and continues into the orchestrator invocation
- **AND** the command does NOT exit early on stray input

#### Scenario: Empty argument string proceeds silently

- **WHEN** the user invokes `/experiments:commander-update-deep-minor` with no argument or only whitespace
- **THEN** the command proceeds directly to the orchestrator invocation with no preamble line

---

### Requirement: Single invocation of the orchestrator with the deep-minor input set

The command SHALL invoke the `commander-update-orchestrator` skill exactly **once** per command execution, via the `Skill` tool, with these inputs:

- `level: "minor"`
- `target: "minor"`
- `mode: "deep"`
- `overrideRegistryPath`: omitted (the skill defaults to the shared `pkg-upgrade-overrides.yaml`)
- `projectsFilter`: omitted (the skill's interactive multi-select picker is the only project-selection surface in v1)

The command SHALL NOT override `level`/`target` to anything other than `minor`, SHALL NOT override `mode` to anything other than `"deep"`, SHALL NOT override `overrideRegistryPath`, SHALL NOT pass a `projectsFilter`, and SHALL NOT invoke any other skill or package-manager command directly. Every action goes through the orchestrator.

#### Scenario: Orchestrator invoked with deep-minor inputs

- **WHEN** `/experiments:commander-update-deep-minor` runs against a registry with at least one project
- **THEN** the orchestrator skill is invoked exactly once with `level: "minor"`, `target: "minor"`, `mode: "deep"`
- **AND** the command issues no other Skill invocations and runs no `ncu` / `<pm>` commands of its own

#### Scenario: Orchestrator output is surfaced verbatim

- **WHEN** the orchestrator emits prompts (project picker, conflict policy, override actions, the four-option deep gate, plan-mode entry), the rendered `plan.md`, summaries, or error messages
- **THEN** the command surfaces every line verbatim, without wrapping, prefixing, or post-processing
- **AND** the command exits with the same exit code the orchestrator returned

#### Scenario: Surfaced plan includes the changelog section

- **WHEN** the orchestrator surfaces the workflow-produced `plan.md`
- **THEN** the surfaced content includes the `## Changelogs` chronology section (per the `parallel-research-workflow` spec)

---

### Requirement: Hard rules inherited from the orchestrator and the deep flow

The command SHALL inherit and preserve every hard rule from `commander-update-orchestrator` (deep mode) and the single-project deep flow. The command SHALL NOT run tests/lint/build; SHALL NOT create commits/branches/PRs; SHALL NOT modify any file when the user selects `cancel` at the gate; on plan-mode rejection it SHALL NOT apply any improvement edits, but already-applied bumps (from the Step 10a bumps loop) are preserved, not reverted; SHALL NOT mutate `<HOME>/.claude/commander/projects.json` (byte-identical, verifiable via `shasum`); SHALL NOT mutate a `catalog:` consumer `package.json` (only `pnpm-workspace.yaml`); SHALL NOT auto-execute an override without explicit `run-override`; and SHALL NOT run `ncu --upgrade` as a fallback after an override fails.

#### Scenario: Cancel at the gate leaves the workspace untouched

- **WHEN** the user picks `cancel` at the orchestrator's confirmation gate
- **THEN** no manifest, override command, install, or plan-mode round runs, the command exits zero, and the registry SHA is unchanged

#### Scenario: Plan-mode rejection preserves bumps but skips improvements

- **WHEN** the user rejects the plan-mode round after some bumps already landed
- **THEN** the already-applied bumps are preserved (no rollback), no improvement edits are applied, and `Improvements rejected at plan-mode review. No improvement edits applied; bumps are preserved.` is surfaced verbatim

---

### Requirement: Non-goals deferred to follow-ups

The command SHALL NOT implement `--projects a,b,c`, `--all`, per-project parallel apply, auto-rollback (of projects or of bumps when plan-mode is rejected), or automated tests in v1 (deferred, matching the deep-patch sibling).

#### Scenario: CLI flags are not recognized

- **WHEN** the user invokes `/experiments:commander-update-deep-minor --projects foo,bar`
- **THEN** the command treats `--projects foo,bar` as a stray argument, prints the standard ignore line, and continues into the orchestrator with no project filter applied
