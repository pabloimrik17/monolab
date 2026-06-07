# parallel-research-workflow Specification

## Purpose
TBD - created by archiving change add-npm-update-deep-patch. Update Purpose after archive.
## Requirements
### Requirement: Plan-directory creation

The skill SHALL create a plan directory at `~/.claude/experiments/plans/<slug>-<level>-<unix-ts>/` after the stale-plan cleanup prompt resolves, and only when the invocation has not been cancelled (i.e., the user did not select `cancel` in stale-cleanup), where:

- `<slug>` is derived from the root `package.json#name` if present, else `basename(CWD)`. Sanitization: lowercase, replace any run of `[^a-z0-9]+` with `-`, trim leading and trailing `-`, truncate to 40 characters.
- `<level>` is the level passed by the caller (one of `patch`, `minor`, `major`, `engines`).
- `<unix-ts>` is the unix timestamp in seconds at invocation start. To guarantee uniqueness for same-second collisions, if the candidate directory already exists the skill SHALL deterministically append `-2`, `-3`, … (incrementing until a free name is found) so the final path becomes `<slug>-<level>-<unix-ts>[-N]`. The chosen final directory name SHALL be recorded in `_meta.json` under the `planDirName` field (basename only, including any collision suffix).

The plan directory SHALL be created with these subpaths populated: `_meta.json` (global metadata), `scan.json` (verbatim copy of the `ScanResult` consumed by the workflow), and an empty `groups/` directory. `plan.md` is written later by the main agent.

#### Scenario: Slug from package.json

- **WHEN** the workspace root contains `package.json` with `"name": "@monolab/source"` and the level is `patch`
- **THEN** the plan directory is `~/.claude/experiments/plans/monolab-source-patch-<ts>/`

#### Scenario: Slug fallback to CWD basename

- **WHEN** no `package.json` exists at the workspace root and `basename(CWD)` is `My.Demo App`
- **THEN** the plan directory is `~/.claude/experiments/plans/my-demo-app-patch-<ts>/`

#### Scenario: Slug truncation

- **WHEN** the resolved name produces a sanitized slug longer than 40 characters
- **THEN** the slug used in the path is the first 40 characters of the sanitized form, with no trailing `-`

#### Scenario: Initial layout written

- **WHEN** the plan directory is created
- **THEN** `_meta.json` exists with `phase: "scanning"`, `scan.json` exists with the verbatim ScanResult, and `groups/` exists and is empty

### Requirement: Stale-plan cleanup prompt

Before creating a new plan directory, the skill SHALL enumerate existing entries under `~/.claude/experiments/plans/` and classify each as stale when its `_meta.json.createdAt` is more than 10 days old, or its `_meta.json` is missing or unreadable.

If at least one stale entry is found, the skill SHALL prompt the user once via `AskUserQuestion` with options `delete-stale` (recursively remove every stale entry), `keep-stale` (leave them), and `cancel` (abort the current invocation without creating a new plan dir). The skill SHALL NOT delete any directory without explicit `delete-stale` selection.

#### Scenario: No stale dirs

- **WHEN** every entry under `~/.claude/experiments/plans/` has `_meta.json.createdAt` within the last 10 days
- **THEN** no prompt is shown and the workflow proceeds to create the new plan directory

#### Scenario: Stale dirs deleted on confirmation

- **WHEN** three entries are stale and the user selects `delete-stale`
- **THEN** the three directories are recursively removed before the new plan directory is created

#### Scenario: Cancel aborts cleanly

- **WHEN** any stale dirs exist and the user selects `cancel`
- **THEN** the workflow exits without creating a new plan dir, without deleting anything, and prints `Cancelled. No files modified.`

#### Scenario: Unreadable meta treated as stale

- **WHEN** an entry's `_meta.json` is missing or fails to parse
- **THEN** the entry is classified as stale and offered for deletion under `delete-stale`

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

### Requirement: Global plan metadata

The skill SHALL maintain a `_meta.json` file at the plan-directory root with the following shape, updated atomically at every phase transition:

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

`planDirName` is the basename of the chosen plan directory (e.g. `monolab-source-patch-1745347200` or `monolab-source-patch-1745347200-2` when a collision suffix was appended). It is recorded so consumers can reconstruct the absolute path as `~/.claude/experiments/plans/<planDirName>/` even when the suffix is non-empty.

Backward compatibility: when the stale-cleanup pass (phase 0) reads an existing `_meta.json` lacking the `mode` field, it SHALL treat it as `mode: "single-project"`. The 10-day stale threshold is mode-independent.

The `phase` field SHALL advance monotonically through the listed values; the skill SHALL NOT skip phases or move backwards.

#### Scenario: Phase advances on transition

- **WHEN** the workflow finishes the changelogs phase and is about to dispatch research subagents
- **THEN** `_meta.json.phase` is updated to `"research"` before any research subagent is dispatched

#### Scenario: Group ids written after grouping

- **WHEN** the grouping phase produces three groups `tanstack-1`, `vitest-1`, `solo-react-router-1`
- **THEN** `_meta.json.groupIds` contains exactly those three ids, in deterministic order matching the grouping skill's output

#### Scenario: New _meta.json writes carry the mode field

- **WHEN** the workflow initializes a fresh plan-dir
- **THEN** `_meta.json` SHALL include the `mode` field with the value from the workflow input

#### Scenario: Legacy _meta.json without mode reads as single-project

- **WHEN** phase 0 stale-cleanup encounters an existing plan-dir whose `_meta.json` lacks the `mode` field
- **THEN** the workflow classifies it as if `mode: "single-project"` was set
- **AND** the 10-day stale threshold applies

### Requirement: Per-group metadata

For each group dispatched, the skill SHALL create `groups/<groupId>/_meta.json` with this shape:

```json
{
  "groupId": "<string>",
  "packages": [
    { "name": "<string>", "from": "<semver>", "to": "<semver>", "location": "<string>", "sourceFile": "<string>" }
  ],
  "phase": "pending" | "changelogs" | "research" | "done",
  "status": "pending" | "ok" | "error",
  "startedAt": "<ISO 8601>",
  "completedAt": "<ISO 8601 | null>",
  "errorPhase": "changelogs" | "research" | null,
  "errorReason": "<string | null>"
}
```

The skill SHALL initialize this file with `phase: "pending"`, `status: "pending"`, `completedAt: null`, `errorPhase: null`, `errorReason: null` before the group's first subagent is dispatched.

#### Scenario: Initial state on dispatch

- **WHEN** a group is created with two packages and the changelog phase is about to start
- **THEN** the group's `_meta.json` exists with `phase: "pending"`, `status: "pending"`, `packages` populated from the scan output, and `startedAt` set to the dispatch timestamp

#### Scenario: Final state on success

- **WHEN** the group's research subagent finishes without errors
- **THEN** `_meta.json` has `phase: "done"`, `status: "ok"`, `completedAt` set to an ISO 8601 timestamp, `errorPhase: null`, `errorReason: null`

#### Scenario: Final state on failure

- **WHEN** the changelogs phase fails for the group with reason `rate limited by GitHub`
- **THEN** `_meta.json` has `phase: "changelogs"`, `status: "error"`, `errorPhase: "changelogs"`, `errorReason: "rate limited by GitHub"`, `completedAt` set

### Requirement: Field naming conventions

The skill SHALL use a fixed vocabulary for persistent JSON fields. Implementations SHALL NOT silently accept synonyms or aliases; encountering a non-canonical field name (e.g. `manifest` in place of `sourceFile`) SHALL cause the record to be treated as malformed.

The canonical fields for per-group `_meta.json.packages[]` items are: `name`, `from`, `to`, `location`, `sourceFile`. The global `scan.json` retains the upstream `experiments:scan-npm-updates` vocabulary (`currentVersion`, `targetVersion`); the two artifacts SHALL NOT be unified.

#### Scenario: Canonical fields written

- **WHEN** the skill initializes a group's `_meta.json`
- **THEN** every package record contains exactly the keys `name`, `from`, `to`, `location`, `sourceFile` and SHALL NOT contain `manifest`, `path`, `file`, `currentVersion`, or `targetVersion`

#### Scenario: Aliased field rejected on read

- **WHEN** a downstream consumer reads a `_meta.json` whose package record contains `manifest` instead of `sourceFile`
- **THEN** the consumer SHALL classify the record as malformed and SHALL NOT silently treat `manifest` as `sourceFile`

### Requirement: Phase 1 — batched parallel changelog fetch

When the workflow's phase transitions to `changelogs`, the skill SHALL dispatch subagents in **sequential batches** of size `maxConcurrent` (default `5`, range `[1, 10]`). Within a batch, all subagents SHALL be dispatched in a single dispatch step (parallel). Batches themselves SHALL be sequential — batch N+1 SHALL NOT start before every subagent in batch N has returned.

A single batch is allowed only when `groups.length <= maxConcurrent`; otherwise the skill SHALL split groups into sequential batches of at most `maxConcurrent`. The skill SHALL NOT exceed `maxConcurrent` in any batch — the cap is a hard limit, not a hint, and SHALL NOT be inflated to fit a larger group count into one dispatch. The skill SHALL surface a one-line progress message after each batch completes.

Each subagent SHALL:

1. Read its group's `_meta.json` to determine the package set.
2. For each package, invoke the `experiments:npm-changelog` skill once with the package name and version range `<from>..<to>`.
3. Write the raw output of `npm-changelog` to `groups/<groupId>/changelogs/<package-basename>/` (preserving the cache structure produced by `npm-changelog`).
4. On per-package failure, record the error inline within `changelogs/<package-basename>/error.txt` and continue to the next package.
5. After all packages have been attempted, update its group's `_meta.json` to `phase: "research"` and proceed to phase 2 if at least one package succeeded; otherwise set `status: "error"`, `errorPhase: "changelogs"`, `errorReason: "<aggregated reasons>"`, `completedAt: <now>`, and exit.

Within a batch, the skill SHALL NOT block phase 2 of group A on phase 1 of group B; each group's two phases run sequentially within the group, but groups within the same batch run in parallel.

#### Scenario: Groups split into batches

- **WHEN** grouping yields 13 groups and `maxConcurrent` is `5`
- **THEN** the skill dispatches three batches of size 5, 5, 3 sequentially; batch 2 starts only after every subagent in batch 1 has returned

#### Scenario: Single batch when count fits

- **WHEN** grouping yields 4 groups and `maxConcurrent` is `5`
- **THEN** the skill dispatches all 4 groups in a single batch

#### Scenario: Per-package failure does not abort the group

- **WHEN** a group has packages `[A, B, C]` and `npm-changelog` for `B` fails with HTTP 429
- **THEN** the subagent records the error for `B` in its changelogs subdir, fetches `A` and `C` successfully, and proceeds to phase 2 for `[A, C]`

#### Scenario: Total changelog failure marks group as error

- **WHEN** every package in a group fails the changelog phase
- **THEN** the group's `_meta.json` is set to `phase: "changelogs"`, `status: "error"`, `errorPhase: "changelogs"`, `errorReason` summarizing the per-package reasons, and the subagent does not run phase 2

### Requirement: Subagent dispatch prompt template

Each subagent dispatched in phase 1+2 SHALL receive a prompt that explicitly enforces non-termination across two failure modes observed in dry-runs: (a) returning the `experiments:npm-changelog` skill's structured summary as the agent's final answer, and (b) returning the first per-package failure (notably `no_changelog_source` for `@types/*`) as the agent's final answer.

The dispatch prompt SHALL include, at minimum: numbered execution steps; an explicit rule that the `npm-changelog` skill output is INTERMEDIATE data and the subagent MUST NOT terminate after invoking it; explicit handling for `no_changelog_source` (write `error.txt`, continue); a required final-response format `<groupId>: ok — <fetched>/<total> changelogs; <researched> researched.`; and a closing reminder that the task is incomplete if `research.md` is missing in the success path or `_meta.json` is not updated.

The skill SHALL NOT dispatch a subagent with a looser prompt; substitution is a spec violation.

#### Scenario: Skill output is intermediate

- **WHEN** a subagent invokes `experiments:npm-changelog` and receives a "All N versions cached and verified..." summary
- **THEN** the dispatch prompt mandates the subagent treat that summary as intermediate and continue to the next package, ultimately writing `research.md` and updating `_meta.json` before returning

#### Scenario: no_changelog_source does not abort the subagent

- **WHEN** the first package processed by a subagent returns `no_changelog_source`
- **THEN** the subagent writes `error.txt` for that package and continues with the remaining packages in the group; it SHALL NOT terminate after the first failure

#### Scenario: Final-response format is enforced

- **WHEN** the subagent completes phase 2 successfully
- **THEN** its final response is a single line in the form `<groupId>: ok — <fetched>/<total> changelogs; <researched> researched.` with no surrounding prose or markdown

### Requirement: Subagent dispatch hard-wall fallback

If every subagent in a single batch returns with `phase: "pending"` and `status: "pending"` (i.e. none even started — the dispatch itself was denied or rate-limited rather than the work failing), the skill SHALL classify the batch as **hard-walled** and prompt the user once via `AskUserQuestion` before starting the next batch.

The prompt SHALL offer exactly three options: `retry-current-batch` (re-dispatch this batch only), `degrade-to-main-agent` (abandon subagent dispatch for the remaining un-dispatched batches and synthesize `plan.md` directly in the main agent using already-cached changelogs under `~/.claude/changelogs/`), and `abort` (exit cleanly, plan dir preserved). The skill SHALL NOT auto-retry a hard-walled batch.

When `degrade-to-main-agent` is selected, the resulting `plan.md` SHALL include a one-line banner identifying which `groupIds` were not dispatched and noting that research was consolidated in the main agent. Per-package failures inside groups that DID start are NOT a hard wall and SHALL NOT trigger this prompt.

#### Scenario: Hard wall fires prompt

- **WHEN** every subagent in batch 1 of 3 returns with `phase: "pending"`, `status: "pending"`
- **THEN** the workflow fires the hard-wall prompt before starting batch 2

#### Scenario: Per-package failure does not fire prompt

- **WHEN** all subagents in a batch start and run, but each ends with `status: "error"` due to per-package fetch failures
- **THEN** the workflow does NOT fire the hard-wall prompt; the failures are surfaced via the phase 3 integrity prompt instead

#### Scenario: Degrade-to-main-agent banner

- **WHEN** the user selects `degrade-to-main-agent` after batch 2 of 4 hard-walls
- **THEN** the resulting `plan.md` contains a banner naming the un-dispatched batch-3 and batch-4 group ids and stating research was consolidated in the main agent

### Requirement: Phase 2 — parallel codebase research

For each group whose phase advanced to `research`, the subagent SHALL:

1. Read every changelog written in phase 1 plus the codebase context available to it (file enumeration, recent edits, framework patterns).
2. Produce `groups/<groupId>/research.md` containing two sections per package that fetched successfully:
   - **Workarounds resolved** — bullet list of bug fixes mentioned in the changelog cross-referenced against likely codebase areas. Each bullet SHALL include a brief justification and one or more file globs or directory hints. Effort target: ~20% of the subagent's allocated work.
   - **Improvements applicable** — bullet list of new APIs, behaviors, or features in the changelog cross-referenced against codebase patterns that could adopt them. Each bullet SHALL include a brief justification and one or more file globs or directory hints. Effort target: ~80% of the subagent's allocated work.
3. The subagent SHALL NOT propose code changes, line numbers, or diff sketches. Output is opportunity-level only.
4. If a package has no findings in either section, the subagent SHALL still write a sentinel line `_no findings_` under the relevant heading rather than omitting the heading.
5. After writing `research.md`, update the group's `_meta.json` to `phase: "done"`, `status: "ok"`, `completedAt: <now>`.

If the subagent encounters an unrecoverable error during phase 2, it SHALL update `_meta.json` to `phase: "research"`, `status: "error"`, `errorPhase: "research"`, `errorReason: "<message>"`, `completedAt: <now>`, and exit without writing `research.md`.

#### Scenario: Research output structure

- **WHEN** a group with packages `[react, react-dom]` finishes phase 2 successfully
- **THEN** `groups/<id>/research.md` exists and contains, for each of `react` and `react-dom`, a `## Workarounds resolved` heading and a `## Improvements applicable` heading

#### Scenario: No findings sentinel

- **WHEN** the subagent finds no applicable improvements for a package
- **THEN** the package's `## Improvements applicable` section in `research.md` contains the literal line `_no findings_`

#### Scenario: No code suggestions

- **WHEN** the subagent identifies an opportunity to adopt a new API
- **THEN** the corresponding bullet in `research.md` describes the area (file globs or directory hints) and the justification, and SHALL NOT contain code blocks, line numbers, or diff sketches

#### Scenario: Research-phase error preserves changelog work

- **WHEN** phase 2 errors out for a group whose phase 1 succeeded
- **THEN** `groups/<id>/changelogs/` is preserved on disk, `_meta.json` is set to `phase: "research"`, `status: "error"`, `errorPhase: "research"`, and `research.md` is not written

### Requirement: Phase 3 — integrity verification (mandatory gate)

Phase 3 is a **mandatory gate**: the global `_meta.json.phase` SHALL NOT advance to `"planning"` without phase 3 completing first. Skipping phase 3 — even when the workflow believes all groups succeeded — is a spec violation.

After every batch of phase 1+2 has returned (or after `degrade-to-main-agent` was selected from the hard-wall prompt), the skill SHALL:

1. Set the global `_meta.json.phase` to `"integrity"`.
2. Enumerate every `groupId` listed in the global `_meta.json.groupIds`.
3. For each `groupId`, read `groups/<groupId>/_meta.json` from disk and classify:
   - **healthy** if the file exists AND `phase: "done"` AND `status: "ok"`.
   - **failed** if the file exists AND (`status: "error"` OR `phase !== "done"`).
   - **missing** if the file does not exist on disk.
4. Classification SHALL be done by reading from disk, not from in-memory state — disk is the source of truth.

If every group is `healthy`, the skill SHALL set the global `_meta.json.phase` to `"planning"` and advance to phase 4 silently.

If at least one group is `failed` or `missing`, the main agent SHALL prompt via `AskUserQuestion` (the prompt is mandatory — the skill SHALL NOT silently continue) with these options:

- `retry-failed` — re-dispatch only the non-healthy groups (phase 1 + phase 2 from scratch for each), respecting `maxConcurrent` batching.
- `continue-without` — proceed to phase 4 using only the healthy groups; non-healthy groups SHALL be documented in the resulting `plan.md`.
- `abort` — exit cleanly. The plan dir is preserved.

The skill SHALL NOT auto-retry non-healthy groups.

In the degraded path (after `degrade-to-main-agent`), groups in batches that were never dispatched SHALL be classified `expected-missing` (a path-only fourth class) and SHALL be documented in `plan.md`'s `## Skipped or unavailable` section without firing the integrity prompt for them; legitimately failed or missing groups still trigger the prompt as usual.

#### Scenario: Phase advances to integrity before planning

- **WHEN** every batch of phase 1+2 has returned and all groups are healthy
- **THEN** the global `_meta.json.phase` is set to `"integrity"` first, then to `"planning"`, never directly from `"changelogs"` to `"planning"`

#### Scenario: Disk truth over in-memory state

- **WHEN** the workflow's in-memory tracking believes a group succeeded but `groups/<id>/_meta.json` on disk shows `status: "pending"`
- **THEN** the integrity walk classifies the group as `failed` and the prompt fires

#### Scenario: All groups healthy proceeds to plan

- **WHEN** every group has `phase: "done"` and `status: "ok"`
- **THEN** no integrity prompt is shown and the workflow advances to phase 4 after setting phase to `"integrity"` then `"planning"`

#### Scenario: Mixed health prompts user

- **WHEN** two groups are healthy and one has `status: "error"`
- **THEN** the integrity prompt is shown with options `retry-failed`, `continue-without`, `abort`

#### Scenario: Retry re-dispatches only failed groups

- **WHEN** the user selects `retry-failed` and one group out of three is failed
- **THEN** only that one group is re-dispatched; the two healthy groups are not touched and their `research.md` is preserved

#### Scenario: Continue-without documents skipped groups

- **WHEN** the user selects `continue-without` with one failed group `vitest-1`
- **THEN** the eventual `plan.md` contains a `## Skipped or unavailable` section listing `vitest-1` and its `errorReason`

#### Scenario: Expected-missing groups in degraded path

- **WHEN** the user selected `degrade-to-main-agent` and 8 of 20 groups were never dispatched
- **THEN** the integrity walk classifies those 8 as `expected-missing`, does NOT fire the prompt for them, and the resulting `plan.md` lists them under `## Skipped or unavailable`

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

### Requirement: Cleanup is opt-in at flow end

At the end of the workflow (after a successful execution step, after `cancel`, or after `abort`), the skill SHALL prompt via `AskUserQuestion` with options `delete-plan` (recursive removal of the plan directory) and `keep-plan` (leave it for inspection). The skill SHALL NOT delete the plan directory without explicit `delete-plan` selection.

#### Scenario: Delete on confirmation

- **WHEN** the user selects `delete-plan` at flow end
- **THEN** the plan directory and all of its contents are recursively removed

#### Scenario: Keep on choice

- **WHEN** the user selects `keep-plan`
- **THEN** the plan directory remains on disk and will only be removed by a future stale-cleanup prompt

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

