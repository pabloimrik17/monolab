## MODIFIED Requirements

### Requirement: Hard rules inherited from the orchestrator

The command SHALL inherit and preserve every hard rule from `/experiments:npm-update-major` and the orchestrator: SHALL NOT create commits, push, or open PRs (branch/worktree isolation via `update-isolation` is permitted); SHALL NOT modify files on `cancel`; SHALL NOT mutate `<HOME>/.claude/commander/projects.json` (byte-identical, verifiable via `shasum`); SHALL NOT mutate a `catalog:` consumer `package.json`; SHALL NOT auto-execute an override without explicit `run-override`; SHALL NOT run `ncu --upgrade` as a fallback after an override fails.

#### Scenario: Registry is read-only

- **WHEN** any `/experiments:commander-update-major` run completes
- **THEN** the `shasum` of `<HOME>/.claude/commander/projects.json` is unchanged from before the run
