## MODIFIED Requirements

### Requirement: Output shape — ordered buckets + count-by-policy summary

The skill SHALL return an ordered list of buckets, each `{ title, packages, riskTier, rationale, suggestedBranch, suggestedMergeOrder }`, plus a count-by-policy summary that reports the number of buckets (and the largest bucket) under at least two policies, so the caller can let the user choose granularity before any worktree is created. The buckets render as a `## PR plan` section in the dossier output (the section name `## PR plan` is a retained legacy name — see the deep-update artifact glossary carve-outs). The skill SHALL NOT create branches or worktrees itself (that is `update-isolation`'s role).

#### Scenario: Buckets render in the dossier output

- **WHEN** the caller surfaces the returned buckets
- **THEN** they render as a `## PR plan` section in the dossier output (legacy section name retained)
