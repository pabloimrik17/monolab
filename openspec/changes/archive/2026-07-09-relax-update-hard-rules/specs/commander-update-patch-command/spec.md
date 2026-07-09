## MODIFIED Requirements

### Requirement: Hard rules preserved

The command SHALL preserve every hard rule the `commander-update-orchestrator` skill enforces:

- The command SHALL NOT create commits, push, or open pull requests autonomously; it stops for human-in-the-loop review before any such outward/VCS action (opt-in isolation branch/worktree creation via `update-isolation` is permitted).
- The command SHALL NOT modify any file when the user selects `cancel` at the orchestrator's confirmation gate.
- The command SHALL NOT mutate `<HOME>/.claude/commander/projects.json`.
- The command SHALL NOT mutate any consumer `package.json` entry that is a `catalog:` reference — only the catalog source file (`pnpm-workspace.yaml` for pnpm, the root `package.json` for Bun).
- The command SHALL NOT auto-execute an override command without the user selecting `run-override` for that entry.
- The command SHALL NOT run `ncu --upgrade` as a fallback after an override command fails.

#### Scenario: Cancel preserves all files

- **WHEN** the user selects `cancel` at the orchestrator's confirmation gate
- **THEN** no project's manifest, lockfile, or registry entry SHALL be modified
- **AND** the command exits with the orchestrator's `Cancelled. No files modified.` message

#### Scenario: No autonomous commit/push/PR

- **WHEN** the command completes a successful apply across multiple projects
- **THEN** no `git commit`, `git push`, or pull-request-creation command has been invoked by the command or the skill
