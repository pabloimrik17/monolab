# Experiments Plugin

Beta skills and commands staging area for monolab. Features here are experimental and may graduate to production plugins once stable.

## Commands

> **Commander CRUD has graduated.** `/commander:add`, `/commander:list`, `/commander:update`, `/commander:delete` and the `commander-normalize` skill now live in their own plugin — see [`claude-plugins/commander/README.md`](../commander/README.md). The orchestration commands below remain here.

### `/experiments:commander-update-patch`

Apply patch-level npm updates across every project registered in the Commander registry, in one invocation. Reads `~/.claude/commander/projects.json` (never mutates it), raises a multi-select project picker, dispatches parallel scans via Haiku subagents (one per project), deduplicates updates by package, applies max-wins version alignment with a single conflict-policy prompt when ranges disagree, consults the same `pkg-upgrade-overrides.yaml` registry as `npm-update-patch` (one prompt per matched entry across the whole run), and applies projects sequentially with stop-on-fail. Inherits every `npm-update-patch` hard rule: no tests, no lint, no build, no commits.

```bash
/experiments:commander-update-patch
```

The summary partitions the resolved set into applied / failed / pending so a partial-failure run can be resumed by re-invoking the command after fixing the failed project.

### `/experiments:commander-update-minor`

Minor sibling of `/experiments:commander-update-patch` — identical cross-project flow (registry-driven project picker, parallel Haiku scans, dedup, max-wins alignment with the conflict-policy prompt, override consultation once per matched entry, sequential apply with stop-on-fail), only the level/target are `minor`. Thin wrapper over `commander-update-orchestrator` (`level: "minor"`, `target: "minor"`, shallow). Inherits every `npm-update-minor` hard rule: no tests, no lint, no build, no commits, never mutates the registry.

```bash
/experiments:commander-update-minor
```

### `/experiments:commander-update-deep-patch`

Deep sibling of `/experiments:commander-update-patch`. Same scope (patch-level, cross-project plan, sequential apply with stop-on-fail) plus **research deduplicated by package**: every patch changelog is fetched once across the run (no per-project duplication), subagents produce universal findings only (no codebase cross-reference — that happens at apply time), and after the bumps loop the main agent enters plan mode ONCE with a unified document of (improvement, project) pairs spanning every applied project. Gate options expand to four: `apply-all` / `apply-bumps-only` / `pick-subset` / `cancel`. Plan dirs live under `~/.claude/experiments/plans/commander-deep-patch-<unix-ts>/` and inherit the workflow's 10-day stale-cleanup. Inherits every hard rule from the shallow command plus `npm-update-deep-patch` — no tests, no lint, no build, no commits, never mutates the registry, never auto-executes an override.

```bash
/experiments:commander-update-deep-patch
```

### `/experiments:commander-update-deep-minor`

Minor sibling of `/experiments:commander-update-deep-patch` — identical deep cross-project flow (research deduplicated by package, universal-only findings, four-option gate `apply-all` / `apply-bumps-only` / `pick-subset` / `cancel`, one unified cross-project plan-mode round for improvements after the bumps loop), only the level/target are `minor`. Thin wrapper over `commander-update-orchestrator` (`level: "minor"`, `target: "minor"`, `mode: "deep"`). The surfaced `plan.md` ends with the `## Changelogs` chronology section. Plan dirs live under `~/.claude/experiments/plans/commander-deep-minor-<unix-ts>/` with the 10-day stale-cleanup. Inherits every hard rule from the shallow command plus `npm-update-deep-minor` — no tests, no lint, no build, no commits, never mutates the registry, never auto-executes an override.

```bash
/experiments:commander-update-deep-minor
```

### `/experiments:ralph`

Generate Ralph loop infrastructure from a project description for autonomous AI coding.

```bash
/experiments:ralph "Build auth system with login and logout"
```

Creates 5 files in the current directory:

- `prd.json` - PRD items extracted from description
- `progress.txt` - Iteration tracking file
- `PROMPT.md` - Prompt template with @-references
- `ralph-once.sh` - Single iteration script (HITL)
- `ralph.sh` - Autonomous loop script (AFK)

**Requirements:** Docker Desktop 4.58+ with Docker Sandbox

### `/experiments:hello-experiments`

Explains the purpose of this plugin and lists any experimental features currently available.

### `/experiments:npm-update-deep-patch`

Same scope as `npm-update-patch` (patch-level, semver-safe, manifest bump + one install) but with **research**: every changelog is fetched in parallel by subagents who cross-reference it against this codebase, then the main agent enters plan mode and synthesizes a single integrated `plan.md` of (a) applicable improvements and (b) workarounds-resolved-by-upgrade, plus the bump set. The user picks `apply-all` / `apply-bumps-only` / `pick-subset` / `cancel`. Plan dir lives under `~/.claude/experiments/plans/` with stale-cleanup (>10 days) prompted on each invocation. Never runs tests, lint, build, or commits.

```bash
/experiments:npm-update-deep-patch
```

### `/experiments:npm-update-deep-minor`

Minor sibling of `/experiments:npm-update-deep-patch` — same deep single-project flow (parallel changelog research, plan-mode synthesis, `apply-all` / `apply-bumps-only` / `pick-subset` / `cancel` gate), only the level differs. Scans at `level=minor`, runs `parallel-research-workflow` at `level: "minor"`, and applies bumps via the shared `apply-npm-updates` skill (generic-only — the deep path consults no override registry). The synthesized `plan.md` carries a `## Minor bump set` table and a final `## Changelogs` chronology section. Never runs tests, lint, build, or commits.

```bash
/experiments:npm-update-deep-minor
```

### `/experiments:npm-update-patch`

Scan the current project for patch-level npm updates and interactively apply the subset you accept. Works on pnpm/npm/yarn/bun/deno, single-repo or workspace; treats pnpm `catalog:` entries as first-class. Bumps `package.json` manifests via a single `ncu --upgrade` per file (prefix- and format-preserving), edits `pnpm-workspace.yaml#catalog` in-memory, and runs one final install unless all accepted updates were handled via `run-override`. Never runs tests, lint, or commits.

When the accepted set contains packages that ship their own upgrade command (e.g. Storybook), the command consults a **package upgrade override registry** and asks per matched family whether to run the override, skip it, or fall through to the generic flow.

```bash
/experiments:npm-update-patch
```

**Extending the override registry.** Entries live in [`skills/scan-npm-updates/data/pkg-upgrade-overrides.yaml`](./skills/scan-npm-updates/data/pkg-upgrade-overrides.yaml). Append an entry (fields: `id`, `matches`, `command`, `versionSource`, optional `fallbackVersionSource` / `reference` / `notes`) and the command picks it up on the next invocation — no logic change required. The file comment block documents each field.

Tip: pair with `/experiments:npm-changelog <pkg> <from>..<to>` before accepting if you want to skim the changelog for any listed patch.

### `/experiments:npm-update-minor`

Minor sibling of `/experiments:npm-update-patch` — same shallow single-project flow (scan → table → `apply-all` / `pick-subset` / `cancel`, override-registry consultation per matched family), only the level differs. Scans at `level=minor` and applies the accepted set via the shared `apply-npm-updates` skill (`target: minor`): one `ncu --upgrade` per `package.json`, in-memory `pnpm-workspace.yaml#catalog` edits, one final install. Never runs tests, lint, build, or commits.

```bash
/experiments:npm-update-minor
```

### `/experiments:npm-changelog`

Retrieve, cache, and verify changelogs for any npm package across a version range. Caches under `~/.claude/changelogs/` and only re-fetches when SHA256 verification fails or TTL expires — repeated queries are effectively free.

```bash
/experiments:npm-changelog react 18.0.0..19.0.0
/experiments:npm-changelog @tanstack/query-core 5.90.0..5.90.20
/experiments:npm-changelog @angular/core latest
```

Monorepo-aware: when `repository.directory` is present in npm metadata, the command probes `{directory}/CHANGELOG.md` first, then falls back to the repo root, then to scoped GitHub release tags (`@scope/pkg@{version}`, `{packageBasename}@{version}`, hyphenated variants). The discovered `tagFormat` is cached per-package for subsequent versions.

Authoritative spec: `openspec/specs/npm-changelog-retrieval/spec.md`.

## Skills

### `skills-update-check`

Checks for updates to globally-installed skills.sh skills once per session. Detects the project's package runner, runs `skills check -g`, and offers to apply updates if available.

### `scan-npm-updates`

Shared scan backend used by `/experiments:npm-update-{patch,minor}` (and by future `npm-update-major`/`engines` siblings). Invokes `npm-check-updates@21.0.2` via the detected package manager's dlx runner, post-processes pnpm `catalog:` entries, and returns a structured `ScanResult` JSON object. Read-only — never edits files.

### `apply-npm-updates`

Shared single-project apply backend — the single source of truth for the apply mechanism. Given a fully-resolved apply spec (`packageManager`, `cwd`, `target`, `manifestBumps[]`, `catalogEdits[]`, `overrideCommands[]`, `skipInstall`), it runs one `npm-check-updates@21.0.2 --upgrade` per `package.json`, edits `pnpm-workspace.yaml#catalog` in place, runs override commands in declaration order, and runs one install — streaming `ncu`/install/override output verbatim and returning a structured result fragment (it never prints a consumer summary or abort message). Level-agnostic (parameterized solely by `target`). Also documents the caller-invoked override-resolution procedure (registry load → first-win glob match → `{version}` resolution → GENERIC/OVERRIDE_RUN/OVERRIDE_SKIP partition) consumed by the shallow single-project commands and the orchestrator. Consumed by `/experiments:npm-update-{patch,minor}`, `/experiments:npm-update-deep-{patch,minor}`, and `commander-update-orchestrator` (once per project). Never runs tests/lint/build/commits.

### `group-packages-for-research`

Deterministic partition of `ScanResult.updates[]` into bounded subagent groups using `@scope/` coalescing + per-group cap (default `8`, override via `maxPerGroup ∈ [1, 32]`). Pure, no-network, reproducible. Consumed by the `parallel-research-workflow` skill and therefore by `/experiments:npm-update-deep-patch` (and future deep-\* siblings).

### `parallel-research-workflow`

Multi-phase parallel-subagent orchestration over a pre-grouped package set: phase 0 stale-plan cleanup (>10d), phase 1 fetches every changelog via `experiments:npm-changelog`, phase 2 cross-references against this codebase (single-project mode) or produces universal findings only (cross-project mode), phase 3 verifies integrity (`retry-failed` / `continue-without` / `abort`), phase 4 enters plan mode and writes `plan.md`. Persists artifacts under `~/.claude/experiments/plans/<slug>-<level>-<unix-ts>/`. The `mode` input (`single-project` default, `cross-project` for commander deep) selects the subagent prompt template, plan-dir layout (`scan.json` vs `scan-by-project.json` + `cross-project-plan.json`), and `plan.md` template (single-project bump-set vs cross-project bump-set with `affects projects:` tags). Reusable across `npm-update-deep-{patch,minor,major,engines}` and `commander-update-deep-{patch,minor,major,engines}` — only the level and mode change.

### `commander-update-orchestrator`

Cross-project npm-update orchestration. Owns the fan-out / fan-in pipeline used by `/experiments:commander-update-patch` and `/experiments:commander-update-deep-patch` (and the future `-minor` / `-major` / `-engines` siblings, plus their deep variants): list+filter projects from the registry, dispatch parallel `experiments:scan-npm-updates` runs via Haiku subagents (one per project, in a single message), deduplicate updates by package, version-align (max-wins with a one-prompt per-project fallback on range conflicts), render a unified plan, consult `pkg-upgrade-overrides.yaml` once per matched entry across the whole run, gate on the user's chosen apply path, then apply each project sequentially (stop-on-fail) and emit an aggregated summary. The `mode` input selects shallow (default) or deep — deep mode inserts Step 6.5 (cross-project research via `parallel-research-workflow`), expands the gate to four options (adds `apply-bumps-only`), and after the bumps loop enters plan-mode ONCE for a unified cross-project improvements round (Step 10b). Pure built-in tools (`Read`, `Bash`, `AskUserQuestion`, `Agent`, `Skill`, `Edit`, `Write`, `EnterPlanMode`); read-only against the registry.

## Testing

```bash
claude --plugin-dir ./claude-plugins/experiments
```

Then use `/experiments:hello-experiments` in the Claude Code CLI.

## Releases

This plugin is released via git tags formatted `experiments--v{version}`.

Triggers: a `feat(experiments)` or `fix(experiments)` conventional-commit on `main` causes `release-please` to open a release PR. Merging that PR bumps `.claude-plugin/plugin.json`, `package.json`, and the matching entry in the root `.claude-plugin/marketplace.json`, then creates the tag and a GitHub release.

See [`RELEASE.md`](../../RELEASE.md) at the repo root for the full flow, the conventional-commit-to-bump mapping, and the `develop → main` cadence.
