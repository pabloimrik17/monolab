---
description: Bump the dev/runtime toolchain (Node + pnpm/npm/yarn/bun + Deno + Bun-runtime) across every Commander-registered project with deep research — cross-project plan, engine release-note research deduplicated once per engine/version, a ## Breaking changes & migration section, and a unified plan-mode round for migration edits. Runtime upgrades may include breaking changes. No tests, no commits. No PR partition.
---

# commander-update-deep-engines

Bump the **dev/runtime toolchain** (Node + the package manager + Deno + Bun-runtime) across every project registered in the user-scoped Commander registry, in a single invocation, with deep research. Cross-project plan, **engine release-note research deduplicated once per engine/version** (not per project) and weighted toward breaking changes/migration, one cross-project synthesis, one resolved target per engine reused everywhere, sequential apply with stop-on-fail, and one unified plan-mode round for migration + improvement edits at apply time. The engines sibling of `/experiments:commander-update-deep-major` and the cross-project counterpart of `/experiments:npm-update-deep-engines`.

> **Runtime/toolchain upgrades may include breaking changes.** The surfaced `plan.md` carries a `## Breaking changes & migration` section (from engine release notes) and a `## Changelogs` chronology section; review them before applying. This command never commits or PRs.

There is **no `## PR plan`** — an engine bump is a single coordinated co-upgrade (Node + its PM, moved together), so `partition-breaking-changes` does not apply.

The command is a thin wrapper around the `commander-update-orchestrator` skill — every prompt, table, summary, plan-mode entry, and error message is produced by the skill (which composes `parallel-research-workflow` in cross-project mode at `level: "engines"`, routes scan/apply to the engine toolchain skills, and skips the override registry). The command's sole responsibility is to invoke the skill with the deep-engines input set and surface its output verbatim.

> Tip: pair with `/experiments:commander-list` (read-only registry render) before running this command if you want to inspect the current project set first.

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
- Wrap, intercept, or post-process the skill's output (prompts, plan table, summary, plan-mode entry, error messages).
- Call `detect-toolchain-surfaces`, `apply-engine-bumps`, `parallel-research-workflow`, `group-packages-for-research`, `scan-npm-updates`, `npm-check-updates`/`ncu`, or any package-manager command directly. Every action goes through the skill.

## Step 3 — Surface the skill's output verbatim

Every line the skill emits — including:

- the empty-registry message (`No projects registered. Use /commander:add to register one.`),
- the project picker (`AskUserQuestion` multi-select),
- the workflow's phase 0 stale-cleanup prompt (`delete-stale` / `keep-stale` / `cancel`),
- the per-batch progress messages from phase 1 engine release-note fetch,
- the workflow's phase 1 hard-wall fallback prompt and phase 3 integrity prompt (if triggered),
- the rendered cross-project `plan.md` content (**`## Breaking changes & migration`** + improvements + workarounds + skipped + cross-project bump set + **`## Changelogs`**, and **no `## PR plan`**),
- any ambiguity prompt,
- the four-option deep gate (`apply-all` / `apply-bumps-only` / `pick-subset` / `cancel`),
- the per-project apply output during the bumps loop,
- the `EnterPlanMode` document for the cross-project migration + improvements round (when applicable),
- the workflow's end-of-flow cleanup prompt (`delete-plan` / `keep-plan`),
- the cross-project deep summary,
- every error or abort message,

— SHALL be surfaced verbatim. The command exits with the skill's exit code.

## Hard rules

Inherited from `commander-update-orchestrator` (deep mode) and `/experiments:npm-update-deep-engines`. The command preserves every one of them:

- Never run tests, lint, or build at any point.
- Never create git commits or pull requests (or push). Branch/worktree isolation via `update-isolation` is permitted (opt-in; v1 cross-project caps at **one worktree per project** — there is no per-bucket matrix because there is no partition at engines level).
- Never modify any file when the user selects `cancel` at the orchestrator's confirmation gate or rejects the plan-mode round.
- Never mutate `<HOME>/.claude/commander/projects.json` — the registry is read-only on this path. The on-disk file SHALL be byte-identical before and after every run (verifiable via `shasum`).
- Never modify a publishable-library `engines.<engine>` **support range** — only runtime surfaces are pinned/aligned.
- Never expand the plan-mode round's scope beyond bullets present in `plan.md` (migration + improvement items; adjacent opportunities go to the summary's `Suggested next steps`).

## Plan-mode round semantics (deep-specific)

When the gate option is `apply-all` and the bumps loop completes successfully for at least one project AND `plan.md` has at least one migration or improvement bullet, the orchestrator enters plan-mode ONCE with a unified document covering every (bullet, applied project) pair — migration edits presented first (they gate the upgrade), then improvements. On **approval**, edits land via `Edit`/`Write` across every applicable project; on **rejection**, bumps already applied are PRESERVED (no rollback) — only the migration/improvement edits are skipped, and the summary surfaces the rejection notice. `apply-bumps-only` skips the plan-mode round entirely.

## Non-goals (deferred)

- `--projects a,b,c` flag and `--all` flag — the orchestrator's interactive picker is the v1 surface.
- Per-project parallel apply — sequential by design.
- Auto-rollback on failure or on plan-mode rejection — bumps are preserved; user reviews `git diff` per project.
- `## PR plan` / per-bucket isolation — N/A at engines level (a single coordinated co-upgrade, not many independent packages).
- Tests — manual verification only. See the change's `tasks.md` for the matrix.
