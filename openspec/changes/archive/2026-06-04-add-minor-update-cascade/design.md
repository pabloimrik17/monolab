## Context

The `npm:update-*` / `commander:update-*` matrix ships only the `patch` row. The cross-project layer is already factored: `commander-update-{patch,deep-patch}` are thin wrappers over `commander-update-orchestrator`, fully parameterized by `level`/`target`/`mode`. The single-project layer is **not**: the apply mechanism (override consult → ncu `package.json` + `pnpm-workspace.yaml` catalog edits → one install → summary) is restated in three sites — `npm-update-patch` (inline), `npm-update-deep-patch` (inline bumps), and `commander-update-orchestrator` (Steps 8/10, "mirror npm-update-patch Step 5.5"). The orchestrator's non-goals defer a shared `apply-npm-updates` skill "until the deep variants land (third consumer)" — reached now.

This change extracts that shared mechanism, threads `<level>` through the few remaining hardcoded patch strings, adds a changelog-chronology section to the deep plan, and lands the four `minor` commands as the first reuse. Plugin-only; no automated tests in `claude-plugins/experiments/` (manual verification, mirroring prior changes). Versions are driven by release-please from conventional commits — manifests are never hand-edited.

## Goals / Non-Goals

**Goals:**
- One shared `npm-update-apply` capability owning the single-project apply mechanism + the override-resolution procedure, consumed by all single-project commands and (per project) by the orchestrator.
- Phase A is **behavior-preserving**: today's `patch` commands produce byte-equivalent user-visible output (prompts, tables, summaries, streamed ncu/install, error copy) after the rewire.
- A `## Changelogs` section in the deep `plan.md` (both workflow modes): packages alphabetical, versions ascending, repo/release links first, full verbatim bodies collapsed — assembled entirely from already-cached `npm-changelog` data (no re-fetch).
- The four `minor` commands as thin, level-parameterized wrappers (MON-137/146/195/200).

**Non-Goals:**
- `major` / `engines` rows (MON-201/202) — breaking-change / peer / engines semantics are not `homónima` to patch; separate tickets. (They do become trivial wrappers after this.)
- Unifying the override **prompt** copy across single-project and cross-project (the two surfaces legitimately differ — see D2).
- Changing any observable behavior of the shipped patch commands.
- Tests/lint/build/commits; registry mutation; auto-rollback.

## Decisions

### D1 — `npm-update-apply` = mechanical apply + override-resolution procedure; the prompt + scope stay with callers

The skill exposes two things:

**(a) A mechanical apply contract.** Caller passes a fully-resolved per-project apply spec; the skill performs writes only and streams `ncu`/install stdout/stderr verbatim:

```
Input  { packageManager, cwd, target,            // target = ncu --target (= level)
         cooldown?,                                // mirror scan; omit for pnpm
         manifestBumps: [{ sourceFile, names[], includeFilter }],   // one ncu call per sourceFile
         catalogEdits:  [{ name, targetVersion }],                  // pnpm-workspace.yaml in-place
         overrideCommands: [{ id, command }],                       // interpolated, declaration order
         skipInstall }                                              // overrides handled their own install
Result { appliedGeneric: [{ name, location }], appliedOverrides: [{ id, command, matchedNames }],
         installRan, failure?: { step, sourceFile?|entryId?, exitCode, appliedSoFar[], rawMessage } }
```

On failure the skill returns the structured `failure` (and the streamed stderr the user already saw); it does **not** print the consumer-specific abort copy. The caller formats its own canonical abort message (single-project "Re-run /experiments:npm-update-<level>…" vs orchestrator "Stopping the run. Subsequent projects not attempted."). This preserves byte-equivalence while sharing the mechanism.

**(b) An override-resolution procedure** (registry load → first-win glob match → `target-of:`/`max-target-of:`/`latest` `{version}` resolution + interpolation → GENERIC/OVERRIDE_RUN/OVERRIDE_SKIP partition). Documented once in this capability; **invoked** by callers that opt into overrides, **skipped** by those that don't. The interactive `run-override`/`skip-matched`/`force-generic` prompt and *which* packages are in scope stay caller-owned.

*Why:* the heaviest, line-for-line duplication is the mechanical block (a) and the matching algorithm (b) — both fully extracted. The only things left in callers are the prompt copy and resolution scope, which genuinely diverge.

*Alternative considered:* skill owns the override prompt too, making `npm-update-patch` a pure wrapper. Rejected — `npm-update-deep-patch` skips overrides entirely and the orchestrator prompts **cross-project** (one prompt per entry across all projects, then runs the command once per affected project), so the prompt can't be shared; baking it in would force 3 awkward modes ("resolve", "no-overrides", "pre-resolved") into the skill.

### D2 — Caller responsibilities after extraction

| Consumer | Overrides | Bumps |
|---|---|---|
| `npm-update-patch` (shallow) | resolve (single-project) via (b) + own prompt | apply via (a) |
| `npm-update-deep-patch` (deep) | **skipped** (preserve existing divergence) | apply via (a), generic-only |
| `commander-update-orchestrator` (both modes) | resolve **cross-project** (own Step 8 prompt) | apply via (a) **per project** |

The orchestrator computes each project's `effectiveTarget` (post conflict-policy) and per-project override partition, then calls (a) once per project. Its Step 10.3/10.4/10.5 collapse into "build the per-project spec → invoke `npm-update-apply` → fold the returned fragment into the cross-project summary; stop-on-fail on `failure`".

### D3 — `<level>` parameterization

All consumer-visible patch literals become `<level>`-interpolated: scan `level`, ncu `--target`, `No <level> updates available.`, `## ...-<level> summary` / `## ...-deep-<level> summary`, retry-hint command names. Title-cased where a section heading needs it. **Latent fix:** `parallel-research-workflow` 4.S hardcodes `## Patch bump set`; interpolate to `## <Level> bump set` (the mode-table already says "or matching level"). Cross-project bump set stays `## Cross-project bump set` (level-independent). No level-specific *logic* exists anywhere — only these strings + the `level`/`target` inputs.

### D4 — Changelog section (parallel-research-workflow phase 4, both modes)

- New `## Changelogs` H2 **at the end** of `plan.md` (after the bump-set table — reference material, not actionable).
- One block per bumped package, **alphabetical** by name. Header `### <name> (<from> → <to>)`.
- **Links first:** a line with the repository URL + per-version release/source links, read from the existing `npm-changelog` cache — `~/.claude/changelogs/<normalized-name>/_meta.json` (`repository`, `changelogFiles`) and each `<ver>.meta.json.sourceUrl`. **No network call** in synthesis.
- **Bodies:** the stable versions in `(from, to]` (every version newer than the installed `from`, up to `to`; `from` excluded — its changelog is not "new"), **ascending**, each full verbatim body from the cached `<ver>.md` wrapped in `<details><summary>{ver}</summary>…</details>`. Top→bottom = chronology advancing (opposite to repos).
- **Missing:** a package whose changelog failed (`error.txt` / `no_changelog_source`) or has no new version renders the links line (if a repo is known) + `_no changelog available_`.
- **Degraded path:** if phase-1 hard-walled into `degrade-to-main-agent` (no per-group `research.md`), the cached `<ver>.md` files still exist under `~/.claude/changelogs/`; the main agent builds the section from the cache anyway.
- **Cross-project:** the package is deduped (one block); display `from`=`mostCommonCurrentVersion`, `to`=`effectiveTarget` (already computed in orchestrator 6.5.1). A note points to the bump-set table for per-project version variations rather than repeating them per project.
- Not a chat paste — `plan.md` is a file; the `npm-changelog` "never paste into chat" rule does not apply to file synthesis.

### D5 — One change, phased; verification gate between A and B

`tasks.md` sequences: **Phase A** (new `npm-update-apply`; rewire `npm-update-patch` + `npm-update-deep-patch` + orchestrator; changelog section) → **byte-equivalence gate** (D6) → **Phase B** (4 minor wrappers). Specs split accordingly: Phase A = new `npm-update-apply` + modified `parallel-research-workflow` / `commander-update-orchestrator-skill` / `npm-update-deep-patch-command` / `experiments-plugin`; Phase B = `npm-update-minor-command`, `npm-update-deep-minor-command`, `commander-update-minor-command`, `commander-update-deep-minor-command`.

### D6 — Behavior-equivalence verification (manual)

No test runner here. The gate: capture a **reference run** of the four shipped patch commands against a known fixture (a small multi-PM workspace + the registered commander project set) *before* Phase A — record prompts, tables, summaries, streamed ncu/install, error copy. After Phase A, re-run and **diff**; acceptance = identical user-visible output modulo timestamps/absolute paths. Documented as explicit tasks; Phase B does not start until the gate passes.

### D7 — Override registry stays single + shared across levels

One `pkg-upgrade-overrides.yaml` (not per-level). Override families (e.g. Storybook) need coordinated upgrades regardless of level; `minor` reuses the same file via the same default path. No new data file.

## Risks / Trade-offs

- **Refactor regresses shipped patch output** → D6 byte-equivalence gate before Phase B; canonical abort copy stays caller-owned (skill returns structured failure, never prints consumer copy).
- **`plan.md` bloats** with full changelog bodies on large cross-project minor runs → `<details>` collapse + section placed last + `_no changelog available_` sentinel; reading is opt-in. No hard cap (the user wants all bodies); flagged as a soft note in the spec.
- **Stale/missing changelog cache** for a version → links-only + sentinel; synthesis never re-fetches (phase 1 already fetched; failures surface inline).
- **Cross-project `from` ambiguity** when projects sit on different current versions → show the representative `mostCommonCurrentVersion` + a pointer to the bump-set table; do not fabricate a single per-project history.
- **Scope creep into major/engines** → specs reference `level=minor` only; major/engines explicitly deferred.
- **Orchestrator↔skill coupling** (per-project spec contract) → the contract in D1 is the single integration surface; the orchestrator owns conflict/override resolution, the skill owns mechanical writes — clean seam.

## Migration Plan

Markdown-only change (skill + command files under `claude-plugins/experiments/`). "Deploy" = land the files; rollback = `git revert`. The phased gate (D6) is the safety net: Phase A is provably output-equivalent before any new command surface (Phase B) is added. release-please bumps the plugin version from the conventional commits — no manual version edits.

## Open Questions

- **Version span** — confirm bodies cover `(from, to]` (exclude the already-installed `from`). Recommended; flagging for sign-off.
- **Changelog section when zero findings** — include it whenever there is ≥1 bumped package, independent of improvements/workarounds. Recommended yes.
- **Cross-project per-project version detail** — representative `from→to` + reference to bump-set table (recommended) vs. enumerating each project's span inside the block.
