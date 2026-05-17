## 1. Orchestrator skill — add `mode` input

- [x] 1.1 Add `mode` to the inputs table in `commander-update-orchestrator/SKILL.md`: `mode: "shallow" | "deep"`, optional, default `"shallow"`. Document the input validation: an unknown `mode` aborts with `Error: invalid mode "<value>". Expected shallow|deep.` before any side effect.
- [x] 1.2 Document the contract that the shallow path (`mode === "shallow"` or unset) is byte-equivalent to today — no behavior changes to project resolution, parallel scan, aggregation, version alignment, override registry, sequential apply, summary.
- [x] 1.3 Add `mode: "deep"` callouts to each step that diverges (Step 6.5 insertion, Step 7 plan shape, Step 9 gate option count, Step 10 plan-mode round, Step 11 summary additions).

## 2. Orchestrator skill — deep mode Step 6.5 (cross-project research)

- [x] 2.1 Document Step 6.5 "Cross-project research" between Step 6 (version alignment) and Step 7 (plan rendering) — fires only in deep mode.
- [x] 2.2 Specify: convert the post-alignment `CrossProjectPlan.packages` into the `ScanResult`-compatible shape required by `group-packages-for-research` (each occurrence becomes one `updates[]` record; deduplicated by `name` so the grouping skill sees one row per package, not N).
- [x] 2.3 Invoke `group-packages-for-research` with the deduplicated package set; capture the `groups[]` and `warnings[]` outputs; append the warnings to the running list for the summary.
- [x] 2.4 Build a `scanResult` value for the workflow input: a synthetic `ScanResult` constructed from the cross-project plan (package manager defaults to the union of project package managers — see Step 2.6).
- [x] 2.5 Invoke `parallel-research-workflow` with `{ groups, level, scanResult, mode: "cross-project", slugOverride: "commander-deep-<level>" }`. Capture the plan-dir path emitted by the workflow.
- [x] 2.6 Handle a "mixed package managers across projects" case: when projects in the run use different package managers (e.g. pnpm in proj-A, npm in proj-B), set the synthesized `scanResult.packageManager` to `"mixed"` and surface this in the run header / warnings. The workflow does not consume `packageManager` directly; this field is informational for downstream rendering.
- [x] 2.7 Document early-exit handling: if the workflow returns `Cancelled by stale-cleanup`, the orchestrator prints the cancellation message and exits before any apply (mirrors single-project deep-patch's Phase 0 short-circuit). If the workflow returns aborted at the integrity gate or the hard-wall fallback, the orchestrator preserves the plan-dir, surfaces the abort message, and skips Steps 7–11 with no file modifications.

## 3. Orchestrator skill — deep mode Step 7 (plan rendering)

- [x] 3.1 In deep mode, plan rendering reads `plan.md` from the plan-dir produced in Step 6.5 and surfaces its content as the run plan (improvements + workarounds + skipped + bump set).
- [x] 3.2 Override the bump-set table columns to `package | proposed target | projects (locations)` mirroring the shallow Step 7 table — the deep `plan.md` already uses this shape per the workflow's cross-project template.
- [x] 3.3 Append the existing `Warnings:`, `Skipped (scan-failed):`, `Skipped (path missing):` sections from the shallow plan to the deep plan output (these are orchestrator-owned, not workflow-owned).
- [x] 3.4 Empty-plan early exit: when `plan.md` reports zero bumps AND zero improvements AND zero workarounds, print `No <level> updates available across selected projects.` and exit `0`. The plan dir is preserved (the workflow's end-of-flow cleanup runs separately).

## 4. Orchestrator skill — Step 8 (overrides) unchanged in deep mode

- [x] 4.1 Document explicitly that Step 8 (override registry consultation, prompts, `OVERRIDE_RUN` / `OVERRIDE_SKIP` / `GENERIC` partitioning) is identical across modes. This is Decision 5 in `design.md`.
- [x] 4.2 Confirm the override registry path default is the same in both modes (`claude-plugins/experiments/skills/scan-npm-updates/data/pkg-upgrade-overrides.yaml`).

## 5. Orchestrator skill — Step 9 (confirmation gate) gains `apply-bumps-only`

- [x] 5.1 In deep mode, the confirmation gate offers four options: `apply-all`, `apply-bumps-only`, `pick-subset`, `cancel`. Shallow mode keeps the three-option gate (`apply-all`, `pick-subset`, `cancel`) unchanged.
- [x] 5.2 Document the `apply-bumps-only` semantics: equivalent to the shallow `apply-all` (per-project bumps + overrides + install) but skips Step 10's plan-mode improvements round entirely.
- [x] 5.3 Document `pick-subset` accepting both improvement bullets AND package names in deep mode (mirrors single-project deep-patch Step 6c). Shallow mode keeps the package-name-only `pick-subset` it has today.

## 6. Orchestrator skill — Step 10 (apply) split into bumps-loop + plan-mode round in deep mode

- [x] 6.1 In deep mode, Step 10 is split into Step 10a (bumps loop, same as shallow today) and Step 10b (cross-project plan-mode round, new). Stop-on-fail in Step 10a aborts BOTH 10a and 10b.
- [x] 6.2 Step 10a behavior: identical to shallow Step 10 (per-project ncu + catalog edits + override commands + install, sequential, stop-on-fail). Pending projects are recorded for the summary. Improvements are NOT applied during this phase.
- [x] 6.3 Step 10b fires only when (a) the gate option was `apply-all` (not `apply-bumps-only`), (b) Step 10a completed without failure for every applied project, and (c) `plan.md`'s improvements section has at least one bullet.
- [x] 6.4 Step 10b reconnaissance: for each improvement bullet, for each project in the bullet's `affects projects:` tag intersected with `applied projects`, the main agent reads the project's hinted areas and classifies the bullet as `applicable` (concrete edits) or `inapplicable` (with reason).
- [x] 6.5 Step 10b plan-mode entry: the main agent invokes `EnterPlanMode` with a unified plan-mode document listing `applicable: <N>` / `inapplicable: <M>` counts at the bottom and the per-(project, bullet) edits laid out in order — file path (absolute), short description, before/after snippet for non-trivial edits.
- [x] 6.6 Plan-mode review: approved → exit plan-mode, execute edits across projects via `Edit` / `Write`; rejected → print `Improvements rejected at plan-mode review. No improvement edits applied; bumps are preserved.` and continue to Step 11.
- [x] 6.7 Plan-mode hard rules: SHALL NOT expand scope beyond `plan.md` bullets; SHALL NOT execute tests / lint / build; SHALL NOT create commits or PRs. Adjacent opportunities discovered during reconnaissance go to the Step 11 summary's `Suggested next steps` list, never silently into the plan.

## 7. Orchestrator skill — Step 11 (summary) extends in deep mode

- [x] 7.1 Add deep-mode summary sections: `Applied improvements (<N>):` per (project, bullet) pair, `Skipped improvements (<M>):` per `pick-subset` exclusion or plan-mode rejection, `Inapplicable improvements (<K>):` per (project, bullet) marked inapplicable during reconnaissance.
- [x] 7.2 Document section gating: deep-mode sections render conditionally (omit when count is zero), except `Suggested next steps` which always renders.
- [x] 7.3 Update the H1 in deep mode: `## commander-update-deep-<level> summary` (vs shallow's `## commander-update-<level> summary`).
- [x] 7.4 Suggested next steps in deep mode include the existing three bullets (test suite, lint/typecheck, git diff + commit) plus an additional bullet `Review <plan-dir>/plan.md before re-running.` when the plan-dir was kept (delete-plan vs keep-plan recorded in the global `_meta.json` end-of-flow cleanup state).

## 8. parallel-research-workflow — add `mode` + `slugOverride` inputs

- [x] 8.1 Add `mode: "single-project" | "cross-project"` to the inputs table; default `"single-project"`. Validation: unknown value aborts with `Error: invalid mode "<value>". Expected single-project|cross-project.` before any side effect.
- [x] 8.2 Add `slugOverride: string` (optional in single-project mode, REQUIRED in cross-project mode). Validation: in cross-project mode, an absent or empty `slugOverride` aborts with `Error: slugOverride is required when mode is cross-project.`. In single-project mode, when set, `slugOverride` bypasses the CWD/`package.json` slug derivation.
- [x] 8.3 Document the contract that `mode: "single-project"` (default) is byte-equivalent to today — no behavior changes for `/experiments:npm-update-deep-patch`.
- [x] 8.4 Slug derivation in cross-project mode: use `slugOverride` verbatim (after applying the same sanitization as CWD-derived slugs: lowercase, replace `[^a-z0-9]+` with `-`, trim leading/trailing `-`, truncate to 40 chars). The unix-ts suffix and collision-suffix rules are unchanged.

## 9. parallel-research-workflow — cross-project subagent prompt template

- [x] 9.1 Document the cross-project subagent prompt template as a separate verbatim block from the single-project one. The template SHALL drop the `Codebase root: <CWD>` line.
- [x] 9.2 Replace phase-2 instructions: subagents produce `research.md` with `### Workarounds resolved (universal)` and `### Improvements applicable (universal)` headings; findings carry universal descriptions of what the version fixes / introduces, plus abstract hints (file globs by convention, framework names, idiomatic patterns).
- [x] 9.3 Hard rule: cross-project subagents SHALL NOT read any project codebase file. The skill enforces this in the prompt template by explicitly stating `You SHALL NOT use Read/Glob/Grep on any project source file. Findings are derived solely from the changelog.`.
- [x] 9.4 The `_no findings_` sentinel rule is unchanged.
- [x] 9.5 Effort allocation guideline in cross-project mode: ~80% on improvements, ~20% on workarounds (identical to single-project).

## 10. parallel-research-workflow — cross-project plan.md template

- [x] 10.1 H1 in cross-project mode: `# Deep-<level> plan (cross-project): <slug>`.
- [x] 10.2 `## Improvements (universal — applicability checked per project at apply time)` heading explicitly states the universal/per-project split.
- [x] 10.3 Each improvement bullet carries `(group: <groupId>; affects projects: <comma-separated project names>)`. The `affects projects` list is derived from the cross-project `scanResult`: for each package in the bullet, list every project whose `ScanResult.updates[]` includes the package.
- [x] 10.4 `## Workarounds resolved` follows the same per-bullet structure.
- [x] 10.5 `## Skipped or unavailable` section unchanged (per-group failure reasons).
- [x] 10.6 `## Cross-project bump set` table columns: `package | proposed target | projects (locations)`. The `projects (locations)` cell lists every (projectName, location) pair joined with `; ` between projects and `, ` between locations within a project.
- [x] 10.7 Empty-section rule: zero items still produces the heading with a single `_no improvements identified_` / `_no workarounds resolved_` / `_no skipped groups_` line.
- [x] 10.8 The four H2 sections appear in this exact order: `Improvements (universal — applicability checked per project at apply time)`, `Workarounds resolved`, `Skipped or unavailable`, `Cross-project bump set`.

## 11. parallel-research-workflow — global _meta.json gains `mode` field

- [x] 11.1 Add `mode: "single-project" | "cross-project"` to the global `_meta.json` schema (alongside `slug`, `planDirName`, `level`, `createdAt`, `phase`, `groupIds`). Backward-compat: existing `_meta.json` files without the field SHALL be read as `mode: "single-project"` (stale-cleanup pass classifies them by basename pattern, which is mode-aware via the slug prefix).
- [x] 11.2 Stale-cleanup phase 0 basename regex stays the same (`^[a-z0-9-]+-(patch|minor|major|engines)-\d+(-\d+)?$`). Cross-project plans match the same pattern (e.g. `commander-deep-patch-1715693231`).

## 12. parallel-research-workflow — phases 0, 1, 3, end-of-flow cleanup unchanged

- [x] 12.1 Document explicitly that phase 0 stale-cleanup, phase 1 batched dispatch + hard-wall fallback, phase 3 integrity gate + retry-failed semantics, and end-of-flow cleanup are identical across modes. The cross-project mode changes only the subagent prompt (phase 1 wording, phase 2 contract) and the plan.md template (phase 4).

## 13. New command file `commander-update-deep-patch.md`

- [x] 13.1 Create `claude-plugins/experiments/commands/commander-update-deep-patch.md` with YAML frontmatter (`description: <one-line>` mirroring `commander-update-patch.md`'s style; explicit "deep" callout + "no tests, no commits").
- [x] 13.2 Document the invocation contract: no positional args, no flags. `ARGUMENTS` handling prints `commander-update-deep-patch takes no arguments; ignoring: <verbatim>` when non-empty and continues.
- [x] 13.3 Invoke `commander-update-orchestrator` exactly once with `level: "patch"`, `target: "patch"`, `mode: "deep"`. The override registry path defaults to the patch override file (same as `commander-update-patch`); `projectsFilter` is omitted (skill's multi-select picker is the only project-selection surface in v1).
- [x] 13.4 Surface skill output verbatim — no wrapper messages, no extra prompts, no post-processing. The command exits with the skill's exit code.
- [x] 13.5 Document the hard rules inherited from the orchestrator + `npm-update-deep-patch`: never run tests / lint / build; never create commits, branches, PRs; never modify any file when the user selects `cancel`; never mutate `<HOME>/.claude/commander/projects.json`; never mutate consumer `package.json` `catalog:` references; never auto-execute an override without explicit `run-override`; never run `ncu --upgrade` as a fallback after an override fails.

## 14. Plugin metadata

- [x] 14.1 Add `commander-update-deep-patch.md` to `claude-plugins/experiments/README.md` under the appropriate section (mirroring the existing `commander-update-patch.md` listing's placement).
- [x] 14.2 Update the `experiments` plugin description / README block to mention the new command alongside its shallow sibling.
- [x] 14.3 Plugin version bump: deferred to release-please. The `feat(experiments): /experiments:commander-update-deep-patch command (MON-199)` commit message drives the bump on the next release-please PR. No manual edits to `plugin.json` / `package.json` / `marketplace.json`.

## 15. Manual verification (acceptance matrix)

- [ ] 15.1 NO registry file (`<HOME>/.claude/commander/projects.json` missing): run `/experiments:commander-update-deep-patch`. Expect empty-registry message; confirm no directory or file is created; confirm no plan-dir is created.
- [ ] 15.2 Empty `projects` object in the registry: same expectation as 15.1.
- [ ] 15.3 Registry version > 2: abort with `unsupported registry version: <n>`. No scan, no apply, no plan-dir.
- [ ] 15.4 Multi-project happy path (3 projects, ~10 unique packages with overlap): scan, group, research (universal-only), plan.md, gate, `apply-all`, bumps loop succeeds in every project, plan-mode round opens, reconnaissance produces applicable + inapplicable bullets, user approves, edits land, summary prints with `Applied projects`, `Applied improvements`, `Inapplicable improvements`, `Suggested next steps`.
- [ ] 15.5 Multi-project `apply-bumps-only`: same setup as 15.4, user picks `apply-bumps-only`. Expect bumps + overrides applied, NO plan-mode round, summary prints without `Applied improvements` section.
- [ ] 15.6 Multi-project `pick-subset` with mixed bumps + improvements: user excludes one package and one improvement bullet; expect both exclusions reflected in the apply + summary.
- [ ] 15.7 Multi-project `cancel`: no scan side effects beyond the plan-dir (which IS created by the workflow before the gate); plan-dir cleanup prompt at end of flow.
- [ ] 15.8 Multi-project plan-mode rejection: bumps land successfully; user rejects plan-mode; summary shows applied bumps + `Improvements rejected at plan-mode review.` + zero applied improvements.
- [ ] 15.9 Multi-project stop-on-fail during bumps: simulate ncu failure in project 2 of 3; verify project 1 is applied, project 2 is failed, project 3 is pending; plan-mode round does NOT fire; summary partitions correctly.
- [ ] 15.10 Conflict policy paths (`use-max-where-possible`, `per-project`, `skip-package`) covered in cross-project deep — same matrix as shallow; verify the prompt fires once for all conflicting packages.
- [ ] 15.11 Override registry paths (`run-override`, `skip-matched`, `force-generic`) covered in cross-project deep — same matrix as shallow; verify the override prompt fires once per matched entry across the run.
- [ ] 15.12 Missing path drift: one registered project's `path` no longer exists. Run produces `Skipped (path missing)` entry in the summary; the run proceeds with the remaining projects.
- [ ] 15.13 Scan-failed for one project: simulate `scan-npm-updates` precondition error in one project's agent. Verify that project is excluded from research + apply with a `Skipped (scan-failed)` entry; the rest of the run proceeds.
- [ ] 15.14 Stale plan-dir cleanup: pre-seed `~/.claude/experiments/plans/` with a >10-day-old `commander-deep-patch-*` dir; verify phase 0 prompt fires; verify `delete-stale` removes it.
- [ ] 15.15 Subagent dispatch hard-wall: simulate (or observe naturally) the hard-wall fallback in a batch with high group count; verify the degrade-to-main-agent option succeeds with the banner in plan.md.
- [ ] 15.16 Integrity gate retry: simulate one group failing phase 2 mid-write; verify the integrity prompt fires; verify `retry-failed` clean-retries the group; verify `continue-without` proceeds with the healthy subset and surfaces the failed group in `Skipped or unavailable`.
- [ ] 15.17 Registry byte-identity: capture `shasum` of `<HOME>/.claude/commander/projects.json` pre and post a full apply-all run; verify byte-identical.
- [ ] 15.18 Backward-compat: invoke `/experiments:commander-update-patch` (shallow) over the same registry as 15.4. Verify byte-equivalent output to the pre-MON-199 baseline (no deep-mode artifacts leak into the shallow path).
- [ ] 15.19 Backward-compat: invoke `/experiments:npm-update-deep-patch` (single-project) in one of the registered projects. Verify byte-equivalent output to the pre-MON-199 baseline (no cross-project mode leaks into single-project research).
- [ ] 15.20 Plan-dir layout verification: after a full run, confirm `~/.claude/experiments/plans/commander-deep-patch-<ts>/` contains `_meta.json` (with `mode: "cross-project"`), `scan-by-project.json` (with one ScanResult per project), `cross-project-plan.json` (with the aggregated post-alignment plan), `plan.md` (with cross-project structure), and `groups/<groupId>/{_meta.json,changelogs/...,research.md}` per group.
