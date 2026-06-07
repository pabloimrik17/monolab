---
description: Apply major-level npm updates across every project registered in the user-scoped Commander registry. Cross-project plan, deduplicated bumps, sequential apply with stop-on-fail. Reads ~/.claude/commander/projects.json; never mutates the registry. Major updates may include breaking changes. No tests, no commits.
---

# commander-update-major

Apply **major-level** npm dependency updates across every project registered in the user-scoped Commander registry, in a single invocation. Cross-project plan, deduplicated bumps, sequential apply with stop-on-fail. The major sibling of `/experiments:commander-update-minor`.

> **Major updates may include breaking changes.** This shallow command bumps + installs only; for researched migration guidance use `/experiments:commander-update-deep-major`.

The command is a thin wrapper around the `commander-update-orchestrator` skill — every prompt, table, summary, and error message is produced by the skill. The command's sole responsibility is to invoke the skill with the major-specific inputs and surface its output verbatim.

> Tip: pair with `/experiments:commander-list` (read-only registry render) before running this command if you want to inspect the current project set first.

## Invocation

```text
/experiments:commander-update-major
```

The command takes **no positional arguments and no flags**. The level and target are fixed at `major`; the override registry path defaults to the override file shipped with `scan-npm-updates`.

## Step 1 — Argument handling

1. Trim leading/trailing whitespace from `ARGUMENTS`.
2. If the trimmed string is empty: proceed silently to Step 2.
3. If non-empty: print exactly one line — `commander-update-major takes no arguments; ignoring: <verbatim trimmed argument string>` — then continue with Step 2 normally. Do NOT exit early.

## Step 2 — Invoke the orchestrator

Invoke the `commander-update-orchestrator` skill via the `Skill` tool exactly **once** with these inputs:

- `level: "major"`
- `target: "major"`
- `mode`: omitted (defaults to `shallow`)
- `overrideRegistryPath`: omitted (the skill defaults to `claude-plugins/experiments/skills/scan-npm-updates/data/pkg-upgrade-overrides.yaml`)
- `projectsFilter`: omitted (the skill raises the multi-select project picker)

The command MUST NOT:

- Override `level` or `target` to anything other than `major`.
- Set `mode` to `deep`.
- Override `overrideRegistryPath`.
- Pass a `projectsFilter` (the skill's interactive picker is the only project-selection surface in v1).
- Wrap, intercept, or post-process the skill's output (prompts, plan table, summary, error messages).
- Call `experiments:scan-npm-updates`, `npm-check-updates`, or any package-manager command directly. Every action goes through the skill.

## Step 3 — Surface the skill's output verbatim

Every line the skill emits — including:

- the empty-registry message (`No projects registered. Use /experiments:commander-add to register one.`),
- the project picker (`AskUserQuestion` multi-select),
- the plan table,
- the conflict-policy prompt (when applicable),
- the override prompts (one per matched entry),
- the apply-all / pick-subset / cancel prompt,
- the per-project `ncu` and `<pm> install` stdout/stderr,
- the cross-project summary,
- every error or abort message,

— SHALL be surfaced verbatim. The command exits with the skill's exit code.

## Hard rules

Inherited from `/experiments:npm-update-major` and the orchestrator. The command preserves every one of them:

- Never run tests, lint, or build.
- Never create commits or PRs (or push). Branch/worktree isolation via `update-isolation` is permitted (opt-in; default `none` = today's in-place behavior).
- Never modify any file when the user selects `cancel` at the orchestrator's confirmation gate.
- Never mutate `<HOME>/.claude/commander/projects.json` — the registry is read-only on this path. The on-disk file SHALL be byte-identical before and after every run (verifiable via `shasum`).
- Never mutate a consumer `package.json` entry that is a `catalog:` reference — only `pnpm-workspace.yaml` for those.
- Never auto-execute an override command without the user selecting `run-override` explicitly for that entry.
- Never run `ncu --upgrade` as a fallback after an override command fails.

## Non-goals (deferred)

- `--projects a,b,c` flag — the orchestrator's interactive picker is the v1 surface. Add when a scripted caller appears.
- `--all` flag to skip the picker — the picker has an `all` option already; CLI sugar deferred.
- Per-project parallel apply — sequential by design (see orchestrator Decision 2).
- Auto-rollback on failure — not a goal; the summary partition (applied / failed / pending) is the recovery surface.
- Tests — manual verification only, mirroring the rest of the experiments plugin. See the change's `tasks.md` for the matrix.
