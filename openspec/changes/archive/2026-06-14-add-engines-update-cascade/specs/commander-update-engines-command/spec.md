## ADDED Requirements

### Requirement: Command location, frontmatter, and invocation contract

The `experiments` plugin SHALL include a slash command at `claude-plugins/experiments/commands/commander-update-engines.md` with YAML frontmatter declaring a non-empty `description`, invocable as `/experiments:commander-update-engines`. The command SHALL accept no positional arguments and no flags; stray input is reported with a one-line warning, not an early exit. It is the shallow cross-project sibling of `/experiments:commander-update-major`.

#### Scenario: Command file exists with frontmatter

- **WHEN** examining `claude-plugins/experiments/commands/`
- **THEN** the file `commander-update-engines.md` SHALL exist with YAML frontmatter and a non-empty `description`

#### Scenario: Stray arguments reported and ignored, not fatal

- **WHEN** the user invokes `/experiments:commander-update-engines foo`
- **THEN** the command prints one ignore line and continues into the orchestrator invocation

### Requirement: Single invocation of the orchestrator with the shallow engines input set

The command SHALL invoke `commander-update-orchestrator` exactly **once**, via the `Skill` tool, with `level: "engines"`, `target: "engines"`, `mode: "shallow"` (or `mode` omitted to default shallow), `overrideRegistryPath` omitted, and `projectsFilter` omitted (interactive picker). The command SHALL NOT override `level`/`target` to anything other than `engines`, SHALL NOT pass a `projectsFilter`, and SHALL NOT invoke `detect-toolchain-surfaces`, `apply-engine-bumps`, `scan-npm-updates`, `ncu`, or any package-manager command directly.

#### Scenario: Orchestrator invoked with shallow engines inputs

- **WHEN** the command runs against a registry with at least one project
- **THEN** the orchestrator is invoked exactly once with `level: "engines"`, `target: "engines"`, shallow mode
- **AND** the command issues no other Skill invocations and runs no engine detect/apply or `ncu` of its own

#### Scenario: Output surfaced verbatim

- **WHEN** the orchestrator emits prompts, the rendered plan, summaries, or errors
- **THEN** the command surfaces every line verbatim and exits with the orchestrator's exit code

### Requirement: Hard rules inherited from the orchestrator

The command SHALL inherit and preserve every hard rule from `commander-update-orchestrator`: SHALL NOT run tests/lint/build; SHALL NOT create commits, push, or open PRs (branch/worktree isolation via `update-isolation` is permitted); SHALL NOT modify files on `cancel`; SHALL NOT mutate `<HOME>/.claude/commander/projects.json` (byte-identical, verifiable via `shasum`); SHALL NOT modify publishable-library `engines.node` support ranges (only runtime surfaces).

#### Scenario: Registry untouched

- **WHEN** the command completes
- **THEN** `<HOME>/.claude/commander/projects.json` is byte-identical (verifiable via `shasum`)

#### Scenario: Cancel leaves all projects untouched

- **WHEN** the user selects `cancel` at the orchestrator gate
- **THEN** no project's runtime surfaces are modified and the command exits
