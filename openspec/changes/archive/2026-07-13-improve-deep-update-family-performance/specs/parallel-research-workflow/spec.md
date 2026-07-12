## MODIFIED Requirements

### Requirement: Plan-directory creation

The skill SHALL create a plan directory at `~/.claude/experiments/plans/<slug>-<level>-<unix-ts>/` after the stale-plan cleanup prompt resolves, and only when the invocation has not been cancelled (i.e., the user did not select `cancel` in stale-cleanup), where:

- `<slug>` is derived from the root `package.json#name` if present, else `basename(CWD)`. Sanitization: lowercase, replace any run of `[^a-z0-9]+` with `-`, trim leading and trailing `-`, truncate to 40 characters.
- `<level>` is the level passed by the caller (one of `patch`, `minor`, `major`, `engines`).
- `<unix-ts>` is the unix timestamp in seconds at invocation start. To guarantee uniqueness for same-second collisions, if the candidate directory already exists the skill SHALL deterministically append `-2`, `-3`, … (incrementing until a free name is found) so the final path becomes `<slug>-<level>-<unix-ts>[-N]`. The chosen final directory name SHALL be recorded in `_meta.json` under the `planDirName` field (basename only, including any collision suffix).

The plan directory SHALL be created with these subpaths populated: `_meta.json` (global metadata), `scan.json` (verbatim copy of the `ScanResult` consumed by the workflow), and an empty `groups/` directory. `dossier.md` is written later by the synthesizer teammate (see "Phase 4 — dossier synthesis by teammate"). No artifact named `plan.md` SHALL be written. (The storage path `~/.claude/experiments/plans/` and the terms "plan directory" / `planDirName` are retained for on-disk compatibility; they are not artifact names.)

#### Scenario: Initial layout written, no plan.md artifact

- **WHEN** the plan directory is created
- **THEN** `_meta.json` exists with `phase: "scanning"`, `scan.json` exists with the verbatim ScanResult, and `groups/` exists and is empty
- **AND** no artifact named `plan.md` is ever written at the root (`dossier.md` arrives in phase 4)

### Requirement: Workflow input contract

The workflow SHALL accept exactly these inputs:

- `groups` (required) — array of group records as emitted by `group-packages-for-research`: `[{ groupId, bucketKey, packages: [...] }]`.
- `level` (required) — one of `patch`, `minor`, `major`, `engines`. Embedded into the plan-dir slug and into `_meta.json.level`. Determines the title of `dossier.md`.
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
- **AND** the subagent prompt, plan-dir layout, and `dossier.md` template follow the single-project contract

#### Scenario: Cross-project mode without slugOverride is rejected

- **WHEN** a caller invokes the workflow with `mode: "cross-project"` and no `slugOverride`
- **THEN** the workflow aborts with `Error: slugOverride is required when mode is cross-project.` before creating any plan-dir
- **AND** performs no scan, no research, no synthesis

### Requirement: Global plan metadata

The skill SHALL maintain a `_meta.json` file at the plan-directory root with the following shape, updated atomically at every phase transition:

```json
{
  "slug": "<string>",
  "planDirName": "<string>",
  "level": "patch" | "minor" | "major" | "engines",
  "mode": "single-project" | "cross-project",
  "createdAt": "<ISO 8601>",
  "phase": "scanning" | "grouping" | "changelogs" | "research" | "integrity" | "synthesis" | "executing" | "done",
  "groupIds": ["<string>", ...]
}
```

`planDirName` is the basename of the chosen plan directory (e.g. `monolab-source-patch-1745347200` or `monolab-source-patch-1745347200-2` when a collision suffix was appended). It is recorded so consumers can reconstruct the absolute path as `~/.claude/experiments/plans/<planDirName>/` even when the suffix is non-empty.

Backward compatibility: when the stale-cleanup pass (phase 0) reads an existing `_meta.json` lacking the `mode` field, it SHALL treat it as `mode: "single-project"`. When a reader encounters the legacy phase value `"planning"`, it SHALL interpret it as `"synthesis"`. The 10-day stale threshold is mode-independent.

The `phase` field SHALL advance monotonically through the listed values; the skill SHALL NOT skip phases or move backwards.

Resume ownership: when the fan-out is orchestrated as a resumable background workflow (per the experiments-plugin "Research fan-out gates at the workflow boundary" requirement), the workflow journal SHALL be the single resume source of truth and `_meta.json.phase` SHALL NOT be used as resume state (it remains an informational status record). In the main-driven batched-dispatch fallback, `_meta.json` remains the resume state.

#### Scenario: Legacy planning phase value reads as synthesis

- **WHEN** a reader encounters an existing `_meta.json` whose `phase` is the legacy value `"planning"`
- **THEN** it SHALL be interpreted as `"synthesis"`

#### Scenario: Journal is resume truth under workflow orchestration

- **WHEN** the fan-out runs as a resumable background workflow and the run is resumed
- **THEN** resume SHALL be driven by the workflow journal
- **AND** SHALL NOT be driven by `_meta.json.phase`

### Requirement: Phase 1 — batched parallel changelog fetch

When the workflow's phase transitions to `changelogs`, the skill SHALL dispatch subagents in **sequential batches** of size `maxConcurrent` (default `5`, range `[1, 10]`). Within a batch, all subagents SHALL be dispatched in a single dispatch step (parallel). Batches themselves SHALL be sequential — batch N+1 SHALL NOT start before every subagent in batch N has returned.

A single batch is allowed only when `groups.length <= maxConcurrent`; otherwise the skill SHALL split groups into sequential batches of at most `maxConcurrent`. The skill SHALL NOT exceed `maxConcurrent` in any batch — the cap is a hard limit, not a hint, and SHALL NOT be inflated to fit a larger group count into one dispatch. The skill SHALL surface a one-line progress message after each batch completes.

Each subagent SHALL:

1. Read its group's `_meta.json` to determine the package set.
2. For each package, invoke the `fetch-changelog` plugin executable once with the package name and version range `<from>..<to>`. The executable preserves the `experiments:npm-changelog` cache contract and either writes cache entries or records a structured per-package error; it SHALL NOT be replaced by a prose fetch procedure.
3. Write the executable's output to `groups/<groupId>/changelogs/<package-basename>/` (preserving the cache structure).
4. On per-package failure, record the error inline within `changelogs/<package-basename>/error.txt` and continue to the next package.
5. After all packages have been attempted, update its group's `_meta.json` to `phase: "research"` and proceed to phase 2 if at least one package succeeded; otherwise set `status: "error"`, `errorPhase: "changelogs"`, `errorReason: "<aggregated reasons>"`, `completedAt: <now>`, and exit.

Within a batch, the skill SHALL NOT block phase 2 of group A on phase 1 of group B; each group's two phases run sequentially within the group, but groups within the same batch run in parallel.

#### Scenario: Per-package failure does not abort the group

- **WHEN** a group has packages `[A, B, C]` and the `fetch-changelog` executable for `B` fails with HTTP 429
- **THEN** the subagent records the error for `B` in its changelogs subdir, fetches `A` and `C` successfully, and proceeds to phase 2 for `[A, C]`

### Requirement: Subagent dispatch prompt template

Each subagent dispatched in phase 1+2 SHALL receive a prompt that explicitly enforces non-termination across two failure modes observed in dry-runs: (a) returning the `fetch-changelog` executable's structured summary as the agent's final answer, and (b) returning the first per-package failure (notably `no_changelog_source` for `@types/*`) as the agent's final answer.

The dispatch prompt SHALL include, at minimum: numbered execution steps; an explicit rule that the `fetch-changelog` executable's output is INTERMEDIATE data and the subagent MUST NOT terminate after invoking it; explicit handling for `no_changelog_source` (write `error.txt`, continue); a required final-response format `<groupId>: ok — <fetched>/<total> changelogs; <researched> researched.`; and a closing reminder that the task is incomplete if `research.md` is missing in the success path or `_meta.json` is not updated.

The skill SHALL NOT dispatch a subagent with a looser prompt; substitution is a spec violation.

#### Scenario: Executable output is intermediate

- **WHEN** a subagent invokes the `fetch-changelog` executable and receives a success summary
- **THEN** the dispatch prompt mandates the subagent treat that summary as intermediate and continue to the next package, ultimately writing `research.md` and updating `_meta.json` before returning

### Requirement: Cross-project subagent prompt template (mandatory)

When `mode === "cross-project"`, the workflow SHALL dispatch every phase-1+2 subagent with a prompt that:

1. **Omits** the `Codebase root: <CWD>` line present in single-project mode.
2. **Replaces** the phase-2 instructions with the cross-project contract:
    - Subagents SHALL NOT use `Read` / `Glob` / `Grep` on any project source file. Findings are derived solely from the changelog.
    - Subagents SHALL produce `research.md` with `### Workarounds resolved (universal)` and `### Improvements applicable (universal)` headings per package.
    - Each finding SHALL contain a universal description of what the version fixes or introduces, plus an optional `Hint:` line carrying abstract context — file globs by convention (`apps/**/use*.ts`), framework names (`React`, `Hono server-mode`), idiomatic patterns (`hooks pattern`, `Server Components`). The `Hint:` line SHALL NOT name specific project paths.
3. **Preserves** the rest of the mandatory contract from single-project mode:
    - Steps 1–4 (read `_meta.json`, invoke the `fetch-changelog` executable per package, write `error.txt` on per-package failure, do not terminate after the executable returns).
    - Steps 7–8 (advance `_meta.json` to `phase: "done"` / `status: "ok"` after writing `research.md`, or to `phase: "changelogs"` / `status: "error"` on every-package failure).
    - The final-line response format (`<groupId>: ok — <fetched>/<total> changelogs; <researched> researched.`).

The workflow SHALL NOT dispatch a cross-project subagent without this prompt template. Substituting a looser prompt is a spec violation.

#### Scenario: Cross-project subagent fetches via the executable

- **WHEN** the workflow dispatches a phase-1 subagent in cross-project mode
- **THEN** the subagent prompt SHALL NOT contain a `Codebase root:` line
- **AND** the prompt instructs the subagent to invoke the `fetch-changelog` executable per package

### Requirement: Subagent dispatch hard-wall fallback

If every subagent in a single batch returns with `phase: "pending"` and `status: "pending"` (i.e. none even started — the dispatch itself was denied or rate-limited rather than the work failing), the skill SHALL classify the batch as **hard-walled**.

In main-driven batched dispatch (the non-workflow fallback), the skill SHALL prompt the user once via `AskUserQuestion` before starting the next batch. When the fan-out runs as a background workflow (which cannot prompt mid-flight), the hard-wall condition SHALL be recorded and the same prompt SHALL be raised at the post-fan-out boundary, before synthesis.

The prompt SHALL offer exactly three options: `retry-current-batch` (re-dispatch this batch only), `degrade-to-direct-synthesis` (abandon subagent dispatch for the remaining un-dispatched batches; the synthesizer teammate builds the dossier from the changelog cache under `~/.claude/changelogs/` alone — the main conversation still does not ingest changelog or research bodies), and `abort` (exit cleanly, plan dir preserved). The skill SHALL NOT auto-retry a hard-walled batch.

When `degrade-to-direct-synthesis` is selected, the resulting `dossier.md` SHALL include a one-line banner identifying which `groupIds` were not dispatched and noting that research was consolidated from the cache. Per-package failures inside groups that DID start are NOT a hard wall and SHALL NOT trigger this prompt.

#### Scenario: Hard wall fires prompt

- **WHEN** every subagent in batch 1 of 3 returns with `phase: "pending"`, `status: "pending"` under main-driven dispatch
- **THEN** the workflow fires the hard-wall prompt before starting batch 2

#### Scenario: Hard wall under background workflow defers to the boundary

- **WHEN** a batch hard-walls while the fan-out runs as a background workflow
- **THEN** the hard-wall condition is recorded and the prompt is raised after the fan-out returns, before synthesis

#### Scenario: Degrade-to-direct-synthesis banner

- **WHEN** the user selects `degrade-to-direct-synthesis` after batch 2 of 4 hard-walls
- **THEN** the resulting `dossier.md` contains a banner naming the un-dispatched batch-3 and batch-4 group ids and stating research was consolidated from the cache

### Requirement: Phase 3 — integrity verification (mandatory gate)

Phase 3 is a **mandatory gate**: the global `_meta.json.phase` SHALL NOT advance to `"synthesis"` without phase 3 completing first. Skipping phase 3 — even when the workflow believes all groups succeeded — is a spec violation.

After every batch of phase 1+2 has returned (or after `degrade-to-direct-synthesis` was selected from the hard-wall prompt), the skill SHALL:

1. Set the global `_meta.json.phase` to `"integrity"`.
2. Enumerate every `groupId` listed in the global `_meta.json.groupIds`.
3. For each `groupId`, read `groups/<groupId>/_meta.json` from disk and classify:
    - **healthy** if the file exists AND `phase: "done"` AND `status: "ok"`.
    - **failed** if the file exists AND (`status: "error"` OR `phase !== "done"`).
    - **missing** if the file does not exist on disk.
4. Classification SHALL be done by reading from disk, not from in-memory state — disk is the source of truth.

If every group is `healthy`, the skill SHALL set the global `_meta.json.phase` to `"synthesis"` and advance to phase 4 silently.

If at least one group is `failed` or `missing`, the user SHALL be prompted via `AskUserQuestion` (the prompt is mandatory — the skill SHALL NOT silently continue) with these options:

- `retry-failed` — re-dispatch only the non-healthy groups (phase 1 + phase 2 from scratch for each), respecting `maxConcurrent` batching.
- `continue-without` — proceed to phase 4 using only the healthy groups; non-healthy groups SHALL be documented in the resulting `dossier.md`.
- `abort` — exit cleanly. The plan dir is preserved.

The skill SHALL NOT auto-retry non-healthy groups.

In the degraded path (after `degrade-to-direct-synthesis`), groups in batches that were never dispatched SHALL be classified `expected-missing` (a path-only fourth class) and SHALL be documented in `dossier.md`'s `## Skipped or unavailable` section without firing the integrity prompt for them; legitimately failed or missing groups still trigger the prompt as usual.

#### Scenario: Phase advances to integrity before synthesis

- **WHEN** every batch of phase 1+2 has returned and all groups are healthy
- **THEN** the global `_meta.json.phase` is set to `"integrity"` first, then to `"synthesis"`, never directly from `"changelogs"` to `"synthesis"`

#### Scenario: All groups healthy proceeds to synthesis

- **WHEN** every group has `phase: "done"` and `status: "ok"`
- **THEN** no integrity prompt is shown and the workflow advances to phase 4 after setting phase to `"integrity"` then `"synthesis"`

#### Scenario: Continue-without documents skipped groups

- **WHEN** the user selects `continue-without` with one failed group `vitest-1`
- **THEN** the eventual `dossier.md` contains a `## Skipped or unavailable` section listing `vitest-1` and its `errorReason`

#### Scenario: Expected-missing groups in degraded path

- **WHEN** the user selected `degrade-to-direct-synthesis` and 8 of 20 groups were never dispatched
- **THEN** the integrity walk classifies those 8 as `expected-missing`, does NOT fire the prompt for them, and the resulting `dossier.md` lists them under `## Skipped or unavailable`

### Requirement: Cross-project plan-dir layout

When `mode === "cross-project"`, the workflow SHALL write the following on-disk layout:

```text
~/.claude/experiments/plans/<slugOverride>-<level>-<unix-ts>[-N]/
├── _meta.json              # mode: "cross-project"
├── scan-by-project.json    # { [projectName]: ScanResult } — the per-project scans
├── cross-project-plan.json # the orchestrator's post-version-alignment aggregated plan
├── dossier.md              # cross-project dossier synthesized in phase 4
└── groups/
    └── <group-id>/
        ├── _meta.json
        ├── changelogs/
        └── research.md
```

Differences from single-project layout:

- `scan-by-project.json` replaces `scan.json`. It is a JSON object mapping project name to `ScanResult` (verbatim per-project scan output).
- `cross-project-plan.json` is new. It is a JSON object capturing the orchestrator's post-version-alignment `CrossProjectPlan` (deduplicated package list with per-occurrence projection: `projectName`, `currentVersion`, `targetVersion`, `location`, `sourceFile`, plus `proposedTarget` and the resolved conflict-policy outcome).
- The orchestrator writes both files; the workflow only requires them to exist if the workflow needs them for synthesis.

For backward compatibility, the workflow SHALL NOT require `scan-by-project.json` and `cross-project-plan.json` to be present in single-project mode (those runs continue to write only `scan.json`).

#### Scenario: Cross-project plan-dir carries the dossier and both scan artifacts

- **WHEN** the workflow completes phase 4 in cross-project mode
- **THEN** `<plan-dir>/dossier.md` SHALL exist at the plan-dir root
- **AND** `scan-by-project.json` and `cross-project-plan.json` SHALL exist while `scan.json` SHALL NOT

### Requirement: Phases 0, 1, 3, end-of-flow cleanup are mode-independent

The following workflow behaviors SHALL be identical across `single-project` and `cross-project` modes:

- Phase 0 stale-plan cleanup (basename regex, 10-day threshold, `delete-stale` / `keep-stale` / `cancel` prompt).
- Phase 1 batched dispatch (sequential batches of `maxConcurrent`, parallel within a batch).
- Phase 1 hard-wall fallback (`retry-current-batch` / `degrade-to-direct-synthesis` / `abort` prompt; degrade banner in `dossier.md`).
- Phase 3 mandatory integrity gate (disk-truth classification, `retry-failed` / `continue-without` / `abort` prompt).
- End-of-flow cleanup (`delete-plan` / `keep-plan` prompt).
- Per-group `_meta.json` schema (`groupId`, `packages`, `phase`, `status`, `startedAt`, `completedAt`, `errorPhase`, `errorReason`).
- Field naming conventions (`name`, `from`, `to`, `location`, `sourceFile`) for per-group meta.

The cross-project mode SHALL NOT introduce new phases or change phase transition order. The only mode-conditional differences are: subagent prompt template (this spec's earlier requirement), plan-dir layout (this spec's earlier requirement), `dossier.md` template (this spec's earlier requirement), and `_meta.json.mode` field (carried over from the modified global schema).

#### Scenario: Phase 1 hard-wall fallback works identically in cross-project mode

- **WHEN** a batch hard-walls in cross-project mode
- **THEN** the workflow raises the same `retry-current-batch` / `degrade-to-direct-synthesis` / `abort` prompt as single-project mode
- **AND** `degrade-to-direct-synthesis` results in the same banner prepended to `dossier.md` (with the cross-project H1)

### Requirement: Engine release-note sourcing for level `engines`

When the workflow's `level` input is `engines`, research SHALL target **engine release notes** rather than npm-registry package changelogs, in BOTH `single-project` and `cross-project` modes. For `level ∈ {patch, minor, major}` this requirement is inert (no change to those flows).

**Phase 1 — fetch.** For `level=engines`, the changelog-fetch phase SHALL retrieve release notes for each affected engine (Node, pnpm, npm, yarn, Deno, Bun) over the range `current → target`, via the `fetch-changelog` executable's engine release-note retrieval, **deduplicated once per engine/version** (not per project). The plan-dir slug and `_meta.json.level` SHALL record `engines`.

**Phase 2 — research.** Subagents SHALL assess the engine upgrade's impact on the codebase: required config/script/CI changes, removed runtime flags/APIs, package-manager lockfile-format or settings changes, and deprecations to act on — emitted under the `### Breaking changes & migration` heading (the same category major introduced), with the `_no findings_` sentinel when none. In `cross-project` mode findings SHALL be phrased universally (no specific project path).

**Phase 4 — synthesis.** `dossier.md` SHALL include the `## Breaking changes & migration` section (populated from engine release notes) and the `## Changelogs` section SHALL link engine release notes rather than package changelogs.

#### Scenario: Engines dossier carries breaking-change + changelog sections from engine notes

- **WHEN** `dossier.md` is synthesized for `level: "engines"`
- **THEN** it contains a `## Breaking changes & migration` section sourced from engine release notes and a `## Changelogs` section linking engine release notes

### Requirement: Breaking-change research category for level `major`

When the workflow's `level` input is `major`, the research contract and dossier synthesis SHALL surface breaking changes as a first-class category, in BOTH `single-project` and `cross-project` modes. For `level ∈ {patch, minor, engines}` this requirement is inert (no change to those flows).

**Phase 2 — research contract.** For `level=major`, each research subagent's `research.md` SHALL include, per package, a `### Breaking changes & migration` heading in addition to the existing `### Workarounds resolved` and `### Improvements applicable` headings. It SHALL capture: required code/config changes to keep the project building, removed/renamed/changed APIs, available codemods, and deprecations to act on. The `_no findings_` sentinel SHALL be written under the heading when the upgrade introduces none. In `cross-project` mode the findings SHALL be phrased universally (framework names, convention globs, idiomatic patterns) and SHALL NOT name any specific project path, identical to the constraints on the other cross-project finding categories.

**Phase 4 — synthesis.** For `level=major`, `dossier.md` SHALL include a `## Breaking changes & migration` H2 placed **before** `## Improvements`, aggregating the per-package breaking-change findings (single-project: concrete; cross-project: universal with per-bullet `affects projects:` tagging, consistent with the Improvements section). When no package reports a breaking change, the section SHALL render a single `_no breaking changes_` sentinel line rather than being omitted. The dossier section ordering for `level=major` is therefore: title → `## Breaking changes & migration` → `## Improvements` → `## Workarounds resolved` → `## Skipped or unavailable` → (mode-specific bump-set table: `## Major bump set` single-project or `## Cross-project bump set` cross-project) → `## Changelogs`.

The breaking-change items are reference + actionable material consumed by the deep-major commands' changeset gate round (presented as candidate edits, applied by the apply teammate only on user approval).

#### Scenario: Section placement and ordering

- **WHEN** `dossier.md` is synthesized for `level: "major"`
- **THEN** `## Breaking changes & migration` appears before `## Improvements`, the bump-set heading is `## Major bump set` (single-project) or `## Cross-project bump set` (cross-project), and `## Changelogs` is last

## REMOVED Requirements

### Requirement: Phase 4 — plan synthesis in plan mode

**Reason**: Replaced by "Phase 4 — dossier synthesis by teammate" (added below). The main agent no longer enters plan mode to synthesize, and no artifact named `plan.md` is produced.

### Requirement: Cross-project `plan.md` template

**Reason**: Replaced by "Cross-project `dossier.md` template" (added below) under the D1 artifact glossary.

### Requirement: Changelog chronology section in plan.md

**Reason**: Replaced by "Changelog chronology section in dossier.md" (added below); assembly moves from agent synthesis to the deterministic chronology script.

## ADDED Requirements

### Requirement: Phase 4 — dossier synthesis by teammate

When all groups are healthy or the user chose `continue-without`, a named synthesizer teammate SHALL produce `dossier.md` at the plan-dir root. The main conversation SHALL NOT read the groups' `research.md` files or changelog bodies to produce or review the dossier — it handles paths and digests only. The single documented exception is the synthesizer terminal-failure fallback below.

In `single-project` mode at `level ∈ {patch, minor}` the file SHALL begin with an `H1` titled `Deep-<level> dossier: <slug>` followed by exactly five `H2` sections in this fixed order: `Improvements (applicable to this codebase)`, `Workarounds resolved`, `Skipped or unavailable`, `<Level> bump set`, `Changelogs`. The bump-set heading SHALL be the title-cased level followed by ` bump set` — interpolated from the `level` input (it SHALL NOT be hardcoded to `Patch`). Two deltas modify this baseline: for `level ∈ {major, engines}` a sixth H2 — `## Breaking changes & migration` — is prepended before `Improvements` (see the level-specific requirements); in `cross-project` mode the H1, the `Improvements` heading variant, and the `Cross-project bump set` heading follow the "Cross-project `dossier.md` template" requirement.

The teammate populates the non-chronology sections by reading the healthy groups' `research.md` files plus the mode's scan artifacts — `scan.json` in `single-project` mode; `scan-by-project.json` and `cross-project-plan.json` in `cross-project` mode (which has no `scan.json`). The bump-set section SHALL list every update from those artifacts regardless of group health — in `single-project` mode as a markdown table with columns `package | current → target | location`; in `cross-project` mode per the "Cross-project `dossier.md` template" requirement. The `Changelogs` section SHALL be the output of the deterministic chronology script (see "Changelog chronology section in dossier.md"); the teammate links or embeds that output and SHALL NOT re-type changelog bodies.

Before the dossier is surfaced to the user, the two-layer compliance check defined by the experiments-plugin "Dossier synthesis by teammate with two-layer compliance check" requirement SHALL run (repair loop capped at 3 rounds, residual violations escalated into the user gate).

**Synthesizer terminal-failure fallback.** If the synthesizer teammate terminates abnormally (e.g., an API failure) before completing `dossier.md`, the skill SHALL tear it down and re-dispatch a fresh synthesizer exactly once. On a second consecutive terminal failure the skill SHALL degrade to **direct synthesis**: the main agent authors the dossier from the healthy groups' `research.md` files and the script-assembled chronology (appended verbatim, never re-typed). Both compliance layers remain mandatory on the degraded path — the layer-2 fresh-eyes subagent is the independence backstop once author independence is lost — and the degraded dossier SHALL carry a one-line banner noting the fallback. Every input needed for recovery already lives on disk (per-group `research.md`, `chronology.md`, scan artifacts); no phase SHALL be re-run. This is the bounded, documented exception to the main-context diet rule: on this path the main agent MAY read only the healthy groups' `research.md` files, SHALL append `chronology.md` via a mechanical file-level append (never loading changelog bodies into context), and SHALL NOT read `changelogs/` or the `~/.claude/changelogs/` cache; the digest surfaced to the user keeps its bounded size.

The skill SHALL update the global `_meta.json.phase` to `"synthesis"` before dispatching the synthesizer teammate. The skill SHALL NOT set `_meta.json.phase` to `"executing"` or `"done"`; advancing past `"synthesis"` is consumer-owned (the calling command sets these phases when applying begins or completes).

#### Scenario: Dossier authored by the teammate, not the main

- **WHEN** phase 3 completes successfully or the user chose `continue-without`
- **THEN** `dossier.md` is authored by the named synthesizer teammate
- **AND** the main conversation does not read `research.md` files or changelog bodies

#### Scenario: Synthesizer dies twice → direct synthesis with both layers

- **WHEN** the synthesizer teammate terminates abnormally before writing `dossier.md` and its one re-dispatch also terminates abnormally
- **THEN** the main agent authors the dossier directly from the on-disk `research.md` files + script-assembled chronology, with a one-line fallback banner
- **AND** both compliance layers still run before the dossier is surfaced

#### Scenario: Dossier structure is fixed

- **WHEN** `dossier.md` is written for a `patch` run
- **THEN** it contains exactly the five H2 section headings `Improvements (applicable to this codebase)`, `Workarounds resolved`, `Skipped or unavailable`, `Patch bump set`, `Changelogs` in that order

#### Scenario: Bump-set heading is level-derived

- **WHEN** `dossier.md` is written for a `minor` run
- **THEN** the bump-set heading reads `## Minor bump set` (not `## Patch bump set`)

#### Scenario: Bump set always present

- **WHEN** the scan returned 12 updates and 2 groups were skipped via `continue-without`
- **THEN** the `<Level> bump set` table contains all 12 updates regardless of which groups were skipped

#### Scenario: Phase set to synthesis before dispatch

- **WHEN** the workflow advances past the integrity gate
- **THEN** the global `_meta.json.phase` is set to `"synthesis"` before the synthesizer teammate is dispatched

### Requirement: Cross-project `dossier.md` template

When `mode === "cross-project"`, phase 4 synthesis SHALL write `dossier.md` with the following exact structure (top-to-bottom):

- An H1 title formatted as `Deep-<level> dossier (cross-project): <slug>` (e.g. `# Deep-patch dossier (cross-project): commander-deep-patch`).
- A single descriptive line `Projects covered: <comma-separated project names from scan-by-project.json keys, alphabetical>`.
- Five H2 sections, in this order: `Improvements (universal — applicability checked per project at apply time)`, `Workarounds resolved`, `Skipped or unavailable`, `Cross-project bump set`, `Changelogs`.
- The `Improvements` section contains `-` bullets, each with the form `[<priority>] <package> — <opportunity>. Hint: <abstract hint or "none">. (group: <groupId>; affects projects: <comma-separated project names>)`.
- The `Workarounds resolved` section contains `-` bullets, each with the form `<package> — <bug fixed in this version>. Hint: <abstract hint or "none">. (group: <groupId>; affects projects: <comma-separated project names>)`.
- The `Skipped or unavailable` section contains `-` bullets, each with the form `<groupId> — <reason>.`.
- The `Cross-project bump set` section contains a markdown table whose columns are exactly `package`, `proposed target`, `projects (locations)`.
- The `Changelogs` section is the final section and SHALL follow the "Changelog chronology section in dossier.md" requirement (cross-project variant: representative `from → to`, dedup by package).

Rules:

- Sections with zero items still render with a single sentinel line: `_no improvements identified_`, `_no workarounds resolved_`, `_no skipped groups_`. The `Changelogs` section uses the per-package `_no changelog available_` sentinel defined in its own requirement.
- The `affects projects:` list per improvement / workaround bullet is derived from `scan-by-project.json` and `cross-project-plan.json`: for the bullet's package, list every project name whose `ScanResult.updates[]` includes the package.
- The `Cross-project bump set` table cell format: `<projectName> (<location>)`, with `;` separating projects and `,` separating multiple locations within the same project.
- Table rows sorted by `package` name (alphabetical, stable).
- The `<reason>` cell in `Skipped or unavailable` follows the same rule as single-project: for `failed`/`missing` groups, copy `groups/<id>/_meta.json.errorReason` verbatim; for `expected-missing` groups (degraded path), use the constant string `research consolidated from cache (subagent dispatch limited)`.

#### Scenario: Cross-project dossier uses cross-project H1 and project-tagged bullets

- **WHEN** phase 4 completes in cross-project mode with `slug: "commander-deep-patch"`, `level: "patch"`, and three improvement bullets affecting different project subsets
- **THEN** `dossier.md` H1 reads `# Deep-patch dossier (cross-project): commander-deep-patch`
- **AND** the second line reads `Projects covered: <alphabetical comma-separated names>`
- **AND** each improvement bullet ends with `(group: <id>; affects projects: <names>)`

#### Scenario: Changelogs is the final cross-project section

- **WHEN** phase 4 completes in cross-project mode
- **THEN** `dossier.md` ends with the `## Changelogs` section, after `## Cross-project bump set`

#### Scenario: Single-project dossier template unchanged in shape

- **WHEN** phase 4 completes in single-project mode
- **THEN** `dossier.md` follows the single-project template (H1 `Deep-<level> dossier: <slug>`, sections `Improvements (applicable to this codebase)`, `Workarounds resolved`, `Skipped or unavailable`, `<Level> bump set`, `Changelogs`)
- **AND** improvement bullets carry `(group: <groupId>)` without the `affects projects:` tag

### Requirement: Changelog chronology section in dossier.md

The `## Changelogs` section of `dossier.md` SHALL be assembled by the deterministic chronology plugin executable reading changelog data already on disk — the per-group `changelogs/<package-basename>/` outputs written in phase 1 and the cache under `~/.claude/changelogs/<normalized-name>/`. No agent SHALL re-type or re-author changelog bodies into the section, and assembly SHALL NOT perform any network fetch.

The section SHALL contain one block per package in the bump set, ordered **alphabetically** by package name. Each block:

1. Header `### <package> (<from> → <to>)`. In single-project mode `<from>`/`<to>` are the package's `currentVersion`/`targetVersion` from `scan.json`. In cross-project mode they are the representative `currentVersion` (the most-common current version across occurrences) and the `effectiveTarget` from `cross-project-plan.json`; the block SHALL NOT enumerate per-project version variations (the `Cross-project bump set` table is the source for those).
2. A **links line first**, reused from the changelog cache: the repository URL (`~/.claude/changelogs/<normalized-name>/_meta.json.repository`) plus the per-version source/release URLs (`<ver>.meta.json.sourceUrl`) for the covered versions. This line is produced from cached metadata only — no network call.
3. Then the full verbatim changelog body for each **stable version in `(from, to]`** — every version newer than the installed `from`, up to and including `to`; the installed `from` is excluded — in **ascending** order (oldest→newest). Each version's body SHALL be the cached `<ver>.md` content verbatim, wrapped in a collapsible `<details><summary>{ver}</summary> … </details>` block.

If no changelog body is available for a package (every covered version failed, `no_changelog_source`, or `from == to` so the half-open span is empty), the block SHALL render the links line (when a repository is known) followed by the sentinel `_no changelog available_`. In the degraded path (`degrade-to-direct-synthesis`), the cached `<ver>.md` files still exist under `~/.claude/changelogs/`; the script SHALL build the section from that cache even when per-group `research.md` is absent.

The `## Changelogs` section SHALL render whenever the bump set has at least one package, independent of whether any improvements or workarounds were found. Because `dossier.md` is a file the user opens deliberately (not chat output), embedding verbatim changelog bodies does not violate the `experiments:npm-changelog` "never paste into chat" rule — and per the main-window context diet, the section SHALL NOT be surfaced verbatim into the main conversation.

#### Scenario: Assembled by script, not by an agent

- **WHEN** the `## Changelogs` section of `dossier.md` is produced
- **THEN** its content originates from the chronology script's cache read
- **AND** no agent re-types changelog bodies into it

#### Scenario: Packages alphabetical, versions ascending

- **WHEN** the bump set contains `zod (3.23.0 → 3.24.1)` and `axios (1.7.0 → 1.7.9)`, each with multiple intermediate versions
- **THEN** the `## Changelogs` section lists `axios` before `zod`
- **AND** within each package the `<details>` blocks run oldest version first to newest version last

#### Scenario: Version span excludes the installed version

- **WHEN** a package is bumped `1.7.0 → 1.7.9` with stable intermediates `1.7.1 … 1.7.9`
- **THEN** the block embeds bodies for `1.7.1` through `1.7.9` and SHALL NOT embed a body for `1.7.0`

#### Scenario: Missing changelog renders sentinel

- **WHEN** a bumped package has no available changelog body for any covered version
- **THEN** its block renders the links line (if a repository is known) followed by `_no changelog available_`

#### Scenario: Cross-project block uses representative versions

- **WHEN** in cross-project mode a package is at different current versions across projects
- **THEN** the block header shows the representative `currentVersion` → `effectiveTarget` and points to the `Cross-project bump set` table for per-project detail, rather than enumerating each project's span
