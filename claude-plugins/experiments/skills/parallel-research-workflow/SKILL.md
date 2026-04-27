---
name: parallel-research-workflow
description: Use when a command needs to dispatch a two-phase parallel-subagent research workflow (changelog fetch → codebase research → integrity check → plan-mode synthesis) over a pre-grouped package set — for example `/experiments:npm-update-deep-patch` (and future deep-* siblings) after invoking `group-packages-for-research`. Trigger phrases include "dispatch research subagents over these groups", "run the deep-update workflow", or any flow that needs per-group changelog research persisted under `~/.claude/experiments/plans/`. Inputs `{ groups, level, scanResult }`; produces `<plan-dir>/plan.md` + per-group `_meta.json`, `changelogs/`, `research.md`. Never edits workspace files; bumps/applies are the caller's responsibility.
---

# parallel-research-workflow

Generic two-phase parallel-subagent research workflow. Given a pre-grouped set of package updates (the output of `group-packages-for-research`), dispatch one subagent per group to (1) fetch every changelog with `experiments:npm-changelog` and (2) cross-reference the changelogs against this codebase. Then verify integrity, prompt the main agent into plan mode, and emit a single integrated `plan.md`.

This skill is reusable by every `/experiments:npm-update-deep-*` command (and, eventually, `commander:update-deep-*`). It is the orchestration layer; consumers wire scan → grouping → this skill → user-driven execution.

The skill writes only under `~/.claude/experiments/plans/<slug>-<level>-<unix-ts>/`. It does NOT modify any workspace file. Bumping manifests / running installs / applying improvements are the caller's responsibility (see `/experiments:npm-update-deep-patch`).

## Inputs

- **`groups`** (required): array of group records as emitted by `group-packages-for-research` — `[{ groupId, bucketKey, packages: [...] }]`.
- **`level`** (required): one of `patch` | `minor` | `major` | `engines`. Embedded into the plan-dir slug and into `_meta.json.level`. Determines the title of `plan.md` (e.g. `Deep-patch plan: <slug>`).
- **`scanResult`** (required): the verbatim `ScanResult` JSON from `experiments:scan-npm-updates`. Persisted as `scan.json` so the main agent can reconstruct the full bump set in phase 4.

The skill SHALL NOT mutate any input.

## Outputs (on disk)

```text
~/.claude/experiments/plans/<slug>-<level>-<unix-ts>/
├── _meta.json          # global plan metadata (phase, level, scan summary, group ids)
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

The same diagram applies for `level=minor`, `level=major`, `level=engines` — only the slug suffix and the title of `plan.md` change.

## Slug derivation

Compute `<slug>` once at invocation start:

1. If a `package.json` exists at the workspace root and has a non-empty `name`, use that name.
2. Otherwise, use `basename(CWD)`.
3. Sanitize: lowercase, replace any run of `[^a-z0-9]+` with `-`, trim leading and trailing `-`.
4. Truncate to 40 characters; trim any trailing `-` after truncation.

Examples:

| Source                                                                         | Slug                                                                      |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| `package.json#name = "@monolab/source"`                                        | `monolab-source`                                                          |
| `package.json#name = "investlab"`                                              | `investlab`                                                               |
| no `package.json`, `basename(CWD) = "My.Demo App"`                             | `my-demo-app`                                                             |
| `package.json#name = "@scope/very-long-package-name-that-overflows-the-limit"` | first 40 chars of `scope-very-long-package-name-that-overflows-the-limit` |

The unix timestamp suffix (`<unix-ts>` = seconds since epoch at invocation) provides time ordering. To guarantee uniqueness for same-second collisions on the same project, the skill SHALL append a deterministic collision suffix (`-2`, `-3`, …) when the target directory already exists.

## Phase 0 — Stale-plan cleanup (pre-step)

Before creating the new plan directory, enumerate `~/.claude/experiments/plans/` and classify each child entry:

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

1. Compute `<slug>`, capture `level` from input, capture `<unix-ts> = now`.
2. `mkdir -p ~/.claude/experiments/plans/<slug>-<level>-<unix-ts>/groups/`.
3. Write `scan.json` with the verbatim `scanResult` input (pretty-printed, 2-space indent).
4. Write the global `_meta.json` (see schema below) with `phase: "scanning"`.

After this step, the global phase advances monotonically through:

`scanning` → `grouping` → `changelogs` → `research` → `integrity` → `planning` → `executing` → `done`

The skill SHALL NOT skip phases or move backwards. Each transition writes the new phase to `_meta.json` atomically (write to `_meta.json.tmp`, rename).

### Global `_meta.json` schema

```json
{
    "slug": "<string>",
    "level": "patch" | "minor" | "major" | "engines",
    "createdAt": "<ISO 8601>",
    "phase": "scanning" | "grouping" | "changelogs" | "research" | "integrity" | "planning" | "executing" | "done",
    "groupIds": ["<string>", ...]
}
```

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

## Phase 1 — Parallel changelog fetch

When the global phase transitions to `changelogs`, dispatch **one subagent per group**, all in a single dispatch step (not sequentially). Each phase-1 subagent SHALL:

1. Read its group's `_meta.json` to determine the package set.
2. For each package in the group, invoke the `experiments:npm-changelog` skill once with the package name and the version range `<from>..<to>` (e.g., `@tanstack/react-query 5.90.18..5.90.20`).
3. Write the raw output of `npm-changelog` under `groups/<groupId>/changelogs/<package-basename>/`, preserving the cache structure produced by `npm-changelog`. The `<package-basename>` is the part after the last `/` in scoped names (`@tanstack/react-query` → `react-query`); for unscoped names use the full name (`vitest` → `vitest`). On collision (same basename across distinct scopes within the same group, theoretically possible), suffix the second one with the scope (e.g. `react-query` and `react-query.@otherscope`).
4. On per-package failure (network error, missing changelog, parse error from `npm-changelog`), record the error inline as `groups/<groupId>/changelogs/<package-basename>/error.txt` with the failure message and continue to the next package. Do NOT abort the group on per-package failure.
5. After all packages have been attempted, transition the group:
    - **At least one package succeeded** → update `_meta.json` to `phase: "research"`, leave `status` as `pending`, and proceed to phase 2 within the same subagent.
    - **Every package failed** → update `_meta.json` to `phase: "changelogs"`, `status: "error"`, `errorPhase: "changelogs"`, `errorReason: "<aggregated reasons>"`, `completedAt: <now>`. Exit the subagent without running phase 2.

Groups run in parallel. Within a group, phase 1 → phase 2 is sequential (the same subagent does both back to back). The skill SHALL NOT block phase 2 of group A on phase 1 of group B.

## Phase 2 — Parallel codebase research

For each group whose phase advanced to `research`, the same subagent (continuing from phase 1) SHALL:

1. Read every successfully fetched changelog (skip the ones with `error.txt`) plus the codebase context available to it (file enumeration, recent edits, framework patterns).
2. Produce `groups/<groupId>/research.md` containing the following structure for each package that fetched successfully:

    ```markdown
    ## <package-name> (<from> → <to>)

    ### Workarounds resolved

    - <bullet — bug fix in changelog cross-referenced against likely codebase area, with file globs / directory hints / component names>. Justification: <one sentence>.

    ### Improvements applicable

    - <bullet — new API / behavior / feature in changelog cross-referenced against codebase patterns that could adopt it, with file globs / directory hints>. Justification: <one sentence>.
    ```

3. Effort allocation guideline for the subagent: **~80% on `Improvements applicable`, ~20% on `Workarounds resolved`**. The improvement side is where the leverage is.
4. Output is **opportunity-level only**. Subagents SHALL NOT produce code blocks, line numbers, or diff sketches. Plan-mode synthesis (phase 4) decides whether to surface anything as a concrete edit.
5. After writing `research.md`, update the group's `_meta.json` to `phase: "done"`, `status: "ok"`, `completedAt: <now>`, `errorPhase: null`, `errorReason: null`. Exit the subagent.

If the subagent encounters an unrecoverable error during phase 2 (e.g. crashed mid-write, exhausted token budget), update `_meta.json` to `phase: "research"`, `status: "error"`, `errorPhase: "research"`, `errorReason: "<message>"`, `completedAt: <now>`, and exit without writing `research.md`. Phase-1 changelog files are preserved on disk for inspection.

### `_no findings_` sentinel

If a package has no findings under either heading, the subagent SHALL still write the heading and a single literal sentinel line `_no findings_` rather than omitting the heading. This keeps the plan-synthesis step (phase 4) able to distinguish "researched, nothing applicable" from "no research happened".

Example for a package with no improvements found:

```markdown
## react (^19.0.0 → ^19.0.14)

### Workarounds resolved

- Stale ref retention fix in concurrent rendering. Likely affects: `apps/wealth-react/src/**/use*.ts`. Justification: hooks captured stale state across suspense boundaries.

### Improvements applicable

_no findings_
```

### No code suggestions — hard rule

The subagent SHALL NOT include in `research.md`:

- Code blocks (``any-language` ...``)
- Specific line numbers
- Diff snippets / patch sketches
- Concrete `Edit` / `Write` invocations

Allowed: file globs (`apps/**/use*.ts`), directory hints (`apps/wealth-react/src/state/`), component names (`<Suspense>`), brief justification sentences.

This is a deliberate choice (D4 in the design): the main agent has full project context in plan mode and synthesizes line-level changes more reliably than independent subagents.

## Phase 3 — Integrity verification

When every dispatched subagent has returned, the main agent SHALL walk `groups/*/`, read each `_meta.json`, and classify each group:

- **healthy**: `phase: "done"` AND `status: "ok"`.
- **failed**: `status: "error"` (regardless of phase) OR `phase !== "done"` after all subagents have returned.
- **missing**: `groupId` listed in the global `_meta.json.groupIds` but `groups/<groupId>/` does not exist on disk.

If every group is healthy → silently advance to phase 4.

If at least one group is `failed` or `missing`, prompt the main agent's user via `AskUserQuestion`:

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

## Phase 4 — Plan-mode synthesis

When all groups are healthy or the user chose `continue-without`:

1. Update the global `_meta.json.phase` to `"planning"`.
2. The main agent enters Claude Code plan mode.
3. The main agent reads every healthy `groups/<id>/research.md` and the original `scan.json`, then writes `plan.md` at the plan-dir root with this exact structure:

    ```markdown
    # Deep-<level> plan: <slug>

    ## Improvements (applicable to this codebase)

    - [<priority>] <package> — <opportunity>. Areas: <file globs>. (group: <groupId>)
    - ...

    ## Workarounds resolved

    - <package> — <bug fixed in this version>. Likely affects: <file globs>. (group: <groupId>)
    - ...

    ## Skipped or unavailable

    - <groupId> — <reason copied from groups/<id>/\_meta.json.errorReason>.
    - ...

    ## Patch bump set

    | package | current → target | location |
    | ------- | ---------------- | -------- |
    | ...     | ...              | ...      |
    ```

4. The four `H2` sections SHALL appear in this exact order: `Improvements (applicable to this codebase)`, `Workarounds resolved`, `Skipped or unavailable`, `Patch bump set`. Sections with zero items still appear with a single line under them (e.g. `_no improvements identified_`) — never omit the heading.
5. The `Patch bump set` table SHALL list every update from `scan.json` regardless of group health (i.e., even if a group's research is unavailable, its packages are still listed for bumping). Columns are exactly `package`, `current → target`, `location`. Rows sorted by `location` then `name` for stability.
6. After plan mode ends and the user has reviewed `plan.md` (the user is the gate, not the workflow — the workflow does not auto-advance), the main agent updates `_meta.json.phase` to `"executing"` only when the consumer command (e.g. `/experiments:npm-update-deep-patch`) actually begins applying things. The workflow itself does not apply edits — it hands control back to the caller after writing `plan.md`.

The H1 title interpolates `<level>`: `Deep-patch plan: <slug>` for `level=patch`, `Deep-minor plan: <slug>` for `level=minor`, etc.

## End-of-flow cleanup

After the consumer's apply / cancel / abort step finishes (or after `abort` from phase 3), the workflow SHALL prompt the user once via `AskUserQuestion`:

- **Question**: `Plan dir at <plan-dir>. Keep for inspection or delete?`
- **Multi-select**: `false`
- **Options**:
    - `delete-plan` — recursively `rm -rf <plan-dir>`.
    - `keep-plan` — leave it on disk; the next invocation's stale-cleanup (phase 0) will catch it after 10 days.

The workflow SHALL NOT delete the plan dir without explicit `delete-plan`. There is no default option. Stale-cleanup (phase 0) is the safety net.

After the cleanup choice, the workflow returns control to the consumer. The consumer is responsible for advancing `_meta.json.phase` to `"executing"` / `"done"` when applicable (only if the dir was kept; otherwise the file is gone with the dir). The workflow itself SHALL NOT set the phase past `"planning"` — see Hard rules.

## Hard rules

- The workflow SHALL NOT write outside `~/.claude/experiments/plans/<slug>-<level>-<unix-ts>/`.
- The workflow SHALL NOT execute tests, lint, or build.
- The workflow SHALL NOT create commits or PRs.
- The workflow SHALL NOT auto-delete any plan dir without explicit user confirmation.
- The workflow SHALL NOT advance the global phase past `planning` on its own — the consumer (command) advances `executing` and `done`.

## See also

- `group-packages-for-research` — the upstream skill whose output (`groups`) feeds this workflow's `groups` input.
- `/experiments:npm-update-deep-patch` — the first command that wires `scan-npm-updates` (level=patch) → `group-packages-for-research` → this workflow → user-driven execution.
- `experiments:npm-changelog` — invoked once per package by phase-1 subagents.
- `openspec/changes/add-npm-update-deep-patch/design.md` — full design document including decisions D1-D10.
