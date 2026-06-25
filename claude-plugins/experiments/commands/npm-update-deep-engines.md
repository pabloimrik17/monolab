---
description: Detect the dev/runtime toolchain (Node + pnpm/npm/yarn/bun + Deno + Bun-runtime), research engine release notes for breaking changes/migration, then pin + align every runtime surface and apply reviewed migration edits via plan mode. Engines level only. No tests/lint/build/commits. A single coordinated co-upgrade — no PR partition.
---

# npm-update-deep-engines

The "deep" sibling of `/experiments:npm-update-engines`. Same scope (engines-level toolchain bump: detect → resolve → pin + align runtime surfaces), but with research weighted toward **breaking changes & migration** sourced from **engine release notes** (Node/pnpm/npm/yarn/Deno/Bun): the release notes are fetched and cross-referenced against this codebase, then the main agent enters plan mode and synthesizes a single integrated plan. The deep single-project sibling of `/experiments:npm-update-deep-major`, but at engines level — it drives `detect-toolchain-surfaces` + `parallel-research-workflow(level=engines)` + `apply-engine-bumps`, never `scan-npm-updates`/`apply-npm-updates`/`ncu`.

> **Runtime/toolchain upgrades may include breaking changes.** This command pins runtime surfaces and (on `apply-all`) applies reviewed migration edits via plan mode. It never commits or PRs.

There is **no `## PR plan` / partition** at engines level: an engine bump is a single coordinated co-upgrade (Node + its PM, moved together), so there is one bucket. The command always operates at engines level and ignores any user-supplied level argument.

## Step 1 — Detect surfaces

Invoke `detect-toolchain-surfaces` against the project root; parse the `EngineSurfaceInventory`. If it aborts, surface the error verbatim and exit. Do not create a plan directory.

## Step 2 — Empty-result short-circuit

Resolve per-engine targets (via `apply-engine-bumps` resolution: Node → latest LTS; pnpm/npm/yarn/bun → latest; Deno → latest release). If **every** runtime surface already matches its resolved target, print exactly:

```text
No engine updates available.
```

and exit. Do NOT invoke grouping, the research workflow, or create a plan directory.

## Step 3 — Build the engine research set + group

Build a pseudo-`updates[]` set — one record per out-of-date engine — shaped like `ScanResult.updates[]` so the existing research machinery applies:

```ts
const engineUpdates = outOfDateEngines.map((e) => ({
    name: e.engine, // "node" | "pnpm" | "npm" | "yarn" | "deno" | "bun"
    currentVersion: representativeRuntimeVersion(e), // most-common across runtime loci
    targetVersion: resolvedTargets[e.engine],
    location: "engines",
    sourceFile: "engines",
}));
```

Invoke `group-packages-for-research` with `{ updates: engineUpdates }`; capture `{ groups, warnings }`. Synthesize a `scanResult` = `{ packageManager: <detected pm>, repoType: <detected>, updates: engineUpdates, warnings: [] }` for the workflow's `scan.json`.

## Step 4 — Dispatch the parallel research workflow (`level=engines`)

Invoke `parallel-research-workflow` with `{ groups, level: "engines", scanResult }`, single-project mode. The workflow handles phases 0–4; for `level=engines` it:

- **Phase 1** — fetches **engine release notes** (via `experiments:npm-changelog`'s engine retrieval) once per engine/version.
- **Phase 2** — research subagents emit the `### Breaking changes & migration` heading (required config/script/CI changes, removed runtime flags/APIs, PM lockfile/settings changes, deprecations) alongside improvements/workarounds.
- **Phase 4** — writes `plan.md` with `## Breaking changes & migration` (first) + the `## Engines bump set` table + a `## Changelogs` section linking **engine release notes**. The plan slug + `_meta.json.level` record `engines`.

Surface the workflow's progress messages as produced. The command SHALL NOT advance the workflow's phases or dispatch subagents itself. Handle early exits exactly as `/experiments:npm-update-deep-major` does (Phase 0 `cancel` → `Cancelled by stale-cleanup. No files modified.`, no Step 8; Phase 1/Phase 3 `abort` → reasoned summary, skip to Step 8).

**No `## PR plan`.** Do NOT invoke `partition-breaking-changes` — there is no partition at engines level. The surfaced plan carries `## Breaking changes & migration`, `## Engines bump set`, and `## Changelogs` only.

## Step 5 — Execution prompt

Prompt via `AskUserQuestion`:

- **Question**: `Plan synthesized. <plan-dir>/plan.md is ready (incl. ## Breaking changes & migration). Runtime/toolchain upgrades may include breaking changes. How do you want to proceed?`
- **Multi-select**: `false`
- **Options** (in this exact order):
    - `apply-all` — pin every engine in the `Engines bump set` AND apply every applicable `Breaking changes & migration` (and `Improvements`) bullet via plan mode.
    - `apply-bumps-only` — pin every engine in the `Engines bump set`; skip improvements and migration edits entirely.
    - `pick-subset` — accept a free-form list of plan items (migration/improvement items + specific engines) to apply.
    - `cancel` — exit without modifying any file. Plan dir preserved pending the cleanup prompt.

Show this prompt exactly once. Never auto-apply a plan item without an explicit selection.

## Step 5.5 — Optional isolation gate (default `none`)

Offer isolation via **AskUserQuestion** (`none` / `worktree` / `branch`). When isolated, invoke `update-isolation` **once** for the whole engine bump (one workspace — no per-bucket partition) with `branchName: "deps/engines-<YYYY-MM-DD>"`; use its `workdir` as the apply `cwd`. No commit/push/PR.

## Step 6 — Apply

### 6a — Bumps (`apply-all`, `apply-bumps-only`, and the bump part of `pick-subset`)

Invoke `apply-engine-bumps` **once** with `{ cwd: <resolved workdir>, inventory, resolvedTargets: <accepted engines>, ambiguousResolutions, confirmed: true }`. Do not restate the rewrite recipe; do not touch `support`/`unknownSurfaces`. On a structured `failure`, print the abort copy referencing `/experiments:npm-update-deep-engines` and stop. For `apply-bumps-only`, jump to Step 7 (skip the plan-mode round).

### 6b — Plan-mode migration round (`apply-all`)

After bumps land, apply the `Breaking changes & migration` bullets **and** `Improvements` bullets from `plan.md` **via Claude Code plan mode** (reconnaissance → `EnterPlanMode` preview → user-gated apply), migration edits presented first (they gate the upgrade). On **approval**, execute the listed edits via `Edit`/`Write`. On **rejection**, print `Plan-mode round rejected. No improvement or migration edits applied; bumps are preserved.` and skip to Step 7 — **already-applied bumps are NOT reverted**. The round SHALL NOT expand scope beyond bullets present in `plan.md`, and SHALL NOT run tests/lint/build or commit.

### 6c — `pick-subset`

Free-form selection over migration bullets, improvement bullets, and engine bump names (mirror `/experiments:npm-update-deep-major` Step 6c, substituting engine names for package names). Apply accepted bumps via 6a's mechanism and accepted migration/improvement bullets via 6b's plan-mode mechanism (in-scope bullets only).

### 6d — `cancel`

Print `Cancelled. No files modified.` and skip to Step 7. The plan dir is preserved.

## Step 7 — Summary

Print `## npm-update-deep-engines summary` with conditional sections (omit zero-count, except `Suggested next steps`, always present): `Applied bumps`, `Applied migration edits`, `Applied improvements`, `Skipped improvements / migration`, `Left untouched (support / unknown)`, `Isolation:`, and `Suggested next steps (not executed)` (reinstall under new toolchain, run tests, lint/typecheck, review `git diff` + commit). The surfaced `plan.md` includes `## Breaking changes & migration` + `## Changelogs` and **no** `## PR plan`.

## Step 8 — Cleanup

Delegate the cleanup prompt to `parallel-research-workflow` (it owns `delete-plan` / `keep-plan`). Invoke exactly once at this step on every path that reaches Step 8 (`abort` from Phase 1/3, and any `apply-*` path after Step 7). Phase 0 `cancel` does not reach Step 8.

## Hard rules

- Never run tests, lint, or build at any point.
- Never create commits or PRs (or push). Branch/worktree isolation via `update-isolation` is permitted (Step 5.5, opt-in, default `none`).
- Never modify any file on `cancel`. The plan dir is preserved until `delete-plan` at cleanup.
- Never modify `support`/`unknownSurfaces` loci; modify `ambiguous` only on resolution to `runtime`.
- Never expand the plan-mode round beyond bullets present in `plan.md`.
- `partition-breaking-changes` (PR bucketing) does NOT apply at engines level — a single coordinated co-upgrade. No `## PR plan` is rendered.
- Always operate at engines level; ignore any user-supplied level argument. Never invoke `scan-npm-updates`, `apply-npm-updates`, or `ncu`.
