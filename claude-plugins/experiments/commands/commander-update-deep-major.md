---
description: Apply major-level npm updates across every Commander-registered project with deep research — cross-project plan, deduplicated changelog research weighted toward breaking changes/migration, a ## PR plan, and a unified plan-mode round for improvements + migration edits. Major updates may include breaking changes. No tests, no commits.
---

# commander-update-deep-major

Apply **major-level** npm dependency updates across every project registered in the user-scoped Commander registry, in a single invocation, with deep research. Cross-project plan, **research deduplicated by package** (not per project) and weighted toward breaking changes/migration, one cross-project synthesis, a `## PR plan`, sequential apply with stop-on-fail, and one unified plan-mode round for improvements + migration edits at apply time. The major sibling of `/experiments:commander-update-deep-minor`.

> **Major updates may include breaking changes.** The surfaced `plan.md` carries a `## Breaking changes & migration` section and a `## PR plan`; review them before applying. This command never commits or PRs.

The command is a thin wrapper around the `commander-update-orchestrator` skill — every prompt, table, summary, plan-mode entry, and error message is produced by the skill (which composes `parallel-research-workflow` in cross-project mode at `level: "major"`, and `partition-breaking-changes` for the `## PR plan`). The command's sole responsibility is to invoke the skill with the deep-major input set and surface its output verbatim.

> Tip: pair with `/experiments:commander-list` (read-only registry render) before running this command if you want to inspect the current project set first.

## Invocation

```text
/experiments:commander-update-deep-major
```

The command takes **no positional arguments and no flags**. The level and target are fixed at `major`, `mode` is fixed at `deep`, and the override registry path defaults to the override file shipped with `scan-npm-updates`.

## Step 1 — Argument handling

1. Trim leading/trailing whitespace from `ARGUMENTS`.
2. If the trimmed string is empty: proceed silently to Step 2.
3. If non-empty: print exactly one line — `commander-update-deep-major takes no arguments; ignoring: <verbatim trimmed argument string>` — then continue with Step 2 normally. Do NOT exit early.

CLI flags such as `--projects`, `--all`, `--level` are not recognized in v1 and SHALL be treated as stray arguments by the rule above (the orchestrator's interactive picker is the only project-selection surface in v1).

## Step 2 — Invoke the orchestrator

Invoke the `commander-update-orchestrator` skill via the `Skill` tool exactly **once** with these inputs:

- `level: "major"`
- `target: "major"`
- `mode: "deep"`
- `overrideRegistryPath`: omitted (the skill defaults to `claude-plugins/experiments/skills/scan-npm-updates/data/pkg-upgrade-overrides.yaml` — same as `/experiments:commander-update-major`).
- `projectsFilter`: omitted (the skill raises the multi-select project picker).

The command MUST NOT:

- Override `level` or `target` to anything other than `major`.
- Override `mode` to anything other than `"deep"`.
- Override `overrideRegistryPath`.
- Pass a `projectsFilter` (the skill's interactive picker is the only project-selection surface in v1).
- Wrap, intercept, or post-process the skill's output (prompts, plan table, summary, plan-mode entry, error messages).
- Call `experiments:scan-npm-updates`, `experiments:group-packages-for-research`, `experiments:parallel-research-workflow`, `experiments:partition-breaking-changes`, `npm-check-updates`, or any package-manager command directly. Every action goes through the skill.

## Step 3 — Surface the skill's output verbatim

Every line the skill emits — including:

- the empty-registry message (`No projects registered. Use /experiments:commander-add to register one.`),
- the project picker (`AskUserQuestion` multi-select),
- the workflow's phase 0 stale-cleanup prompt (`delete-stale` / `keep-stale` / `cancel`),
- the per-batch progress messages from phase 1 changelog fetch,
- the workflow's phase 1 hard-wall fallback prompt (if triggered),
- the workflow's phase 3 integrity prompt (if triggered),
- the rendered cross-project `plan.md` content (breaking changes & migration + improvements + workarounds + skipped + cross-project bump set + `## PR plan` + `## Changelogs`),
- the conflict-policy prompt (when applicable),
- the override prompts (one per matched entry),
- the four-option deep gate (`apply-all` / `apply-bumps-only` / `pick-subset` / `cancel`),
- the per-project `ncu` and `<pm> install` stdout/stderr during the bumps loop,
- the `EnterPlanMode` document for the cross-project improvements + migration round (when applicable),
- the workflow's end-of-flow cleanup prompt (`delete-plan` / `keep-plan`),
- the cross-project deep summary,
- every error or abort message,

— SHALL be surfaced verbatim. The command exits with the skill's exit code.

## Hard rules

Inherited from `commander-update-orchestrator` (deep mode) and `/experiments:npm-update-deep-major`. The command preserves every one of them:

- Never run tests, lint, or build at any point.
- Never create git commits or pull requests (or push). Branch/worktree isolation via `update-isolation` is permitted (opt-in; v1 cross-project caps at **one worktree per project** — per-(project,bucket) is deferred).
- Never modify any file when the user selects `cancel` at the orchestrator's confirmation gate or rejects the plan-mode round.
- Never mutate `<HOME>/.claude/commander/projects.json` — the registry is read-only on this path. The on-disk file SHALL be byte-identical before and after every run (verifiable via `shasum`).
- Never mutate a consumer `package.json` entry that is a `catalog:` reference — only `pnpm-workspace.yaml` for those.
- Never auto-execute an override command without the user selecting `run-override` explicitly for that entry.
- Never run `ncu --upgrade` as a fallback after an override command fails.
- Never expand the plan-mode round's scope beyond bullets present in `plan.md` (improvements + breaking-change/migration items; adjacent opportunities go to the summary's `Suggested next steps`).

## Plan-mode round semantics (deep-specific)

When the gate option is `apply-all` and the bumps loop completes successfully for at least one project AND `plan.md` has at least one improvement or breaking-change/migration bullet, the orchestrator enters plan-mode ONCE with a unified document covering every (bullet, applied project) pair:

- **Applicable** pairs are presented with concrete edits — absolute file path, short description, before/after snippet for non-trivial edits. Breaking-change/migration edits are presented first (they gate the upgrade), then improvements.
- **Inapplicable** pairs are presented with a one-sentence reason captured during reconnaissance.
- The plan-mode footer counts `applicable: <N>` / `inapplicable: <M>`.

If the user **approves**, edits land via `Edit` / `Write` across every applicable project; if they **reject**, bumps already applied are PRESERVED (no rollback) — only the improvement/migration edits are skipped, and the summary surfaces the rejection notice.

`apply-bumps-only` SKIPS the plan-mode round entirely. `pick-subset` accepts improvement/migration bullet titles (case-insensitive substring) AND package names (exact) for fine-grained exclusion.

## Cross-project PR plan & isolation (v1)

The surfaced `plan.md` includes the `## PR plan` section (from `partition-breaking-changes`) with the bucket count-by-policy summary so the user sees the proposed buckets. When isolation is opted into, v1 creates at most **one worktree per project** (the per-(project,bucket) matrix is deferred to a follow-up). The `## PR plan` remains advisory cross-project; per-bucket worktrees are a single-project surface (`/experiments:npm-update-deep-major`).

## Non-goals (deferred)

- `--projects a,b,c` flag — the orchestrator's interactive picker is the v1 surface. Add when a scripted caller appears.
- `--all` flag to skip the picker — the picker has an `all` option already; CLI sugar deferred.
- Per-project parallel apply — sequential by design (see the `commander-update-orchestrator` skill).
- One worktree per (project, bucket) cross-project — deferred (the N×M explosion); v1 caps at one worktree per project.
- Auto-rollback on failure or on plan-mode rejection — bumps are preserved; user reviews `git diff` per project.
- Tests — manual verification only, mirroring the rest of the experiments plugin. See the change's `tasks.md` for the matrix.
- `/experiments:commander-update-deep-engines` (MON-201) — a separate sub-issue, not part of this command.
