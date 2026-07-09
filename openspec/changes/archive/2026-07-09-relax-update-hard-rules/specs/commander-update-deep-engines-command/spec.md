## MODIFIED Requirements

### Requirement: Hard rules inherited from the orchestrator and the deep flow

The command SHALL inherit and preserve every hard rule from `commander-update-orchestrator` (deep mode): SHALL NOT create commits, push, or open PRs (branch/worktree isolation via `update-isolation` is permitted); SHALL NOT modify files on `cancel`; on plan-mode rejection it SHALL NOT apply any migration edit while already-applied bumps are preserved; SHALL NOT mutate `<HOME>/.claude/commander/projects.json` (byte-identical, verifiable via `shasum`); SHALL NOT modify publishable-library `engines.node` support ranges; SHALL NOT expand the plan-mode round beyond items present in `plan.md`.

#### Scenario: Cancel at the gate leaves everything untouched

- **WHEN** the user picks `cancel` at the orchestrator's confirmation gate
- **THEN** no project's surfaces, no install, and no plan-mode round runs; the registry `shasum` is unchanged

#### Scenario: Plan-mode rejection preserves bumps but skips migration edits

- **WHEN** the user rejects the plan-mode round after some bumps landed
- **THEN** the already-applied bumps are preserved and no migration edit is applied
