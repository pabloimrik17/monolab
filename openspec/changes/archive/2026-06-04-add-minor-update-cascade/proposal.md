## Why

The npm/commander dependency-update command matrix ships only the `patch` row. The four `minor` commands are pending — MON-137 (`npm:update-minor`), MON-146 (`npm:update-deep-minor`), MON-195 (`commander:update-minor`), MON-200 (`commander:update-deep-minor`, this branch). The cross-project layer is already factored (thin command wrappers → `commander-update-orchestrator`), but the **single-project apply flow is duplicated in three places**: inline in `npm-update-patch`, inline in `npm-update-deep-patch`, and re-specified ("mirror npm-update-patch Step 5.5") inside the orchestrator. The orchestrator's own non-goals defer a shared `apply-npm-updates` skill *"until the deep variants land (third consumer)"* — that consumer is now. Extract once, then every remaining command (minor now; major/engines later) is a thin, level-parameterized wrapper. This change also adds a changelog-chronology section to the generated deep plan, so a reviewer sees the full version history of every bumped package in one place.

## What Changes

**Phase A — platform (behavior-preserving; output byte-equivalent to today's shipped patch commands):**

- **NEW shared skill `apply-npm-updates`** — the single-project apply mechanism, parameterized by `level`/`target`: override-registry consultation → ncu `package.json` bumps + `pnpm-workspace.yaml` catalog edits → single `<pm> install` → summary fragment.
- **Rewire** `npm-update-patch` (shallow apply) and `npm-update-deep-patch` (bumps mechanism) to **consume** `apply-npm-updates` instead of inlining it.
- **Rewire** `commander-update-orchestrator` (Steps 8 + 10) to **invoke** `apply-npm-updates` per project — passing the per-project resolved accepted set (`effectiveTarget` + override actions) — instead of re-specifying ncu inline.
- **NEW plan.md `## Changelogs` section** in `parallel-research-workflow` phase-4 synthesis (both single-project and cross-project modes → benefits existing deep-patch + new deep-minor + future levels). Packages **alphabetical**; within each, versions **ascending** (oldest→newest) so top→bottom reads as chronology advancing (opposite to repos). Each package block: repo/release **links first** (reused from cached `npm-changelog` metadata — `_meta.json.repository` / `changelogFiles` + per-version `{ver}.meta.json.sourceUrl`, **no re-fetch**), then full verbatim per-version bodies in collapsible `<details>`. `_no changelog available_` sentinel when absent.

**Phase B — minor column (thin wrappers on the now-factored flow):**

- **NEW** `/experiments:npm-update-minor` (MON-137) — shallow single-project; scan(minor) + `apply-npm-updates`(target=minor).
- **NEW** `/experiments:npm-update-deep-minor` (MON-146) — deep single-project; scan + group + workflow + `apply-npm-updates`.
- **NEW** `/experiments:commander-update-minor` (MON-195) — shallow cross-project; `orchestrator(level=minor, mode=shallow)`.
- **NEW** `/experiments:commander-update-deep-minor` (MON-200) — deep cross-project; `orchestrator(level=minor, mode=deep)`.

**Out of scope:** the `major`/`engines` rows (MON-201/MON-202) — non-`homónima` semantics (breaking changes, peer/engines handling), separate tickets — though they become trivial wrappers once this lands. No tests/lint/build, no commits/branches/PRs, no registry mutation. Manual verification only (mirrors the rest of the experiments plugin).

## Capabilities

### New Capabilities

- `npm-update-apply`: shared single-project apply skill (override → ncu/catalog → install → summary fragment). The deduplicated mechanism consumed by `npm-update-{patch,minor}` (shallow), `npm-update-deep-{patch,minor}` (bumps), and `commander-update-orchestrator` (per-project apply). Owns the apply requirements moved out of the three current sites.
- `npm-update-minor-command`: `/experiments:npm-update-minor` (MON-137).
- `npm-update-deep-minor-command`: `/experiments:npm-update-deep-minor` (MON-146).
- `commander-update-minor-command`: `/experiments:commander-update-minor` (MON-195).
- `commander-update-deep-minor-command`: `/experiments:commander-update-deep-minor` (MON-200).

### Modified Capabilities

- `parallel-research-workflow`: phase-4 plan.md gains the `## Changelogs` chronology section (both modes); the plan.md section enumeration is extended.
- `commander-update-orchestrator-skill`: per-project apply (Steps 8 + 10) now delegates to `npm-update-apply`; deep-mode plan.md section enumeration (Step 7.D) includes `Changelogs`. Observable output preserved.
- `npm-update-deep-patch-command`: bumps/apply mechanism delegates to `npm-update-apply`; the surfaced plan.md now includes `Changelogs`. Observable output preserved.
- `experiments-plugin`: the shallow `npm-update-patch` apply requirements refactor to delegate to `npm-update-apply`. Observable output preserved.

## Impact

- **Code** (`claude-plugins/experiments/`):
  - NEW `skills/apply-npm-updates/SKILL.md`.
  - NEW commands: `npm-update-minor.md`, `npm-update-deep-minor.md`, `commander-update-minor.md`, `commander-update-deep-minor.md`.
  - MODIFIED commands: `npm-update-patch.md`, `npm-update-deep-patch.md`.
  - MODIFIED skills: `commander-update-orchestrator/SKILL.md`, `parallel-research-workflow/SKILL.md`.
- **Regression surface**: shipped patch commands are refactored underneath. Mitigated by the byte-equivalence requirement on Phase A + a manual patch re-run before Phase B adds new commands.
- **Data**: reuses the existing shared `pkg-upgrade-overrides.yaml` (one file, not per-level) and the `npm-changelog` cache; no new data files.
- **No** dependency / CI / published-package impact (plugin-only; this plugin has no automated tests).
- **Linear**: closes MON-137, MON-146, MON-195, MON-200; unblocks the major/engines rows of MON-154.
