---
description: Apply major-level npm updates across every Commander-registered project with deep research — cross-project dossier weighted toward breaking changes/migration, a ## PR plan, per-project changeset gate for improvements + migration edits. Major updates may include breaking changes. Never commits/pushes/opens PRs autonomously.
---

# commander-update-deep-major

Apply **major-level** npm dependency updates across every project registered in the user-scoped Commander registry, in a single invocation, with deep research. Cross-project dossier, **research deduplicated by package** (not per project) and weighted toward breaking changes/migration, one cross-project synthesis (by the workflow's synthesizer teammate, compliance-checked), a `## PR plan` (retained legacy section name), sequential apply with a per-project failure gate, and a **per-project changeset gate** for improvements + migration edits at apply time (apply teammate + orchestrator-owned approval — see the orchestrator's Step 10b, the single normative home for the gate semantics). The major sibling of `/experiments:commander-update-deep-minor`.

> **Major updates may include breaking changes.** The on-disk `dossier.md` carries a `## Breaking changes & migration` section, the `## PR plan`, and the script-assembled `## Changelogs` chronology; the surfaced digest references them by path. Review before applying. This command never commits or PRs.

The command is a thin wrapper around the `commander-update-orchestrator` skill — every prompt, digest, summary, gate, and error message is produced by the skill (which composes `parallel-research-workflow` in cross-project mode at `level: "major"`, and `partition-breaking-changes` for the `## PR plan`). The command's sole responsibility is to invoke the skill with the deep-major input set and surface its output verbatim.

> Tip: pair with `/commander:list` (read-only registry render) before running this command if you want to inspect the current project set first.

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
- Wrap, intercept, or post-process the skill's output (prompts, dossier digest, summary, changeset-gate entry, error messages).
- Call `experiments:scan-npm-updates`, `experiments:group-packages-for-research`, `experiments:parallel-research-workflow`, `experiments:partition-breaking-changes`, `npm-check-updates`, or any package-manager command directly. Every action goes through the skill.

## Step 3 — Surface the skill's output verbatim

Every line the skill emits — including:

- the empty-registry message (`No projects registered. Use /commander:add to register one.`),
- the project picker (`AskUserQuestion` multi-select),
- the workflow's phase 0 stale-cleanup prompt (`delete-stale` / `keep-stale` / `cancel`),
- the per-batch progress messages from phase 1 changelog fetch,
- the workflow's phase 1 hard-wall fallback prompt and phase 3 integrity prompt (if triggered),
- the dossier gate rendering — `<plan-dir>/dossier.md` referenced by absolute path plus the bounded digest (breaking-change item titles, bump-set table, bullet titles with `affects projects:` tags, skipped groups, section presence counts, the appended `## PR plan` with count-by-policy summary; never `## Changelogs` bodies),
- the conflict-policy prompt (when applicable),
- the override prompts (one per matched entry),
- the four-option deep gate (`apply-all` / `apply-bumps-only` / `pick-subset` / `cancel`),
- the optional isolation gate (default `none`; v1 cross-project caps at one worktree per project),
- the per-project apply digests during the bumps loop (`ncu`/install output goes to on-disk logs; a bounded tail surfaces only on failure) and the per-project failure gate (stop vs continue),
- the per-project changeset gate round (migration edits presented first, then improvements; changeset via the orchestrator's plan-mode review or the `AskUserQuestion` fallback in non-interactive runtimes),
- the workflow's end-of-flow cleanup prompt (`delete-plan` / `keep-plan`),
- the cross-project deep summary,
- every error or abort message,

— SHALL be surfaced verbatim. The command exits with the skill's exit code.

## Hard rules

Inherited from `commander-update-orchestrator` (deep mode) and `/experiments:npm-update-deep-major` — those files are the normative home; the command preserves every one of them. Highlights:

- Never create commits, push, or open pull requests autonomously; stop for human-in-the-loop review before any such outward/VCS action. Branch/worktree isolation via `update-isolation` is permitted (opt-in; v1 cross-project caps at **one worktree per project** — per-(project,bucket) is deferred).
- Never modify any file when the user selects `cancel` at the orchestrator's confirmation gate; on changeset-gate rejection no improvement or migration edit is applied and already-applied bumps are preserved (rejection notice surfaced verbatim).
- Never mutate `<HOME>/.claude/commander/projects.json` — the registry is read-only on this path. The on-disk file SHALL be byte-identical before and after every run (verifiable via `shasum`).
- Never mutate a consumer `package.json` entry that is a `catalog:` reference — only the catalog source file (`pnpm-workspace.yaml` for pnpm, the root `package.json` for Bun).
- Never auto-execute an override command without the user selecting `run-override` explicitly for that entry.
- Never run `ncu --upgrade` as a fallback after an override command fails.
- Never expand a changeset beyond bullets present in `dossier.md` (improvements + breaking-change/migration items; adjacent opportunities go to the summary's `Suggested next steps`).

## Cross-project PR plan & isolation (v1)

The surfaced dossier digest includes the `## PR plan` section (from `partition-breaking-changes`; retained legacy section name) with the bucket count-by-policy summary so the user sees the proposed buckets. When isolation is opted into, v1 creates at most **one worktree per project** (the per-(project,bucket) matrix is deferred to a follow-up). The `## PR plan` remains advisory cross-project; per-bucket worktrees are a single-project surface (`/experiments:npm-update-deep-major`).

## Non-goals (deferred)

- `--projects a,b,c` flag and `--all` flag — the orchestrator's interactive picker is the v1 surface.
- Per-project parallel apply — sequential by design (see the `commander-update-orchestrator` skill).
- One worktree per (project, bucket) cross-project — deferred (the N×M explosion); v1 caps at one worktree per project.
- Auto-rollback on failure or of applied bumps when a changeset is rejected at the gate — bumps are preserved; user reviews `git diff` per project.
- Tests — manual verification only, mirroring the rest of the experiments plugin.
