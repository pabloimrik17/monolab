## MODIFIED Requirements

### Requirement: Single invocation of the orchestrator with the deep engines input set

The command SHALL invoke `commander-update-orchestrator` exactly **once**, via the `Skill` tool, with `level: "engines"`, `target: "engines"`, `mode: "deep"`, `overrideRegistryPath` omitted, and `projectsFilter` omitted (interactive picker). The command SHALL NOT override `level`/`target` to anything other than `engines`, SHALL NOT override `mode` to anything other than `"deep"`, SHALL NOT pass a `projectsFilter`, and SHALL NOT invoke `detect-toolchain-surfaces`, `apply-engine-bumps`, `parallel-research-workflow`, `group-packages-for-research`, `scan-npm-updates`, `ncu`, or any package-manager command directly.

#### Scenario: Dossier includes the engines-specific sections

- **WHEN** the orchestrator references the workflow-produced `dossier.md`
- **THEN** the dossier on disk includes the `## Breaking changes & migration` section (sourced from engine release notes) and the script-assembled `## Changelogs` chronology section
- **AND** it contains no `## PR plan` section (partition does not apply to a single coordinated engine bump)
- **AND** the surfaced digest references the dossier by path rather than reproducing its bodies

#### Scenario: Output surfaced verbatim

- **WHEN** the orchestrator emits prompts, the dossier digest, summaries, or errors
- **THEN** the command surfaces every line verbatim and exits with the orchestrator's exit code

### Requirement: Hard rules inherited from the orchestrator and the deep flow

The command SHALL inherit and preserve every hard rule from `commander-update-orchestrator` (deep mode): SHALL NOT create commits, push, or open PRs (branch/worktree isolation via `update-isolation` is permitted); SHALL NOT modify files on `cancel`; on changeset-gate rejection it SHALL NOT apply any migration edit while already-applied bumps are preserved; SHALL NOT mutate `<HOME>/.claude/commander/projects.json` (byte-identical, verifiable via `shasum`); SHALL NOT modify publishable-library `engines.node` support ranges; SHALL NOT expand the changeset gate round beyond items present in `dossier.md`.

#### Scenario: Cancel at the gate leaves everything untouched

- **WHEN** the user picks `cancel` at the orchestrator's confirmation gate
- **THEN** no project's surfaces, no install, and no changeset gate round runs; the registry `shasum` is unchanged

#### Scenario: Gate rejection preserves bumps but skips migration edits

- **WHEN** the user rejects a project's changeset after some bumps landed
- **THEN** the already-applied bumps are preserved and no migration edit is applied
