## MODIFIED Requirements

### Requirement: Single invocation of the orchestrator with the deep-patch input set

The command SHALL invoke the `commander-update-orchestrator` skill exactly **once** per command execution, via the `Skill` tool, with these inputs:

- `level: "patch"`
- `target: "patch"`
- `mode: "deep"`
- `overrideRegistryPath`: omitted (the skill defaults to `claude-plugins/experiments/skills/scan-npm-updates/data/pkg-upgrade-overrides.yaml`)
- `projectsFilter`: omitted (the skill's interactive multi-select picker is the only project-selection surface in v1)

The command SHALL NOT:

- Override `level` or `target` to anything other than `patch`.
- Override `mode` to anything other than `"deep"`.
- Override `overrideRegistryPath`.
- Pass a `projectsFilter`.
- Invoke any other skill or package-manager command directly. Every action goes through the orchestrator.

#### Scenario: Orchestrator output is surfaced verbatim

- **WHEN** the orchestrator emits prompts (project picker, conflict policy, override actions, gate, changeset-gate entry), the dossier digest, summaries, or error messages
- **THEN** the command surfaces every line verbatim to the user, without wrapping, prefixing, or post-processing
- **AND** the command exits with the same exit code the orchestrator returned

### Requirement: Hard rules inherited from the orchestrator and `npm-update-deep-patch`

The command SHALL inherit and preserve every hard rule from `commander-update-orchestrator` (deep mode) and `npm-update-deep-patch`. The command SHALL NOT:

- Create commits, push, or open pull requests autonomously (branch/worktree isolation via `update-isolation` is permitted); it stops for human-in-the-loop review before any such outward/VCS action.
- Modify any file when the user selects `cancel` at the orchestrator's confirmation gate or rejects a changeset at the gate at apply time.
- Mutate `<HOME>/.claude/commander/projects.json` — the registry is read-only on this path. The on-disk file SHALL be byte-identical before and after every run (verifiable via `shasum`).
- Mutate any consumer `package.json` entry that is a `catalog:` reference — only `pnpm-workspace.yaml` for those.
- Auto-execute an override command without the user selecting `run-override` explicitly for that entry.
- Run `ncu --upgrade` as a fallback after an override command fails.

#### Scenario: Cancel at the gate leaves the workspace untouched

- **WHEN** the user picks `cancel` at the orchestrator's confirmation gate
- **THEN** no manifest, lockfile, override command, install, or changeset gate round runs
- **AND** the command exits zero
- **AND** the registry SHA is unchanged

#### Scenario: Gate rejection preserves bumps but skips improvements

- **WHEN** the user rejects a project's changeset at the gate after some bumps have already landed
- **THEN** the already-applied bumps are preserved (no rollback)
- **AND** no improvement edits are applied for that project
- **AND** the command surfaces `Improvements rejected at the changeset gate. No improvement edits applied; bumps are preserved.` verbatim
- **AND** the summary lists applied bumps and zero applied improvements for that project
