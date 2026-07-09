## MODIFIED Requirements

### Requirement: Hard rules

The command SHALL NOT create commits, push, or open PRs (branch/worktree isolation via `update-isolation` is permitted); SHALL NOT modify files on `cancel`; SHALL NOT modify `support`/`unknownSurfaces` loci; SHALL NOT expand the plan-mode round beyond items present in `plan.md`. The command stops for human-in-the-loop review before any commit/push/PR. `partition-breaking-changes` (PR bucketing) does NOT apply at engines level — an engine bump is a single coordinated co-upgrade.

#### Scenario: Cancel touches nothing

- **WHEN** the user selects `cancel` at the gate
- **THEN** no file is modified and the command exits

#### Scenario: No PR partition at engines level

- **WHEN** the deep-engines plan is rendered
- **THEN** it contains no `## PR plan` section (partition is not applicable to a single coordinated engine bump)
