---
description: Scan, fetch every patch changelog in parallel, research applicable improvements/workarounds against this codebase, then drive a user-gated apply step (dossier digest → bumps → changeset gate). Patch level only. Never commits/pushes/opens PRs autonomously.
---

# npm-update-deep-patch

The "deep" sibling of `/experiments:npm-update-patch`. Same scope (patch-level, semver-safe, manifest bumps + one install), but with research: every changelog is fetched in parallel by subagents via the `fetch-changelog` executable and cross-referenced against this codebase; a synthesizer teammate writes a single integrated `dossier.md` (improvements + workarounds-resolved-by-upgrade + bump set + script-assembled `## Changelogs` chronology); the user picks what to apply, and improvements land through the per-project changeset gate.

This command is a **thin parameterized entry point**: the full pipeline contract lives once in the `npm-update-deep-orchestrator` skill (shared steps + per-level delta table), so behavior cannot drift between levels.

## Execution

1. This command operates exclusively at **patch level**; ignore any user-supplied level argument.
2. Invoke the `experiments:npm-update-deep-orchestrator` skill via the `Skill` tool exactly **once** with `{ level: "patch" }`.
3. Surface every line the skill emits — prompts (stale-cleanup, integrity, execution prompt, isolation gate, changeset gate), the dossier digest, progress messages, summaries, and errors — verbatim, without wrapping or post-processing. Exit with the skill's exit code.

The command MUST NOT invoke `scan-npm-updates`, `group-packages-for-research`, `parallel-research-workflow`, `apply-npm-updates`, `npm-check-updates`, or any package-manager command directly — every action goes through the orchestrator skill.

## Hard rules

Inherited from `npm-update-deep-orchestrator` (see its "Hard rules" section — the single normative home). Highlights: no commits/pushes/PRs autonomously (branch/worktree isolation via `update-isolation` is permitted, opt-in, default `none`); nothing modified on `cancel`; no `catalog:` consumer mutation; NO override registry consultation (override flows belong to the shallow `/experiments:npm-update-patch`); the changeset gate never expands beyond bullets present in `dossier.md`.
