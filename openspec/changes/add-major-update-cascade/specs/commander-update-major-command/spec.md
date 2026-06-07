## ADDED Requirements

### Requirement: Command location, frontmatter, and invocation contract

The `experiments` plugin SHALL include a slash command at `claude-plugins/experiments/commands/commander-update-major.md` with YAML frontmatter declaring a non-empty `description` field, invocable as `/experiments:commander-update-major`. The command SHALL accept no positional arguments and no flags; the `ARGUMENTS` token is preserved only for handling stray user input (a one-line warning, not an early exit). It is the shallow cross-project sibling of `/experiments:commander-update-minor`.

#### Scenario: Command file exists with frontmatter

- **WHEN** examining `claude-plugins/experiments/commands/`
- **THEN** the file `commander-update-major.md` SHALL exist
- **AND** SHALL contain YAML frontmatter with a non-empty `description` field

#### Scenario: Stray arguments are reported and ignored, not fatal

- **WHEN** the user invokes `/experiments:commander-update-major foo bar`
- **THEN** the command prints exactly one line `commander-update-major takes no arguments; ignoring: foo bar` and continues into the orchestrator invocation
- **AND** the command does NOT exit early on stray input

### Requirement: Single invocation of the orchestrator with the major input set

The command SHALL invoke `commander-update-orchestrator` exactly **once** per execution, via the `Skill` tool, with `level: "major"`, `target: "major"`, `mode` omitted (defaults to `shallow`), `overrideRegistryPath` omitted (shared default), and `projectsFilter` omitted (interactive picker). The command SHALL NOT override `level`/`target` to anything other than `major`, SHALL NOT set `mode` to `deep`, SHALL NOT override `overrideRegistryPath`, SHALL NOT pass a `projectsFilter`, and SHALL NOT call `scan-npm-updates`, `npm-check-updates`, or any package-manager command directly.

#### Scenario: Orchestrator invoked with major inputs

- **WHEN** `/experiments:commander-update-major` runs against a registry with at least one project
- **THEN** the orchestrator is invoked exactly once with `level: "major"`, `target: "major"`, shallow mode
- **AND** the command issues no other Skill invocations and runs no `ncu`/`<pm>` commands of its own

#### Scenario: Output surfaced verbatim

- **WHEN** the orchestrator emits the project picker, plan table, conflict-policy prompt, override prompts, the apply gate, per-project `ncu`/install output, the summary, or error messages
- **THEN** the command surfaces every line verbatim and exits with the orchestrator's exit code

### Requirement: Hard rules inherited from the orchestrator

The command SHALL inherit and preserve every hard rule from `/experiments:npm-update-major` and the orchestrator: SHALL NOT run tests/lint/build; SHALL NOT create commits, push, or open PRs (branch/worktree isolation via `update-isolation` is permitted); SHALL NOT modify files on `cancel`; SHALL NOT mutate `<HOME>/.claude/commander/projects.json` (byte-identical, verifiable via `shasum`); SHALL NOT mutate a `catalog:` consumer `package.json`; SHALL NOT auto-execute an override without explicit `run-override`; SHALL NOT run `ncu --upgrade` as a fallback after an override fails.

#### Scenario: Registry is read-only

- **WHEN** any `/experiments:commander-update-major` run completes
- **THEN** the `shasum` of `<HOME>/.claude/commander/projects.json` is unchanged from before the run

### Requirement: Non-goals deferred to follow-ups

The command SHALL NOT implement `--projects a,b,c`, `--all`, per-project parallel apply, auto-rollback, or automated tests in v1 (deferred, matching the patch/minor siblings).

#### Scenario: CLI flags are not recognized

- **WHEN** the user invokes `/experiments:commander-update-major --projects foo,bar`
- **THEN** the command treats `--projects foo,bar` as a stray argument, prints the standard ignore line, and continues into the orchestrator with no project filter applied
