## MODIFIED Requirements

### Requirement: Summary and hard rules

After apply (or after `cancel`), the command SHALL print a summary headed `## npm-update-minor summary`, composing the `npm-update-apply` result fragment into the same section shape as `/experiments:npm-update-patch` (applied generically, applied via override, skipped by override policy, skipped by user, install line, always-present `Suggested next steps`). On an `npm-update-apply` structured failure, the command SHALL format and print the single-project abort copy (`Re-run /experiments:npm-update-minor to retry the rest.`). The command SHALL NOT create commits, push, or open PRs autonomously — it stops for human-in-the-loop review before any such outward/VCS action — and SHALL NOT mutate `catalog:` consumer `package.json` entries. Running read-only verification (lint, typecheck, or build) is permitted but never performed automatically by default.

#### Scenario: Summary heading is minor-namespaced

- **WHEN** a run completes
- **THEN** the summary starts with `## npm-update-minor summary`

#### Scenario: Abort copy is minor-namespaced

- **WHEN** `npm-update-apply` returns an `ncu` failure
- **THEN** the command prints the abort message naming `/experiments:npm-update-minor` as the re-run target
