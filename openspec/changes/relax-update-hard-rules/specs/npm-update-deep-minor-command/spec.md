## MODIFIED Requirements

### Requirement: Final summary, changelog plan section, and hard rules

The command SHALL print a summary headed `## npm-update-deep-minor summary` with the same conditional sections as `npm-update-deep-patch` (applied bumps, applied improvements, skipped improvements, skipped-or-unavailable groups, install line, always-present `Suggested next steps`). The `plan.md` the command surfaces SHALL include the `## Changelogs` chronology section produced by `parallel-research-workflow`. The command SHALL delegate end-of-flow cleanup to the workflow (one `delete-plan` / `keep-plan` prompt). The command SHALL NOT create commits, push, or open PRs autonomously — it stops for human-in-the-loop review before any such outward/VCS action; SHALL NOT consult the override registry; and SHALL NOT mutate `catalog:` consumer `package.json` entries.

#### Scenario: Summary heading is deep-minor-namespaced

- **WHEN** a run completes
- **THEN** the summary starts with `## npm-update-deep-minor summary`

#### Scenario: Plan includes the changelog section

- **WHEN** the workflow produces `plan.md` for a minor run
- **THEN** `plan.md` includes a `## Changelogs` section (per the `parallel-research-workflow` spec)

#### Scenario: Override registry not consulted on the deep path

- **WHEN** the command applies bumps
- **THEN** it does NOT load or match the override registry (the override flow remains the shallow `/experiments:npm-update-minor` path's responsibility)
