## ADDED Requirements

### Requirement: Command location, frontmatter, and invocation contract

The `experiments` plugin SHALL include a slash command at `claude-plugins/experiments/commands/commander-update-deep-engines.md` with YAML frontmatter declaring a non-empty `description`, invocable as `/experiments:commander-update-deep-engines`. The command SHALL accept no positional arguments and no flags; stray input is reported with a one-line warning, not an early exit. It is the deep cross-project sibling of `/experiments:commander-update-deep-major` and the cross-project counterpart of `/experiments:npm-update-deep-engines`.

#### Scenario: Command file exists with frontmatter

- **WHEN** examining `claude-plugins/experiments/commands/`
- **THEN** the file `commander-update-deep-engines.md` SHALL exist with YAML frontmatter and a non-empty `description`

#### Scenario: Stray arguments reported and ignored, not fatal

- **WHEN** the user invokes `/experiments:commander-update-deep-engines foo bar`
- **THEN** the command prints one ignore line and continues into the orchestrator invocation

### Requirement: Single invocation of the orchestrator with the deep engines input set

The command SHALL invoke `commander-update-orchestrator` exactly **once**, via the `Skill` tool, with `level: "engines"`, `target: "engines"`, `mode: "deep"`, `overrideRegistryPath` omitted, and `projectsFilter` omitted (interactive picker). The command SHALL NOT override `level`/`target` to anything other than `engines`, SHALL NOT override `mode` to anything other than `"deep"`, SHALL NOT pass a `projectsFilter`, and SHALL NOT invoke `detect-toolchain-surfaces`, `apply-engine-bumps`, `parallel-research-workflow`, `group-packages-for-research`, `scan-npm-updates`, `ncu`, or any package-manager command directly.

#### Scenario: Orchestrator invoked with deep engines inputs

- **WHEN** the command runs against a registry with at least one project
- **THEN** the orchestrator is invoked exactly once with `level: "engines"`, `target: "engines"`, `mode: "deep"`
- **AND** the command issues no other Skill invocations and runs no engine detect/apply or `ncu` of its own

#### Scenario: Surfaced plan includes the engines-specific sections

- **WHEN** the orchestrator surfaces the workflow-produced `plan.md`
- **THEN** the surfaced content includes the `## Breaking changes & migration` section (sourced from engine release notes) and the `## Changelogs` chronology section
- **AND** it contains no `## PR plan` section (partition does not apply to a single coordinated engine bump)

#### Scenario: Output surfaced verbatim

- **WHEN** the orchestrator emits prompts, the rendered plan, summaries, or errors
- **THEN** the command surfaces every line verbatim and exits with the orchestrator's exit code

### Requirement: Hard rules inherited from the orchestrator and the deep flow

The command SHALL inherit and preserve every hard rule from `commander-update-orchestrator` (deep mode): SHALL NOT run tests/lint/build; SHALL NOT create commits, push, or open PRs (branch/worktree isolation via `update-isolation` is permitted); SHALL NOT modify files on `cancel`; on plan-mode rejection it SHALL NOT apply any migration edit while already-applied bumps are preserved; SHALL NOT mutate `<HOME>/.claude/commander/projects.json` (byte-identical, verifiable via `shasum`); SHALL NOT modify publishable-library `engines.node` support ranges; SHALL NOT expand the plan-mode round beyond items present in `plan.md`.

#### Scenario: Cancel at the gate leaves everything untouched

- **WHEN** the user picks `cancel` at the orchestrator's confirmation gate
- **THEN** no project's surfaces, no install, and no plan-mode round runs; the registry `shasum` is unchanged

#### Scenario: Plan-mode rejection preserves bumps but skips migration edits

- **WHEN** the user rejects the plan-mode round after some bumps landed
- **THEN** the already-applied bumps are preserved and no migration edit is applied
