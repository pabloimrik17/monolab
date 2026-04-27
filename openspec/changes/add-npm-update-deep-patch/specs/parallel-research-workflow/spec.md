## ADDED Requirements

### Requirement: Plan-directory creation

The skill SHALL create a plan directory at `~/.claude/experiments/plans/<slug>-<level>-<unix-ts>/` at the start of every invocation, where:

- `<slug>` is derived from the root `package.json#name` if present, else `basename(CWD)`. Sanitization: lowercase, replace any run of `[^a-z0-9]+` with `-`, trim leading and trailing `-`, truncate to 40 characters.
- `<level>` is the level passed by the caller (one of `patch`, `minor`, `major`, `engines`).
- `<unix-ts>` is the unix timestamp in seconds at invocation start.

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

### Requirement: Global plan metadata

The skill SHALL maintain a `_meta.json` file at the plan-directory root with the following shape, updated atomically at every phase transition:

```json
{
  "slug": "<string>",
  "level": "patch" | "minor" | "major" | "engines",
  "createdAt": "<ISO 8601>",
  "phase": "scanning" | "grouping" | "changelogs" | "research" | "integrity" | "planning" | "executing" | "done",
  "groupIds": ["<string>", ...]
}
```

The `phase` field SHALL advance monotonically through the listed values; the skill SHALL NOT skip phases or move backwards.

#### Scenario: Phase advances on transition

- **WHEN** the workflow finishes the changelogs phase and is about to dispatch research subagents
- **THEN** `_meta.json.phase` is updated to `"research"` before any research subagent is dispatched

#### Scenario: Group ids written after grouping

- **WHEN** the grouping phase produces three groups `tanstack-1`, `vitest-1`, `solo-react-router-1`
- **THEN** `_meta.json.groupIds` contains exactly those three ids, in deterministic order matching the grouping skill's output

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

### Requirement: Phase 1 — parallel changelog fetch

When the workflow's phase transitions to `changelogs`, the skill SHALL dispatch one subagent per group in parallel. Each subagent SHALL:

1. Read its group's `_meta.json` to determine the package set.
2. For each package, invoke the `experiments:npm-changelog` skill once with the package name and version range `<from>..<to>`.
3. Write the raw output of `npm-changelog` to `groups/<groupId>/changelogs/<package-basename>/` (preserving the cache structure produced by `npm-changelog`).
4. On per-package failure, record the error inline within `changelogs/<package-basename>/error.txt` and continue to the next package.
5. After all packages have been attempted, update its group's `_meta.json` to `phase: "research"` and proceed to phase 2 if at least one package succeeded; otherwise set `status: "error"`, `errorPhase: "changelogs"`, `errorReason: "<aggregated reasons>"`, `completedAt: <now>`, and exit.

The skill SHALL NOT block phase 2 of group A on phase 1 of group B; each group's two phases run sequentially within the group, but groups run in parallel.

#### Scenario: All groups dispatched in parallel

- **WHEN** grouping yields three groups
- **THEN** three subagents are dispatched in a single dispatch step (not sequentially)

#### Scenario: Per-package failure does not abort the group

- **WHEN** a group has packages `[A, B, C]` and `npm-changelog` for `B` fails with HTTP 429
- **THEN** the subagent records the error for `B` in its changelogs subdir, fetches `A` and `C` successfully, and proceeds to phase 2 for `[A, C]`

#### Scenario: Total changelog failure marks group as error

- **WHEN** every package in a group fails the changelog phase
- **THEN** the group's `_meta.json` is set to `phase: "changelogs"`, `status: "error"`, `errorPhase: "changelogs"`, `errorReason` summarizing the per-package reasons, and the subagent does not run phase 2

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

### Requirement: Phase 3 — integrity verification

When every dispatched subagent has returned, the main agent SHALL classify each group:

- **healthy** if the group's `_meta.json` has `phase: "done"` and `status: "ok"`.
- **failed** if `status: "error"` (regardless of phase) or `phase !== "done"` after all subagents have returned.
- **missing** if the group id is listed in the global `_meta.json.groupIds` but `groups/<id>/` does not exist on disk.

If at least one group is `failed` or `missing`, the main agent SHALL prompt via `AskUserQuestion` with these options:

- `retry-failed` — re-dispatch only the non-healthy groups (phase 1 + phase 2 from scratch for each).
- `continue-without` — proceed to phase 4 using only the healthy groups; non-healthy groups SHALL be documented in the resulting `plan.md`.
- `abort` — exit cleanly. The plan dir is preserved.

The skill SHALL NOT auto-retry non-healthy groups.

#### Scenario: All groups healthy proceeds to plan

- **WHEN** every group has `phase: "done"` and `status: "ok"`
- **THEN** no integrity prompt is shown and the workflow advances to phase 4

#### Scenario: Mixed health prompts user

- **WHEN** two groups are healthy and one has `status: "error"`
- **THEN** the integrity prompt is shown with options `retry-failed`, `continue-without`, `abort`

#### Scenario: Retry re-dispatches only failed groups

- **WHEN** the user selects `retry-failed` and one group out of three is failed
- **THEN** only that one group is re-dispatched; the two healthy groups are not touched and their `research.md` is preserved

#### Scenario: Continue-without documents skipped groups

- **WHEN** the user selects `continue-without` with one failed group `vitest-1`
- **THEN** the eventual `plan.md` contains a `## Skipped or unavailable` section listing `vitest-1` and its `errorReason`

### Requirement: Phase 4 — plan synthesis in plan mode

When all groups are healthy or the user chose `continue-without`, the main agent SHALL enter Claude Code plan mode and produce `plan.md` at the plan-dir root. The file SHALL begin with an `H1` titled `Deep-<level> plan: <slug>` followed by exactly four `H2` sections in this fixed order: `Improvements (applicable to this codebase)`, `Workarounds resolved`, `Skipped or unavailable`, `Patch bump set`.

Each section is populated by reading the healthy groups' `research.md` files and the original `scan.json`. The "Patch bump set" section SHALL list every update from `scan.json` regardless of group health, formatted as a markdown table with columns `package | current → target | location`.

The skill SHALL update the global `_meta.json.phase` to `"planning"` before entering plan mode and to `"executing"` after the user-driven execution step begins.

#### Scenario: Plan mode entered

- **WHEN** phase 3 completes successfully or the user chose `continue-without`
- **THEN** the global `_meta.json.phase` is set to `"planning"` and the main agent enters plan mode

#### Scenario: Plan structure is fixed

- **WHEN** `plan.md` is written
- **THEN** it contains exactly the four H2 section headings `Improvements (applicable to this codebase)`, `Workarounds resolved`, `Skipped or unavailable`, `Patch bump set` in that order

#### Scenario: Bump set always present

- **WHEN** the scan returned 12 updates and 2 groups were skipped via `continue-without`
- **THEN** the `Patch bump set` table contains all 12 updates regardless of which groups were skipped

### Requirement: Cleanup is opt-in at flow end

At the end of the workflow (after a successful execution step, after `cancel`, or after `abort`), the skill SHALL prompt via `AskUserQuestion` with options `delete-plan` (recursive removal of the plan directory) and `keep-plan` (leave it for inspection). The skill SHALL NOT delete the plan directory without explicit `delete-plan` selection.

#### Scenario: Delete on confirmation

- **WHEN** the user selects `delete-plan` at flow end
- **THEN** the plan directory and all of its contents are recursively removed

#### Scenario: Keep on choice

- **WHEN** the user selects `keep-plan`
- **THEN** the plan directory remains on disk and will only be removed by a future stale-cleanup prompt
