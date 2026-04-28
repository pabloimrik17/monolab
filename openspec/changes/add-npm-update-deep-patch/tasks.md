## 1. Skill — `group-packages-for-research`

- [x] 1.1 Create `claude-plugins/experiments/skills/group-packages-for-research/SKILL.md` with frontmatter `description` reflecting the input (`ScanResult.updates[]`) and the output JSON shape
- [x] 1.2 Document the deterministic sort step (stable, locale-insensitive ascending by `name`)
- [x] 1.3 Document the bucketing rule: scoped names key by `<scope>` (lowercased), unscoped names key by `solo-<name>`
- [x] 1.4 Document the cap rule: split buckets exceeding `MAX_PER_GROUP` (default `8`) into chunks preserving sort order
- [x] 1.5 Document the `maxPerGroup` override input parameter, including the inclusive `[1, 32]` validation range and the abort message format
- [x] 1.6 Document group-id generation: `<sanitized-bucket-key>-<n>`, 1-indexed, lowercase, sanitization rule `[^a-z0-9]+ → -`, trim
- [x] 1.7 Specify the JSON output contract: `{ groups: [{ groupId, bucketKey, packages: [...] }], warnings: string[] }`, ordered by `groupId` ascending, packages preserving sort order, warnings deduplicated
- [x] 1.8 State the no-network constraint explicitly (no `npm view`, no fetch, no changelog reads)
- [x] 1.9 Add a worked example with `[@tanstack/*, vitest, react]` showing inputs, intermediate buckets, and the final output JSON

## 2. Skill — `parallel-research-workflow`

- [x] 2.1 Create `claude-plugins/experiments/skills/parallel-research-workflow/SKILL.md` with frontmatter describing the input (`{ groups, level, scanResult }`) and the workflow's responsibilities
- [x] 2.2 Document the slug-derivation rule (prefer `package.json#name`, fall back to `basename(CWD)`, sanitize, cap at 40)
- [x] 2.3 Document the plan-directory creation step including initial `_meta.json` (phase `scanning`), `scan.json` write, and empty `groups/`
- [x] 2.4 Document the stale-cleanup pre-step: enumerate `~/.claude/experiments/plans/`, classify by `_meta.json.createdAt > 10 days` or unreadable meta, prompt with `delete-stale` / `keep-stale` / `cancel`
- [x] 2.5 Specify the global `_meta.json` schema with the monotonic phase enum (`scanning` → `grouping` → `changelogs` → `research` → `integrity` → `planning` → `executing` → `done`)
- [x] 2.6 Specify the per-group `groups/<id>/_meta.json` schema (`groupId`, `packages[]`, `phase`, `status`, timing, `errorPhase`, `errorReason`)
- [x] 2.7 Document phase 1 (parallel changelog fetch): one subagent per group dispatched together, each invoking `experiments:npm-changelog` per package, writing under `groups/<id>/changelogs/<package-basename>/`, recording per-package failures inline as `error.txt`
- [x] 2.8 Specify the phase-1 → phase-2 transition rule: at least one package fetched successfully → continue; all packages failed → mark group `status: error`, `errorPhase: changelogs`, exit
- [x] 2.9 Document phase 2 (codebase research): subagent reads changelogs + codebase context, writes `research.md` with the two fixed sections per package (`Workarounds resolved`, `Improvements applicable`), 80/20 effort split, opportunity-level only — no code, no line numbers, no diff sketches
- [x] 2.10 Document the `_no findings_` sentinel rule and the no-code-suggestions rule
- [x] 2.11 Document phase 3 integrity verification: classify groups as healthy / failed / missing, prompt with `retry-failed` / `continue-without` / `abort` only if any non-healthy
- [x] 2.12 Specify the retry behavior: `retry-failed` re-dispatches phase 1 + phase 2 from scratch only for non-healthy groups; healthy groups are not touched
- [x] 2.13 Document phase 4 (plan-mode synthesis): main agent enters plan mode, reads healthy `research.md` files plus `scan.json`, writes `plan.md` with the four fixed `##` sections in the prescribed order (`Improvements (applicable to this codebase)`, `Workarounds resolved`, `Skipped or unavailable`, `Patch bump set`)
- [x] 2.14 Document the `Patch bump set` table format (columns `package | current → target | location`) and the rule that all updates from `scan.json` are listed regardless of group health
- [x] 2.15 Document the end-of-flow cleanup prompt (`delete-plan` / `keep-plan`) and the no-auto-delete rule
- [x] 2.16 Add a tree-shaped diagram of the plan-directory layout (matches design.md D1)

## 3. Command — `/experiments:npm-update-deep-patch`

- [x] 3.1 Create `claude-plugins/experiments/commands/npm-update-deep-patch.md` with frontmatter `description`
- [x] 3.2 Step 1 — invoke `experiments:scan-npm-updates` with `level=patch`; surface scan failures verbatim and exit
- [x] 3.3 Step 2 — empty-result short-circuit: print warnings then `No patch updates available.`, exit without creating a plan dir
- [x] 3.4 Step 3 — invoke the `dependency-grouping-strategy` skill (the `group-packages-for-research` skill from group 1) with `ScanResult.updates`
- [x] 3.5 Step 4 — invoke the `parallel-research-workflow` skill (from group 2) with `{ groups, level: "patch", scanResult }`; surface workflow progress messages but do NOT advance phases on its behalf
- [x] 3.6 Step 5 — execution prompt: `AskUserQuestion` with options in this exact order: `apply-all`, `apply-bumps-only`, `pick-subset`, `cancel`
- [x] 3.7 Step 6a — `apply-all` and `apply-bumps-only` paths: bump every package via the same mechanism as `npm-update-patch` (ncu for `package.json`, in-memory edit for `pnpm-workspace.yaml#catalog`), one install at the end
- [x] 3.8 Step 6b — `apply-all` (improvements): re-enter plan mode with the improvement bullets in scope and drive main-agent edits per the plan
- [x] 3.9 Step 6c — `pick-subset` path: free-form selection over both improvements and bumps; validate selections against the plan content; reuse 6a/6b mechanisms for the chosen subset
- [x] 3.10 Step 6d — `cancel` path: print `Cancelled. No files modified.` and skip to Step 7's cleanup prompt
- [x] 3.11 Step 7 — final summary: emit the conditional sections (`Applied bumps`, `Applied improvements`, `Skipped improvements`, `Skipped or unavailable groups`, `Install`, `Suggested next steps`) per the spec, omitting zero-count sections except `Suggested next steps`
- [x] 3.12 Step 8 — cleanup prompt delegated to the workflow skill (no double prompt)
- [x] 3.13 Document all command-level hard rules verbatim: never run tests/lint/build, never commit/PR, never modify files on `cancel`, never mutate consumer `catalog:` references

## 4. Plugin manifest + cross-references

- [x] 4.1 Add the new command to the experiments plugin's component listing in `claude-plugins/experiments/.claude-plugin/plugin.json` — N/A: the existing `plugin.json` has no `components`/`commands`/`skills` listing; commands and skills are auto-discovered from `commands/` and `skills/` directories per Claude Code plugin convention. README.md is the de facto listing (task 4.3).
- [x] 4.2 Add the two new skills (`group-packages-for-research`, `parallel-research-workflow`) to the same listing — N/A: same as 4.1.
- [x] 4.3 Add a one-line entry for `/experiments:npm-update-deep-patch` to `claude-plugins/experiments/README.md` under the existing command index
- [x] 4.4 Cross-link the two new skills' descriptions so they reference each other and the command (skills' `description` field shows up in skill discovery)

## 5. Plugin version bump

- [x] 5.1 Bump `claude-plugins/experiments/.claude-plugin/plugin.json` version (minor — new capability, no breaking change) — 0.8.0 → 0.9.0
- [x] 5.2 Bump `claude-plugins/experiments/package.json` to match — 0.8.0 → 0.9.0
- [x] 5.3 Bump the `experiments` entry in `.claude-plugin/marketplace.json` to match — 0.8.0 → 0.9.0
- [x] 5.4 Verify the three files report the same new version — confirmed via grep all three at 0.9.0

## 6. Spec sync (after implementation merges)

> Deferred to archive time. The user's standing rule (`feedback_openspec_delta.md`) is "Never edit `openspec/specs/` directly while a change is in-flight; edit the delta in `openspec/changes/<id>/specs/` instead." The section header itself reads "(after implementation merges)". Pre-merge, the change validates strictly via `openspec validate add-npm-update-deep-patch --strict` (passes). The per-capability `openspec spec validate <name>` calls require the synced specs which only exist post-sync. Tick these off when archiving via `/opsx:archive`.

- [ ] 6.1 Run `openspec sync` (or `/opsx:sync add-npm-update-deep-patch`) so each new capability spec is materialized at `openspec/specs/<capability>/spec.md`
- [ ] 6.2 Validate via `openspec spec validate parallel-research-workflow`
- [ ] 6.3 Validate via `openspec spec validate dependency-grouping-strategy`
- [ ] 6.4 Validate via `openspec spec validate npm-update-deep-patch-command`

## 7. Manual verification — happy path

> Cannot be exercised from the implementation session: requires interactive `AskUserQuestion` flows, real network access for `npm-changelog`, and a workspace with actual patch updates available at run time. Tick off once verified by the user (or by running the command in a real environment) before archiving.

- [ ] 7.1 In a single-repo project with at least 3 patch updates available, run `/experiments:npm-update-deep-patch`; confirm the plan dir is created at the expected location with the prescribed layout
- [ ] 7.2 Confirm phase 1 produces one `changelogs/` subtree per dispatched group and that each `npm-changelog` cache entry is present
- [ ] 7.3 Confirm phase 2 produces a `research.md` per healthy group with the two prescribed sections per package
- [ ] 7.4 Confirm phase 4 produces a `plan.md` at the plan-dir root with the four prescribed `##` sections in the prescribed order, and that the `Patch bump set` table contains every scan update
- [ ] 7.5 Choose `apply-bumps-only`; confirm the bumps apply, exactly one install runs, and the summary section omits the improvement-related blocks
- [ ] 7.6 Choose `keep-plan`; confirm the plan dir remains on disk

## 8. Manual verification — edge cases

> Same constraints as section 7. Each scenario needs a specific workspace setup (zero updates, catalog entries, network failure injection, backdated `_meta.json`).

- [ ] 8.1 Run on a repo with zero patch updates; confirm the empty-result short-circuit fires and no plan dir is created
- [ ] 8.2 Run on a pnpm workspace with `catalog:` entries; confirm `pnpm-workspace.yaml` is edited in place and consumer `package.json` files referencing `catalog:` are not modified
- [ ] 8.3 Force a phase-1 failure for one package (e.g., disable network briefly during fetch); confirm the integrity prompt fires with `retry-failed`/`continue-without`/`abort`
- [ ] 8.4 Choose `continue-without`; confirm the resulting `plan.md` contains a populated `## Skipped or unavailable` section
- [ ] 8.5 Re-run after >10 days (simulate by manually backdating an existing plan dir's `_meta.json.createdAt`); confirm the stale-cleanup prompt fires with `delete-stale`/`keep-stale`/`cancel`
- [ ] 8.6 Choose `cancel` at the execution prompt; confirm no workspace files were modified and the plan dir is preserved

## 9. Manual verification — grouping determinism

> Same constraints. 9.1 needs a workspace with ≥18 packages from a single scope; 9.2 needs two consecutive invocations to compare; 9.3 needs network monitoring during the grouping step.

- [ ] 9.1 Run on a repo with at least 18 packages from a single scope (e.g., `@storybook/*`); confirm the group ids are `storybook-1`, `storybook-2`, `storybook-3` and chunk sizes are 8, 8, 2
- [ ] 9.2 Run twice on identical scan output; confirm both invocations produce byte-identical group partitions and group ids
- [ ] 9.3 Confirm that no `npm view` or `gh api` calls are made during grouping (network trace or zero outbound requests)

## 10. Resilience hardening (post-monolab dry-run findings)

> Added 2026-04-28 after the first real run on monolab (50 patches → 20 groups) revealed three implementation gaps the original spec did not address: subagent fan-out at scale was rejected by the dispatcher, phase 3 was silently skipped, and per-group `_meta.json` field naming drifted between parallel writers (`manifest` vs `sourceFile`). All three are now in the delta spec and the `parallel-research-workflow` SKILL.md.

- [x] 10.1 Add `Field naming conventions` section to `parallel-research-workflow/SKILL.md` (canonical `name` / `from` / `to` / `location` / `sourceFile`; explicit "no aliases, malformed if drifted")
- [x] 10.2 Add corresponding `Requirement: Field naming conventions` to the delta spec with two scenarios (canonical fields written, aliased field rejected on read)
- [x] 10.3 Replace "single-dispatch all groups" in `parallel-research-workflow/SKILL.md` Phase 1 with batched dispatch (`maxConcurrent` default `5`, range `[1, 10]`); document that batches are sequential and progress is surfaced after each batch
- [x] 10.4 Update the delta spec `Requirement: Phase 1` accordingly, renamed to "Phase 1 — batched parallel changelog fetch", with batching scenarios (split into batches, single batch when count fits)
- [x] 10.5 Document the hard-wall fallback in `parallel-research-workflow/SKILL.md`: detection rule (every subagent in a batch returns `pending/pending`), prompt options (`retry-current-batch` / `degrade-to-main-agent` / `abort`), and the degraded-mode `plan.md` banner contract
- [x] 10.6 Add `Requirement: Subagent dispatch hard-wall fallback` to the delta spec with three scenarios (hard wall fires prompt, per-package failure does not, degrade-to-main-agent banner)
- [x] 10.7 Promote phase 3 to a mandatory gate in `parallel-research-workflow/SKILL.md` (global phase MUST advance through `integrity` before `planning`; classification reads from disk, not memory; degraded-path `expected-missing` class)
- [x] 10.8 Update the delta spec `Requirement: Phase 3` to "Phase 3 — integrity verification (mandatory gate)" with new scenarios (phase advances to integrity, disk truth over memory, expected-missing in degraded path)
- [x] 10.9 Re-validate change post-edits via `openspec validate add-npm-update-deep-patch` (passes)
- [ ] 10.10 Manual re-test on monolab: confirm batching produces sequential `Batch n/total` progress lines, phase 3 prompt fires when groups stall, and `_meta.json` writers use `sourceFile` consistently

## 11. Manual verification — coverage from initial monolab run (2026-04-27)

> Tasks effectively covered by the first real run, with caveats. See `~/.claude/experiments/plans/m0n0lab-source-patch-1777322102/` for artifacts.

- [x] 11.1 Plan-dir layout created (7.1 ✓)
- [x] 11.2 `apply-all` end-to-end: 50 bumps applied across 17 manifests + single `pnpm install` (covers 7.5 broader than `apply-bumps-only`)
- [x] 11.3 `keep-plan` honored (7.6 ✓)
- [x] 11.4 Catalog scan path exercised (8.2 partial — no catalog patches available on monolab so the in-place edit was not triggered)
- [ ] 11.5 ⚠️ Phase 2 `research.md` per group NOT produced (subagent dispatch failed; addressed by §10 — retest required)
- [ ] 11.6 ⚠️ Phase 3 integrity prompt NOT fired despite 19 stalled groups (addressed by §10 — retest required)
