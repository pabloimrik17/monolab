---
description: Bump the dev/runtime toolchain (Node + pnpm/npm/yarn/bun + Deno + Bun-runtime) across every project registered in the user-scoped Commander registry. Cross-project plan, one resolved target per engine reused everywhere, sequential apply with stop-on-fail. Reads ~/.claude/commander/projects.json; never mutates the registry. Runtime upgrades may include breaking changes. No tests, no commits.
---

# commander-update-engines

Bump the **dev/runtime toolchain** (Node + the package manager + Deno + Bun-runtime) across every project registered in the user-scoped Commander registry, in a single invocation. Cross-project plan, **one resolved target per engine** (Node→latest LTS, others→latest) reused for every project, sequential apply with stop-on-fail. The engines sibling of `/experiments:commander-update-major`.

> **Runtime/toolchain upgrades may include breaking changes.** This shallow command detects + pins runtime surfaces only; for researched migration guidance use `/experiments:commander-update-deep-engines`.

The command is a thin wrapper around the `commander-update-orchestrator` skill — every prompt, table, summary, and error message is produced by the skill (which routes `level=engines` to `detect-toolchain-surfaces` + `apply-engine-bumps`, aligns cross-project on the engine version, and skips the override registry). The command's sole responsibility is to invoke the skill with the engines-specific inputs and surface its output verbatim.

> Tip: pair with `/experiments:commander-list` (read-only registry render) before running this command if you want to inspect the current project set first.

## Invocation

```text
/experiments:commander-update-engines
```

The command takes **no positional arguments and no flags**. The level and target are fixed at `engines`.

## Step 1 — Argument handling

1. Trim leading/trailing whitespace from `ARGUMENTS`.
2. If the trimmed string is empty: proceed silently to Step 2.
3. If non-empty: print exactly one line — `commander-update-engines takes no arguments; ignoring: <verbatim trimmed argument string>` — then continue with Step 2 normally. Do NOT exit early.

## Step 2 — Invoke the orchestrator

Invoke the `commander-update-orchestrator` skill via the `Skill` tool exactly **once** with these inputs:

- `level: "engines"`
- `target: "engines"`
- `mode`: omitted (defaults to `shallow`)
- `overrideRegistryPath`: omitted (irrelevant at engines level — the orchestrator skips override consultation)
- `projectsFilter`: omitted (the skill raises the multi-select project picker)

The command MUST NOT:

- Override `level` or `target` to anything other than `engines`.
- Set `mode` to `deep`.
- Pass a `projectsFilter` (the skill's interactive picker is the only project-selection surface in v1).
- Wrap, intercept, or post-process the skill's output (prompts, plan table, summary, error messages).
- Call `detect-toolchain-surfaces`, `apply-engine-bumps`, `scan-npm-updates`, `npm-check-updates`/`ncu`, or any package-manager command directly. Every action goes through the skill.

## Step 3 — Surface the skill's output verbatim

Every line the skill emits — the empty-registry message, the project picker, the detected-surfaces plan, the apply-all / pick-subset / cancel prompt, any ambiguity prompt, the per-project apply output, the cross-project summary, and every error or abort message — SHALL be surfaced verbatim. The command exits with the skill's exit code.

## Hard rules

Inherited from `commander-update-orchestrator` and `/experiments:npm-update-engines`. The command preserves every one of them:

- Never run tests, lint, or build.
- Never create commits or PRs (or push). Branch/worktree isolation via `update-isolation` is permitted (opt-in; default `none` = today's in-place behavior).
- Never modify any file when the user selects `cancel` at the orchestrator's confirmation gate.
- Never mutate `<HOME>/.claude/commander/projects.json` — the registry is read-only on this path. The on-disk file SHALL be byte-identical before and after every run (verifiable via `shasum`).
- Never modify a publishable-library `engines.<engine>` **support range** — only runtime surfaces are pinned/aligned (the orchestrator's `apply-engine-bumps` leaves `support` and `unknownSurfaces` loci untouched).

## Non-goals (deferred)

- `--projects a,b,c` flag — the orchestrator's interactive picker is the v1 surface.
- `--all` flag to skip the picker — the picker has an `all` option already.
- Per-project parallel apply — sequential by design.
- Auto-rollback on failure — the summary partition (applied / failed / pending) is the recovery surface.
- Tests — manual verification only. See the change's `tasks.md` for the matrix.
