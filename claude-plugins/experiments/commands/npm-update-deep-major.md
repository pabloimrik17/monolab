---
description: Scan, fetch every major changelog in parallel, research breaking changes/migration + improvements against this codebase, partition into PR-sized buckets, then drive a user-gated apply step (dossier digest → bumps → changeset gate; optionally per-bucket worktrees). Major level only. Never commits/pushes/opens PRs autonomously.
---

# npm-update-deep-major

The "deep" sibling of `/experiments:npm-update-major`. Same scope (major-level, manifest bumps + one install), but with research weighted toward **breaking changes & migration** as first-class findings: every changelog is fetched in parallel by subagents via the `fetch-changelog` executable and cross-referenced against this codebase; a synthesizer teammate writes a single integrated `dossier.md` (`## Breaking changes & migration` first, then improvements, `## Major bump set`, and the script-assembled `## Changelogs` chronology). After research, the accepted set is partitioned into PR-sized buckets (`partition-breaking-changes` → `## PR plan`, a retained legacy section name) with optional per-bucket worktree isolation. Improvement AND migration edits land through the per-project changeset gate — never silently.

> **Major updates may include breaking changes.** This command bumps + installs, and (on `apply-all`) applies reviewed migration edits via the changeset gate. It never commits, pushes, or opens PRs autonomously.

This command is a **thin parameterized entry point**: the full pipeline contract lives once in the `npm-update-deep-orchestrator` skill (shared steps + per-level delta table — major's deltas: breaking-change research weighting, Step 4.5 PR partition, `per-bucket-worktree` isolation, migration items in the changeset gate), so behavior cannot drift between levels.

## Execution

1. This command operates exclusively at **major level**; ignore any user-supplied level argument.
2. Invoke the `experiments:npm-update-deep-orchestrator` skill via the `Skill` tool exactly **once** with `{ level: "major" }`.
3. Surface every line the skill emits — prompts (stale-cleanup, integrity, execution prompt, isolation gate, changeset gate), the dossier digest (including the `## PR plan` section with ordered buckets + count-by-policy summary), progress messages, summaries, and errors — verbatim, without wrapping or post-processing. Exit with the skill's exit code.

The command MUST NOT invoke `scan-npm-updates`, `group-packages-for-research`, `parallel-research-workflow`, `partition-breaking-changes`, `apply-npm-updates`, `npm-check-updates`, or any package-manager command directly — every action goes through the orchestrator skill.

## Hard rules

Inherited from `npm-update-deep-orchestrator` (see its "Hard rules" section — the single normative home). Highlights: no commits/pushes/PRs autonomously (branch/worktree isolation via `update-isolation` is permitted — including one worktree per PR-plan bucket — opt-in, default `none`); nothing modified on `cancel`; no `catalog:` consumer mutation; NO override registry consultation (override flows belong to the shallow `/experiments:npm-update-major`); the changeset gate never expands beyond bullets present in `dossier.md`; on gate rejection already-applied bumps are preserved (no rollback).
