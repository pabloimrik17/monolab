---
description: Apply patch-level npm updates across every Commander-registered project with deep research — cross-project plan, deduplicated changelog research, unified plan-mode round for improvements. No tests, no commits.
---

# commander-update-deep-patch

Apply **patch-level** npm dependency updates across every project registered in the user-scoped Commander registry, in a single invocation, with deep research. Cross-project plan, **research deduplicated by package** (not per project), one cross-project synthesis, sequential apply with stop-on-fail, and one unified plan-mode round for improvements at apply time.

The command is a thin wrapper around the `commander-update-orchestrator` skill — every prompt, table, summary, plan-mode entry, and error message is produced by the skill (which composes `parallel-research-workflow` in cross-project mode for Step 6.5). The command's sole responsibility is to invoke the skill with the deep-patch input set and surface its output verbatim.

> Tip: pair with `/commander:list` (read-only registry render) before running this command if you want to inspect the current project set first.

## Invocation

```text
/experiments:commander-update-deep-patch
```

The command takes **no positional arguments and no flags**. The level and target are fixed at `patch`, `mode` is fixed at `deep`, and the override registry path defaults to the patch override file shipped with `scan-npm-updates`.

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
- Wrap, intercept, or post-process the skill's output (prompts, plan table, summary, plan-mode entry, error messages).
- Call `experiments:scan-npm-updates`, `experiments:group-packages-for-research`, `experiments:parallel-research-workflow`, `npm-check-updates`, or any package-manager command directly. Every action goes through the skill.

## Step 3 — Surface the skill's output verbatim

Every line the skill emits — including:

- the empty-registry message (`No projects registered. Use /commander:add to register one.`),
- the project picker (`AskUserQuestion` multi-select),
- the workflow's phase 0 stale-cleanup prompt (`delete-stale` / `keep-stale` / `cancel`),
- the per-batch progress messages from phase 1 changelog fetch,
- the workflow's phase 1 hard-wall fallback prompt (if triggered),
- the workflow's phase 3 integrity prompt (if triggered),
- the rendered cross-project `plan.md` content (improvements + workarounds + skipped + cross-project bump set),
- the conflict-policy prompt (when applicable),
- the override prompts (one per matched entry),
- the four-option deep gate (`apply-all` / `apply-bumps-only` / `pick-subset` / `cancel`),
- the optional isolation gate (`none` / `worktree` / `branch`, default `none`),
- the per-project `ncu` and `<pm> install` stdout/stderr during Step 10a,
- the `EnterPlanMode` document for Step 10b (when applicable),
- the workflow's end-of-flow cleanup prompt (`delete-plan` / `keep-plan`) raised by Step 10c,
- the cross-project deep summary,
- every error or abort message,

— SHALL be surfaced verbatim. The command exits with the skill's exit code.

## Hard rules

Inherited from `commander-update-orchestrator` (deep mode) and `/experiments:npm-update-deep-patch`. The command preserves every one of them:

- Never run tests, lint, or build at any point.
- Never create git commits or pull requests (or push). Branch/worktree isolation via `update-isolation` (the orchestrator's opt-in Step 9.5 gate, default `none`) is allowed.
- Never modify any file when the user selects `cancel` at the orchestrator's confirmation gate or rejects the plan-mode round at Step 10b.3.
- Never mutate `<HOME>/.claude/commander/projects.json` — the registry is read-only on this path. The on-disk file SHALL be byte-identical before and after every run (verifiable via `shasum`).
- Never mutate a consumer `package.json` entry that is a `catalog:` reference — only `pnpm-workspace.yaml` for those.
- Never auto-execute an override command without the user selecting `run-override` explicitly for that entry.
- Never run `ncu --upgrade` as a fallback after an override command fails.
- Never expand the plan-mode round's scope beyond bullets present in `plan.md` (adjacent opportunities discovered during reconnaissance go to the summary's `Suggested next steps`, never silently into the plan).

## Plan-mode round semantics (deep-specific)

When the gate option is `apply-all` and Step 10a (bumps loop) completes successfully for at least one project AND `plan.md` has at least one improvement bullet, Step 10b enters plan-mode ONCE with a unified document covering every (improvement bullet, applied project) pair:

- **Applicable** pairs are presented with concrete edits — absolute file path, short description, before/after snippet for non-trivial edits.
- **Inapplicable** pairs are presented with a one-sentence reason captured during reconnaissance (`Project uses Solid, not React; useTransition has no equivalent here.`).
- The plan-mode footer counts `applicable: <N>` / `inapplicable: <M>` so the user knows the breakdown before approving.

If the user **approves** the plan-mode round, edits land via `Edit` / `Write` across every applicable project; if they **reject**, bumps already applied in Step 10a are PRESERVED (no rollback) — only the improvement edits are skipped, and the summary surfaces `Improvements rejected at plan-mode review. No improvement edits applied; bumps are preserved.`

`apply-bumps-only` SKIPS Step 10b entirely (the summary's `Applied improvements` section is omitted). `pick-subset` accepts both improvement-bullet titles (case-insensitive substring match) AND package names (exact match) for fine-grained exclusion.

## Non-goals (deferred)

- `--projects a,b,c` flag — the orchestrator's interactive picker is the v1 surface. Add when a scripted caller appears.
- `--all` flag to skip the picker — the picker has an `all` option already; CLI sugar deferred.
- Per-project parallel apply — sequential by design (see orchestrator Decision 6 in `add-commander-update-deep-patch/design.md`).
- Auto-rollback on failure — not a goal; the summary partition (applied / failed / pending) is the recovery surface.
- Auto-rollback of applied bumps when the plan-mode round is rejected — bumps are preserved, user reviews `git diff` per project (same posture as single-project `/experiments:npm-update-deep-patch`).
- Tests — manual verification only, mirroring the rest of the experiments plugin. See the change's `tasks.md` for the matrix.
- `/experiments:commander-update-deep-engines` (MON-201) — a separate command (toolchain-engine bump, not an ncu level); this command is patch-only by contract. (`/experiments:commander-update-deep-{minor,major,engines}` now ship, see MON-200/MON-202/MON-201.)
