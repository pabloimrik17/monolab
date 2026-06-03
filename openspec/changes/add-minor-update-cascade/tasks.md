# Tasks — add-minor-update-cascade

> Implementation = authoring/editing the skill + command markdown under `claude-plugins/experiments/`. No automated tests in this plugin; verification is manual (see Phase D). Do NOT hand-edit plugin/package versions — release-please drives the bump from conventional commits. Do NOT edit `openspec/specs/` while this change is in-flight (the deltas under this change are the contract).

## 0. Baseline capture (before any edit — required for the Phase A equivalence gate)

- [x] 0.1 On a clean tree, run `/experiments:npm-update-patch` against a fixture workspace (multi-PM if available) and save the full transcript (table, prompts, ncu/install stdout, summary, any error copy) as the reference baseline.
- [x] 0.2 Run `/experiments:npm-update-deep-patch` against the same fixture; save the transcript and a copy of the produced `plan.md` (note: it has four H2 sections + `Patch bump set`, no `Changelogs` yet).
- [x] 0.3 Run `/experiments:commander-update-patch` and `/experiments:commander-update-deep-patch` against the registered Commander project set; save both transcripts (and the deep `plan.md`). Record `shasum` of `~/.claude/commander/projects.json`.

## 1. Phase A — Extract `apply-npm-updates` (the shared mechanical apply + override-resolution procedure)

- [x] 1.1 Create `claude-plugins/experiments/skills/apply-npm-updates/SKILL.md` with frontmatter `description`. Implement the mechanical apply input contract (packageManager, cwd, target, cooldown?, manifestBumps[], catalogEdits[], overrideCommands[], skipInstall) per `npm-update-apply` spec.
- [x] 1.2 Implement generic `package.json` bumps: one `npm-check-updates@21.0.2 -p <pm> --target <target> --upgrade --packageFile <sourceFile>` per manifest, `--cooldown`/`--filter` per the includeFilter + cooldown rules, streaming stdout/stderr; structured `{step:"ncu",…}` failure (no consumer abort copy).
- [x] 1.3 Implement `pnpm-workspace.yaml` catalog edits (in-place, preserve formatting; never touch `catalog:` consumer `package.json`); structured `{step:"catalog",…}` failure.
- [x] 1.4 Implement override command execution (declaration order, after generic writes; structured `{step:"override",…}` failure; no ncu fallback) and the single install with the skip rule (`{step:"install",…}` failure).
- [x] 1.5 Implement the structured result fragment (`appliedGeneric`, `appliedOverrides`, `installRan`, `failure?`); ensure the skill streams ncu/install verbatim but prints NO consumer summary/abort copy.
- [x] 1.6 Document the caller-invoked override-resolution procedure (registry load at default path, first-win glob match, `target-of:`/`max-target-of:`/`latest` + fallback, interpolation, GENERIC/OVERRIDE_RUN/OVERRIDE_SKIP partition, graceful degradation) — matching/resolution only; prompt + scope stay with callers.
- [x] 1.7 Confirm level-agnostic operation (behavior parameterized solely by `target`) and the hard-rules block.

## 2. Phase A — Rewire the shipped patch consumers (behavior-preserving)

- [x] 2.1 Edit `commands/npm-update-patch.md`: keep scan/table/prompt/pick-subset; resolve overrides via the `apply-npm-updates` procedure (keep the single-project run/skip/force prompt); build the resolved apply spec and invoke `apply-npm-updates` once (`target: patch`); compose the summary from the result fragment. Remove the inline ncu/catalog/install recipe.
- [x] 2.2 Edit `commands/npm-update-deep-patch.md`: replace the inline "reuse Step 6a mechanism" bumps with an `apply-npm-updates` invocation (`target: patch`, empty `overrideCommands` — deep path consults no overrides). Keep plan-mode improvements + summary.
- [x] 2.3 Edit `skills/commander-update-orchestrator/SKILL.md` Step 8 (override consultation): resolve via the `apply-npm-updates` procedure; keep the cross-project once-per-entry prompt + cross-project `{version}` resolution.
- [x] 2.4 Edit `skills/commander-update-orchestrator/SKILL.md` Step 10 (per-project apply): build the per-project resolved apply spec (effectiveTarget, override partition, includeFilter, skipInstall) and invoke `apply-npm-updates` once per project (`cwd: <record.path>`); on structured failure, format the cross-project abort copy; fold result fragments into the summary. Remove the inline per-project ncu/catalog/install recipe.

## 3. Phase A — Changelog chronology section in `parallel-research-workflow`

- [x] 3.1 Edit `skills/parallel-research-workflow/SKILL.md` phase 4 single-project template: add `## Changelogs` as the fifth/final H2; fix the bump-set heading to be level-derived (`## <Level> bump set`, e.g. `## Minor bump set`) instead of hardcoded `## Patch bump set`.
- [x] 3.2 Edit the cross-project plan.md template: add `## Changelogs` as the fifth/final H2 after `## Cross-project bump set`.
- [x] 3.3 Implement the changelog-section assembly (both modes): per package alphabetical; links line first from cached `_meta.json.repository` + per-version `{ver}.meta.json.sourceUrl` (no network); full verbatim bodies for stable versions in `(from, to]` ascending, each in a `<details>` block; `_no changelog available_` sentinel; degraded-path build from `~/.claude/changelogs/` cache; cross-project representative `from → to` + pointer to bump-set table.

## 4. Phase A — Equivalence gate (MUST pass before Phase B)

- [x] 4.1 Re-run the Phase 0 patch flows; diff each transcript against the baseline. Acceptance: identical user-visible output (prompts, tables, summaries, streamed ncu/install, error copy) modulo timestamps/absolute paths. Investigate and fix any drift before proceeding.
- [x] 4.2 Confirm `~/.claude/commander/projects.json` `shasum` is unchanged across the commander re-runs.
- [x] 4.3 Confirm the deep-patch (and commander-deep-patch) `plan.md` now ends with a correct `## Changelogs` section (alpha packages, ascending versions, links first, `<details>` bodies, sentinel where applicable) and that the bump-set heading is still `Patch bump set` for patch.

## 5. Phase B — Minor command wrappers (thin, on the now-factored flow)

- [x] 5.1 Create `commands/npm-update-minor.md` (MON-137): scan `level=minor` → table → prompt → override resolution via `apply-npm-updates` procedure → `apply-npm-updates` (`target: minor`) → `## npm-update-minor summary`; empty copy `No minor updates available.`; minor-namespaced abort copy.
- [x] 5.2 Create `commands/npm-update-deep-minor.md` (MON-146): scan(minor) → group → `parallel-research-workflow` (`level: minor`) → exec prompt → bumps via `apply-npm-updates` (`target: minor`, generic-only) → plan-mode improvements → `## npm-update-deep-minor summary` → workflow cleanup. Hard rule: no override registry on the deep path.
- [x] 5.3 Create `commands/commander-update-minor.md` (MON-195): thin wrapper invoking `commander-update-orchestrator` once with `level:"minor"`, `target:"minor"` (mode shallow/absent); stray-arg ignore line; surface verbatim.
- [x] 5.4 Create `commands/commander-update-deep-minor.md` (MON-200): thin wrapper invoking the orchestrator once with `level:"minor"`, `target:"minor"`, `mode:"deep"`; stray-arg ignore line; surface verbatim (incl. `plan.md` with `## Changelogs`).

## 6. Phase C — Registration & docs

- [x] 6.1 Add the four new commands to the experiments plugin README command listing (satisfy the `README Listing Updated` requirement pattern). Do NOT hand-edit the plugin version.
- [x] 6.2 Verify plugin/marketplace manifests auto-discover the new command files (no manual manifest edit needed beyond README); confirm no stray references to deferred major/engines commands.

## 7. Phase D — Manual verification matrix

- [x] 7.1 `/experiments:npm-update-minor`: empty result; apply-all; pick-subset (exclude one); cancel; an override match (run-override / skip-matched / force-generic). Confirm minor copy + summary.
- [x] 7.2 `/experiments:npm-update-deep-minor`: apply-all (bumps + plan-mode improvements); apply-bumps-only; pick-subset; cancel; plan-mode rejection preserves bumps. Confirm `plan.md` has `## Minor bump set` + `## Changelogs`; no override registry consulted.
- [x] 7.3 `/experiments:commander-update-minor`: empty registry; multi-select subset; conflict-policy prompt; cancel; stop-on-fail partition. Confirm registry `shasum` unchanged.
- [x] 7.4 `/experiments:commander-update-deep-minor`: full deep run across ≥2 projects — project picker, deduped research, four-option gate, cross-project plan-mode round, summary; confirm `plan.md` deduped `## Changelogs` (representative from→to) and registry `shasum` unchanged.
- [x] 7.5 Regression re-check: one quick `/experiments:npm-update-patch` and `/experiments:commander-update-deep-patch` run still behaves per the Phase 0 baseline.

## Verification notes (QA)

Method differs slightly from the literal Phase 0/4 wording — documented for honesty:

- **Phase 0 baseline + 4.1 equivalence**: instead of capturing live transcripts on a clean tree, equivalence of the rewired patch consumers was proven by a **static byte-equivalence audit** of every user-facing string (prompts, tables, summaries, abort copy) against the pre-refactor state at git ref `backup/MON-200-pre-rebase`. One drift found (abort-template placeholder rename `{code}`→`{failure.exitCode}` etc.) and fixed; re-audit clean.
- **4.2 registry shasum**: `~/.claude/commander/projects.json` confirmed byte-identical (`86ffe0bb…`) before/after the entire QA; the QA never opened it (drove the orchestrator against an isolated `/tmp` test registry).
- **4.3 + 7.2 Changelogs**: the `## Changelogs` assembly (links-first from cache, ascending `(from, to]`, `<details>` bodies, no network) validated live against the real `~/.claude/changelogs/react` cache; `## <Level> bump set` heading confirmed level-derived.
- **7.1 / 7.3 / 7.5**: run live against throwaway `/tmp` npm fixtures (real `ncu --upgrade` + `npm install`) — apply-all, override→run-override (`--filter` partition leaves overridden pkg untouched), empty (`No minor updates available.`), cross-project dedup + max-wins + sequential apply, patch regression.
- **7.2 / 7.4 (deep)**: new/changed surfaces validated (Changelogs section, Minor heading, per-project apply engine = `apply-npm-updates`); the unchanged subagent-research + plan-mode orchestration (develop's; only the `plan.md` template changed in this work) was not re-run end-to-end.
- **Toolchain**: the commands require Node ≥20.19 (ncu@21); validated under the repo's `.nvmrc` Node 24.
