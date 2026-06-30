## ADDED Requirements

### Requirement: Breaking-change research category for level `major`

When the workflow's `level` input is `major`, the research contract and plan synthesis SHALL surface breaking changes as a first-class category, in BOTH `single-project` and `cross-project` modes. For `level ∈ {patch, minor, engines}` this requirement is inert (no change to those flows).

**Phase 2 — research contract.** For `level=major`, each research subagent's `research.md` SHALL include, per package, a `### Breaking changes & migration` heading in addition to the existing `### Workarounds resolved` and `### Improvements applicable` headings. It SHALL capture: required code/config changes to keep the project building, removed/renamed/changed APIs, available codemods, and deprecations to act on. The `_no findings_` sentinel SHALL be written under the heading when the upgrade introduces none. In `cross-project` mode the findings SHALL be phrased universally (framework names, convention globs, idiomatic patterns) and SHALL NOT name any specific project path, identical to the constraints on the other cross-project finding categories.

**Phase 4 — plan synthesis.** For `level=major`, `plan.md` SHALL include a `## Breaking changes & migration` H2 placed **before** `## Improvements`, aggregating the per-package breaking-change findings (single-project: concrete; cross-project: universal with per-bullet `affects projects:` tagging, consistent with the Improvements section). When no package reports a breaking change, the section SHALL render a single `_no breaking changes_` sentinel line rather than being omitted. The plan.md section ordering for `level=major` is therefore: title → `## Breaking changes & migration` → `## Improvements` → (mode-specific bump-set table: `## Major bump set` single-project or `## Cross-project bump set` cross-project) → `## Skipped or unavailable` → `## Changelogs`.

The breaking-change items are reference + actionable material consumed by the deep-major commands' plan-mode apply round (presented as candidate edits alongside improvements, applied only on user approval).

#### Scenario: Major research adds the breaking-change heading

- **WHEN** the workflow runs with `level: "major"` and a package's major upgrade removes an API
- **THEN** that package's `research.md` block includes a `### Breaking changes & migration` heading describing the removed API and the migration step

#### Scenario: Sentinel when a major upgrade has no breaking changes

- **WHEN** the workflow runs with `level: "major"` and a package's major upgrade introduces no breaking change
- **THEN** the package's `### Breaking changes & migration` heading is still present with a `_no findings_` sentinel
- **AND** `plan.md`'s `## Breaking changes & migration` aggregates only real findings, rendering `_no breaking changes_` when none exist across all packages

#### Scenario: Section placement and ordering

- **WHEN** `plan.md` is synthesized for `level: "major"`
- **THEN** `## Breaking changes & migration` appears before `## Improvements`, the bump-set heading is `## Major bump set` (single-project) or `## Cross-project bump set` (cross-project), and `## Changelogs` is last

#### Scenario: Non-major levels are unaffected

- **WHEN** the workflow runs with `level: "patch"` or `level: "minor"`
- **THEN** no `### Breaking changes & migration` heading is added to `research.md` and no `## Breaking changes & migration` section is added to `plan.md` (output byte-equivalent to the minor cascade)

#### Scenario: Cross-project breaking changes stay universal

- **WHEN** the workflow runs with `level: "major"`, `mode: "cross-project"`
- **THEN** breaking-change findings name frameworks / convention globs / idiomatic patterns only and contain no specific project path, and bullets carry the `affects projects:` tag
