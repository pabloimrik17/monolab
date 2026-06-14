## Why

The npm/commander dependency-update matrix now ships the `patch` and `minor` rows. The four `major` commands are pending — MON-138 (`npm:update-major`), MON-147 (`npm:update-deep-major`), MON-196 (`commander:update-major`), MON-202 (`commander:update-deep-major`, this branch). The `add-minor-update-cascade` change already did the one-time platform work: it extracted the shared `npm-update-apply` skill, threaded `<level>` through every command/skill, added the deep-plan `## Changelogs` section, and left the cross-project + single-project flows fully parameterized by `level`/`target`/`mode`. So the four `minor` commands landed as thin wrappers.

`major` is **not** a pure relabel of `minor` — it is the first "non-homónima" level, and exercising it surfaces three gaps the minor cascade deferred:

1. **`ncu` has no `major` target.** `scan-npm-updates` already maps `major → --target latest` (then post-filters to major-only). But `npm-update-apply` and `commander-update-orchestrator` pass `target` **verbatim** to `ncu --target` — fine for patch/minor (`target===level===` a valid ncu target), but `ncu --target major` is invalid and aborts. The apply layer must map `level → ncuTarget` using the same table scan uses.
2. **`--target latest` over-bumps without a filter.** scan's major set is a strict subset of `ncu --target latest`'s candidate set (it post-filtered to packages whose major actually advanced). If apply re-runs `ncu --target latest` without `--filter`, it bumps every minor/patch-only dep to latest too. For `latest`-mapped targets the names list must always be authoritative (`--filter` always on).
3. **Major = breaking changes.** MON-147/MON-202 mandate *"mayor peso en el research: breaking changes, guías de migración, codemods, deprecaciones"*. The `parallel-research-workflow` research contract is level-agnostic today; deep-major needs a level-gated breaking-change/migration research category and a `plan.md` section that surfaces it.

This change closes those three gaps (small, targeted platform deltas — **no** Phase-A-style extraction, that cost was paid by minor) and lands the four `major` commands as thin, `level=major` wrappers on top.

## What Changes

**Platform deltas in the shared skills (the major-readiness gaps + one decided family-wide change):**

- **`npm-update-apply` — `level → ncuTarget` mapping.** Resolve an internal `ncuTarget` from `target` via the same table `scan-npm-updates` uses: `patch→patch`, `minor→minor`, `major→latest`, `engines→latest` (+`--enginesNode`). Pass `ncuTarget` (not the raw `target`) to `ncu --target`. Validation list unchanged (`patch|minor|major|engines`); callers keep `level===target`. The mapping is identity for patch/minor (their *target* is unchanged; their *written version* changes via the exact-pin below).
- **`npm-update-apply` — force `--filter` for `latest`-mapped targets.** When `ncuTarget === latest` (major/engines), always pass `--filter "<names>"`; the caller's `names` list is authoritative and `includeFilter` is treated as `true` regardless. Prevents over-bumping deps that scan deliberately excluded.
- **`npm-update-apply` — exact version pinning, family-wide (`--removeRange`).** Every `ncu` bump passes `--removeRange` → deps are written as exact versions (`"react": "19.0.2"`, no `^`/`~`); catalog edits strip the prefix likewise. Applies to **all levels and all bump types** (patch/minor/major/engines, shallow/deep). One lever in the shared skill ⇒ the whole cascade pins exact. **This deliberately changes the already-shipped patch/minor output** (no longer `^`-preserving). Override-managed families pin per their own tool.
- **`commander-update-orchestrator` — per-project `includeFilter` forced for `major`/`engines`.** The per-project apply-spec builder sets `includeFilter: true` for every `manifestBumps` element when `target` maps to `latest`. Target mapping + exact-pin are delegated to `npm-update-apply` (single source of truth).
- **`parallel-research-workflow` — level-gated breaking-change research.** For `level=major`, the phase-2 research subagent prompt gains a mandatory **Breaking changes & migration** finding category (required code/config changes, removed/renamed APIs, codemods, deprecations), and phase-4 `plan.md` synthesis emits a `## Breaking changes & migration` section (before `## Improvements`, with a `_no breaking changes_` sentinel when empty), in both single-project and cross-project modes. patch/minor output unchanged here.

**Major column (thin wrappers on the now-major-ready flow):**

- **NEW** `/experiments:npm-update-major` (MON-138) — shallow single-project; scan(major) + `npm-update-apply`(target=major) + breaking-changes caution copy.
- **NEW** `/experiments:npm-update-deep-major` (MON-147) — deep single-project; scan + group + workflow(level=major) + `npm-update-apply`(target=major, generic-only). Plan carries `## Breaking changes & migration`.
- **NEW** `/experiments:commander-update-major` (MON-196) — shallow cross-project; `orchestrator(level=major, target=major, mode=shallow)`.
- **NEW** `/experiments:commander-update-deep-major` (MON-202) — deep cross-project; `orchestrator(level=major, target=major, mode=deep)`.

**Isolation & breaking-change PR grouping (opt-in; the contract refinement applies family-wide):**

The family's hard rule is refined: **commits and PRs remain forbidden, but branch/worktree creation is now allowed** (the user routinely created the branch by hand afterward). A new **`update-isolation`** capability resolves and creates an isolated workspace *before* apply runs, with a preference order: **worktree via worktrunk** (`wt`) if available → plain **`git worktree`** → optionally **ask** (direct in-place branch vs worktree). Worktree is preferred because it leaves the user's current checkout undisturbed. `apply-npm-updates` stays VCS-free; it simply runs in the resolved workdir.

- **NEW shared skill `update-isolation`** — strategy resolution (`auto`/`worktrunk`/`worktree`/`branch`/`ask`/`none`) + branch/worktree creation. Creates branch/worktree only; NEVER commits, pushes, or opens a PR. Available to every command in the family via an opt-in gate (default `none` = today's in-place behavior, so existing runs are unchanged).
- **NEW skill `partition-breaking-changes`** (deep-major) — given the `## Breaking changes & migration` findings + the bump set + a dependency-graph read, partition into PR-sized buckets using **hard co-upgrade sets** (peer/lockstep groups: `react`+`react-dom`+`@types/react`; `@storybook/*`; reuses the override-registry families) + **soft risk heuristics** (blast radius, breaking-change weight, centrality, codemod-required). Emits a `## PR plan` section: ordered buckets, each with packages, risk tier, rationale, suggested branch name, and a count summary under 2–3 policies so the user picks granularity (e.g. *isolate-high + batch-low* vs *one-per-project*). A high-risk set (React major) lands solo even though it is "one package" (with its peer set).
- **Wire into deep-major:** `npm-update-deep-major` may, per bucket, call `update-isolation` and apply that bucket's bumps + migration edits into its own worktree (the user then reviews + commits + PRs each). The summary lists each bucket → its branch/worktree path + next steps.

**Out of scope:** the `engines` row (MON-139/148/197/201) — runtime/package-manager semantics, separate tickets. D1's mapping table documents `engines→latest+--enginesNode` for forward-compat (same mechanism), but NO engines command ships. **Still forbidden:** tests/lint/build, **commits**, **PRs**, push, registry mutation. **Per-bucket isolation × cross-project** (one worktree per (project,bucket)) is a flagged follow-up — v1 keeps cross-project at one worktree per project and per-bucket isolation at the single-project surface (see Open Questions). Manual verification only. Stays in the `experiments` plugin — same as patch and minor.

## Capabilities

### New Capabilities

- `npm-update-major-command`: `/experiments:npm-update-major` (MON-138).
- `npm-update-deep-major-command`: `/experiments:npm-update-deep-major` (MON-147).
- `commander-update-major-command`: `/experiments:commander-update-major` (MON-196).
- `commander-update-deep-major-command`: `/experiments:commander-update-deep-major` (MON-202).
- `update-isolation`: shared branch/worktree isolation skill (worktrunk → worktree → branch/ask), opt-in, VCS-safe (no commit/push/PR). Consumed by the major commands now; designed for family-wide adoption.
- `breaking-change-pr-grouping`: the `partition-breaking-changes` skill — risk/family/size partition of major breaking changes into a `## PR plan` of buckets, with a count-by-policy summary.

### Modified Capabilities

- `npm-update-apply`: `target` is now mapped to an `ncuTarget` (`major→latest`, `engines→latest+--enginesNode`) instead of passed verbatim; for `latest`-mapped targets `--filter` is always applied; and **`--removeRange` is always passed so every bump writes an exact version** (catalog edits strip the prefix too) — a deliberate family-wide change, so patch/minor output is intentionally NOT preserved.
- `commander-update-orchestrator-skill`: per-project apply spec forces `includeFilter: true` when `target` maps to `latest`; target→ncu mapping delegated to `npm-update-apply`. patch/minor behavior preserved.
- `parallel-research-workflow`: phase-2 research contract + phase-4 `plan.md` gain a level-gated `Breaking changes & migration` category/section for `level=major`. patch/minor/`Changelogs` output unchanged.

## Impact

- **Code** (`claude-plugins/experiments/`):
  - NEW commands: `npm-update-major.md`, `npm-update-deep-major.md`, `commander-update-major.md`, `commander-update-deep-major.md`.
  - NEW skills: `update-isolation/SKILL.md` (branch/worktree strategy + creation), `partition-breaking-changes/SKILL.md` (risk/family/size PR grouping).
  - MODIFIED skills: `apply-npm-updates/SKILL.md` (level→ncuTarget map + force-filter), `commander-update-orchestrator/SKILL.md` (per-project includeFilter force), `parallel-research-workflow/SKILL.md` (breaking-change research category/section).
  - **Cross-cutting contract refinement**: the "no branches" hard rule is lifted to "branch/worktree allowed via `update-isolation`; no commits/PRs" across the family. MON-202 updates the four major commands + the shared skills' wording; the already-shipped patch/minor command files adopt the same opt-in gate (small, mechanical — flagged as a possible standalone follow-up; see Open Questions).
  - **worktrunk detection**: `update-isolation` probes for `wt` on `PATH` / a usable worktrunk config; note that worktrunk `post-start` hooks may run their own install, which can interact with the apply step's install (handled by the install-skip rule).
- **Sequencing / dependency**: builds directly on `add-minor-update-cascade` (MON-200) — the `npm-update-apply` skill, the `level`-parameterized orchestrator, and the `## <Level> bump set` / `## Changelogs` plan template. **RESOLVED**: the `feature/MON-202-commander-update-deep-major` worktree was rebased onto `develop` (bcc8376), so the platform + synced base specs are present and the MODIFIED deltas validate against the real baseline. (Task 0.1 done.)
- **Regression surface / intentional change**: the mapping + filter + research deltas are inert for patch/minor (identity map, `latest`-only filter, level-gated research). **But the `--removeRange` exact-pin is a deliberate behavior change to the already-shipped patch/minor/deep-patch/deep-minor commands** (their bumps now write exact versions, no `^`). Phase 4 verifies the intended exact-pin output rather than byte-equivalence. This is the one place MON-202 changes shipped behavior (decided, folded here).
- **Data**: reuses the shared `pkg-upgrade-overrides.yaml` and the `npm-changelog` cache; no new data files.
- **No** dependency / CI / published-package impact (plugin-only; no automated tests in this plugin).
- **Linear**: closes MON-138, MON-147, MON-196, MON-202; completes the `major` row of MON-133/MON-140/MON-153/MON-154, leaving only the `engines` row.
