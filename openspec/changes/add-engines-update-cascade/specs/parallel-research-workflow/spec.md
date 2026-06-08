## ADDED Requirements

### Requirement: Engine release-note sourcing for level `engines`

When the workflow's `level` input is `engines`, research SHALL target **engine release notes** rather than npm-registry package changelogs, in BOTH `single-project` and `cross-project` modes. For `level ∈ {patch, minor, major}` this requirement is inert (no change to those flows).

**Phase 1 — fetch.** For `level=engines`, the changelog-fetch phase SHALL retrieve release notes for each affected engine (Node, pnpm, npm, yarn, Deno, Bun) over the range `current → target`, via `npm-changelog`'s engine release-note retrieval, **deduplicated once per engine/version** (not per project). The plan-dir slug and `_meta.json.level` SHALL record `engines`.

**Phase 2 — research.** Subagents SHALL assess the engine upgrade's impact on the codebase: required config/script/CI changes, removed runtime flags/APIs, package-manager lockfile-format or settings changes, and deprecations to act on — emitted under the `### Breaking changes & migration` heading (the same category major introduced), with the `_no findings_` sentinel when none. In `cross-project` mode findings SHALL be phrased universally (no specific project path).

**Phase 4 — synthesis.** `plan.md` SHALL include the `## Breaking changes & migration` section (populated from engine release notes) and the `## Changelogs` section SHALL link engine release notes rather than package changelogs.

#### Scenario: Engines research fetches engine release notes

- **WHEN** the workflow runs with `level: "engines"` bumping Node and pnpm
- **THEN** phase 1 retrieves Node and pnpm release notes over their `current → target` ranges (once per engine/version), not npm package changelogs

#### Scenario: Engines plan carries breaking-change + changelog sections from engine notes

- **WHEN** `plan.md` is synthesized for `level: "engines"`
- **THEN** it contains a `## Breaking changes & migration` section sourced from engine release notes and a `## Changelogs` section linking engine release notes

#### Scenario: Non-engines levels unaffected

- **WHEN** the workflow runs with `level: "patch"`, `"minor"`, or `"major"`
- **THEN** research continues to target npm package changelogs and no engine release-note sourcing occurs
