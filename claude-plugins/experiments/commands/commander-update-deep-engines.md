---
description: Bump the dev/runtime toolchain (Node + pnpm/npm/yarn/bun + Deno + Bun-runtime) across every Commander-registered project with deep research — cross-project dossier, engine release-note research deduplicated once per engine/version, a ## Breaking changes & migration section, per-project changeset gate for migration edits. Runtime upgrades may include breaking changes. Never commits/pushes/opens PRs autonomously. No PR partition.
---

# commander-update-deep-engines

Bump the **dev/runtime toolchain** (Node + the package manager + Deno + Bun-runtime) across every project registered in the user-scoped Commander registry, in a single invocation, with deep research. Cross-project dossier, **engine release-note research deduplicated once per engine/version** (not per project) and weighted toward breaking changes/migration, one cross-project synthesis (by the workflow's synthesizer teammate, compliance-checked), one resolved target per engine reused everywhere, sequential apply with a per-project failure gate, and a **per-project changeset gate** for migration + improvement edits at apply time (apply teammate + orchestrator-owned approval — see the orchestrator's Step 10b, the single normative home for the gate semantics). The engines sibling of `/experiments:commander-update-deep-major` and the cross-project counterpart of `/experiments:npm-update-deep-engines`.

> **Runtime/toolchain upgrades may include breaking changes.** The on-disk `dossier.md` carries a `## Breaking changes & migration` section (from engine release notes) and a `## Changelogs` section linking engine release notes; the surfaced digest references them by path. Review before applying. This command never commits or PRs.

There is **no `## PR plan`** — an engine bump is a single coordinated co-upgrade (Node + its PM, moved together), so `partition-breaking-changes` does not apply.

The command is a thin wrapper around the `commander-update-orchestrator` skill — every prompt, digest, summary, gate, and error message is produced by the skill (which composes `parallel-research-workflow` in cross-project mode at `level: "engines"`, routes scan/apply to the engine toolchain skills, and skips the override registry). The command's sole responsibility is to invoke the skill with the deep-engines input set and surface its output verbatim.

> Tip: pair with `/commander:list` (read-only registry render) before running this command if you want to inspect the current project set first.

## Invocation

```text
/experiments:commander-update-deep-engines
```

The command takes **no positional arguments and no flags**. The level and target are fixed at `engines`, and `mode` is fixed at `deep`.

## Step 1 — Argument handling

1. Trim leading/trailing whitespace from `ARGUMENTS`.
2. If the trimmed string is empty: proceed silently to Step 2.
3. If non-empty: print exactly one line — `commander-update-deep-engines takes no arguments; ignoring: <verbatim trimmed argument string>` — then continue with Step 2 normally. Do NOT exit early.

CLI flags such as `--projects`, `--all`, `--level` are not recognized in v1 and SHALL be treated as stray arguments by the rule above.

## Step 2 — Invoke the orchestrator

Invoke the `commander-update-orchestrator` skill via the `Skill` tool exactly **once** with these inputs:

- `level: "engines"`
- `target: "engines"`
- `mode: "deep"`
- `overrideRegistryPath`: omitted (irrelevant at engines level — the orchestrator skips override consultation).
- `projectsFilter`: omitted (the skill raises the multi-select project picker).

The command MUST NOT:

- Override `level` or `target` to anything other than `engines`.
- Override `mode` to anything other than `"deep"`.
- Pass a `projectsFilter` (the skill's interactive picker is the only project-selection surface in v1).
- Wrap, intercept, or post-process the skill's output (prompts, dossier digest, summary, changeset-gate entry, error messages).
- Call `detect-toolchain-surfaces`, `apply-engine-bumps`, `parallel-research-workflow`, `group-packages-for-research`, `scan-npm-updates`, `npm-check-updates`/`ncu`, or any package-manager command directly. Every action goes through the skill.

## Step 3 — Surface the skill's output verbatim

Every line the skill emits — including:

- the empty-registry message (`No projects registered. Use /commander:add to register one.`),
- the project picker (`AskUserQuestion` multi-select),
- the workflow's phase 0 stale-cleanup prompt (`delete-stale` / `keep-stale` / `cancel`),
- the per-batch progress messages from phase 1 engine release-note fetch,
- the workflow's phase 1 hard-wall fallback prompt and phase 3 integrity prompt (if triggered),
- the dossier gate rendering — `<plan-dir>/dossier.md` referenced by absolute path plus the bounded digest (breaking-change item titles, cross-project bump set, skipped groups, section presence counts; **no `## PR plan`**; never `## Changelogs` bodies),
- any ambiguity prompt,
- the four-option deep gate (`apply-all` / `apply-bumps-only` / `pick-subset` / `cancel`),
- the per-project apply digests during the bumps loop (output to on-disk logs; bounded tail only on failure) and the per-project failure gate (stop vs continue),
- the per-project changeset gate round (migration edits presented first, then improvements; changeset via the orchestrator's plan-mode review or the `AskUserQuestion` fallback in non-interactive runtimes),
- the workflow's end-of-flow cleanup prompt (`delete-plan` / `keep-plan`),
- the cross-project deep summary,
- every error or abort message,

— SHALL be surfaced verbatim. The command exits with the skill's exit code.

## Hard rules

Inherited from `commander-update-orchestrator` (deep mode) and `/experiments:npm-update-deep-engines` — those files are the normative home; the command preserves every one of them. Highlights:

- Never create commits, push, or open pull requests autonomously; stop for human-in-the-loop review before any such outward/VCS action. Branch/worktree isolation via `update-isolation` is permitted (opt-in; v1 cross-project caps at **one worktree per project** — there is no per-bucket matrix because there is no partition at engines level).
- Never modify any file when the user selects `cancel` at the orchestrator's confirmation gate; on changeset-gate rejection no migration edit is applied and already-applied bumps are preserved.
- Never mutate `<HOME>/.claude/commander/projects.json` — the registry is read-only on this path. The on-disk file SHALL be byte-identical before and after every run (verifiable via `shasum`).
- Never modify a publishable-library `engines.<engine>` **support range** — only runtime surfaces are pinned/aligned; `support`/`unknownSurfaces` loci are never touched.
- Never expand a changeset beyond items present in `dossier.md` (migration + improvement items; adjacent opportunities go to the summary's `Suggested next steps`).

## Non-goals (deferred)

- `--projects a,b,c` flag and `--all` flag — the orchestrator's interactive picker is the v1 surface.
- Per-project parallel apply — sequential by design.
- Auto-rollback on failure or of applied bumps when a changeset is rejected at the gate — bumps are preserved; user reviews `git diff` per project.
- `## PR plan` / per-bucket isolation — N/A at engines level (a single coordinated co-upgrade, not many independent packages).
- Tests — manual verification only, mirroring the rest of the experiments plugin.
