## MODIFIED Requirements

### Requirement: Hard rules

The command SHALL NOT create commits, push, or open PRs (branch/worktree isolation via `update-isolation` is permitted); SHALL NOT modify files on `cancel`; SHALL NOT mutate a `catalog:` consumer `package.json` (only `pnpm-workspace.yaml`); SHALL NOT consult the override registry; SHALL NOT expand the plan-mode round beyond bullets present in `plan.md`; SHALL ignore any user-supplied level and always pass `level=major`. The command stops for human-in-the-loop review before any commit/push/PR. Cleanup SHALL be delegated to `parallel-research-workflow` (single `delete-plan`/`keep-plan` prompt).

#### Scenario: Deep path never consults overrides

- **WHEN** the command builds the apply spec
- **THEN** `overrideCommands` is empty and no override registry is read
