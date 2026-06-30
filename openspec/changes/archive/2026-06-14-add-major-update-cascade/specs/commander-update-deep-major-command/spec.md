## ADDED Requirements

### Requirement: Command location, frontmatter, and invocation contract

The `experiments` plugin SHALL include a slash command at `claude-plugins/experiments/commands/commander-update-deep-major.md` with YAML frontmatter declaring a non-empty `description` field, invocable as `/experiments:commander-update-deep-major`. The command SHALL accept no positional arguments and no flags; the `ARGUMENTS` token is preserved only for handling stray user input (a one-line warning, not an early exit). It is the deep cross-project sibling of `/experiments:commander-update-deep-minor`.

#### Scenario: Command file exists with frontmatter

- **WHEN** examining `claude-plugins/experiments/commands/`
- **THEN** the file `commander-update-deep-major.md` SHALL exist
- **AND** SHALL contain YAML frontmatter with a non-empty `description` field

#### Scenario: Stray arguments are reported and ignored, not fatal

- **WHEN** the user invokes `/experiments:commander-update-deep-major foo bar`
- **THEN** the command prints exactly one line `commander-update-deep-major takes no arguments; ignoring: foo bar` and continues into the orchestrator invocation
- **AND** the command does NOT exit early on stray input

### Requirement: Single invocation of the orchestrator with the deep-major input set

The command SHALL invoke `commander-update-orchestrator` exactly **once** per execution, via the `Skill` tool, with `level: "major"`, `target: "major"`, `mode: "deep"`, `overrideRegistryPath` omitted (shared default), and `projectsFilter` omitted (interactive picker). The command SHALL NOT override `level`/`target` to anything other than `major`, SHALL NOT override `mode` to anything other than `"deep"`, SHALL NOT override `overrideRegistryPath`, SHALL NOT pass a `projectsFilter`, and SHALL NOT invoke `scan-npm-updates`, `group-packages-for-research`, `parallel-research-workflow`, `npm-check-updates`, or any package-manager command directly.

#### Scenario: Orchestrator invoked with deep-major inputs

- **WHEN** `/experiments:commander-update-deep-major` runs against a registry with at least one project
- **THEN** the orchestrator is invoked exactly once with `level: "major"`, `target: "major"`, `mode: "deep"`
- **AND** the command issues no other Skill invocations and runs no `ncu`/`<pm>` commands of its own

#### Scenario: Output surfaced verbatim

- **WHEN** the orchestrator emits prompts (project picker, conflict policy, override actions, the four-option deep gate, plan-mode entry), the rendered `plan.md`, summaries, or error messages
- **THEN** the command surfaces every line verbatim, without wrapping, prefixing, or post-processing, and exits with the orchestrator's exit code

#### Scenario: Surfaced plan includes the major-specific sections

- **WHEN** the orchestrator surfaces the workflow-produced `plan.md`
- **THEN** the surfaced content includes the `## Breaking changes & migration` section and the `## Changelogs` chronology section (per the `parallel-research-workflow` spec)

### Requirement: Hard rules inherited from the orchestrator and the deep flow

The command SHALL inherit and preserve every hard rule from `commander-update-orchestrator` (deep mode) and the single-project deep flow: SHALL NOT run tests/lint/build; SHALL NOT create commits, push, or open PRs (branch/worktree isolation via `update-isolation` is permitted); SHALL NOT modify files on `cancel` at the gate; on plan-mode rejection it SHALL NOT apply any improvement or migration edit, but already-applied bumps (from the bumps loop) are preserved, not reverted; SHALL NOT mutate `<HOME>/.claude/commander/projects.json` (byte-identical, verifiable via `shasum`); SHALL NOT mutate a `catalog:` consumer `package.json`; SHALL NOT auto-execute an override without explicit `run-override`; SHALL NOT run `ncu --upgrade` as a fallback after an override fails; SHALL NOT expand the plan-mode round beyond bullets present in `plan.md`.

#### Scenario: Cancel at the gate leaves the workspace untouched

- **WHEN** the user picks `cancel` at the orchestrator's confirmation gate
- **THEN** no manifest, override command, install, or plan-mode round runs, the command exits zero, and the registry `shasum` is unchanged

#### Scenario: Plan-mode rejection preserves bumps but skips edits

- **WHEN** the user rejects the plan-mode round after some bumps already landed
- **THEN** the already-applied bumps are preserved (no rollback), no improvement or migration edits are applied, and the rejection notice is surfaced verbatim

---

### Requirement: Cross-project PR plan surfaced; per-project isolation in v1

The orchestrator's surfaced `plan.md` SHALL include the `## PR plan` section (from `partition-breaking-changes`) so the user sees the proposed buckets and the count-by-policy summary. When isolation is opted into, v1 SHALL create at most **one worktree per project** (the per-(project,bucket) matrix is deferred). The command SHALL NOT commit, push, or open PRs in any case.

#### Scenario: PR plan visible cross-project

- **WHEN** the deep-major cross-project run surfaces the plan
- **THEN** it includes the `## PR plan` section with the bucket count-by-policy summary

#### Scenario: v1 cross-project isolation is one worktree per project

- **WHEN** isolation is chosen for a cross-project deep-major run across N projects
- **THEN** at most one worktree per project is created, and no per-bucket worktrees are created cross-project in v1

### Requirement: Non-goals deferred to follow-ups

The command SHALL NOT implement `--projects a,b,c`, `--all`, per-project parallel apply, auto-rollback (of projects or of bumps when plan-mode is rejected), or automated tests in v1. `/experiments:commander-update-deep-engines` (MON-201) is a separate sub-issue, not part of this command.

#### Scenario: CLI flags are not recognized

- **WHEN** the user invokes `/experiments:commander-update-deep-major --projects foo,bar`
- **THEN** the command treats `--projects foo,bar` as a stray argument, prints the standard ignore line, and continues into the orchestrator with no project filter applied
