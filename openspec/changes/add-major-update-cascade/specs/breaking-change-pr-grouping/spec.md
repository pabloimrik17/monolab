## ADDED Requirements

### Requirement: Skill location and pure-partition contract

The `experiments` plugin SHALL include a skill at `claude-plugins/experiments/skills/partition-breaking-changes/SKILL.md` with frontmatter declaring a non-empty `description`. Given the major-level breaking-change findings + the bump set + a dependency-graph read, the skill SHALL partition the accepted set into PR-sized buckets and return them. The skill SHALL be pure: it performs no network call, no manifest write, and no VCS action.

#### Scenario: Skill file exists with frontmatter

- **WHEN** examining `claude-plugins/experiments/skills/`
- **THEN** the directory `partition-breaking-changes/` with `SKILL.md` SHALL exist with a non-empty `description`

#### Scenario: No side effects

- **WHEN** the skill partitions a set
- **THEN** it has written no manifest, made no network request, and created no branch/worktree/commit

### Requirement: Hard co-upgrade sets precede risk grouping

The skill SHALL first compute **hard co-upgrade sets** — packages that MUST share a bucket — from peer/lockstep relationships (e.g. `react`+`react-dom`+`react-is`+`@types/react`; `@storybook/*`; `vue`+`@vue/*`), seeded from the override-registry families and a `peerDependencies` read. Risk heuristics SHALL only decide whether an already-cohesive set is isolated or batched; they SHALL NOT split a co-upgrade set across buckets.

#### Scenario: Peer set never split

- **WHEN** `react` and `react-dom` both have a major update
- **THEN** they appear in the same bucket regardless of risk scoring

### Requirement: Risk scoring and tunable partition policy

The skill SHALL score each co-upgrade set by blast radius (dependent / import-site count), breaking-change weight (count + severity from changelog findings), centrality (framework/runtime/build-core packages such as `react`, `next`, `vite`, `typescript`, `eslint`), and codemod/migration-step count. A tunable policy (`isolateHighRisk`, `batchLowRisk`, `maxPackagesPerBucket`, `maxRiskPerBucket`) SHALL map sets to buckets: a HIGH-risk set becomes its own bucket; low-risk leaf majors batch together.

#### Scenario: High-risk set isolated even if a single logical package

- **WHEN** a major upgrade for the React co-upgrade set scores HIGH (centrality + blast radius + codemods)
- **THEN** it is placed in its own bucket, separate from low-risk majors

#### Scenario: Low-risk majors batched

- **WHEN** several leaf packages have low-risk major updates and `batchLowRisk` is enabled
- **THEN** they are grouped into a single bucket

### Requirement: Output shape — ordered buckets + count-by-policy summary

The skill SHALL return an ordered list of buckets, each `{ title, packages, riskTier, rationale, suggestedBranch, suggestedMergeOrder }`, plus a count-by-policy summary that reports the number of buckets (and the largest bucket) under at least two policies, so the caller can let the user choose granularity before any worktree is created. The buckets render as a `## PR plan` section in the plan output. The skill SHALL NOT create branches or worktrees itself (that is `update-isolation`'s role).

#### Scenario: Count-by-policy table produced

- **WHEN** the skill partitions a set of major updates
- **THEN** the result includes a count-by-policy summary (e.g. `isolate-high + batch-low` vs `one-per-project`) reporting bucket counts before materialization

#### Scenario: Buckets carry rationale and a suggested branch

- **WHEN** a bucket is produced
- **THEN** it includes its packages, a risk tier, a one-line rationale, and a `suggestedBranch` name the caller may pass to `update-isolation`
