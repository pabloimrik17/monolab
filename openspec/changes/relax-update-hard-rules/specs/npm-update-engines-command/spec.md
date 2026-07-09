## MODIFIED Requirements

### Requirement: Hard rules

The command SHALL NOT create commits, push, or open PRs; SHALL NOT modify files on `cancel`; SHALL NOT modify `support` or `unknownSurfaces` loci; SHALL always operate at engines level and ignore any user-supplied level. The command stops for human-in-the-loop review before any commit/push/PR; running read-only verification (lint, typecheck, or build) is permitted but never performed automatically by default. The command MAY offer an opt-in isolation gate delegating branch/worktree creation to `update-isolation` (default `none`); creating an isolation branch/worktree is permitted, committing/pushing/PR-ing is not.

#### Scenario: Optional isolation creates a workspace but never commits

- **WHEN** the user opts into isolation
- **THEN** the command calls `update-isolation` to create the branch/worktree, applies bumps in the resolved workdir, and performs no commit, push, or PR

#### Scenario: Cancel touches nothing

- **WHEN** the user selects `cancel`
- **THEN** no file is modified and the command exits
