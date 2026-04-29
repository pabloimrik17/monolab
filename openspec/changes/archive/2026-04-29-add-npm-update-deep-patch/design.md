## Context

The `npm-update-patch` command and the `scan-npm-updates` skill already cover the mechanical side of patch updates (detect, bump manifests, install). What is missing is *judgment*: which patches matter, which workarounds in this codebase a new version makes obsolete, which new APIs are now applicable. Today the developer answers those questions by hand or skips them entirely.

This change introduces the orchestration that asks those questions automatically — parallel subagents that read each patch's changelog *with the codebase in context* — and then hands the main agent a synthesized plan the user can act on. The orchestration is built generic from day one because it has to serve every level (`patch`, `minor`, `major`, `engines`) of the `npm:update-deep-*` family and, eventually, `commander:update-deep-*` cross-project orchestration.

Two open spike issues block implementation if left undecided: how to group packages for subagents (MON-141) and how detailed subagent output should be (MON-142). This design closes both with pragmatic choices that are revisitable once we have real-world telemetry.

Constraints inherited from the surrounding system:

- Skills are markdown instruction files (no compiled code). Subagent dispatch uses Claude Code's native mechanism.
- The existing `scan-npm-updates` skill is the only agreed-upon entry point for "what's updatable". Output schema (`ScanResult`) is fixed; this design treats it as immutable.
- The existing `npm-changelog` skill is the only agreed-upon mechanism for fetching/caching/parsing/verifying changelogs. Subagents call it once per package.
- `~/.claude/` is the user-level persistence root (decided by the now-completed MON-128 spike). Inside it, capability domains own their own subtrees — `commander/` for the cross-project registry, and (introduced here) `experiments/plans/` for deep-update artifacts.

## Goals / Non-Goals

**Goals:**
- Produce a single integrated plan (markdown) that lists applicable improvements and workarounds-resolved-by-upgrade for the given patch set, grounded in this codebase.
- Make the orchestration reusable: deep-minor / deep-major / deep-engines / cross-project flows reuse the same workflow + grouping skills with no spec changes.
- Persist research artifacts on disk so a long flow is observable, debuggable, and (in a future iteration) resumable.
- Deterministic grouping: the same scan output produces the same group partition every time.
- Bounded subagent output: research is opportunity-level, not patch-level. Subagents do not write code.
- Fail loudly on integrity gaps: a missing or errored group is surfaced to the user with retry / continue-without / abort options.

**Non-Goals:**
- Resuming an interrupted plan from disk. The dir is preserved on cancel for manual inspection but the command does not auto-resume in v1.
- Auto-applying any plan item without explicit user selection.
- Discovering monorepo membership beyond the `@scope/` heuristic in v1 (no `npm view repository.directory` lookups during grouping).
- Size-aware grouping informed by actual changelog size (would require a pre-fetch round before grouping; deferred).
- Replacing or deprecating `/experiments:npm-update-patch`. The shallow command stays.
- Mutation of any existing capability spec.

## Decisions

### D1: Plan-directory layout and lifecycle

**Choice:** Plans live at `~/.claude/experiments/plans/<slug>-<level>-<unix-ts>/`. Inside:

```
~/.claude/experiments/plans/<slug>-<level>-<unix-ts>/
├── _meta.json          # global plan metadata (phase, level, scan summary, group ids)
├── scan.json           # raw ScanResult captured at invocation time
├── plan.md             # final integrated plan written by the main agent
└── groups/
    └── <group-id>/
        ├── _meta.json  # per-group: phase, status, packages, timing, errorReason?
        ├── changelogs/ # raw outputs of npm-changelog, one subdir per package
        └── research.md # phase-2 findings written by the research subagent
```

`<slug>` derivation: prefer the root `package.json#name` (sanitized — lowercase, `[^a-z0-9]+` collapsed to `-`, trimmed, capped at 40 chars). Fall back to the sanitized `basename(CWD)` if no manifest. The unix timestamp suffix makes paths unique even under collisions.

**Why:**
- Separate root (`experiments/plans/`) keeps deep-update artifacts out of the commander registry's namespace — different concerns, different lifecycles.
- Per-group subdirectories let phase 1 (changelogs) and phase 2 (research) write independently and in parallel without lock contention.
- The structure is human-inspectable: `_meta.json` files use `phase`/`status` enums so a developer can `cat` any folder and understand state.

**Alternative considered:** Flat layout under one top-level dir. **Rejected** — collisions and harder partial-failure recovery; the per-group dir is the natural unit of subagent work.

### D2: Stale cleanup at the start of each invocation

**Choice:** On every invocation, scan `~/.claude/experiments/plans/`. For each child directory whose `_meta.json.createdAt` is more than 10 days old (or whose `_meta.json` is missing/unreadable), prompt the user once via `AskUserQuestion`:

- `delete-stale` — remove all stale dirs found
- `keep-stale` — leave them alone for this invocation
- `cancel` — abort the deep-patch run

The 10-day threshold matches the expectation set in the parent issue (MON-140). Cleanup is opt-in to avoid silently deleting work the user wanted to inspect.

**Why:** Prevents unbounded growth of `~/.claude/` over months of usage; keeps the user in the loop because plan dirs may contain hours of subagent output worth keeping.

**Alternative considered:** Auto-delete without prompt. **Rejected** — destructive; respecting a user-level dir requires consent.

### D3: Grouping strategy (closes MON-141)

**Choice:** v1 uses scope-based coalescing with a hard per-group cap.

Algorithm:
1. Sort updates by `name` (stable, deterministic).
2. Partition by `@scope/` prefix: every update sharing a scope goes to the same logical bucket. Unscoped updates form one bucket per package (singleton).
3. If any scoped bucket exceeds `MAX_PER_GROUP` (default `8`), split it into chunks of size `MAX_PER_GROUP` preserving sort order. Chunked buckets get suffixes (e.g., `tanstack-1`, `tanstack-2`).
4. Group ids: `<scope-or-package-basename>-<n>` where `<n>` is `1`-indexed within that bucket. Examples: `tanstack-1`, `vitest-1`, `solo-react-router-1` for unscoped.

**Why:**
- The `@scope/` heuristic correctly coalesces ~95% of true monorepo cases (Storybook, TanStack, Babel, Microsoft, Radix, NX, …) without any network round-trip.
- Determinism falls out for free: sort + cap is reproducible.
- The cap caps subagent context size: 8 patch changelogs is a comfortable read for one subagent without thrashing.

**Why not query `repository.directory`:** Would let us coalesce unscoped monorepos (e.g., `vue` + `vue-router`), but adds a synchronous round of `npm view` calls before the workflow can even start. Solo groups for unscoped packages are functionally correct (research happens, just per-package); the cost is more parallel work, not wrong work. Defer the smarter grouping until we observe the failure mode in practice.

**Alternative considered:** Topical grouping ("testing libs", "UI libs"). **Rejected** — categorization is fuzzy, requires a maintained taxonomy, and provides no clear win over scope-based for v1.

**Alternative considered:** Delegate grouping to an agent at runtime. **Rejected** — non-deterministic; debugging a grouping decision after the fact would be painful.

**Exit criteria for revisiting:** if telemetry from the first 20 deep-* runs shows >30% of subagents are wasting context on unrelated solo groups, add `repository.directory` lookup as an opt-in pre-step.

### D4: Research detail level (closes MON-142)

**Choice:** Intermediate. Phase-2 subagents produce *opportunities at the area/component level*, not line-by-line patches.

Concretely, each `research.md` in a group contains, per package:

- **Workarounds resolved** — bullet list of known bug fixes in the changelog cross-referenced against codebase areas where the workaround is likely to live (file globs, directory hints, component names).
- **New features applicable** — bullet list of new API surface in the changelog cross-referenced against codebase patterns that *could* adopt them (file globs, function names, brief justification).
- **Effort allocation guideline** for the subagent: 80% on improvements, 20% on workarounds-resolved.

Subagents do **not** write code suggestions, line numbers, or diff sketches. The main agent integrates the area-level findings during plan-mode and decides whether to surface them as concrete tasks.

**Why:**
- Lighter context per subagent (each one only needs a thin slice of the codebase to verify a pattern exists).
- The main agent already has the full codebase context via plan mode; making *it* synthesize line-level changes scales better than asking N subagents to do so independently.
- Avoids the worst failure mode of "deep" workflows: subagents producing confidently-wrong code suggestions that the user then has to debug.

**Alternative considered:** Heavy subagents (line-level patches). **Rejected** — token cost balloons, quality drops because subagents lack full project context, and the user reviews more noise.

**Alternative considered:** Light subagents (just summarize the changelog). **Rejected** — provides no new value over reading the changelog directly; the cross-referencing against the codebase is the whole point.

**Exit criteria for revisiting:** if user feedback after 10 deep-* runs reports that the integrated plan misses obvious applications, lift subagent detail one notch (file paths instead of globs).

### D5: Subagent meta contract

Every group has `groups/<id>/_meta.json` with this shape:

```json
{
  "groupId": "tanstack-1",
  "packages": [
    { "name": "@tanstack/react-query", "from": "5.90.18", "to": "5.90.20", "location": "...", "sourceFile": "..." }
  ],
  "phase": "pending" | "changelogs" | "research" | "done",
  "status": "pending" | "ok" | "error",
  "startedAt": "<ISO 8601>",
  "completedAt": "<ISO 8601 | null>",
  "errorPhase": "changelogs" | "research" | null,
  "errorReason": "<string | null>"
}
```

The global `_meta.json` mirrors phase progression at the plan level:

```json
{
  "slug": "monolab",
  "level": "patch",
  "createdAt": "<ISO 8601>",
  "phase": "scanning" | "grouping" | "changelogs" | "research" | "integrity" | "planning" | "executing" | "done",
  "groupIds": ["tanstack-1", "vitest-1", "solo-react-router-1"]
}
```

**Why one file per group plus one global:** local writes don't contend with each other; the global file is only ever updated by the main agent; integrity verification is a single-pass scan over `groups/*/`.

### D6: Integrity verification + partial-failure UX

**Choice:** After phase 2 completes (every dispatched subagent returns control), the main agent walks `groups/*/`, reads each `_meta.json`, and classifies:

- **Healthy**: `phase === "done"` and `status === "ok"`.
- **Failed**: `status === "error"` (regardless of phase) or `phase !== "done"` after timeout.
- **Missing**: directory expected per global `groupIds` but not present on disk.

If any group is non-healthy, the main agent prompts via `AskUserQuestion`:

- `retry-failed` — re-dispatch only the failed/missing groups.
- `continue-without` — proceed to plan-mode using only the healthy groups; failed groups are documented in `plan.md` as "research unavailable for: …".
- `abort` — exit cleanly. Plan dir is preserved.

**Why:** The user always knows which packages got research and which didn't. Continuing partial preserves value when most of the work succeeded; retry handles transient network blips; abort handles "I'd rather inspect this manually".

**Why not auto-retry without asking:** Subagent failures are sometimes deterministic (rate limits, missing changelog source). Auto-retry can loop. Asking is cheap.

### D7: Plan generation enters plan mode

**Choice:** Phase 4 transitions the main agent into Claude Code plan mode. The main agent reads every healthy `groups/*/research.md`, synthesizes a single `plan.md` at the plan-dir root with this structure:

```markdown
# Deep-patch plan: <slug>

## Improvements (applicable to this codebase)
- [<priority>] <package> — <opportunity>. Areas: <file globs>.

## Workarounds resolved
- <package> — <bug fixed in this version>. Likely affects: <file globs>.

## Skipped or unavailable
- <package> — <reason>.

## Patch bump set
| package | current → target | location |
| ------- | ---------------- | -------- |
```

The user reads `plan.md` interactively, the command then asks how to proceed (Decision D8).

**Why plan mode:** Aligns with Claude Code's existing review checkpoint behavior; it forces a human pause before any file-modifying step.

### D8: Execution step — user-driven, never automatic

**Choice:** After plan-mode emits `plan.md`, the command asks via `AskUserQuestion`:

- `apply-all` — bump every package in the patch bump set AND apply every "Improvements" item. (Both delegated to existing infrastructure: bumps via `npm-check-updates`, improvements via main-agent edits informed by the plan.)
- `apply-bumps-only` — bump every package, skip the improvements. Equivalent in effect to running the shallow `npm-update-patch`.
- `pick-subset` — free-form: user lists which improvements + bumps to apply.
- `cancel` — exit without modifying any file. Plan dir preserved.

This step explicitly does not run tests, lint, or build. Same hard rule as the shallow command.

**Why mirror the shallow command's hard rules:** consistency. A user who knows `npm-update-patch` should not be surprised by `npm-update-deep-patch`'s behavior at the apply step.

### D9: Cleanup is opt-in at the end

**Choice:** At command end (whether after `apply-all`, `cancel`, or `abort`), prompt via `AskUserQuestion`:

- `delete-plan` — recursive `rm -rf <plan-dir>`.
- `keep-plan` — leave it for inspection.

Default option presented but no auto-action. Stale-cleanup (D2) catches anything the user keeps and forgets.

### D10: MON-135 satisfied without spec change

**Observation:** MON-135 ("shared scan skill") enumerates these responsibilities — PM detection, repo type, level filtering, `minimumReleaseAge`, structured output. The existing `npm-update-scanning` capability and its `scan-npm-updates` skill already implement all five. This change references the capability directly and adds nothing to its spec.

**Why call this out:** to make the no-op explicit. A reviewer who sees MON-135 in the issue graph should not look for a delta spec for it.

## Risks / Trade-offs

- **[Risk] Subagent silently produces empty research** → Mitigation: phase-2 contract requires the subagent to write `research.md` even if empty (with a sentinel "no findings"). Integrity check treats a present-but-empty file as healthy; the plan documents "no findings for X" so the absence is observable.
- **[Risk] Long flow exhausts patience** (changelog fetch + N parallel research subagents can take minutes) → Mitigation: progress reporting from the main agent at every phase transition. Plan dir is observable on disk for impatient users.
- **[Risk] Plan dir bloat in `~/.claude/`** → Mitigation: D2 stale cleanup. A single deep-patch run is bounded by the number of patch updates × small per-package research; expected size well under 5 MB per run.
- **[Risk] Project-slug collisions across machines/checkouts of the same repo** → Mitigation: timestamp suffix gives each invocation its own dir; D2 cleans old ones. Cross-machine sync of `~/.claude/` is out of scope.
- **[Risk] v1 grouping is suboptimal for unscoped monorepos** (`vue` + `vue-router` get separate solo groups) → Mitigation: research still happens per package; only context efficiency suffers, not correctness. D3 exit criteria covers when to upgrade.
- **[Risk] Research subagent hallucinates a workaround** that does not exist in this codebase → Mitigation: opportunity-level output (D4) keeps claims falsifiable — every "likely affects" file glob is checkable by the main agent during plan synthesis. The plan itself is reviewed by the user before any apply.
- **[Risk] Phase-1 `npm-changelog` fails for one package and the whole group's research is degraded** → Mitigation: subagent records `errorPhase: "changelogs"` for that package only; phase-2 still runs over the packages that did fetch. Per-package granularity inside a group is the subagent's responsibility.
- **[Trade-off] Determinism vs. smarter grouping**: D3 chooses determinism. Worth re-evaluating once telemetry exists.
- **[Trade-off] Plan persistence on disk vs. ephemeral in-memory**: D1 chooses on-disk persistence. Cost: filesystem I/O; benefit: observability, future resumability, debug-friendliness. Net win.

## Migration Plan

Greenfield capability — no migration. Once shipped:

- Existing `npm-update-patch` users see no change; the new command is additive.
- First-time deep-patch users get the stale-cleanup prompt only when stale dirs exist (none initially).
- Plugin version bumps as a minor (new capability, no breaking change). Tracked in `tasks.md`.

## Open Questions

- **OQ1**: Should a future flag `--keep-plan` short-circuit the cleanup prompt for power users? Likely yes in a follow-up; not blocking for v1.
- **OQ2**: Should the integrity prompt have a default highlighted option (e.g., `retry-failed`)? Going with no default — the choice is consequential enough to deserve an explicit pick.
- **OQ3**: The "Improvements" application step in D8 is described as "main-agent edits informed by the plan". The exact protocol (does the main agent re-enter plan mode for apply? does it ask per-improvement?) is left to the implementing skill. The spec only mandates the user-driven gate; the inner UX can be tuned during implementation review.
- **OQ4**: When deep-minor / deep-major / deep-engines join the family, do they also live under `~/.claude/experiments/plans/` with the same slug-level-ts pattern? Strong yes by symmetry — but worth confirming when those changes land.
