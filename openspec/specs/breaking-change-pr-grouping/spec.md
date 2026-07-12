# breaking-change-pr-grouping Specification

## Purpose
TBD - created by archiving change add-major-update-cascade. Update Purpose after archive.
## Requirements
### Requirement: Skill location and pure-partition contract

The `experiments` plugin SHALL include a skill at `claude-plugins/experiments/skills/partition-breaking-changes/SKILL.md` with frontmatter declaring a non-empty `description`. Given the major-level breaking-change findings + the bump set + a dependency-graph read, the skill SHALL partition the accepted set into PR-sized buckets and return them. The skill SHALL be pure: it performs no network call, no manifest write, and no VCS action.

#### Scenario: Skill file exists with frontmatter

- **WHEN** examining `claude-plugins/experiments/skills/`
- **THEN** the directory `partition-breaking-changes/` with `SKILL.md` SHALL exist with a non-empty `description`

#### Scenario: No side effects

- **WHEN** the skill partitions a set
- **THEN** it has written no manifest, made no network request, and created no branch/worktree/commit

### Requirement: Hard co-upgrade sets precede risk grouping

The skill SHALL first compute **hard co-upgrade sets** — packages that MUST share a bucket — before any risk scoring, from: (1) a `peerDependencies` read (the authoritative source, recovering most families, e.g. `react-dom`→`react`, `@vitest/*`→`vitest`, `@angular/*`→`@angular/core`); and (2) the override-registry families. The skill SHALL NOT maintain a hardcoded family list or a family registry (neither its own nor a shared one). For the residual case the peer read cannot express — a `@types/*` package that pairs with its runtime but declares no peer edge — the executing agent MAY recognize the obvious lockstep pairing from the package names; this reasoning SHALL NOT be codified as a maintained list. Risk heuristics SHALL only decide whether an already-cohesive set is isolated or batched; they SHALL NOT split a co-upgrade set across buckets.

#### Scenario: Peer set never split

- **WHEN** `react` and `react-dom` both have a major update
- **THEN** they appear in the same bucket regardless of risk scoring (recovered from `react-dom`'s peer on `react`)

#### Scenario: Vitest family recovered from peerDependencies

- **WHEN** `vitest` and `@vitest/browser` both have a major update
- **THEN** they are computed as one hard co-upgrade set and share a bucket (recovered from `@vitest/browser`'s peer on `vitest`, with no maintained family list)

#### Scenario: No hardcoded family list

- **WHEN** the skill computes hard co-upgrade sets
- **THEN** it relies on the `peerDependencies` read and the override registry (plus agent reasoning for peer-less types pairings), and does NOT read or maintain a version-group family file

### Requirement: Risk scoring and tunable partition policy

The skill SHALL score each co-upgrade set by blast radius (dependent / import-site count), breaking-change weight (count + severity from changelog findings), centrality (framework/runtime/build-core packages such as `react`, `next`, `vite`, `typescript`, `eslint`), and codemod/migration-step count. A tunable policy (`isolateHighRisk`, `batchLowRisk`, `maxPackagesPerBucket`, `maxRiskPerBucket`) SHALL map sets to buckets: a HIGH-risk set becomes its own bucket; low-risk leaf majors batch together.

#### Scenario: High-risk set isolated even if a single logical package

- **WHEN** a major upgrade for the React co-upgrade set scores HIGH (centrality + blast radius + codemods)
- **THEN** it is placed in its own bucket, separate from low-risk majors

#### Scenario: Low-risk majors batched

- **WHEN** several leaf packages have low-risk major updates and `batchLowRisk` is enabled
- **THEN** they are grouped into a single bucket

### Requirement: Output shape — ordered buckets + count-by-policy summary

The skill SHALL return an ordered list of buckets, each `{ title, packages, riskTier, rationale, suggestedBranch, suggestedMergeOrder }`, plus a count-by-policy summary `countByPolicy: Array<{ policy: string, bucketCount: number, largestBucket: number }>` with at least two entries in deterministic order: the active-knobs policy (identifier `isolate-high + batch-low` under default knobs) first, then the `one-per-package` baseline, so the caller can render the choices and let the user choose granularity before any worktree is created. The buckets render as a `## PR plan` section appended to the caller's surfaced digest — the dossier file template itself does not include it (the section name `## PR plan` is a retained legacy name — see the deep-update artifact glossary carve-outs). The skill SHALL NOT create branches or worktrees itself (that is `update-isolation`'s role).

#### Scenario: Buckets render in the surfaced digest

- **WHEN** the caller surfaces the returned buckets
- **THEN** they render as a `## PR plan` section in the surfaced digest (legacy section name retained; the dossier file does not carry it)

#### Scenario: Count-by-policy summary is stable

- **WHEN** the skill returns its result under default policy knobs
- **THEN** `countByPolicy` has `{ policy, bucketCount, largestBucket }` entries
- **AND** the first entry's `policy` is `isolate-high + batch-low` and the second is the `one-per-package` baseline

