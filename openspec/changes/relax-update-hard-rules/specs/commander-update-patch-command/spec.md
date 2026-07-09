## MODIFIED Requirements

### Requirement: Hard rules preserved

The command SHALL preserve every hard rule the `commander-update-orchestrator` skill enforces:

- Running read-only verification (lint, typecheck, or build) is permitted and is never a hard-rule violation; the command performs none automatically by default, so a plain run stays behaviorally unchanged. The binding restriction is the commit/push/PR review gate below.
- The command SHALL NOT create commits, push, or open pull requests autonomously; it stops for human-in-the-loop review before any such outward/VCS action (opt-in isolation branch/worktree creation via `update-isolation` is permitted).
- The command SHALL NOT modify any file when the user selects `cancel` at the orchestrator's confirmation gate.
- The command SHALL NOT mutate `<HOME>/.claude/commander/projects.json`.

#### Scenario: Cancel preserves all files

- **WHEN** the user selects `cancel` at the orchestrator's confirmation gate
- **THEN** no project's manifest, lockfile, or registry entry SHALL be modified
- **AND** the command exits with the orchestrator's `Cancelled. No files modified.` message

#### Scenario: No autonomous commit/push/PR

- **WHEN** the command completes a successful apply across multiple projects
- **THEN** no `git commit`, `git push`, or pull-request-creation command has been invoked by the command or the skill
