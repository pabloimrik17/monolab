---
name: npm-update-deep-orchestrator
description: Use when a single-project deep update command (`/experiments:npm-update-deep-{patch,minor,major,engines}`) needs the shared deep pipeline — scan → group → parallel changelog research (fetch via the `fetch-changelog` executable) → teammate-synthesized dossier with two-layer compliance check → user-gated bumps apply → per-project changeset gate for improvements/migration edits. Single parameterized contract; per-level differences live ONLY in this file's delta table, so a behavioral rule cannot drift between levels. Never runs tests/lint/build; never commits/pushes/opens PRs autonomously.
---

# npm-update-deep-orchestrator

The single source of truth for the **deep single-project pipeline**. The four `/experiments:npm-update-deep-*` commands are thin parameterized entry points: they invoke this skill exactly once with their fixed `level` and surface its output verbatim. Every shared behavioral rule — including the requirement that `dossier.md` carries the script-assembled `## Changelogs` chronology — is expressed once here; level differences live only in the delta table below.

**Artifact glossary + main-window context diet.** `dossier.md` is the global research document (formerly `plan.md`; no artifact is named `plan.md`), `changeset.md` is the concrete apply plan written by the apply teammate, and Claude Code **plan mode** is the harness feature (used only as the changeset gate's review UI — Step 6b). The main conversation holds only paths and small status digests (target ≤ ~30 lines each; structured tables such as the bump set may exceed the target but stay bounded digests, never full artifact bodies). It SHALL NOT load changelog bodies, per-group research files, or the dossier body into its own context; `ncu`/install output goes to on-disk logs (digest + bounded tail-on-failure only, per `apply-npm-updates`).

## Inputs

| Field   | Type     | Required | Notes                                                                                           |
| ------- | -------- | -------- | ----------------------------------------------------------------------------------------------- |
| `level` | `string` | yes      | One of `patch`, `minor`, `major`, `engines`. Fixed by the calling command; never user-supplied. |

Reject before any side effect: unknown `level` → abort with `Error: invalid level "<value>". Expected patch|minor|major|engines.`

## Per-level delta table

Everything not listed here is identical across levels. This table is the ONLY place level-conditional behavior may be expressed.

| Concern                     | `patch`                                                          | `minor`                               | `major`                                                                                            | `engines`                                                                                                         |
| --------------------------- | ---------------------------------------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Step 1 scan                 | `scan-npm-updates` `level=patch`                                 | `scan-npm-updates` `level=minor`      | `scan-npm-updates` `level=major`                                                                   | `detect-toolchain-surfaces` (returns an `EngineSurfaceInventory`; targets resolved via `apply-engine-bumps`)      |
| Step 2 empty-exit copy      | `No patch updates available.`                                    | `No minor updates available.`         | `No major updates available.`                                                                      | `No engine updates available.`                                                                                    |
| Research target             | npm package changelogs                                           | npm package changelogs                | npm package changelogs, weighted toward `### Breaking changes & migration`                         | **engine release notes** (Node/pnpm/npm/yarn/Deno/Bun), deduplicated once per engine/version                      |
| Dossier extra sections      | —                                                                | —                                     | `## Breaking changes & migration` (first H2); `## PR plan` appended at Step 4.5                    | `## Breaking changes & migration` (first H2); **no** `## PR plan`                                                 |
| Bump-set heading            | `## Patch bump set`                                              | `## Minor bump set`                   | `## Major bump set`                                                                                | `## Engines bump set`                                                                                             |
| Step 4.5 PR partition       | SHALL NOT run                                                    | SHALL NOT run                         | `partition-breaking-changes` → `## PR plan` (legacy section name, retained)                        | SHALL NOT run (an engine bump is one coordinated co-upgrade — one bucket)                                         |
| Step 5.5 isolation options  | `none` / `worktree` / `branch`, branch `deps/patch-<YYYY-MM-DD>` | same, `deps/minor-<YYYY-MM-DD>`       | `none` / `per-bucket-worktree` (each bucket's `suggestedBranch`, applied in `suggestedMergeOrder`) | `none` / `worktree` / `branch`, one workspace for the whole bump, `deps/engines-<YYYY-MM-DD>`                     |
| Step 6a bumps mechanism     | `apply-npm-updates` `target: "patch"`                            | `apply-npm-updates` `target: "minor"` | `apply-npm-updates` `target: "major"` (skill forces `--filter`; `names` authoritative)             | `apply-engine-bumps` (`confirmed: true`; no `ncu`, no `apply-npm-updates`)                                        |
| Step 6b changeset scope     | improvement bullets                                              | improvement bullets                   | improvement bullets **+ breaking-change/migration items** (migration entries listed first)         | improvement bullets **+ migration items from engine release notes** (migration first)                             |
| Step 6c extra selection set | —                                                                | —                                     | `MIGRATION_TITLES` from `## Breaking changes & migration`                                          | `MIGRATION_TITLES` from `## Breaking changes & migration`; engine names replace package names                     |
| Step 7 summary H1           | `## npm-update-deep-patch summary`                               | `## npm-update-deep-minor summary`    | `## npm-update-deep-major summary` (+ `Applied buckets`, `Applied migration edits` sections)       | `## npm-update-deep-engines summary` (+ `Applied migration edits`, `Left untouched (support / unknown)` sections) |
| Failure retry copy          | `Re-run /experiments:npm-update-deep-patch to retry the rest.`   | …`-deep-minor`…                       | …`-deep-major`…                                                                                    | …`-deep-engines`…                                                                                                 |
| Level-specific hard rules   | —                                                                | —                                     | —                                                                                                  | never invoke `scan-npm-updates`/`apply-npm-updates`/`ncu`; never modify `support`/`unknownSurfaces` loci          |

## Step 1 — Scan

Invoke the level's scan source (delta table). For `patch`/`minor`/`major`, parse the JSON result into a `ScanResult` (`{ packageManager, repoType, updates, warnings }`). For `engines`, parse the `EngineSurfaceInventory`, resolve per-engine targets once (Node → latest LTS; pnpm/npm/yarn/bun/deno → latest, via `apply-engine-bumps` resolution), and build the pseudo-`updates[]` set — one record per out-of-date engine: `{ name: <engine>, currentVersion: <representative runtime version>, targetVersion: <resolved>, location: "engines", sourceFile: "engines" }`.

If the scan skill aborts on a precondition, surface the error verbatim and exit. Do not create a plan directory.

## Step 2 — Empty-result short-circuit

If the update set is empty (no `updates`, or every engine surface already matches its target): print any warnings under a `Warnings:` heading, print the level's empty-exit copy (delta table), and exit. Do NOT invoke grouping, the research workflow, or create a plan directory.

## Step 3 — Group

Invoke `group-packages-for-research` with `{ updates }` (and `maxPerGroup` only when explicitly overridden). Capture `{ groups, warnings }`; append the warnings to a running list for the summary. Do NOT modify the scan result — the workflow needs it verbatim.

## Step 4 — Dispatch the parallel research workflow

Invoke `parallel-research-workflow` with `{ groups, level, scanResult }` (single-project mode). The workflow owns, in order: phase 0 stale-cleanup, plan-dir creation under `~/.claude/experiments/plans/<slug>-<level>-<unix-ts>/`, phase 1 batched parallel changelog fetch (each subagent invoking the `fetch-changelog` plugin executable per package — engine release notes at `level=engines`), phase 2 parallel codebase research, phase 3 mandatory integrity gate, and phase 4 **dossier synthesis**: the workflow's named synthesizer teammate writes `<plan-dir>/dossier.md` (the `## Changelogs` chronology assembled by the deterministic script — REQUIRED at every level) and the two-layer compliance check (script + fresh-eyes subagent, repair loop ≤ 3 rounds) runs before the dossier is surfaced.

Surface the workflow's progress messages as produced. This skill SHALL NOT advance the workflow's phases or dispatch research subagents itself; its only job during Step 4 is to wait.

Early-exit handling (skip the Step 5 execution prompt entirely — no `AskUserQuestion`, no dossier item applied):

- Phase 0 `cancel` → print `Cancelled by stale-cleanup. No files modified.` and exit (no plan dir exists; Step 8 is not reached).
- Phase 1 hard-wall `abort` → print `Aborted at hard-wall. No files modified.`, skip to Step 8 (plan dir preserved).
- Phase 3 integrity `abort` → print `Aborted on integrity check. No files modified.`, skip to Step 8 (plan dir preserved).

## Step 4.5 — PR partition (level `major` only)

Per the delta table, only for `level=major`: invoke `partition-breaking-changes` with `bumpSet` (the `## Major bump set` rows), `breakingFindings` (the aggregated `## Breaking changes & migration` items), `depGraph` (manifest `peerDependencies` + import-site read), `overrideFamilies` (the shipped registry families — seeds co-upgrade sets only; the deep path runs no overrides), `policy` defaults. Append the returned buckets + count-by-policy summary to the **surfaced digest** as a `## PR plan` section (the section name is a retained legacy name — see the artifact glossary carve-outs).

## Step 5 — Execution prompt (after dossier synthesis)

Surface the dossier **by absolute path plus a bounded digest** — the bump-set table, improvement (and migration, per level) bullet titles, `## Skipped or unavailable` entries, and section presence counts (e.g. `Breaking changes & migration: 4 items; Changelogs: 12 package blocks`), plus any residual violations escalated by the compliance check. The digest SHALL NOT include the `## Changelogs` bodies or research content; the dossier lives on disk for the user to open.

Then raise exactly **one** `AskUserQuestion`:

- **Question**: `Dossier synthesized. <plan-dir>/dossier.md is ready for review.` — at `major`/`engines` append ` Includes ## Breaking changes & migration.` and a breaking-change warning — ` How do you want to proceed?`
- `multiSelect: false`
- **Options** (in this exact order):
    - `apply-all` — bump every package in the `<Level> bump set` table AND take every improvement (and migration, per level) bullet through the changeset gate (Step 6b).
    - `apply-bumps-only` — bump every package in the bump-set table; skip the changeset gate entirely.
    - `pick-subset` — accept a free-form list of dossier items (bullets and/or specific bumps) to apply.
    - `cancel` — exit without modifying any file. Plan dir preserved pending the cleanup prompt.

Show the prompt exactly once per invocation. NEVER auto-apply a dossier item without an explicit option selection.

## Step 5.5 — Optional isolation gate (default `none`)

When Step 5 resolved to an apply path (not `cancel`), raise exactly one `AskUserQuestion` with the level's isolation options (delta table). On `none`, `APPLY_CWD = <project root>`. Otherwise invoke `update-isolation` (once per workspace; per bucket at `major` with `per-bucket-worktree`) with the delta table's `branchName`/strategy, set `APPLY_CWD = <returned workdir>`, and note `installAlreadyRan` for `skipInstall`. `update-isolation` creates the branch/worktree only — never commits, pushes, or opens a PR.

## Step 6 — Apply

Branch on the Step 5 option. At `major` with `per-bucket-worktree`, run 6a+6b once per bucket in `suggestedMergeOrder` (each in its own worktree, changesets under `<plan-dir>/changesets/<bucket-branch>/`); otherwise run once over the whole accepted set.

### Step 6a — Bumps (`apply-all`, `apply-bumps-only`, and the bump part of `pick-subset`)

Invoke the level's bumps mechanism (delta table) exactly once per bucket-or-set. For `patch`/`minor`/`major`, build the resolved `apply-npm-updates` spec — do NOT restate the `ncu`/catalog/install recipe inline:

- `packageManager` = the scan's; `cwd` = `APPLY_CWD`; `target` = the level; `cooldown` = the scan's (omit for `pnpm`); `runDir` = `<plan-dir>` (the run log lands under `<plan-dir>/logs/`).
- `manifestBumps` — one element per distinct `package.json` `sourceFile`: `{ sourceFile, names, includeFilter }`. `includeFilter: true` only when this invocation's bumps for the file are a strict subset of ncu's own detected set (`pick-subset` partial inclusion); at `target: "major"` the skill forces `--filter` regardless.
- `catalogEdits` — one element per accepted update whose `location` is `catalog:default` / `catalog:<name>`: `{ name, targetVersion, catalogSource }`.
- `overrideCommands` — **empty** (`[]`). The deep single-project path consults NO override registry (see hard rules).
- `skipInstall` — `false`, except `true` when Step 5.5 reported `installAlreadyRan`.

For `engines`, invoke `apply-engine-bumps` once with `{ cwd: APPLY_CWD, inventory, resolvedTargets: <accepted engines>, ambiguousResolutions, confirmed: true }`; never touch `support`/`unknownSurfaces` loci.

The skill redirects `ncu`/install output to the on-disk run log and returns `{ appliedGeneric, appliedOverrides, installRan, logPath, failure }` — one-line digests in the conversation, bounded tail (≤ ~40 lines) on failure only, never verbatim streaming.

On a structured `failure`, print the command-owned abort copy for the failing step and stop immediately:

- `step: "ncu"` → `ncu --upgrade failed on {sourceFile} (exit {code}).` + `Applied before this failure: {manifest paths already rewritten}.` + the level's retry copy (delta table).
- `step: "catalog"` → `Failed to bump {name} in {catalogSource.sourceFile}: {reason}.` + `Applied so far: {names already written on disk}.` + the level's retry copy.
- `step: "install"` → `Install failed ({pm} exit {code}). Manifests are already bumped; review changes before retrying.`
- `apply-engine-bumps` failures (`resolve`/`write`) → surface the returned `detail` + the level's retry copy.

For `apply-bumps-only`: stop here, jump to Step 7 — the changeset gate is skipped entirely.

### Step 6b — Changeset gate (improvements + migration items; `apply-all` and `pick-subset` with bullets)

Improvements (and migration items, per the delta table) are applied through the per-project apply gate — never via blind edits and never by the main agent:

1. **Snapshot**: `node ${CLAUDE_PLUGIN_ROOT}/scripts/check-source-untouched.mjs snapshot --dir "<APPLY_CWD>" --out "<plan-dir>/changesets/baseline.json"` (bucket-suffixed paths when per-bucket).
2. **Apply teammate, turn 1 = recon + changeset, no source edit.** Spawn a single apply teammate whose turn-1 task is: read the in-scope bullets from `<plan-dir>/dossier.md` (titles, `Hint:` lines, bodies), reconnoiter the codebase at `APPLY_CWD` (pure read — no test/lint/build, no package-manager command, no file modification), classify each bullet as **applicable** (concrete edit: absolute file path, short imperative description, before/after snippet for non-trivial edits) or **inapplicable** (one-sentence reason), and write `<plan-dir>/changesets/changeset.md` (H1 `# Changeset: <slug> (deep-<level>)`; `## Applicable (<N>)` — migration entries first at `major`/`engines`; `## Inapplicable (<M>)`; `## Summary` counting both). Then END THE TURN and wait; a later turn arrives as `proceed` (apply exactly the approved changeset via `Edit`/`Write`, report files touched) or `revise: <feedback>` (update `changeset.md`, end the turn again). The teammate stays alive across the gate.
3. **Pre-gate check**: `node ${CLAUDE_PLUGIN_ROOT}/scripts/check-source-untouched.mjs check --dir "<APPLY_CWD>" --baseline "<plan-dir>/changesets/baseline.json"`. Exit `1` (modified) or `changeset.md` missing → abort the improvement round WITHOUT opening the gate: print `Apply teammate modified the workspace before approval. Aborting the changeset round.`, `TaskStop` the teammate, skip to Step 7. Applied bumps are NOT reverted.
4. **Human gate (orchestrator-owned).** Primary: the main agent enters plan mode, reads `changeset.md` (bounded, digest-sized), and presents it via the plan-approval flow (`ExitPlanMode`) — the orchestrator's OWN plan approval blocks for the human (verified under `defaultMode: "auto"`); teammate-native plan approval never reaches the human and SHALL NOT be the gate. Fallback (ONLY when the orchestrator's plan-mode approval is unavailable or non-blocking in the active runtime, e.g. non-interactive execution): `AskUserQuestion` with the changeset digest (`## Summary` counts + applicable entries' file/description lines), options `approve` / `reject`. Either way the gate blocks for the human.
    - **Approved** → leave plan mode WITHOUT implementing in the main; send `proceed` to the still-alive teammate via `SendMessage`.
    - **Rejected with feedback** → relay `revise: <feedback>` via `SendMessage`; the teammate updates `changeset.md`; re-run the pre-gate check and re-present (human-driven loop, no fixed cap).
    - **Rejected outright** → print exactly `Improvements rejected at the changeset gate. No improvement edits applied; bumps are preserved.`, `TaskStop` the teammate, skip to Step 7. Bumps are NOT reverted.
5. **Verify on disk, then teardown.** The teammate's completion message SHALL NOT be trusted: re-run the pre-gate `check` against the baseline (or `git diff --name-only` + spot-`Read`) and confirm the changed set matches the approved changeset — one change per applicable entry, all within the changeset's target files; when the approved changeset has zero applicable entries, an EMPTY changed set is the expected match, not a failure. Run the check only after the teammate's turn has completed; if an applicable edit appears missing, re-run the check once after a short wait before concluding — the teammate's writes can land between reads (observed twice in dry-runs). On a confirmed mismatch (an applicable edit missing on the re-check, or files outside the changeset changed) print `Apply verification failed: <detail>.` and do NOT retry silently. Record verified applied bullets and the changeset's inapplicable entries for the Step 7 summary. Tear the teammate down via `TaskStop` on every path out of the round.

After the gated edits are applied and verified, the round may run read-only verification over those edits and surface the result in the summary (read-only, no `--fix`). The changeset SHALL NOT expand scope beyond bullets present in `dossier.md`; adjacent opportunities discovered during reconnaissance are surfaced in the summary's `Suggested next steps`, never silently added.

### Step 6c — `pick-subset`

1. Compute `IMPROVEMENT_TITLES` (and `MIGRATION_TITLES`, per delta table) — the leading title text of each `-` bullet under the dossier's corresponding H2s (bounded titles-only read); `BUMP_NAMES` — unique names from the bump-set table (engine names at `engines`).
2. Ask free-form (no `AskUserQuestion`): `Enter the IDs to apply (comma-separated or one per line). Use dossier-line excerpts for improvements/migration items (case-insensitive substring match), package names for bumps. Empty response cancels.` listing the valid sets.
3. Parse (split commas/newlines, trim, drop empties). Empty → `cancel` (print `Cancelled. No files modified.`, skip to Step 7). Classification MAY be delegated to `node ${CLAUDE_PLUGIN_ROOT}/scripts/validate-subset.mjs` (input `{ selection, bumpNames, improvementTitles }`; output `{ bumpExclusions, improvementExclusions, unmatched }`). Unknown tokens → print `Unknown selection(s): {invalid items}.` with the valid sets and re-prompt.
4. `ACCEPTED_BUMPS` → Step 6a's mechanism; `ACCEPTED_IMPROVEMENTS ∪ ACCEPTED_MIGRATIONS` → Step 6b's changeset gate with those as the in-scope bullets only; declined bullets are recorded for the summary's `Skipped improvements`. Both empty → `cancel`.

### Step 6d — `cancel`

Print exactly `Cancelled. No files modified.` and skip to Step 7. The plan dir is preserved.

## Step 7 — Final summary

Print the level's H1 (delta table), then conditionally (omit zero-count sections, except `Suggested next steps` — always present):

- `Applied buckets ({N}):` — `major` + `per-bucket-worktree` only: `- {bucket.title} → {workdir} (branch: {branchName})`.
- `Applied bumps ({N}):` — `- {name} {currentVersion} → {targetVersion} ({location})`.
- `Applied migration edits ({N}):` — `major`/`engines` only, per applied migration bullet.
- `Applied improvements ({N}):` — one line per improvement bullet applied and verified.
- `Skipped improvements ({N}):` — bullets declined under `pick-subset` or rejected at the changeset gate (distinguish with `(excluded via pick-subset)` / `(rejected at the changeset gate)`; abort paths use `(aborted: early edit)` / `(apply verification failed)`).
- `Skipped or unavailable groups ({N}):` — sourced verbatim from `dossier.md`'s `## Skipped or unavailable` section.
- `Left untouched (support / unknown):` — `engines` only.
- `Isolation:` — always: `none (applied in current tree)` or `<mode> — <workdir(s)>`.
- `Install:` — `<pm> install executed` / `skipped (isolation already ran install)` / `skipped (no bumps applied)`.
- `Suggested next steps (not executed):` — `Run your test suite.`, `Run lint / typecheck.`, `Review changes (\`git diff\`) and commit — any isolation branch may not pass repo commit hooks, so run lint/build before committing.`(engines adds`Reinstall dependencies under the new toolchain.` first).

For the `cancel` path the summary body is `Cancelled. No files modified.` plus the always-present `Suggested next steps`.

## Step 8 — Cleanup

Delegate the cleanup prompt to `parallel-research-workflow` (it owns `delete-plan` / `keep-plan`) exactly once, on every path that reaches Step 8: Phase 1/3 `abort` and every `apply-*`/`cancel` path after Step 7. Phase 0 `cancel` does not reach Step 8.

## Hard rules (all levels)

- SHALL NOT create commits, push, or open pull requests autonomously; stops for human-in-the-loop review before any such outward/VCS action. Branch/worktree isolation via `update-isolation` is permitted (Step 5.5, opt-in, default `none`).
- SHALL NOT modify any file when the user selects `cancel`. The plan dir under `~/.claude/experiments/plans/` is preserved until `delete-plan` at cleanup.
- SHALL NOT mutate any consumer `package.json` entry that is a `catalog:` reference — only the catalog source file (`pnpm-workspace.yaml` for pnpm, the root `package.json` for Bun).
- SHALL NOT consult the package upgrade override registry — override flows belong to the shallow `/experiments:npm-update-*` paths. (The dossier may mention overridable family upgrades as improvements; the user picks whether to apply them via the standard mechanism.)
- SHALL NOT expand the changeset gate beyond bullets present in `dossier.md`.
- SHALL NOT apply improvement/migration edits in the main agent — approval always delegates to the apply teammate; results are verified on disk.
- `dossier.md` SHALL include the script-assembled `## Changelogs` chronology at every level; this skill references it by path and SHALL NOT reproduce its bodies in the conversation.
- The `level` is fixed by the calling command; any user-supplied level argument is ignored upstream.
- Level-specific rules per the delta table (engines: no `scan-npm-updates`/`apply-npm-updates`/`ncu`; `support`/`unknownSurfaces` untouched).
