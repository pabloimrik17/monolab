## MODIFIED Requirements

### Requirement: Phase 4 — plan synthesis in plan mode

When all groups are healthy or the user chose `continue-without`, the main agent SHALL enter Claude Code plan mode and produce `plan.md` at the plan-dir root. The file SHALL begin with an `H1` titled `Deep-<level> plan: <slug>` followed by exactly five `H2` sections in this fixed order: `Improvements (applicable to this codebase)`, `Workarounds resolved`, `Skipped or unavailable`, `<Level> bump set`, `Changelogs`.

The bump-set heading SHALL be the title-cased level followed by ` bump set` — `Patch bump set`, `Minor bump set`, `Major bump set`, or `Engines bump set` — interpolated from the `level` input (it SHALL NOT be hardcoded to `Patch`).

Each section is populated by reading the healthy groups' `research.md` files and the original `scan.json`. The `<Level> bump set` section SHALL list every update from `scan.json` regardless of group health, formatted as a markdown table with columns `package | current → target | location`. The `Changelogs` section is the final section and SHALL follow the "Changelog chronology section in plan.md" requirement below.

The skill SHALL update the global `_meta.json.phase` to `"planning"` before entering plan mode. The skill SHALL NOT set `_meta.json.phase` to `"executing"` or `"done"`; advancing past `"planning"` is consumer-owned (the calling command sets these phases when applying begins or completes).

#### Scenario: Plan mode entered

- **WHEN** phase 3 completes successfully or the user chose `continue-without`
- **THEN** the global `_meta.json.phase` is set to `"planning"` and the main agent enters plan mode

#### Scenario: Plan structure is fixed

- **WHEN** `plan.md` is written for a `patch` run
- **THEN** it contains exactly the five H2 section headings `Improvements (applicable to this codebase)`, `Workarounds resolved`, `Skipped or unavailable`, `Patch bump set`, `Changelogs` in that order

#### Scenario: Bump-set heading is level-derived

- **WHEN** `plan.md` is written for a `minor` run
- **THEN** the bump-set heading reads `## Minor bump set` (not `## Patch bump set`)

#### Scenario: Bump set always present

- **WHEN** the scan returned 12 updates and 2 groups were skipped via `continue-without`
- **THEN** the `<Level> bump set` table contains all 12 updates regardless of which groups were skipped

### Requirement: Cross-project `plan.md` template

When `mode === "cross-project"`, phase 4 plan-mode synthesis SHALL write `plan.md` with the following exact structure (top-to-bottom):

- An H1 title formatted as `Deep-<level> plan (cross-project): <slug>` (e.g. `# Deep-patch plan (cross-project): commander-deep-patch`).
- A single descriptive line `Projects covered: <comma-separated project names from scan-by-project.json keys, alphabetical>`.
- Five H2 sections, in this order: `Improvements (universal — applicability checked per project at apply time)`, `Workarounds resolved`, `Skipped or unavailable`, `Cross-project bump set`, `Changelogs`.
- The `Improvements` section contains `-` bullets, each with the form `[<priority>] <package> — <opportunity>. Hint: <abstract hint or "none">. (group: <groupId>; affects projects: <comma-separated project names>)`.
- The `Workarounds resolved` section contains `-` bullets, each with the form `<package> — <bug fixed in this version>. Hint: <abstract hint or "none">. (group: <groupId>; affects projects: <comma-separated project names>)`.
- The `Skipped or unavailable` section contains `-` bullets, each with the form `<groupId> — <reason>.`.
- The `Cross-project bump set` section contains a markdown table whose columns are exactly `package`, `proposed target`, `projects (locations)`. Example row: a `react` bump to `^19.0.14` applied in `proj-A` (root) and `proj-B` (root) renders as a single row whose third column reads `proj-A (root); proj-B (root)`.
- The `Changelogs` section is the final section and SHALL follow the "Changelog chronology section in plan.md" requirement below (cross-project variant: representative `from → to`, dedup by package).

Rules:

- The five H2 sections SHALL appear in this exact order: `Improvements (universal — applicability checked per project at apply time)`, `Workarounds resolved`, `Skipped or unavailable`, `Cross-project bump set`, `Changelogs`.
- Sections with zero items still render with a single sentinel line: `_no improvements identified_`, `_no workarounds resolved_`, `_no skipped groups_`. The `Changelogs` section uses the per-package `_no changelog available_` sentinel defined in its own requirement.
- The `affects projects:` list per improvement / workaround bullet is derived from `scan-by-project.json` and `cross-project-plan.json`: for the bullet's package, list every project name whose `ScanResult.updates[]` includes the package.
- The `Cross-project bump set` table cell format: `<projectName> (<location>)`, with `;` separating projects and `,` separating multiple locations within the same project (when the package appears in multiple workspaces of a single project).
- Table rows sorted by `package` name (alphabetical, stable).
- The `<reason>` cell in `Skipped or unavailable` follows the same rule as single-project: for `failed`/`missing` groups, copy `groups/<id>/_meta.json.errorReason` verbatim; for `expected-missing` groups (degraded path), use the constant string `research consolidated in main agent (subagent dispatch limited)`.

#### Scenario: Cross-project plan.md uses cross-project H1 and project-tagged bullets

- **WHEN** phase 4 completes in cross-project mode with `slug: "commander-deep-patch"`, `level: "patch"`, and three improvement bullets affecting different project subsets
- **THEN** `plan.md` H1 reads `# Deep-patch plan (cross-project): commander-deep-patch`
- **AND** the second line reads `Projects covered: <alphabetical comma-separated names>`
- **AND** each improvement bullet ends with `(group: <id>; affects projects: <names>)`

#### Scenario: Cross-project bump set table columns

- **WHEN** the cross-project plan's bump set table is rendered
- **THEN** the columns are exactly `package`, `proposed target`, `projects (locations)`
- **AND** rows are sorted alphabetically by `package`

#### Scenario: Changelogs is the final cross-project section

- **WHEN** phase 4 completes in cross-project mode
- **THEN** `plan.md` ends with the `## Changelogs` section, after `## Cross-project bump set`

#### Scenario: Single-project plan.md template unchanged in shape

- **WHEN** phase 4 completes in single-project mode
- **THEN** `plan.md` follows the single-project template (H1 `Deep-<level> plan: <slug>`, sections `Improvements (applicable to this codebase)`, `Workarounds resolved`, `Skipped or unavailable`, `<Level> bump set`, `Changelogs`)
- **AND** improvement bullets carry `(group: <groupId>)` without the `affects projects:` tag

## ADDED Requirements

### Requirement: Changelog chronology section in plan.md

Phase 4 synthesis SHALL append a final `## Changelogs` section to `plan.md` in both `single-project` and `cross-project` modes, assembled entirely from changelog data already on disk — the per-group `changelogs/<package-basename>/` outputs written in phase 1 and the `experiments:npm-changelog` cache under `~/.claude/changelogs/<normalized-name>/`. Synthesis SHALL NOT perform any network fetch for this section.

The section SHALL contain one block per package in the bump set, ordered **alphabetically** by package name. Each block:

1. Header `### <package> (<from> → <to>)`. In single-project mode `<from>`/`<to>` are the package's `currentVersion`/`targetVersion` from `scan.json`. In cross-project mode they are the representative `currentVersion` (the most-common current version across occurrences) and the `effectiveTarget` from `cross-project-plan.json`; the block SHALL NOT enumerate per-project version variations (the `Cross-project bump set` table is the source for those).
2. A **links line first**, reused from the npm-changelog cache: the repository URL (`~/.claude/changelogs/<normalized-name>/_meta.json.repository`) plus the per-version source/release URLs (`<ver>.meta.json.sourceUrl`) for the covered versions. This line is produced from cached metadata only — no network call.
3. Then the full verbatim changelog body for each **stable version in `(from, to]`** — every version newer than the installed `from`, up to and including `to`; the installed `from` is excluded — in **ascending** order (oldest→newest). Each version's body SHALL be the cached `<ver>.md` content verbatim, wrapped in a collapsible `<details><summary>{ver}</summary> … </details>` block.

Reading the section top-to-bottom therefore advances through versions chronologically (oldest first), the reverse of repository changelog ordering.

If no changelog body is available for a package (every covered version failed, `no_changelog_source`, or `from == to` so the half-open span is empty), the block SHALL render the links line (when a repository is known) followed by the sentinel `_no changelog available_`. In the degraded path (`degrade-to-main-agent` was selected at the phase-1 hard wall), the cached `<ver>.md` files still exist under `~/.claude/changelogs/`; the main agent SHALL build the section from that cache even when per-group `research.md` is absent.

The `## Changelogs` section SHALL render whenever the bump set has at least one package, independent of whether any improvements or workarounds were found. Because `plan.md` is a file the user opens deliberately (not chat output), embedding verbatim changelog bodies does not violate the `experiments:npm-changelog` "never paste into chat" rule.

#### Scenario: Packages alphabetical, versions ascending

- **WHEN** the bump set contains `zod (3.23.0 → 3.24.1)` and `axios (1.7.0 → 1.7.9)`, each with multiple intermediate versions
- **THEN** the `## Changelogs` section lists `axios` before `zod`
- **AND** within each package the `<details>` blocks run oldest version first to newest version last

#### Scenario: Links first, reused from cache, no network

- **WHEN** a package block is rendered
- **THEN** the first line of the block is the repository + per-version source links read from the npm-changelog cache metadata
- **AND** synthesis issues no `npm view`, `gh api`, or `curl` calls to build the section

#### Scenario: Version span excludes the installed version

- **WHEN** a package is bumped `1.7.0 → 1.7.9` with stable intermediates `1.7.1 … 1.7.9`
- **THEN** the block embeds bodies for `1.7.1` through `1.7.9` and SHALL NOT embed a body for `1.7.0`

#### Scenario: Missing changelog renders sentinel

- **WHEN** a bumped package has no available changelog body for any covered version
- **THEN** its block renders the links line (if a repository is known) followed by `_no changelog available_`

#### Scenario: Cross-project block uses representative versions

- **WHEN** in cross-project mode a package is at different current versions across projects
- **THEN** the block header shows the representative `currentVersion` → `effectiveTarget` and points to the `Cross-project bump set` table for per-project detail, rather than enumerating each project's span
