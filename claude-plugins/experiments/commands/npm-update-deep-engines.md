---
description: Detect the dev/runtime toolchain (Node + pnpm/npm/yarn/bun + Deno + Bun-runtime), research engine release notes for breaking changes/migration, then pin + align every runtime surface and apply reviewed migration edits via the changeset gate. Engines level only. Never commits/pushes/opens PRs autonomously. A single coordinated co-upgrade — no PR partition.
---

# npm-update-deep-engines

The "deep" sibling of `/experiments:npm-update-engines`. Same scope (engines-level toolchain bump: detect → resolve → pin + align runtime surfaces), but with research weighted toward **breaking changes & migration** sourced from **engine release notes** (Node/pnpm/npm/yarn/Deno/Bun), fetched via the `fetch-changelog` executable's engine retrieval and deduplicated once per engine/version. A synthesizer teammate writes `dossier.md` (`## Breaking changes & migration` first, `## Engines bump set`, and a `## Changelogs` section linking engine release notes). Bumps apply via `apply-engine-bumps`; migration and improvement edits land through the per-project changeset gate. The deep single-project sibling of `/experiments:npm-update-deep-major`, at engines level.

> **Runtime/toolchain upgrades may include breaking changes.** This command pins runtime surfaces and (on `apply-all`) applies reviewed migration edits via the changeset gate. It never commits, pushes, or opens PRs autonomously.

There is **no `## PR plan` / partition** at engines level: an engine bump is a single coordinated co-upgrade (Node + its PM, moved together) — one bucket. This command is a **thin parameterized entry point**: the full pipeline contract lives once in the `npm-update-deep-orchestrator` skill (shared steps + per-level delta table — engines' deltas: `detect-toolchain-surfaces` scan, engine release-note research, `apply-engine-bumps` apply, no PR partition), so behavior cannot drift between levels.

## Execution

1. This command operates exclusively at **engines level**; ignore any user-supplied level argument.
2. Invoke the `experiments:npm-update-deep-orchestrator` skill via the `Skill` tool exactly **once** with `{ level: "engines" }`.
3. Surface every line the skill emits — prompts (stale-cleanup, integrity, execution prompt, isolation gate, changeset gate), the dossier digest, progress messages, summaries, and errors — verbatim, without wrapping or post-processing. Exit with the skill's exit code.

The command MUST NOT invoke `detect-toolchain-surfaces`, `apply-engine-bumps`, `group-packages-for-research`, `parallel-research-workflow`, `scan-npm-updates`, `apply-npm-updates`, `ncu`, or any package-manager command directly — every action goes through the orchestrator skill (which itself never touches `scan-npm-updates`/`apply-npm-updates`/`ncu` at engines level).

## Hard rules

Inherited from `npm-update-deep-orchestrator` (see its "Hard rules" section — the single normative home). Highlights: no commits/pushes/PRs autonomously (branch/worktree isolation via `update-isolation` is permitted, opt-in, default `none`, one workspace for the whole coordinated bump); nothing modified on `cancel`; never modify `support`/`unknownSurfaces` loci (publishable-library `engines.node` support ranges preserved); the changeset gate never expands beyond items present in `dossier.md`; on gate rejection already-applied bumps are preserved and no migration edit is applied; no `## PR plan` at engines level.
