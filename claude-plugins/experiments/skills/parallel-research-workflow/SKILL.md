---
name: parallel-research-workflow
description: Use when a command needs to dispatch a two-phase parallel-subagent research workflow (changelog fetch → codebase research → integrity check → plan-mode synthesis) over a pre-grouped package set — for example `/experiments:npm-update-deep-patch` (and future deep-* siblings) after invoking `group-packages-for-research`. Inputs `{ groups, level, scanResult }`; produces `<plan-dir>/plan.md` plus per-group `_meta.json`, `changelogs/`, and `research.md`. Never edits workspace files; bump/apply are the caller's responsibility.
---

# parallel-research-workflow

Generic two-phase parallel-subagent research workflow. Given a pre-grouped set of package updates (the output of `group-packages-for-research`), dispatch one subagent per group to (1) fetch every changelog with `experiments:npm-changelog` and (2) cross-reference the changelogs against this codebase. Then verify integrity, prompt the main agent into plan mode, and emit a single integrated `plan.md`.

This skill is reusable by every `/experiments:npm-update-deep-*` command (and, eventually, `commander:update-deep-*`). It is the orchestration layer; consumers wire scan → grouping → this skill → user-driven execution.

The skill writes only under `~/.claude/experiments/plans/<slug>-<level>-<unix-ts>[-N]/` (where `[-N]` is the optional collision suffix described in "Slug derivation"; omitted on the common no-collision path). It does NOT modify any workspace file. Bumping manifests / running installs / applying improvements are the caller's responsibility (see `/experiments:npm-update-deep-patch`).

## Inputs

- **`groups`** (required): array of group records as emitted by `group-packages-for-research` — `[{ groupId, bucketKey, packages: [...] }]`.
- **`level`** (required): one of `patch` | `minor` | `major` | `engines`. Embedded into the plan-dir slug and into `_meta.json.level`. Determines the title of `plan.md` (e.g. `Deep-patch plan: <slug>` for single-project, `Deep-patch plan (cross-project): <slug>` for cross-project).
- **`scanResult`** (required): the verbatim `ScanResult` JSON for single-project callers, or a synthesized `ScanResult`-shaped value (from the cross-project orchestrator) for cross-project callers. Persisted as `scan.json` in single-project mode; cross-project mode persists per-project scans in `scan-by-project.json` and the aggregated plan in `cross-project-plan.json` (both written by the orchestrator, NOT by this workflow — see "Cross-project plan-dir layout" below).
- **`mode`** (optional): one of `single-project` | `cross-project`. Default `single-project`. Selects the cross-project research contract when `cross-project`: universal-only findings, no codebase cross-reference, cross-project plan-mode synthesis template. Single-project mode (default) is byte-equivalent to today — no behavior changes for `/experiments:npm-update-deep-patch`.
- **`slugOverride`** (optional in single-project mode, REQUIRED in cross-project mode): string used as the plan-dir basename slug instead of the CWD/`package.json#name`-derived slug. Sanitized identically to derived slugs (lowercase, replace `[^a-z0-9]+` with `-`, trim leading/trailing `-`, truncate to 40 chars). In cross-project mode the caller MUST supply this; in single-project mode it MAY be supplied to bypass CWD/`package.json` derivation.
- **`maxConcurrent`** (optional, integer, default `5`): per-batch concurrency cap for phase-1+2 subagent dispatch. Inclusive valid range `[1, 10]`. A value outside this range aborts with `Error: maxConcurrent must be between 1 and 10, got <value>.` See "Phase 1" for batching semantics.

The skill SHALL NOT mutate any input.

### Input validation

Reject before any side effect (no plan-dir, no scan, no research):

- Unknown `mode`: abort with `Error: invalid mode "<value>". Expected single-project|cross-project.`
- `mode: "cross-project"` and an absent or empty `slugOverride`: abort with `Error: slugOverride is required when mode is cross-project.`
- `maxConcurrent` outside `[1, 10]`: abort with `Error: maxConcurrent must be between 1 and 10, got <value>.`

### Mode-conditional behavior

The workflow ships two research contracts selected by the `mode` input. Phases 0, 1 (batching + hard-wall fallback), 3 (integrity gate + retry-failed), end-of-flow cleanup, per-group `_meta.json` schema, and field naming conventions are identical across both modes. Mode affects exactly five surfaces: the slug source (`slugOverride` required in cross-project, optional in single-project), the on-disk plan-dir scan artifact (`scan.json` vs `scan-by-project.json` + `cross-project-plan.json`), the global `_meta.json.mode` field, the subagent prompt template (phase 1+2 wording), and the phase 4 `plan.md` template (H1, Improvements heading, per-bullet `affects projects:` tag, and bump-set table shape).

| Concern                                           | `mode: "single-project"` (default)                                                                                                            | `mode: "cross-project"`                                                                                                                                                                                                                  |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Slug source                                       | `slugOverride` if set, else `package.json#name` if non-empty, else `basename(CWD)`. Sanitized.                                                | `slugOverride` (REQUIRED). Sanitized identically.                                                                                                                                                                                        |
| Plan-dir scan artifact                            | `scan.json` (written by this workflow at phase init).                                                                                         | `scan-by-project.json` + `cross-project-plan.json` (written by the orchestrator caller; this workflow does NOT create them).                                                                                                             |
| `_meta.json.mode` field                           | `"single-project"`                                                                                                                            | `"cross-project"`                                                                                                                                                                                                                        |
| Subagent prompt (phase 1+2)                       | Includes `Codebase root: <CWD>`. Phase 2 cross-references the codebase. Headings: `### Workarounds resolved` / `### Improvements applicable`. | OMITS `Codebase root:`. Phase 2 produces universal findings only — subagent SHALL NOT use `Read`/`Glob`/`Grep` on any project source file. Headings: `### Workarounds resolved (universal)` / `### Improvements applicable (universal)`. |
| Effort allocation                                 | ~80% on improvements, ~20% on workarounds.                                                                                                    | Identical: ~80% on improvements, ~20% on workarounds.                                                                                                                                                                                    |
| Hint allowed in `research.md`                     | File globs, directory hints, component names, brief justification sentences (codebase-grounded).                                              | File globs by CONVENTION (no specific project paths), framework names, idiomatic patterns. SHALL NOT name specific project paths.                                                                                                        |
| `_no findings_` sentinel                          | Same.                                                                                                                                         | Same.                                                                                                                                                                                                                                    |
| Phase 4 `plan.md` H1                              | `Deep-<level> plan: <slug>`                                                                                                                   | `Deep-<level> plan (cross-project): <slug>`                                                                                                                                                                                              |
| Phase 4 `plan.md` Improvements heading            | `## Improvements (applicable to this codebase)`                                                                                               | `## Improvements (universal — applicability checked per project at apply time)`                                                                                                                                                          |
| Phase 4 `plan.md` improvement / workaround bullet | `... (group: <groupId>)`                                                                                                                      | `... (group: <groupId>; affects projects: <comma-separated names>)`                                                                                                                                                                      |
| Phase 4 `plan.md` bump-set table H2               | `## Patch bump set` (or matching level)                                                                                                       | `## Cross-project bump set`                                                                                                                                                                                                              |
| Phase 4 `plan.md` bump-set table columns          | `package`, `current → target`, `location`                                                                                                     | `package`, `proposed target`, `projects (locations)`                                                                                                                                                                                     |
| Phases 0, 1, 3, end-of-flow cleanup               | Identical machinery.                                                                                                                          | Identical machinery. No new phases introduced; no phase transition order changed.                                                                                                                                                        |

The cross-project mode SHALL NOT introduce new phases or change phase transition order. The mode-conditional surfaces are exactly the five listed above (slug source, plan-dir scan artifact, `_meta.json.mode` field, subagent prompt template, phase 4 `plan.md` template) — the remaining rows (effort allocation, `_no findings_` sentinel, phases 0/1/3/cleanup) are mode-independent and appear in the table only for symmetry / completeness.

## Field naming conventions (canonical vocabulary)

The persistent JSON written by this workflow uses a fixed vocabulary. Implementations MUST use these exact field names — no synonyms, no abbreviations. Drift between parallel writers is a real risk.

**Per-group `_meta.json.packages[]` items:**

| Field        | Type   | Example                      | Notes                                                                              |
| ------------ | ------ | ---------------------------- | ---------------------------------------------------------------------------------- |
| `name`       | string | `@tanstack/react-query`      | Full package name including any `@scope/` prefix.                                  |
| `from`       | string | `5.90.18`                    | Current semver. NOT `currentVersion`, NOT `current`.                               |
| `to`         | string | `5.90.20`                    | Target semver. NOT `targetVersion`, NOT `target`.                                  |
| `location`   | string | `workspace:@m0n0lab/qup-api` | Workspace identifier or `root` or `catalog:<name>`. Mirrors `ScanResult.location`. |
| `sourceFile` | string | `apps/qup-api/package.json`  | Relative path from workspace root. NOT `manifest`, NOT `path`, NOT `file`.         |

**Global `scan.json`** is the verbatim `ScanResult` from `experiments:scan-npm-updates` and uses that skill's vocabulary (`currentVersion` / `targetVersion`). Per-group meta intentionally uses the terser `from`/`to`; do NOT unify — the two artifacts have distinct consumers and contracts.

If a writer encounters a record with the wrong field name (e.g., `manifest` instead of `sourceFile`), it SHALL treat the record as malformed, NOT silently accept the alias.

## Outputs (on disk)

### Single-project mode (`mode: "single-project"`, default)

```text
~/.claude/experiments/plans/<slug>-<level>-<unix-ts>[-N]/   # [-N] appended only on same-second collisions (-2, -3, ...)
├── _meta.json          # global plan metadata (mode: "single-project", phase, level, group ids)
├── scan.json           # raw ScanResult captured at invocation
├── plan.md             # final integrated plan written by the main agent in phase 4
└── groups/
    └── <group-id>/
        ├── _meta.json  # per-group: phase, status, packages, timing, errorReason?
        ├── changelogs/ # raw outputs of npm-changelog, one subdir per package
        │   └── <package-basename>/
        │       ├── ...npm-changelog cache layout...
        │       └── error.txt   # only on per-package fetch failure
        └── research.md # phase-2 findings written by the research subagent
```

### Cross-project mode (`mode: "cross-project"`)

```text
~/.claude/experiments/plans/<slug>-<level>-<unix-ts>[-N]/      # slug from slugOverride (e.g. "commander-deep-patch")
├── _meta.json              # global plan metadata (mode: "cross-project", phase, level, group ids)
├── scan-by-project.json    # { [projectName]: ScanResult } — per-project scans, written by the orchestrator caller
├── cross-project-plan.json # post-version-alignment aggregated CrossProjectPlan, written by the orchestrator caller
├── plan.md                 # cross-project plan synthesized in phase 4
└── groups/
    └── <group-id>/
        ├── _meta.json
        ├── changelogs/
        │   └── <package-basename>/
        │       ├── ...npm-changelog cache layout...
        │       └── error.txt
        └── research.md
```

**Differences from single-project layout**:

- `scan-by-project.json` replaces `scan.json`. JSON object mapping `projectName` → the verbatim per-project `ScanResult`. **Written by the cross-project orchestrator caller**, NOT by this workflow.
- `cross-project-plan.json` is new. JSON object capturing the orchestrator's post-version-alignment `CrossProjectPlan` (deduplicated package list with per-occurrence projection plus resolved conflict-policy outcome). **Written by the cross-project orchestrator caller**, NOT by this workflow.
- `plan.md`'s structure switches to the cross-project template — see "Cross-project plan.md template" below.
- For backward compatibility, the workflow SHALL NOT require `scan-by-project.json` and `cross-project-plan.json` to be present in single-project mode (those plans continue to write only `scan.json`).

The same diagram applies for `level=minor`, `level=major`, `level=engines` — only the slug suffix and the title of `plan.md` change. The per-group sub-tree (`groups/<group-id>/`) is identical across modes; only the subagent prompt template (phase 1+2) and the plan.md template (phase 4) differ.

## Slug derivation

Compute `<slug>` once at invocation start. The source depends on `slugOverride` and `mode`:

1. If `slugOverride` is set (required in `mode: "cross-project"`, optional in `mode: "single-project"`): use `slugOverride` verbatim as the unsanitized source.
2. Otherwise, in `mode: "single-project"`:
    1. If a `package.json` exists at the workspace root and has a non-empty `name`, use that name.
    2. Otherwise, use `basename(CWD)`.
3. Sanitize (applies to BOTH override and derived sources): lowercase, replace any run of `[^a-z0-9]+` with `-`, trim leading and trailing `-`.
4. Truncate to 40 characters; trim any trailing `-` after truncation.

Examples:

| Source                                                                         | Slug                                                                      |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| `package.json#name = "@monolab/source"`                                        | `monolab-source`                                                          |
| `package.json#name = "investlab"`                                              | `investlab`                                                               |
| no `package.json`, `basename(CWD) = "My.Demo App"`                             | `my-demo-app`                                                             |
| `package.json#name = "@scope/very-long-package-name-that-overflows-the-limit"` | first 40 chars of `scope-very-long-package-name-that-overflows-the-limit` |
| `slugOverride = "commander-deep-patch"`                                        | `commander-deep-patch`                                                    |
| `slugOverride = "Commander_DEEP.patch"`                                        | `commander-deep-patch`                                                    |

The unix timestamp suffix (`<unix-ts>` = seconds since epoch at invocation) provides time ordering. To guarantee uniqueness for same-second collisions on the same project, the skill SHALL append a deterministic collision suffix (`-2`, `-3`, …) when the target directory already exists. The collision-suffix rule is independent of slug source.

## Phase 0 — Stale-plan cleanup (pre-step)

Before creating the new plan directory, enumerate **only plan directories** under `~/.claude/experiments/plans/` whose basenames match the regex `^[a-z0-9-]+-(patch|minor|major|engines)-\d+(-\d+)?$` (i.e., `<slug>-<level>-<unix-ts>` with the optional collision suffix). Files and directories that do not match SHALL be ignored entirely — they are never read, never classified, and never offered for deletion.

For each matching plan directory, classify it as:

- **stale** if `_meta.json.createdAt` is more than 10 days old (relative to now), OR if `_meta.json` is missing / unreadable / fails to parse.
- **fresh** otherwise.

If at least one entry is stale, prompt the user once via `AskUserQuestion`:

- **Question**: `Found <N> stale plan dir(s) under ~/.claude/experiments/plans/. What do you want to do?`
- **Multi-select**: `false`
- **Options**:
    - `delete-stale` — recursively remove every stale entry, then continue.
    - `keep-stale` — leave them alone for this invocation; continue.
    - `cancel` — abort the deep-\* run; print `Cancelled. No files modified.`; do not create a new plan dir; exit.

If no stale entries exist, do not prompt — proceed silently. The skill SHALL NOT delete any directory without explicit `delete-stale` selection. The 10-day threshold is fixed in v1.

## Phase init — Create the plan directory

After phase 0, create the new plan directory:

1. Compute `<slug>`, capture `level` from input, capture `<unix-ts> = now`. Resolve any collision suffix per "Slug derivation" so the final basename `<plan-dir-name> = <slug>-<level>-<unix-ts>[-N]` is unique on disk.
2. `mkdir -p ~/.claude/experiments/plans/<plan-dir-name>/groups/`.
3. **Single-project mode (`mode: "single-project"`, default)**: Write `scan.json` with the verbatim `scanResult` input (pretty-printed, 2-space indent).
   **Cross-project mode (`mode: "cross-project"`)**: the workflow itself does NOT write `scan.json`. The cross-project caller (the `commander-update-orchestrator` skill in deep mode) writes `scan-by-project.json` and `cross-project-plan.json` separately — either before invoking the workflow or after it returns, as long as both files exist by end of the orchestrator's Step 6.5. The workflow MAY read these artifacts during phase 4 synthesis but does NOT create them.
4. Write the global `_meta.json` (see schema below) with `phase: "scanning"` and `mode` set from the workflow input (default `"single-project"`).

After this step, the global phase advances monotonically up to and including `planning` (workflow-owned phases):

`scanning` → `grouping` → `changelogs` → `research` → `integrity` → `planning`

The skill SHALL NOT skip phases or move backwards. The skill SHALL NOT advance the phase past `planning` — `executing` and `done` are consumer-owned (the calling command sets them in its own `_meta.json` updates). Each transition writes the new phase to `_meta.json` atomically (write to `_meta.json.tmp`, rename).

### Global `_meta.json` schema

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

`planDirName` is the chosen final directory name (just the basename — not the absolute path), including any deterministic collision suffix (`-2`, `-3`, …) appended for same-second collisions. Consumers reconstruct the absolute path as `~/.claude/experiments/plans/<planDirName>/`. Distinct from `slug`, which is the project identifier without level/timestamp/collision-suffix.

`mode` is set from the workflow's `mode` input (default `"single-project"`). It identifies the plan-dir's research contract and its layout (see "Cross-project plan-dir layout" below for the layout differences).

**Backward compatibility**: existing `_meta.json` files written before this change lack the `mode` field. Phase 0 stale-cleanup SHALL treat such files as `mode: "single-project"` (the only mode that existed before this change). The 10-day stale threshold is mode-independent. The basename regex `^[a-z0-9-]+-(patch|minor|major|engines)-\d+(-\d+)?$` matches both single-project plan-dirs (e.g. `monolab-source-patch-1715693231`) and cross-project plan-dirs (e.g. `commander-deep-patch-1715693231`) — the slug prefix differs but the structure is identical.

`groupIds` is populated when the workflow advances to the `grouping` phase, with the deterministic order from the grouping skill's output.

### Per-group `groups/<groupId>/_meta.json` schema

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

Initialize each group's `_meta.json` with `phase: "pending"`, `status: "pending"`, `completedAt: null`, `errorPhase: null`, `errorReason: null`, and `startedAt` set to the dispatch timestamp before the group's first subagent runs. `from`/`to` mirror the `currentVersion`/`targetVersion` of each scan record.

## Phase 1 — Batched parallel changelog fetch

When the global phase transitions to `changelogs`, dispatch subagents in **sequential batches of `maxConcurrent` groups** (default `5`, range `[1, 10]`). Within a batch, all subagents are dispatched in a single dispatch step (parallel); batches themselves are sequential — batch N+1 does NOT start until every subagent in batch N has returned.

**Why batched** (this is the workflow's hardest-learned lesson): a single dispatch of 20+ subagents reliably triggers cascading permission denials and rate limits, leaving most groups stuck in `phase: "pending"` and the workflow with no progress to show. Smaller batches (a) bound the blast radius of any single denial, (b) ensure that partial progress is preserved on disk before the next batch runs, and (c) let the workflow detect a hard wall early and fall back gracefully.

### Batching algorithm

1. Order the groups by `groupId` ascending (deterministic).
2. Slice into batches of size `maxConcurrent`. The final batch may be smaller.
3. For each batch in order:
    1. Dispatch every subagent in the batch in a single dispatch step.
    2. Wait for **all** subagents in the batch to return (success or error).
    3. Walk the batch's `groups/<id>/_meta.json` files. Surface a one-line progress message `Batch <n>/<total>: <healthy>/<batch-size> groups completed cleanly.`
    4. **Hard-wall detection**: if **every** subagent in the batch returned with `phase: "pending"` and `status: "pending"` (i.e. none even started — the dispatch itself was denied/rate-limited rather than the work failing), enter the **degraded-mode prompt** below before starting the next batch. Per-package fetch failures inside groups that DID start are NOT a hard wall — those are handled by the per-group transition rules.

The skill SHALL NOT skip ahead to the next batch while subagents from the current batch are in flight. The skill SHALL NOT exceed `maxConcurrent` in any batch — the cap is a hard limit, not a hint. A single batch is allowed only when `groups.length <= maxConcurrent`; otherwise groups SHALL be split into sequential batches.

### Degraded-mode prompt (hard-wall fallback)

If a batch hard-walls (all subagents stalled at `pending/pending`), prompt the user once via `AskUserQuestion` before continuing:

- **Question**: `Subagent dispatch was denied or rate-limited for batch <n>/<total> (<groupIds>). How do you want to proceed?`
- **Multi-select**: `false`
- **Options**:
    - `retry-current-batch` — re-dispatch this batch only (no backoff sleep — the user has already paused the flow). Repeats the same batch with the same `maxConcurrent`.
    - `degrade-to-main-agent` — abandon subagent dispatch for the remaining groups; the main agent synthesizes `plan.md` directly using already-cached changelogs under `~/.claude/changelogs/`. The main agent SHALL prepend a one-line banner to `plan.md`: `> Research consolidated in main agent due to subagent dispatch limits. Per-group research.md files were not produced for: <comma-separated groupIds of un-dispatched batches>.`
    - `abort` — exit cleanly. Plan dir is preserved on disk.

If the user picks `retry-current-batch` and the same batch hard-walls again, the prompt re-fires with the question text prefixed `Retried and still hard-walled.` — same three options, no automatic escalation. If the user picks `degrade-to-main-agent`, the workflow skips directly to a modified phase 3 (see "Degraded phase 3" below) and then phase 4 with the banner.

### Per-subagent contract (unchanged)

Each phase-1 subagent SHALL:

1. Read its group's `_meta.json` to determine the package set.
2. For each package in the group, invoke the `experiments:npm-changelog` skill once with the package name and the version range `<from>..<to>` (e.g., `@tanstack/react-query 5.90.18..5.90.20`).
3. Write the raw output of `npm-changelog` under `groups/<groupId>/changelogs/<package-basename>/`, preserving the cache structure produced by `npm-changelog`. The `<package-basename>` is the part after the last `/` in scoped names (`@tanstack/react-query` → `react-query`); for unscoped names use the full name (`vitest` → `vitest`). On collision (same basename across distinct scopes within the same group, theoretically possible), suffix the second one with the scope (e.g. `react-query` and `react-query.@otherscope`).
4. On per-package failure (network error, missing changelog, parse error from `npm-changelog`), record the error inline as `groups/<groupId>/changelogs/<package-basename>/error.txt` with the failure message and continue to the next package. Do NOT abort the group on per-package failure.
5. After all packages have been attempted, transition the group:
    - **At least one package succeeded** → update `_meta.json` to `phase: "research"`, leave `status` as `pending`, and proceed to phase 2 within the same subagent.
    - **Every package failed** → update `_meta.json` to `phase: "changelogs"`, `status: "error"`, `errorPhase: "changelogs"`, `errorReason: "<aggregated reasons>"`, `completedAt: <now>`. Exit the subagent without running phase 2.

Within a batch, groups run in parallel. Within a group, phase 1 → phase 2 is sequential (the same subagent does both back-to-back). The skill SHALL NOT block phase 2 of group A on phase 1 of group B within the same batch.

### Subagent dispatch prompt template (mandatory)

The wording sent to each subagent is **not optional decoration** — it is the load-bearing contract that prevents premature termination. Earlier dry-runs surfaced a recurring failure: subagents invoked the `experiments:npm-changelog` skill, received its structured summary (e.g. `All N versions cached and verified...`), and treated that summary as their final task answer — exiting without running phase 2 or updating `_meta.json`. Looser prompts also caused subagents to bail on the first per-package failure (notably `no_changelog_source` for `@types/*`) instead of continuing to the rest of the group.

There are two prompt templates, one per `mode`. The skill SHALL select the template based on the workflow's `mode` input. Substituting a looser prompt is a spec violation in either mode.

#### Single-project prompt template (`mode: "single-project"`, default)

The skill SHALL dispatch every subagent with a prompt that includes, verbatim or in equivalent imperative form:

```text
You are <agent-name> for group <groupId>. Research <N> package(s) for codebase impact.

Plan dir: <plan-dir>
Group meta: <plan-dir>/groups/<groupId>/_meta.json
Codebase root: <CWD>

Packages in this group:
- <name> (<from> → <to>) — sourceFile: <sourceFile>
- ...

Execute these steps IN ORDER. Do not skip. Do not stop early.

  1. Read <plan-dir>/groups/<groupId>/_meta.json to confirm the package set.
  2. For EACH package, invoke the `experiments:npm-changelog` skill once with `<name>` and `<from>..<to>`.
     - The skill's output (e.g. "All N versions cached and verified...") is INTERMEDIATE DATA, not your final answer.
     - DO NOT terminate after invoking the skill. You MUST continue.
     - If the skill returns `no_changelog_source` (common for @types/*, internal-only packages), write `<plan-dir>/groups/<groupId>/changelogs/<package-basename>/error.txt` with the reason. DO NOT terminate. Continue to the next package.
     - For any other per-package failure, do the same: write `error.txt` and continue.
  3. After every package has been processed, list `<plan-dir>/groups/<groupId>/changelogs/` to confirm what is on disk.
  4. If at least one package's changelog is present (not just `error.txt`), advance to phase 2 (steps 5-7). If every package failed, jump to step 8 (failure exit).
  5. Read every cached changelog plus the codebase context relevant to each package (file enumeration, framework patterns).
  6. Write `<plan-dir>/groups/<groupId>/research.md` with the per-package structure documented in this skill: `## <package> (<from> → <to>)`, `### Workarounds resolved`, `### Improvements applicable`, with the `_no findings_` sentinel under any heading that has no findings. No code blocks, no line numbers.
  7. Update `<plan-dir>/groups/<groupId>/_meta.json` to `phase: "done"`, `status: "ok"`, `completedAt: <now ISO 8601>`, `errorPhase: null`, `errorReason: null`. Stop.
  8. (Failure exit only) Update `<plan-dir>/groups/<groupId>/_meta.json` to `phase: "changelogs"`, `status: "error"`, `errorPhase: "changelogs"`, `errorReason: "<aggregated reasons>"`, `completedAt: <now>`. Stop.

Final response (REQUIRED — exactly one line, no prose, no markdown):
<groupId>: ok — <fetched>/<total> changelogs; <researched> researched.

If you finished without writing research.md (in the success path) or without updating _meta.json, you have NOT completed the task. Re-read these instructions and resume.
```

#### Cross-project prompt template (`mode: "cross-project"`, mandatory)

The cross-project template differs from the single-project one in exactly two places: (a) it **omits** the `Codebase root: <CWD>` line, and (b) it **replaces** the phase-2 instructions with the universal-findings-only contract. Effort allocation (~80% on improvements, ~20% on workarounds) and the `_no findings_` sentinel rule are identical. Steps 1–4 (changelog fetch, per-package failure handling) and steps 7–8 (phase-transition updates to `_meta.json`) are identical. The final-line response format is identical.

The skill SHALL dispatch every cross-project subagent with a prompt that includes, verbatim or in equivalent imperative form:

```text
You are <agent-name> for group <groupId>. Research <N> package(s) for UNIVERSAL changelog findings.

Plan dir: <plan-dir>
Group meta: <plan-dir>/groups/<groupId>/_meta.json

Packages in this group:
- <name> (<from> → <to>) — sourceFile: <sourceFile>
- ...

You SHALL NOT use Read/Glob/Grep on any project source file. Findings are derived solely from the changelog.

Execute these steps IN ORDER. Do not skip. Do not stop early.

  1. Read <plan-dir>/groups/<groupId>/_meta.json to confirm the package set.
  2. For EACH package, invoke the `experiments:npm-changelog` skill once with `<name>` and `<from>..<to>`.
     - The skill's output (e.g. "All N versions cached and verified...") is INTERMEDIATE DATA, not your final answer.
     - DO NOT terminate after invoking the skill. You MUST continue.
     - If the skill returns `no_changelog_source` (common for @types/*, internal-only packages), write `<plan-dir>/groups/<groupId>/changelogs/<package-basename>/error.txt` with the reason. DO NOT terminate. Continue to the next package.
     - For any other per-package failure, do the same: write `error.txt` and continue.
  3. After every package has been processed, list `<plan-dir>/groups/<groupId>/changelogs/` to confirm what is on disk.
  4. If at least one package's changelog is present (not just `error.txt`), advance to phase 2 (steps 5-7). If every package failed, jump to step 8 (failure exit).
  5. Read every cached changelog (NOT the codebase — see hard rule above). For each package, identify universal findings: what the version FIXES (workarounds resolved) and what the version INTRODUCES (improvements applicable). Effort allocation: ~80% on improvements, ~20% on workarounds.
  6. Write `<plan-dir>/groups/<groupId>/research.md` with the per-package structure: `## <package> (<from> → <to>)`, `### Workarounds resolved (universal)`, `### Improvements applicable (universal)`, with the `_no findings_` sentinel under any heading that has no findings. Each finding SHALL contain a universal description of what the version fixes or introduces. An optional `Hint:` line MAY carry abstract context — file globs by convention (`apps/**/use*.ts`), framework names (`React`, `Hono server-mode`), idiomatic patterns (`hooks pattern`, `Server Components`). The `Hint:` line SHALL NOT name specific project paths. No code blocks, no line numbers.
  7. Update <plan-dir>/groups/<groupId>/_meta.json to `phase: "done"`, `status: "ok"`, `completedAt: <now ISO 8601>`, `errorPhase: null`, `errorReason: null`. Stop.
  8. (Failure exit only) Update <plan-dir>/groups/<groupId>/_meta.json to `phase: "changelogs"`, `status: "error"`, `errorPhase: "changelogs"`, `errorReason: "<aggregated reasons>"`, `completedAt: <now>`. Stop.

Final response (REQUIRED — exactly one line, no prose, no markdown):
<groupId>: ok — <fetched>/<total> changelogs; <researched> researched.

If you finished without writing research.md (in the success path) or without updating _meta.json, you have NOT completed the task. Re-read these instructions and resume.
```

**Anti-patterns the templates prevent** (each observed in a real dry-run before these templates were enforced):

- Returning the `npm-changelog` skill's "All N versions cached and verified..." summary as the agent's final response without running phase 2.
- Returning `no_changelog_source` from the first `@types/*` package as the agent's final response, abandoning the rest of the group.
- Writing `research.md` but never flipping `_meta.json.status` to `ok`, leaving the group in `pending/pending` and tripping the integrity gate.
- (Cross-project specific) Subagent reaching for codebase files via Read/Glob/Grep when the cross-project contract forbids it — Hint lines naming concrete paths from an arbitrary project leak per-codebase context into universal findings.

The skill SHALL NOT dispatch a subagent without the appropriate contract. Substituting a looser prompt is a spec violation.

## Phase 2 — Parallel codebase research

For each group whose phase advanced to `research`, the same subagent (continuing from phase 1) SHALL:

1. Read every successfully fetched changelog (skip the ones with `error.txt`). In `mode: "single-project"`, also read the codebase context available (file enumeration, recent edits, framework patterns). In `mode: "cross-project"`, SHALL NOT read any project codebase file — universal findings only, per the cross-project subagent prompt template.
2. Produce `groups/<groupId>/research.md` with structure that depends on `mode`:

    **Single-project mode** (per package that fetched successfully):

    ```markdown
    ## <package-name> (<from> → <to>)

    ### Workarounds resolved

    - <bullet — bug fix in changelog cross-referenced against likely codebase area, with file globs / directory hints / component names>. Justification: <one sentence>.

    ### Improvements applicable

    - <bullet — new API / behavior / feature in changelog cross-referenced against codebase patterns that could adopt it, with file globs / directory hints>. Justification: <one sentence>.
    ```

    **Cross-project mode** (per package that fetched successfully):

    ```markdown
    ## <package-name> (<from> → <to>)

    ### Workarounds resolved (universal)

    - <bullet — bug fix described universally based on the changelog>. Hint: <abstract context: file globs by convention, framework names, idiomatic patterns, or "none">.

    ### Improvements applicable (universal)

    - <bullet — new API / behavior / feature described universally based on the changelog>. Hint: <abstract context: file globs by convention, framework names, idiomatic patterns, or "none">.
    ```

    The two heading variants are distinct strings. The `(universal)` suffix is mandatory in cross-project mode; it signals to phase 4 that the bullets carry universal descriptions, NOT codebase-specific edits. Cross-project hints SHALL NOT name specific project paths.

3. Effort allocation guideline for the subagent: **~80% on `Improvements applicable` / `Improvements applicable (universal)`, ~20% on `Workarounds resolved` / `Workarounds resolved (universal)`**. The improvement side is where the leverage is. Identical across modes.
4. Output is **opportunity-level only**. Subagents SHALL NOT produce code blocks, line numbers, or diff sketches. Plan-mode synthesis (phase 4) decides whether to surface anything as a concrete edit. Identical across modes.
5. After writing `research.md`, update the group's `_meta.json` to `phase: "done"`, `status: "ok"`, `completedAt: <now>`, `errorPhase: null`, `errorReason: null`. Exit the subagent.

If the subagent encounters an unrecoverable error during phase 2 (e.g. crashed mid-write, exhausted token budget), update `_meta.json` to `phase: "research"`, `status: "error"`, `errorPhase: "research"`, `errorReason: "<message>"`, `completedAt: <now>`, and exit without writing `research.md`. Phase-1 changelog files are preserved on disk for inspection.

### `_no findings_` sentinel

If a package has no findings under either heading, the subagent SHALL still write the heading and a single literal sentinel line `_no findings_` rather than omitting the heading. This keeps the plan-synthesis step (phase 4) able to distinguish "researched, nothing applicable" from "no research happened". Applies identically across `mode: "single-project"` and `mode: "cross-project"` (with the respective heading text including the `(universal)` suffix when cross-project).

Example for a package with no improvements found (single-project mode):

```markdown
## react (^19.0.0 → ^19.0.14)

### Workarounds resolved

- Stale ref retention fix in concurrent rendering. Likely affects: `apps/wealth-react/src/**/use*.ts`. Justification: hooks captured stale state across suspense boundaries.

### Improvements applicable

_no findings_
```

Example for a package with no improvements found (cross-project mode):

```markdown
## react (^19.0.0 → ^19.0.14)

### Workarounds resolved (universal)

- Stale ref retention fix in concurrent rendering. Hint: hooks pattern (use\*.ts files by convention).

### Improvements applicable (universal)

_no findings_
```

### No code suggestions — hard rule

The subagent SHALL NOT include in `research.md`, regardless of mode:

- Code blocks (``any-language` ...``)
- Specific line numbers
- Diff snippets / patch sketches
- Concrete `Edit` / `Write` invocations

**Allowed in single-project mode**: file globs (`apps/**/use*.ts`), directory hints (`apps/wealth-react/src/state/`), component names (`<Suspense>`), brief justification sentences.

**Allowed in cross-project mode** (universal hints only): file globs by convention (`apps/**/use*.ts` — naming convention, not a specific path in any single project), framework names (`React`, `Hono server-mode`), idiomatic patterns (`hooks pattern`, `Server Components`). The cross-project subagent SHALL NOT name any specific project path (a path that exists in exactly one of the N projects under research). Hints are universal templates the main agent uses at apply time to find concrete paths per project.

This is a deliberate choice (D4 in the design): the main agent has full project context in plan mode and synthesizes line-level changes more reliably than independent subagents. The cross-project tightening preserves the universal-findings contract — per-project applicability is determined by the orchestrator's plan-mode reconnaissance pass at apply time (Step 10b.1 of `commander-update-orchestrator`), not by the research subagents.

## Phase 3 — Integrity verification (mandatory gate)

Phase 3 is a **mandatory gate**: the global `_meta.json.phase` SHALL NOT advance to `"planning"` without phase 3 completing first. Skipping phase 3 — even when the workflow "knows" all groups succeeded — is a spec violation. The gate exists because parallel writers can leave per-group meta in inconsistent states (stuck `pending`, missing dirs, schema drift) that only a fresh on-disk read can detect.

### Mandatory walk

After every batch of phase 1+2 has returned (or after `degrade-to-main-agent` was selected), the main agent SHALL:

1. Set the global `_meta.json.phase` to `"integrity"`.
2. Enumerate every `groupId` in the global `_meta.json.groupIds`.
3. For each `groupId`, attempt to read `groups/<groupId>/_meta.json` from disk. Classify:
    - **healthy**: file exists AND `phase: "done"` AND `status: "ok"`.
    - **failed**: file exists AND (`status: "error"` OR `phase !== "done"`).
    - **missing**: file does not exist on disk (the directory was never created or was wiped).
4. The classification MUST be done by reading from disk, NOT from in-memory state — disk is the source of truth.

If every group is healthy → set the global `_meta.json.phase` to `"planning"` and advance to phase 4.

If at least one group is `failed` or `missing` (excluding `expected-missing` in degraded mode — see "Degraded phase 3"), prompt the main agent's user via `AskUserQuestion` (the prompt is mandatory — DO NOT silently continue):

- **Question**: `Research integrity check: <healthy>/<total> groups healthy. Non-healthy: <comma-separated groupIds>. How do you want to proceed?`
- **Multi-select**: `false`
- **Options**:
    - `retry-failed` — re-dispatch phase 1 + phase 2 from scratch only for the non-healthy groups. Healthy groups are NOT touched and their `research.md` files are preserved.
    - `continue-without` — proceed to phase 4 using only the healthy groups. Non-healthy groups will be documented in `plan.md`'s `## Skipped or unavailable` section with their `errorReason`.
    - `abort` — exit cleanly. The plan dir is preserved on disk for manual inspection.

The skill SHALL NOT auto-retry. There is no default option — the user must explicitly pick.

### Retry behavior

When the user selects `retry-failed`:

1. For each non-healthy group, recursively remove `groups/<groupId>/` (changelogs and research are wiped — clean retry).
2. Recreate `groups/<groupId>/_meta.json` with `phase: "pending"`, `status: "pending"`, fresh `startedAt`, `completedAt: null`, `errorPhase: null`, `errorReason: null`, packages from the original `scan.json`.
3. Re-dispatch one subagent per non-healthy group with the same phase-1 + phase-2 contract.
4. After this retry round, run phase 3 again. The integrity prompt may fire again if any group still fails — same options apply. The skill SHALL NOT loop indefinitely; if the user re-picks `retry-failed` and the same groups fail twice in a row, the skill SHALL escalate by setting the prompt's question text to `Retried <groupIds> and they failed again. retry-failed will reset and retry once more, continue-without will skip them. Pick.` — but otherwise the same three options remain.

Healthy groups are immutable across retries — never re-dispatched, never re-written.

### Degraded phase 3 (after `degrade-to-main-agent`)

If the user selected `degrade-to-main-agent` from the phase-1 hard-wall prompt, phase 3 still runs but with relaxed semantics:

- Groups that DID complete cleanly before the hard wall → classified `healthy` as usual; their `research.md` feeds phase 4 normally.
- Groups in batches that were never dispatched → classified `expected-missing` (a fourth class introduced only for the degraded path). These are NOT errors and SHALL NOT trigger the integrity prompt. They are recorded in `plan.md`'s `## Skipped or unavailable` section with the constant reason string `research consolidated in main agent (subagent dispatch limited)` — phase 4 SHALL use this constant directly and SHALL NOT attempt to read `groups/<id>/_meta.json.errorReason` for `expected-missing` groups (the per-group `_meta.json` may not exist).
- Groups that started but failed normally → classified `failed` and surfaced via the integrity prompt as usual (the user may still retry the few that legitimately failed even though others were dropped to degraded mode).

The mandatory walk and the disk-truth rule still apply. The only thing the degraded path skips is the integrity prompt for the deliberately-undispatched batches.

## Phase 4 — Plan-mode synthesis

When all groups are healthy or the user chose `continue-without`:

1. Update the global `_meta.json.phase` to `"planning"`.
2. The main agent enters Claude Code plan mode.
3. The main agent reads every healthy `groups/<id>/research.md` plus the original `scan.json` (single-project mode) or both `scan-by-project.json` and `cross-project-plan.json` (cross-project mode), then writes `<plan-dir>/plan.md`. The template depends on `mode`.

### 4.S — Single-project `plan.md` template (`mode: "single-project"`, default)

```markdown
# Deep-<level> plan: <slug>

## Improvements (applicable to this codebase)

- [<priority>] <package> — <opportunity>. Areas: <file globs>. (group: <groupId>)
- ...

## Workarounds resolved

- <package> — <bug fixed in this version>. Likely affects: <file globs>. (group: <groupId>)
- ...

## Skipped or unavailable

- <groupId> — <reason>.
- ...

## Patch bump set

| package | current → target | location |
| ------- | ---------------- | -------- |
| ...     | ...              | ...      |
```

Rules:

- The four `H2` sections SHALL appear in this exact order: `Improvements (applicable to this codebase)`, `Workarounds resolved`, `Skipped or unavailable`, `Patch bump set`.
- Sections with zero items still render with a single sentinel line (e.g. `_no improvements identified_`) — never omit the heading.
- The `<reason>` cell in `Skipped or unavailable` rows: for `failed`/`missing` groups, copy `groups/<id>/_meta.json.errorReason` verbatim; for `expected-missing` groups (degraded path), use the constant string `research consolidated in main agent (subagent dispatch limited)` without reading per-group meta.
- The `Patch bump set` table SHALL list every update from `scan.json` regardless of group health. Columns are exactly `package`, `current → target`, `location`. Rows sorted by `location` then `name` for stability.

### 4.D — Cross-project `plan.md` template (`mode: "cross-project"`)

```markdown
# Deep-<level> plan (cross-project): <slug>

Projects covered: <comma-separated project names from scan-by-project.json keys, alphabetical>

## Improvements (universal — applicability checked per project at apply time)

- [<priority>] <package> — <opportunity>. Hint: <abstract hint or "none">. (group: <groupId>; affects projects: <comma-separated project names>)
- ...

## Workarounds resolved

- <package> — <bug fixed in this version>. Hint: <abstract hint or "none">. (group: <groupId>; affects projects: <comma-separated project names>)
- ...

## Skipped or unavailable

- <groupId> — <reason>.
- ...

## Cross-project bump set

| package | proposed target | projects (locations)         |
| ------- | --------------- | ---------------------------- |
| react   | ^19.0.14        | proj-A (root); proj-B (root) |
| ...     | ...             | ...                          |
```

Rules:

- H1 form: `# Deep-<level> plan (cross-project): <slug>`. The H1 SHALL include the `(cross-project)` parenthetical and SHALL use the `slugOverride`-derived `<slug>` (NOT the CWD/`package.json`-derived slug).
- A single descriptive line `Projects covered: <comma-separated project names from scan-by-project.json keys, alphabetical>` SHALL appear directly under the H1.
- The four H2 sections SHALL appear in this exact order: `Improvements (universal — applicability checked per project at apply time)`, `Workarounds resolved`, `Skipped or unavailable`, `Cross-project bump set`.
- Sections with zero items still render with a single sentinel line:
    - `_no improvements identified_` under the Improvements heading.
    - `_no workarounds resolved_` under the Workarounds heading.
    - `_no skipped groups_` under the Skipped or unavailable heading.
- Each improvement / workaround bullet SHALL end with the parenthetical `(group: <groupId>; affects projects: <comma-separated project names>)`. The `affects projects:` list is derived from the cross-project scan artifacts: for each package in the bullet, list every project whose `ScanResult.updates[]` includes the package (sourced from `<plan-dir>/scan-by-project.json` and `<plan-dir>/cross-project-plan.json`, which the orchestrator caller wrote before / during Step 6.5.5). Names are alphabetical within the parenthetical, comma-separated.
- The `<reason>` cell in `Skipped or unavailable` rows follows the same rule as single-project: for `failed`/`missing` groups, copy `groups/<id>/_meta.json.errorReason` verbatim; for `expected-missing` groups (degraded path), use the constant string `research consolidated in main agent (subagent dispatch limited)`.
- The `Cross-project bump set` table columns are exactly `package`, `proposed target`, `projects (locations)`.
- The `projects (locations)` cell merges per-project + per-location data. Format: `<projectName> (<location>)`, with `;` separating projects and `,` separating multiple locations within the same project. Example: a `react` bump applied at root in `proj-A` and `proj-B` renders as `proj-A (root); proj-B (root)`. Example with multi-workspace: `proj-A (root, workspace:@scope/foo); proj-B (root)`.
- Table rows sorted by `package` name (alphabetical, stable).
- The table SHALL list every package in the cross-project bump set regardless of group health (even if its research group is `failed`/`missing`/`expected-missing`, the bump row appears so the orchestrator's apply step still considers it).
- Hint lines on improvement / workaround bullets carry abstract context only (file globs by convention, framework names, idiomatic patterns) — same restriction as the cross-project subagent prompt template. The main agent SHALL NOT promote a single-project path discovered during phase 4 into a Hint line; if no universal hint exists, write `Hint: none`.

### 4 — Common rules (both modes)

After plan mode ends and the user has reviewed `plan.md` (the user is the gate, not the workflow — the workflow does not auto-advance), the main agent updates `_meta.json.phase` to `"executing"` only when the consumer command (e.g. `/experiments:npm-update-deep-patch` or `/experiments:commander-update-deep-patch`) actually begins applying things. The workflow itself does not apply edits — it hands control back to the caller after writing `plan.md` so the consumer can run its apply step. The end-of-flow cleanup (see below) is a separate, consumer-triggered re-entry into the workflow; the consumer is responsible for invoking it exactly once after its apply / cancel / abort step finishes.

The H1 title interpolates `<level>`: `Deep-patch plan: <slug>` (single-project, level=patch), `Deep-minor plan: <slug>` (single-project, level=minor), `Deep-patch plan (cross-project): <slug>` (cross-project, level=patch), etc.

## End-of-flow cleanup

When the consumer re-invokes the workflow for cleanup, the workflow SHALL prompt the user once via `AskUserQuestion`:

- **Question**: `Plan dir at <plan-dir>. Keep for inspection or delete?`
- **Multi-select**: `false`
- **Options**:
    - `delete-plan` — recursively `rm -rf <plan-dir>`.
    - `keep-plan` — leave it on disk; the next invocation's stale-cleanup (phase 0) will catch it after 10 days.

Cleanup re-entry is consumer-driven and optional: when phase 1 or phase 3 returns `abort`, the workflow itself exits cleanly with the plan dir preserved (per lines covering each abort option) and does NOT prompt for cleanup on its own. The consumer decides whether to re-invoke the workflow for cleanup; if it does, the workflow MUST present the `delete-plan` / `keep-plan` prompt above. If the consumer skips re-invocation, the plan dir stays on disk until the next stale-cleanup pass (phase 0).

The workflow SHALL NOT delete the plan dir without explicit `delete-plan`. There is no default option. Stale-cleanup (phase 0) is the safety net.

After the cleanup choice, the workflow returns control to the consumer. The consumer is responsible for advancing `_meta.json.phase` to `"executing"` / `"done"` when applicable (only if the dir was kept; otherwise the file is gone with the dir). The workflow itself SHALL NOT set the phase past `"planning"` — see Hard rules.

## Hard rules

- The workflow SHALL NOT write outside `~/.claude/experiments/plans/<slug>-<level>-<unix-ts>[-N]/` (where `[-N]` is omitted unless collision resolution appended `-2`, `-3`, …).
- The workflow SHALL NOT execute tests, lint, or build.
- The workflow SHALL NOT create commits or PRs.
- The workflow SHALL NOT auto-delete any plan dir without explicit user confirmation.
- The workflow SHALL NOT advance the global phase past `planning` on its own — the consumer (command) advances `executing` and `done`.

## See also

- `group-packages-for-research` — the upstream skill whose output (`groups`) feeds this workflow's `groups` input.
- `/experiments:npm-update-deep-patch` — the first command that wires `scan-npm-updates` (level=patch) → `group-packages-for-research` → this workflow (in single-project mode) → user-driven execution.
- `/experiments:commander-update-deep-patch` — cross-project sibling. Invokes `commander-update-orchestrator` in deep mode, which inserts this workflow (in cross-project mode) at its Step 6.5.
- `commander-update-orchestrator` — the cross-project caller. In deep mode it composes this workflow with `group-packages-for-research` and writes the per-project / cross-project scan artifacts under the plan-dir.
- `experiments:npm-changelog` — invoked once per package by phase-1 subagents.
- `openspec/changes/add-npm-update-deep-patch/design.md` — original single-project design document (decisions D1-D10).
- `openspec/changes/add-commander-update-deep-patch/design.md` — cross-project design document (decisions 1-8, MON-199).
