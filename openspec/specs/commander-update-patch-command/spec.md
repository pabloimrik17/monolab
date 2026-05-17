# commander-update-patch-command Specification

## Purpose

The `/experiments:commander-update-patch` slash command is the patch-level entry point for cross-project npm dependency updates over the user-scoped Commander registry. It is a thin wrapper that delegates the entire workflow (project selection, scan, plan rendering, confirmation, sequential apply) to the `commander-update-orchestrator` skill with `level=patch` and `target=patch`.

## Requirements

### Requirement: Command file location and frontmatter

The `experiments` plugin SHALL include `commands/commander-update-patch.md` with YAML frontmatter declaring a non-empty `description` field. The command SHALL be invocable as `/experiments:commander-update-patch`.

#### Scenario: Command file exists

- **WHEN** examining `claude-plugins/experiments/commands/`
- **THEN** `commander-update-patch.md` SHALL exist with non-empty `description` frontmatter

#### Scenario: Command invocable

- **WHEN** the user types `/experiments:commander-update-patch`
- **THEN** Claude SHALL execute the command instructions

---

### Requirement: Command entry point and scope

The command SHALL be invokable as `/experiments:commander-update-patch` with no positional arguments. The command SHALL operate exclusively at patch level — it SHALL pass `level=patch` and `target=patch` to the `commander-update-orchestrator` skill and SHALL NOT accept a different level via flags or prompts.

The command SHALL accept no flags in v1. When `ARGUMENTS` is non-empty (after trimming whitespace), the command SHALL print exactly one line `commander-update-patch takes no arguments; ignoring: <verbatim>` and continue normally.

#### Scenario: Invocation with no arguments

- **WHEN** the user runs `/experiments:commander-update-patch`
- **THEN** the command begins the orchestrator workflow with `level=patch` and `target=patch`

#### Scenario: Level is fixed

- **WHEN** the user attempts to pass `--level minor` or `level=minor`
- **THEN** the command prints the "ignoring" notice for the unknown argument and proceeds with `level=patch`

---

### Requirement: Skill delegation

The command SHALL invoke the `commander-update-orchestrator` skill exactly once per invocation. The command SHALL pass:

- `level: "patch"`
- `target: "patch"`
- `overrideRegistryPath`: the default path (`claude-plugins/experiments/skills/scan-npm-updates/data/pkg-upgrade-overrides.yaml`) — the command SHALL NOT override this.
- `projectsFilter`: omitted, so the orchestrator raises the multi-select project picker.

The command SHALL NOT mutate the orchestrator's behavior, intercept its prompts, or post-process its output. The command SHALL NOT call `scan-npm-updates`, `ncu`, or any package-manager command directly — every action goes through the skill.

#### Scenario: One skill invocation

- **WHEN** the user runs the command
- **THEN** exactly one `Skill` call is made to `commander-update-orchestrator` with the inputs above

#### Scenario: Command does not duplicate orchestrator prompts

- **WHEN** the orchestrator raises the project multi-select prompt
- **THEN** the command does NOT raise its own picker, AskUserQuestion, or render its own table

---

### Requirement: Empty-registry short-circuit handled by skill

The command SHALL surface the skill's empty-registry behavior verbatim. The command SHALL NOT add a wrapper message, table, or extra prompt when the skill prints `No projects registered. Use /experiments:commander-add to register one.`.

#### Scenario: Empty registry surface-through

- **WHEN** the registry is missing and the skill prints the empty-registry message
- **THEN** the command exits zero immediately after the skill returns; no further output is emitted

---

### Requirement: Hard rules preserved

The command SHALL preserve every hard rule the `commander-update-orchestrator` skill enforces:

- The command SHALL NOT run tests, lint, or build.
- The command SHALL NOT create git commits, branches, or pull requests.
- The command SHALL NOT modify any file when the user selects `cancel` at the orchestrator's confirmation gate.
- The command SHALL NOT mutate `<HOME>/.claude/commander/projects.json`.

#### Scenario: Cancel preserves all files

- **WHEN** the user selects `cancel` at the orchestrator's confirmation gate
- **THEN** no project's manifest, lockfile, or registry entry SHALL be modified
- **AND** the command exits with the orchestrator's `Cancelled. No files modified.` message

#### Scenario: No commits or tests

- **WHEN** the command completes a successful apply across multiple projects
- **THEN** no `git commit`, `git push`, `vitest`, `nx test`, lint, or build command has been invoked by the command or the skill
