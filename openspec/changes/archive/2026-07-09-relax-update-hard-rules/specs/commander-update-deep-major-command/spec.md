## MODIFIED Requirements

### Requirement: Hard rules inherited from the orchestrator and the deep flow

The command SHALL inherit and preserve every hard rule from `commander-update-orchestrator` (deep mode) and the single-project deep flow: SHALL NOT create commits, push, or open PRs (branch/worktree isolation via `update-isolation` is permitted); SHALL NOT modify files on `cancel` at the gate; on plan-mode rejection it SHALL NOT apply any improvement or migration edit, but already-applied bumps (from the bumps loop) are preserved, not reverted; SHALL NOT mutate `<HOME>/.claude/commander/projects.json` (byte-identical, verifiable via `shasum`); SHALL NOT mutate a `catalog:` consumer `package.json`; SHALL NOT auto-execute an override without explicit `run-override`; SHALL NOT run `ncu --upgrade` as a fallback after an override fails; SHALL NOT expand the plan-mode round beyond bullets present in `plan.md`.

#### Scenario: Cancel at the gate leaves the workspace untouched

- **WHEN** the user picks `cancel` at the orchestrator's confirmation gate
- **THEN** no manifest, override command, install, or plan-mode round runs, the command exits zero, and the registry `shasum` is unchanged

#### Scenario: Plan-mode rejection preserves bumps but skips edits

- **WHEN** the user rejects the plan-mode round after some bumps already landed
- **THEN** the already-applied bumps are preserved (no rollback), no improvement or migration edits are applied, and the rejection notice is surfaced verbatim
