## Why

The deep-update command family (`/experiments:npm-update-deep-{patch,minor,major,engines}` and the `commander-update-deep-*` cross-project siblings) is run rarely (quarterly) but must be highly reliable when it is. Real runs exhibit three recurring failures, all traceable to the pipeline being expressed as thousands of lines of prose an LLM must voluntarily obey:

- **P1 — Changelog research is skipped.** The changelog-fetch step is delegated as a prose instruction with no mechanical enforcement; nothing verifies changelogs were fetched or that the synthesized document contains its `## Changelogs` section. The reference command file (`npm-update-deep-patch.md`) never even mentions `## Changelogs`, while the copies that drifted from it do — so the defense lives in the wrong files.
- **P2 — The main window arrives full at the critical apply phase.** Verbatim `ncu`/install streaming, in-window plan synthesis that re-reads every research file, and in-window reconnaissance all land in the main conversation before the improvements-apply step — exactly where maximum rigor is needed. Worst in `commander-update-deep-*` (N projects).
- **P3 — Naming collides with Claude Code plan mode.** `plan.md`, the `plan-dir`, the `planning` phase and "plan-mode synthesis" all clash with the harness's native plan mode; one spec passage even instructs the agent to "enter plan mode and write plan.md", which is contradictory because plan mode is read-only.

## What Changes

- **Compliance-by-construction, not by prose.** Move every mechanically-checkable step out of prose and into deterministic scripts or schema-validated artifacts: changelog fetch becomes an executable that either runs or errors (killing P1 at the source); the `## Changelogs` chronology is assembled by a script from the on-disk cache (no agent re-types changelog bodies, removing both the P1 skip incentive and the largest P2 context sink).
- **Thin orchestrator + delegated authorship.** The main conversation only ever holds paths and small status digests. Global research is authored by a named teammate into a **dossier**; per-project apply plans are authored by per-project teammates into a **changeset**. A deterministic + fresh-eyes check validates the dossier against the changelog cache before it is shown to the user.
- **Context-clean apply gate.** Per project, a single teammate does reconnaissance and writes a `changeset.md` as its turn-1 task, then pauses at the turn boundary (verified: no source file touched). The human approval gate is authoritative and lives in the orchestrator. **BREAKING (behavioral):** verbatim `ncu`/install streaming into the main window is repealed in favor of on-disk logs + a digest (tail-on-failure only).
- **Glossary that kills the collision.** Three distinct artifacts get three distinct names: `dossier.md` (global research), `changeset.md` (per-project concrete edits), and Claude Code plan mode (the harness feature). No artifact is named `plan.md`; the internal phase is `synthesis`, not `planning`.
- **Command-family consolidation.** The 8 near-identical deep command files collapse to thin parameterized entry points plus one per-level delta table, eliminating the copy-drift class that produced the P1 defense living in the wrong file.
- **Grounded in verified primitives.** Two spikes were run live in the target runtime: Workflow-tool journal resume (unchanged prefix replays from cache), and the teammate apply gate (turn-boundary pause + deterministic pre-gate check + human approval + resume-to-apply). See `design.md`.

No autonomous commits, pushes, or PRs; changelog research via the `npm-changelog` cache; a single global deduplicated dossier — all preserved.

## Capabilities

### New Capabilities

None. All behavior lands under the existing `experiments-plugin` capability.

### Modified Capabilities

- `experiments-plugin`: Adds requirements governing the deep-update pipeline that were previously unspecified (changelog-fetch-as-script, script-assembled chronology, teammate dossier synthesis + compliance check, main-window context diet, per-project teammate apply gate, artifact glossary) and modifies the deep-command "file present" requirements to reflect the consolidated, parameterized command family.

## Impact

- **Plugin scripts (new tested surface):** `fetch-changelog`, chronology assembler, dossier compliance checker, semver max-wins/aggregation, subset validation, pre-gate source-untouched check. Node executables shipped with the plugin; need tests and a permission allowlist for network calls.
- **Skills modified:** `parallel-research-workflow` (fetch → script, synthesis → teammate + check, phase rename), `commander-update-orchestrator` (per-project teammate apply loop replacing in-main reconnaissance/plan mode), `apply-npm-updates` (repeal verbatim streaming; logs to disk).
- **Commands modified:** the 4 `npm-update-deep-*` and 4 `commander-update-deep-*` files consolidate to parameterized entries + a per-level delta table.
- **User-visible behavior change:** install/`ncu` output no longer scrolls in the main window (digest + tail-on-failure instead); the per-project apply gate is an explicit approval surfaced by the orchestrator.
- **No change** to: shallow `npm-update-*` commands, the override registry flow, the `npm-changelog` cache layout/contract, or the no-commit/no-PR hard rules.
