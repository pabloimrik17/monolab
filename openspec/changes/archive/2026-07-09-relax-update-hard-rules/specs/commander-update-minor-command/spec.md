## MODIFIED Requirements

### Requirement: Hard rules inherited from the orchestrator

The command SHALL inherit and preserve every hard rule from `commander-update-orchestrator` (shallow mode). The command SHALL NOT create commits, push, or open PRs (branch/worktree isolation via `update-isolation` is permitted); SHALL NOT modify any file when the user selects `cancel`; SHALL NOT mutate `<HOME>/.claude/commander/projects.json` (byte-identical before/after, verifiable via `shasum`); SHALL NOT mutate a `catalog:` consumer `package.json` (only `pnpm-workspace.yaml`); SHALL NOT auto-execute an override without explicit `run-override`; and SHALL NOT run `ncu --upgrade` as a fallback after an override fails.

#### Scenario: Cancel at the gate leaves the workspace untouched

- **WHEN** the user picks `cancel` at the orchestrator's confirmation gate
- **THEN** no manifest, install, or override command runs, the command exits zero, and the registry SHA is unchanged

#### Scenario: Registry byte-identity verified post-run

- **WHEN** a full run completes (success, partial, or cancel)
- **THEN** `<HOME>/.claude/commander/projects.json` SHALL be byte-identical to its pre-run state
