## MODIFIED Requirements

### Requirement: Output shape — ordered buckets + count-by-policy summary

The skill SHALL return an ordered list of buckets, each `{ title, packages, riskTier, rationale, suggestedBranch, suggestedMergeOrder }`, plus a count-by-policy summary `countByPolicy: Array<{ policy: string, bucketCount: number, largestBucket: number }>` with at least two entries in deterministic order: the active-knobs policy (identifier `isolate-high + batch-low` under default knobs) first, then the `one-per-package` baseline, so the caller can render the choices and let the user choose granularity before any worktree is created. The buckets render as a `## PR plan` section appended to the caller's surfaced digest — the dossier file template itself does not include it (the section name `## PR plan` is a retained legacy name — see the deep-update artifact glossary carve-outs). The skill SHALL NOT create branches or worktrees itself (that is `update-isolation`'s role).

#### Scenario: Buckets render in the surfaced digest

- **WHEN** the caller surfaces the returned buckets
- **THEN** they render as a `## PR plan` section in the surfaced digest (legacy section name retained; the dossier file does not carry it)

#### Scenario: Count-by-policy summary is stable

- **WHEN** the skill returns its result under default policy knobs
- **THEN** `countByPolicy` has `{ policy, bucketCount, largestBucket }` entries
- **AND** the first entry's `policy` is `isolate-high + batch-low` and the second is the `one-per-package` baseline
