# commander-update-minor-command Specification

## Purpose

The `/experiments:commander-update-minor` command is the shallow cross-project sibling of `/experiments:commander-update-patch`, operating at **minor** level. It is a thin wrapper that invokes the `commander-update-orchestrator` skill exactly once with the minor (shallow) input set and surfaces the orchestrator's output verbatim. It inherits every orchestrator hard rule and adds no flags or project-selection surface of its own.

## Requirements

### Requirement: Command location, frontmatter, and invocation contract

The `experiments` plugin SHALL include a slash command at `claude-plugins/experiments/commands/commander-update-minor.md` with YAML frontmatter declaring a non-empty `description` field. The command SHALL be invocable as `/experiments:commander-update-minor`.

The command SHALL accept no positional arguments and no flags. The `ARGUMENTS` token is preserved only for handling stray user input (a one-line warning, not an early exit).

#### Scenario: Command file exists with frontmatter

- **WHEN** examining `claude-plugins/experiments/commands/`
- **THEN** the file `commander-update-minor.md` SHALL exist
- **AND** SHALL contain YAML frontmatter with a non-empty `description` field

#### Scenario: Stray arguments are reported and ignored, not fatal

- **WHEN** the user invokes `/experiments:commander-update-minor foo bar`
- **THEN** the command prints exactly one line `commander-update-minor takes no arguments; ignoring: foo bar` and continues into the orchestrator invocation
- **AND** the command does NOT exit early on stray input

#### Scenario: Empty argument string proceeds silently

- **WHEN** the user invokes `/experiments:commander-update-minor` with no argument or only whitespace
- **THEN** the command proceeds directly to the orchestrator invocation with no preamble line

---

### Requirement: Single invocation of the orchestrator with the minor (shallow) input set

The command SHALL invoke the `commander-update-orchestrator` skill exactly **once** per command execution, via the `Skill` tool, with these inputs:

- `level: "minor"`
- `target: "minor"`
- `overrideRegistryPath`: omitted (the skill defaults to the shared `pkg-upgrade-overrides.yaml`)
- `projectsFilter`: omitted (the skill's interactive multi-select picker is the only project-selection surface in v1)

`mode` SHALL be omitted (defaulting to `shallow`). The command SHALL NOT override `level`/`target` to anything other than `minor`, SHALL NOT set `mode` to `deep`, SHALL NOT override `overrideRegistryPath`, SHALL NOT pass a `projectsFilter`, and SHALL NOT invoke any other skill or package-manager command directly.

#### Scenario: Orchestrator invoked with minor shallow inputs

- **WHEN** `/experiments:commander-update-minor` runs against a registry with at least one project
- **THEN** the orchestrator skill is invoked exactly once with `level: "minor"`, `target: "minor"`, and `mode` shallow (absent)
- **AND** the command issues no other Skill invocations and runs no `ncu` / `<pm>` commands of its own

#### Scenario: Orchestrator output is surfaced verbatim

- **WHEN** the orchestrator emits prompts (project picker, conflict policy, override actions, gate), tables, summaries, or error messages
- **THEN** the command surfaces every line verbatim, without wrapping, prefixing, or post-processing
- **AND** the command exits with the same exit code the orchestrator returned

---

### Requirement: Hard rules inherited from the orchestrator

The command SHALL inherit and preserve every hard rule from `commander-update-orchestrator` (shallow mode). The command SHALL NOT run tests/lint/build; SHALL NOT create commits/branches/PRs; SHALL NOT modify any file when the user selects `cancel`; SHALL NOT mutate `<HOME>/.claude/commander/projects.json` (byte-identical before/after, verifiable via `shasum`); SHALL NOT mutate a `catalog:` consumer `package.json` (only `pnpm-workspace.yaml`); SHALL NOT auto-execute an override without explicit `run-override`; and SHALL NOT run `ncu --upgrade` as a fallback after an override fails.

#### Scenario: Cancel at the gate leaves the workspace untouched

- **WHEN** the user picks `cancel` at the orchestrator's confirmation gate
- **THEN** no manifest, install, or override command runs, the command exits zero, and the registry SHA is unchanged

#### Scenario: Registry byte-identity verified post-run

- **WHEN** a full run completes (success, partial, or cancel)
- **THEN** `<HOME>/.claude/commander/projects.json` SHALL be byte-identical to its pre-run state

---

### Requirement: Non-goals deferred to follow-ups

The command SHALL NOT implement `--projects a,b,c`, `--all`, per-project parallel apply, auto-rollback, or automated tests in v1 (deferred, matching the patch sibling).

#### Scenario: CLI flags are not recognized

- **WHEN** the user invokes `/experiments:commander-update-minor --projects foo,bar`
- **THEN** the command treats `--projects foo,bar` as a stray argument, prints the standard ignore line, and continues into the orchestrator with no project filter applied
