## MODIFIED Requirements

### Requirement: Workflow input contract

The workflow SHALL accept exactly these inputs:

- `groups` (required) — array of group records as emitted by `group-packages-for-research`: `[{ groupId, bucketKey, packages: [...] }]`.
- `level` (required) — one of `patch`, `minor`, `major`, `engines`. Embedded into the plan-dir slug and into `_meta.json.level`. Determines the title of `plan.md`.
- `scanResult` (required) — the verbatim `ScanResult` JSON for single-project callers, or a synthesized cross-project `ScanResult`-shaped value for cross-project callers. Persisted as `scan.json` (single-project) or as part of `scan-by-project.json` + `cross-project-plan.json` (cross-project; see "Cross-project plan-dir layout").
- `mode` (optional) — one of `single-project`, `cross-project`. Default `single-project`. Selects the cross-project research contract (universal-only findings, no codebase cross-reference) when `cross-project`.
- `slugOverride` (optional in single-project mode, REQUIRED in cross-project mode) — string used as the plan-dir basename slug instead of the CWD/`package.json#name`-derived slug. Sanitized identically to derived slugs (lowercase, replace `[^a-z0-9]+` with `-`, trim leading/trailing `-`, truncate to 40 chars).
- `maxConcurrent` (optional, integer, default `5`) — per-batch concurrency cap; identical to today's contract.

The workflow SHALL reject invocations with:

- An unknown `mode` value: abort with `Error: invalid mode "<value>". Expected single-project|cross-project.` before any side effect.
- `mode: "cross-project"` and an absent or empty `slugOverride`: abort with `Error: slugOverride is required when mode is cross-project.` before any side effect.
- A `maxConcurrent` outside `[1, 10]`: abort with `Error: maxConcurrent must be between 1 and 10, got <value>.` (unchanged).

The workflow SHALL NOT mutate any input.

#### Scenario: Defaults preserve single-project behavior

- **WHEN** a caller invokes the workflow with `mode` and `slugOverride` both omitted
- **THEN** the workflow runs in single-project mode using the CWD/`package.json#name`-derived slug
- **AND** the subagent prompt, plan-dir layout, and plan.md template are byte-equivalent to today

#### Scenario: Cross-project mode without slugOverride is rejected

- **WHEN** a caller invokes the workflow with `mode: "cross-project"` and no `slugOverride`
- **THEN** the workflow aborts with `Error: slugOverride is required when mode is cross-project.` before creating any plan-dir
- **AND** performs no scan, no research, no plan-mode entry

#### Scenario: Slug override applies sanitization

- **WHEN** the caller passes `slugOverride: "Commander_DEEP.patch"` 
- **THEN** the workflow sanitizes to `commander-deep-patch` (lowercase, non-alnum runs collapsed to `-`, no leading/trailing `-`)
- **AND** the final plan-dir basename is `commander-deep-patch-<unix-ts>[-N]`

---

### Requirement: Global `_meta.json` schema

The global `_meta.json` schema SHALL include a `mode` field alongside the existing fields:

```json
{
    "slug": "<string>",
    "planDirName": "<string>",
    "level": "patch" | "minor" | "major" | "engines",
    "mode": "single-project" | "cross-project",
    "createdAt": "<ISO 8601>",
    "phase": "scanning" | "grouping" | "changelogs" | "research" | "integrity" | "planning" | "executing" | "done",
    "groupIds": ["<string>", ...]
}
```

Backward compatibility: when the stale-cleanup pass (phase 0) reads an existing `_meta.json` lacking the `mode` field, it SHALL treat it as `mode: "single-project"`. The 10-day stale threshold is mode-independent.

#### Scenario: New _meta.json writes carry the mode field

- **WHEN** the workflow initializes a fresh plan-dir
- **THEN** `_meta.json` SHALL include the `mode` field with the value from the workflow input

#### Scenario: Legacy _meta.json without mode reads as single-project

- **WHEN** phase 0 stale-cleanup encounters an existing plan-dir whose `_meta.json` lacks the `mode` field
- **THEN** the workflow classifies it as if `mode: "single-project"` was set
- **AND** the 10-day stale threshold applies

## ADDED Requirements

### Requirement: Cross-project subagent prompt template (mandatory)

When `mode === "cross-project"`, the workflow SHALL dispatch every phase-1+2 subagent with a prompt that:

1. **Omits** the `Codebase root: <CWD>` line present in single-project mode.
2. **Replaces** the phase-2 instructions with the cross-project contract:
    - Subagents SHALL NOT use `Read` / `Glob` / `Grep` on any project source file. Findings are derived solely from the changelog.
    - Subagents SHALL produce `research.md` with `### Workarounds resolved (universal)` and `### Improvements applicable (universal)` headings per package.
    - Each finding SHALL contain a universal description of what the version fixes or introduces, plus an optional `Hint:` line carrying abstract context — file globs by convention (`apps/**/use*.ts`), framework names (`React`, `Hono server-mode`), idiomatic patterns (`hooks pattern`, `Server Components`). The `Hint:` line SHALL NOT name specific project paths.
3. **Preserves** the rest of the mandatory contract from single-project mode:
    - Steps 1–4 (read `_meta.json`, invoke `experiments:npm-changelog` per package, write `error.txt` on per-package failure, do not terminate after the skill returns).
    - Steps 7–8 (advance `_meta.json` to `phase: "done"` / `status: "ok"` after writing `research.md`, or to `phase: "changelogs"` / `status: "error"` on every-package failure).
    - The final-line response format (`<groupId>: ok — <fetched>/<total> changelogs; <researched> researched.`).

The workflow SHALL NOT dispatch a cross-project subagent without this prompt template. Substituting a looser prompt is a spec violation.

#### Scenario: Cross-project subagent prompt omits codebase root

- **WHEN** the workflow dispatches a phase-1 subagent in cross-project mode
- **THEN** the subagent prompt SHALL NOT contain a `Codebase root:` line
- **AND** the subagent prompt SHALL contain `You SHALL NOT use Read/Glob/Grep on any project source file. Findings are derived solely from the changelog.`

#### Scenario: Cross-project research.md uses universal headings

- **WHEN** a cross-project subagent completes phase 2 for a package
- **THEN** its `research.md` entry for that package SHALL use `### Workarounds resolved (universal)` and `### Improvements applicable (universal)` headings (not the single-project `### Workarounds resolved` / `### Improvements applicable` headings)

#### Scenario: Hint lines carry abstract context only

- **WHEN** a cross-project research bullet includes a `Hint:` line
- **THEN** the hint SHALL reference abstract context (globs, framework names, idiomatic patterns) and SHALL NOT reference specific project paths

#### Scenario: _no findings_ sentinel still applies in cross-project mode

- **WHEN** a package has no universal improvements OR no universal workarounds
- **THEN** the heading is still present with a single `_no findings_` line under it (identical to single-project behavior)

---

### Requirement: Cross-project plan-dir layout

When `mode === "cross-project"`, the workflow SHALL write the following on-disk layout:

```text
~/.claude/experiments/plans/<slugOverride>-<level>-<unix-ts>[-N]/
├── _meta.json              # mode: "cross-project"
├── scan-by-project.json    # { [projectName]: ScanResult } — the per-project scans
├── cross-project-plan.json # the orchestrator's post-version-alignment aggregated plan
├── plan.md                 # cross-project plan synthesized in phase 4
└── groups/
    └── <group-id>/
        ├── _meta.json
        ├── changelogs/
        └── research.md
```

Differences from single-project layout:

- `scan-by-project.json` replaces `scan.json`. It is a JSON object mapping project name to `ScanResult` (verbatim per-project scan output).
- `cross-project-plan.json` is new. It is a JSON object capturing the orchestrator's post-version-alignment `CrossProjectPlan` (deduplicated package list with per-occurrence projection: `projectName`, `currentVersion`, `targetVersion`, `location`, `sourceFile`, plus `proposedTarget` and the resolved conflict-policy outcome).
- The orchestrator writes both files; the workflow only requires them to exist if the workflow needs them for plan-mode synthesis.

For backward compatibility, the workflow SHALL NOT require `scan-by-project.json` and `cross-project-plan.json` to be present in single-project mode (those plans continue to write only `scan.json`).

#### Scenario: Cross-project plan-dir contains both scan artifacts

- **WHEN** the workflow completes phase 4 in cross-project mode
- **THEN** `<plan-dir>/scan-by-project.json` SHALL exist with one ScanResult per project
- **AND** `<plan-dir>/cross-project-plan.json` SHALL exist with the post-version-alignment aggregated plan
- **AND** `<plan-dir>/scan.json` SHALL NOT exist

#### Scenario: Single-project plan-dir layout unchanged

- **WHEN** the workflow completes phase 4 in single-project mode
- **THEN** `<plan-dir>/scan.json` SHALL exist (unchanged from today)
- **AND** `<plan-dir>/scan-by-project.json` SHALL NOT exist
- **AND** `<plan-dir>/cross-project-plan.json` SHALL NOT exist

---

### Requirement: Cross-project `plan.md` template

When `mode === "cross-project"`, phase 4 plan-mode synthesis SHALL write `plan.md` with the following exact structure (top-to-bottom):

- An H1 title formatted as `Deep-<level> plan (cross-project): <slug>` (e.g. `# Deep-patch plan (cross-project): commander-deep-patch`).
- A single descriptive line `Projects covered: <comma-separated project names from scan-by-project.json keys, alphabetical>`.
- Four H2 sections, in this order: `Improvements (universal — applicability checked per project at apply time)`, `Workarounds resolved`, `Skipped or unavailable`, `Cross-project bump set`.
- The `Improvements` section contains `-` bullets, each with the form `[<priority>] <package> — <opportunity>. Hint: <abstract hint or "none">. (group: <groupId>; affects projects: <comma-separated project names>)`.
- The `Workarounds resolved` section contains `-` bullets, each with the form `<package> — <bug fixed in this version>. Hint: <abstract hint or "none">. (group: <groupId>; affects projects: <comma-separated project names>)`.
- The `Skipped or unavailable` section contains `-` bullets, each with the form `<groupId> — <reason>.`.
- The `Cross-project bump set` section contains a markdown table whose columns are exactly `package`, `proposed target`, `projects (locations)`. Example row: a `react` bump to `^19.0.14` applied in `proj-A` (root) and `proj-B` (root) renders as a single row whose third column reads `proj-A (root); proj-B (root)`.

Rules:

- The four H2 sections SHALL appear in this exact order: `Improvements (universal — applicability checked per project at apply time)`, `Workarounds resolved`, `Skipped or unavailable`, `Cross-project bump set`.
- Sections with zero items still render with a single sentinel line: `_no improvements identified_`, `_no workarounds resolved_`, `_no skipped groups_`.
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

#### Scenario: Single-project plan.md template unchanged

- **WHEN** phase 4 completes in single-project mode
- **THEN** `plan.md` follows the existing single-project template (H1 `Deep-<level> plan: <slug>`, sections `Improvements (applicable to this codebase)`, `Workarounds resolved`, `Skipped or unavailable`, `Patch bump set`)
- **AND** improvement bullets carry `(group: <groupId>)` without the `affects projects:` tag

---

### Requirement: Phases 0, 1, 3, end-of-flow cleanup are mode-independent

The following workflow behaviors SHALL be identical across `single-project` and `cross-project` modes:

- Phase 0 stale-plan cleanup (basename regex, 10-day threshold, `delete-stale` / `keep-stale` / `cancel` prompt).
- Phase 1 batched dispatch (sequential batches of `maxConcurrent`, parallel within a batch).
- Phase 1 hard-wall fallback (`retry-current-batch` / `degrade-to-main-agent` / `abort` prompt; `degrade-to-main-agent` banner in `plan.md`).
- Phase 3 mandatory integrity gate (disk-truth classification, `retry-failed` / `continue-without` / `abort` prompt).
- End-of-flow cleanup (`delete-plan` / `keep-plan` prompt).
- Per-group `_meta.json` schema (`groupId`, `packages`, `phase`, `status`, `startedAt`, `completedAt`, `errorPhase`, `errorReason`).
- Field naming conventions (`name`, `from`, `to`, `location`, `sourceFile`) for per-group meta.

The cross-project mode SHALL NOT introduce new phases or change phase transition order. The only mode-conditional differences are: subagent prompt template (this spec's earlier requirement), plan-dir layout (this spec's earlier requirement), `plan.md` template (this spec's earlier requirement), and `_meta.json.mode` field (carried over from the modified global schema).

#### Scenario: Stale-cleanup matches cross-project plan-dirs

- **WHEN** phase 0 scans `~/.claude/experiments/plans/` and encounters `commander-deep-patch-1715693231/`
- **THEN** the directory matches the basename regex `^[a-z0-9-]+-(patch|minor|major|engines)-\d+(-\d+)?$`
- **AND** the 10-day stale threshold applies based on `_meta.json.createdAt`

#### Scenario: Phase 1 hard-wall fallback works identically in cross-project mode

- **WHEN** a batch hard-walls in cross-project mode
- **THEN** the workflow raises the same `retry-current-batch` / `degrade-to-main-agent` / `abort` prompt as single-project mode
- **AND** `degrade-to-main-agent` results in the same banner prepended to `plan.md` (with the cross-project H1)

#### Scenario: Phase 3 integrity gate fires identically in cross-project mode

- **WHEN** one group's `_meta.json` is missing or has `status: "error"` after phase 1+2 batches complete
- **THEN** the workflow raises the same `retry-failed` / `continue-without` / `abort` prompt as single-project mode
- **AND** the gate is mandatory (disk-truth walk) before advancing to phase 4
