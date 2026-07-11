## MODIFIED Requirements

### Requirement: Single invocation of the orchestrator with the deep-minor input set

The command SHALL invoke the `commander-update-orchestrator` skill exactly **once** per command execution, via the `Skill` tool, with these inputs:

- `level: "minor"`
- `target: "minor"`
- `mode: "deep"`
- `overrideRegistryPath`: omitted (the skill defaults to the shared `pkg-upgrade-overrides.yaml`)
- `projectsFilter`: omitted (the skill's interactive multi-select picker is the only project-selection surface in v1)

The command SHALL NOT override `level`/`target` to anything other than `minor`, SHALL NOT override `mode` to anything other than `"deep"`, SHALL NOT override `overrideRegistryPath`, SHALL NOT pass a `projectsFilter`, and SHALL NOT invoke any other skill or package-manager command directly. Every action goes through the orchestrator.

#### Scenario: Orchestrator output is surfaced verbatim

- **WHEN** the orchestrator emits prompts (project picker, conflict policy, override actions, the four-option deep gate, changeset-gate entry), the dossier digest, summaries, or error messages
- **THEN** the command surfaces every line verbatim, without wrapping, prefixing, or post-processing
- **AND** the command exits with the same exit code the orchestrator returned

#### Scenario: Dossier includes the changelog section

- **WHEN** the orchestrator references the workflow-produced `dossier.md`
- **THEN** the dossier on disk includes the script-assembled `## Changelogs` chronology section (per the `parallel-research-workflow` spec)
- **AND** the surfaced digest references it by path rather than reproducing its bodies

### Requirement: Hard rules inherited from the orchestrator and the deep flow

The command SHALL inherit and preserve every hard rule from `commander-update-orchestrator` (deep mode) and the single-project deep flow. The command SHALL NOT create commits, push, or open PRs (branch/worktree isolation via `update-isolation` is permitted); SHALL NOT modify any file when the user selects `cancel` at the gate; on changeset-gate rejection it SHALL NOT apply any improvement edits, but already-applied bumps (from the Step 10a bumps loop) are preserved, not reverted; SHALL NOT mutate `<HOME>/.claude/commander/projects.json` (byte-identical, verifiable via `shasum`); SHALL NOT mutate a `catalog:` consumer `package.json` (only `pnpm-workspace.yaml`); SHALL NOT auto-execute an override without explicit `run-override`; and SHALL NOT run `ncu --upgrade` as a fallback after an override fails.

#### Scenario: Cancel at the gate leaves the workspace untouched

- **WHEN** the user picks `cancel` at the orchestrator's confirmation gate
- **THEN** no manifest, override command, install, or changeset gate round runs, the command exits zero, and the registry SHA is unchanged

#### Scenario: Gate rejection preserves bumps but skips improvements

- **WHEN** the user rejects a project's changeset after some bumps already landed
- **THEN** the already-applied bumps are preserved (no rollback), no improvement edits are applied for that project, and `Improvements rejected at the changeset gate. No improvement edits applied; bumps are preserved.` is surfaced verbatim

### Requirement: Non-goals deferred to follow-ups

The command SHALL NOT implement `--projects a,b,c`, `--all`, per-project parallel apply, auto-rollback (of projects or of bumps when a changeset is rejected at the gate), or automated tests in v1 (deferred, matching the deep-patch sibling).

#### Scenario: CLI flags are not recognized

- **WHEN** the user invokes `/experiments:commander-update-deep-minor --projects foo,bar`
- **THEN** the command treats `--projects foo,bar` as a stray argument, prints the standard ignore line, and continues into the orchestrator with no project filter applied
