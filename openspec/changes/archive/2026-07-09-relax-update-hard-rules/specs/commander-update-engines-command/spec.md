## MODIFIED Requirements

### Requirement: Hard rules inherited from the orchestrator

The command SHALL inherit and preserve every hard rule from `commander-update-orchestrator`: SHALL NOT create commits, push, or open PRs (branch/worktree isolation via `update-isolation` is permitted); SHALL NOT modify files on `cancel`; SHALL NOT mutate `<HOME>/.claude/commander/projects.json` (byte-identical, verifiable via `shasum`); SHALL NOT modify publishable-library `engines.node` support ranges (only runtime surfaces).

#### Scenario: Registry untouched

- **WHEN** the command completes
- **THEN** `<HOME>/.claude/commander/projects.json` is byte-identical (verifiable via `shasum`)

#### Scenario: Cancel leaves all projects untouched

- **WHEN** the user selects `cancel` at the orchestrator gate
- **THEN** no project's runtime surfaces are modified and the command exits
