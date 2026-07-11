## MODIFIED Requirements

### Requirement: Single invocation of the orchestrator with the deep-major input set

The command SHALL invoke `commander-update-orchestrator` exactly **once** per execution, via the `Skill` tool, with `level: "major"`, `target: "major"`, `mode: "deep"`, `overrideRegistryPath` omitted (shared default), and `projectsFilter` omitted (interactive picker). The command SHALL NOT override `level`/`target` to anything other than `major`, SHALL NOT override `mode` to anything other than `"deep"`, SHALL NOT override `overrideRegistryPath`, SHALL NOT pass a `projectsFilter`, and SHALL NOT invoke `scan-npm-updates`, `group-packages-for-research`, `parallel-research-workflow`, `npm-check-updates`, or any package-manager command directly.

#### Scenario: Output surfaced verbatim

- **WHEN** the orchestrator emits prompts (project picker, conflict policy, override actions, the four-option deep gate, changeset-gate entry), the dossier digest, summaries, or error messages
- **THEN** the command surfaces every line verbatim, without wrapping, prefixing, or post-processing, and exits with the orchestrator's exit code

#### Scenario: Dossier includes the major-specific sections

- **WHEN** the orchestrator references the workflow-produced `dossier.md`
- **THEN** the dossier on disk includes the `## Breaking changes & migration` section and the script-assembled `## Changelogs` chronology section (per the `parallel-research-workflow` spec)
- **AND** the surfaced digest references them by path rather than reproducing their bodies

### Requirement: Hard rules inherited from the orchestrator and the deep flow

The command SHALL inherit and preserve every hard rule from `commander-update-orchestrator` (deep mode) and the single-project deep flow: SHALL NOT create commits, push, or open PRs (branch/worktree isolation via `update-isolation` is permitted); SHALL NOT modify files on `cancel` at the gate; on changeset-gate rejection it SHALL NOT apply any improvement or migration edit, but already-applied bumps (from the bumps loop) are preserved, not reverted; SHALL NOT mutate `<HOME>/.claude/commander/projects.json` (byte-identical, verifiable via `shasum`); SHALL NOT mutate a `catalog:` consumer `package.json`; SHALL NOT auto-execute an override without explicit `run-override`; SHALL NOT run `ncu --upgrade` as a fallback after an override fails; SHALL NOT expand the changeset gate round beyond bullets present in `dossier.md`.

#### Scenario: Cancel at the gate leaves the workspace untouched

- **WHEN** the user picks `cancel` at the orchestrator's confirmation gate
- **THEN** no manifest, override command, install, or changeset gate round runs, the command exits zero, and the registry `shasum` is unchanged

#### Scenario: Gate rejection preserves bumps but skips edits

- **WHEN** the user rejects a project's changeset after some bumps already landed
- **THEN** the already-applied bumps are preserved (no rollback), no improvement or migration edits are applied for that project, and the rejection notice is surfaced verbatim

### Requirement: Cross-project PR plan surfaced; per-project isolation in v1

The orchestrator's dossier SHALL include the `## PR plan` section (from `partition-breaking-changes`; the section name `## PR plan` is a retained legacy name — see the deep-update artifact glossary carve-outs) so the user sees the proposed buckets and the count-by-policy summary in the surfaced digest. When isolation is opted into, v1 SHALL create at most **one worktree per project** (the per-(project,bucket) matrix is deferred). The command SHALL NOT commit, push, or open PRs in any case.

#### Scenario: PR plan visible cross-project

- **WHEN** the deep-major cross-project run surfaces the dossier digest
- **THEN** it includes the `## PR plan` section with the bucket count-by-policy summary

### Requirement: Non-goals deferred to follow-ups

The command SHALL NOT implement `--projects a,b,c`, `--all`, per-project parallel apply, auto-rollback (of projects or of bumps when a changeset is rejected at the gate), or automated tests in v1. `/experiments:commander-update-deep-engines` (MON-201) is a separate sub-issue, not part of this command.

#### Scenario: CLI flags are not recognized

- **WHEN** the user invokes `/experiments:commander-update-deep-major --projects foo,bar`
- **THEN** the command treats `--projects foo,bar` as a stray argument, prints the standard ignore line, and continues into the orchestrator with no project filter applied
