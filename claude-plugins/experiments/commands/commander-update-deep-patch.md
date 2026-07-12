---
description: Apply patch-level npm updates across every Commander-registered project with deep research — cross-project dossier, deduplicated changelog research, per-project changeset gate for improvements. Never commits/pushes/opens PRs autonomously.
---

# commander-update-deep-patch

Apply **patch-level** npm dependency updates across every project registered in the user-scoped Commander registry, in a single invocation, with deep research. Cross-project dossier, **research deduplicated by package** (not per project), one cross-project synthesis (by the workflow's synthesizer teammate, compliance-checked), sequential apply with a per-project failure gate, and a **per-project changeset gate** for improvements at apply time (apply teammate + orchestrator-owned approval — see the orchestrator's Step 10b, the single normative home for the gate semantics).

The command is a thin wrapper around the `commander-update-orchestrator` skill — every prompt, digest, summary, gate, and error message is produced by the skill (which composes `parallel-research-workflow` in cross-project mode for Step 6.5). The command's sole responsibility is to invoke the skill with the deep-patch input set and surface its output verbatim.

> Tip: pair with `/commander:list` (read-only registry render) before running this command if you want to inspect the current project set first.

## Invocation

```text
/experiments:commander-update-deep-patch
```

The command takes **no positional arguments and no flags**. The level and target are fixed at `patch`, `mode` is fixed at `deep`, and the override registry path defaults to the override file shipped with `scan-npm-updates`.

## Step 1 — Argument handling

1. Trim leading/trailing whitespace from `ARGUMENTS`.
2. If the trimmed string is empty: proceed silently to Step 2.
3. If non-empty: print exactly one line — `commander-update-deep-patch takes no arguments; ignoring: <verbatim trimmed argument string>` — then continue with Step 2 normally. Do NOT exit early.

CLI flags such as `--projects`, `--all`, `--level` are not recognized in v1 and SHALL be treated as stray arguments by the rule above (the orchestrator's interactive picker is the only project-selection surface in v1).

## Step 2 — Invoke the orchestrator

Invoke the `commander-update-orchestrator` skill via the `Skill` tool exactly **once** with these inputs:

- `level: "patch"`
- `target: "patch"`
- `mode: "deep"`
- `overrideRegistryPath`: omitted (the skill defaults to `claude-plugins/experiments/skills/scan-npm-updates/data/pkg-upgrade-overrides.yaml` — same as `/experiments:commander-update-patch`).
- `projectsFilter`: omitted (the skill raises the multi-select project picker).

The command MUST NOT:

- Override `level` or `target` to anything other than `patch`.
- Override `mode` to anything other than `"deep"`.
- Override `overrideRegistryPath`.
- Pass a `projectsFilter` (the skill's interactive picker is the only project-selection surface in v1).
- Wrap, intercept, or post-process the skill's output (prompts, dossier digest, summary, changeset-gate entry, error messages).
- Call `experiments:scan-npm-updates`, `experiments:group-packages-for-research`, `experiments:parallel-research-workflow`, `npm-check-updates`, or any package-manager command directly. Every action goes through the skill.

## Step 3 — Surface the skill's output verbatim

Every line the skill emits — including:

- the empty-registry message (`No projects registered. Use /commander:add to register one.`),
- the project picker (`AskUserQuestion` multi-select),
- the workflow's phase 0 stale-cleanup prompt (`delete-stale` / `keep-stale` / `cancel`),
- the per-batch progress messages from phase 1 changelog fetch,
- the workflow's phase 1 hard-wall fallback prompt and phase 3 integrity prompt (if triggered),
- the dossier gate rendering — `<plan-dir>/dossier.md` referenced by absolute path plus the bounded digest (bump-set table, bullet titles with `affects projects:` tags, skipped groups, section presence counts; never `## Changelogs` bodies),
- the conflict-policy prompt (when applicable),
- the override prompts (one per matched entry),
- the four-option deep gate (`apply-all` / `apply-bumps-only` / `pick-subset` / `cancel`),
- the optional isolation gate (`none` / `worktree` / `branch`, default `none`),
- the per-project apply digests during Step 10a (`ncu`/install output goes to on-disk logs; a bounded tail surfaces only on failure) and the per-project failure gate (stop vs continue),
- the per-project changeset gate round for Step 10b (changeset presented via the orchestrator's plan-mode review, or the `AskUserQuestion` fallback in non-interactive runtimes),
- the workflow's end-of-flow cleanup prompt (`delete-plan` / `keep-plan`) raised by Step 10c,
- the cross-project deep summary,
- every error or abort message,

— SHALL be surfaced verbatim. The command exits with the skill's exit code.

## Hard rules

Inherited from `commander-update-orchestrator` (deep mode) and `/experiments:npm-update-deep-patch` — those files are the normative home; the command preserves every one of them. Highlights:

- Never create commits, push, or open pull requests autonomously; stop for human-in-the-loop review before any such outward/VCS action. Branch/worktree isolation via `update-isolation` (the orchestrator's opt-in Step 9.5 gate, default `none`) is allowed.
- Never modify any file when the user selects `cancel` at the orchestrator's confirmation gate; on changeset-gate rejection no improvement edit is applied and already-applied bumps are preserved (`Improvements rejected at the changeset gate. No improvement edits applied; bumps are preserved.` surfaced verbatim).
- Never mutate `<HOME>/.claude/commander/projects.json` — the registry is read-only on this path. The on-disk file SHALL be byte-identical before and after every run (verifiable via `shasum`).
- Never mutate a consumer `package.json` entry that is a `catalog:` reference — only the catalog source file (`pnpm-workspace.yaml` for pnpm, the root `package.json` for Bun).
- Never auto-execute an override command without the user selecting `run-override` explicitly for that entry.
- Never run `ncu --upgrade` as a fallback after an override command fails.
- Never expand a changeset beyond bullets present in `dossier.md` (adjacent opportunities discovered during reconnaissance go to the summary's `Suggested next steps`, never silently into the changeset).

## Non-goals (deferred)

- `--projects a,b,c` flag and `--all` flag — the orchestrator's interactive picker is the v1 surface.
- Per-project parallel apply — sequential by design (see the `commander-update-orchestrator` skill).
- Auto-rollback on failure or of applied bumps when a changeset is rejected at the gate — bumps are preserved; user reviews `git diff` per project.
- Tests — manual verification only, mirroring the rest of the experiments plugin.
