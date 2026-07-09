## MODIFIED Requirements

### Requirement: Hard rules

The command SHALL NOT create commits, push, or open PRs; SHALL NOT modify files on `cancel` or when all accepted updates are skipped by override policy; SHALL NOT mutate a `catalog:` consumer `package.json` (only `pnpm-workspace.yaml`); SHALL NOT auto-execute an override without explicit `run-override`; SHALL NOT run `ncu --upgrade` as a fallback after an override fails; SHALL always pass `level=major` and ignore any user-supplied level. The command stops for human-in-the-loop review before any commit/push/PR; running read-only verification (lint, typecheck, or build) is permitted but never performed automatically by default. The command MAY offer an opt-in isolation gate that delegates branch/worktree creation to `update-isolation` (default `none`); creating an isolation branch/worktree is permitted, committing/pushing/PR-ing is not.

#### Scenario: Optional isolation creates a branch/worktree but never commits

- **WHEN** the user opts into isolation at the gate
- **THEN** the command calls `update-isolation` to create the branch/worktree, applies bumps in the resolved workdir, and performs no commit, push, or PR

#### Scenario: Cancel touches nothing

- **WHEN** the user selects `cancel`
- **THEN** no file is modified and the command exits
