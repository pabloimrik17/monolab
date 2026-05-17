## Why

[MON-199](https://linear.app/monolab/issue/MON-199) (sub-issue of [MON-154](https://linear.app/monolab/issue/MON-154) — `commander:update-deep-{patch,minor,major,engines}`). Commander already lets the user (a) register projects and (b) apply patch-level updates across all of them in one shot ([MON-194](https://linear.app/monolab/issue/MON-194), the shallow `commander:update-patch`). The single-project `/experiments:npm-update-deep-patch` ([MON-145](https://linear.app/monolab/issue/MON-145)) adds the missing intelligence on top of the per-project shallow flow: research every changelog in parallel, cross-reference against the codebase, and hand the user one integrated plan of applicable improvements + workarounds-resolved-by-upgrade.

The cross-product is what is missing today. A developer with N registered projects who wants both the alignment of the shallow `commander` command AND the "what's actually worth adopting" reading of the deep `npm` command has no first-class path: they either run `commander:update-patch` and skip the research, or run `npm:update-deep-patch` N times by hand (`cd`-hopping included) and re-do the changelog/research work for every shared package. With a typical monolab spread, ~80% of patch updates are shared across multiple projects — duplicating their research is pure waste.

This change ships `commander:update-deep-patch`: cross-project plan, **research deduplicated by package** (not per project), one cross-project synthesis, sequential apply with stop-on-fail, and one unified plan-mode round for improvements at apply time. It is patch-only by design — the first member of the `commander:update-deep-*` family. Deep-minor / deep-major / deep-engines inherit the entire plumbing introduced here.

## What Changes

- **Extend `experiments:commander-update-orchestrator` with a `mode: "shallow" | "deep"` input** (default `"shallow"`). In deep mode, the orchestrator inserts a research phase between version alignment and override consultation, plumbs research findings into the rendered plan, and replaces the apply step's per-project bumps loop with a two-stage flow: bumps-loop first, then one unified plan-mode round for improvements across every affected project. The shallow path is preserved byte-for-byte (existing `/experiments:commander-update-patch` is unaffected).
- **Extend `experiments:parallel-research-workflow` with `mode: "single-project" | "cross-project"` and `slugOverride`** inputs (default `mode: "single-project"`, default `slugOverride` unset). In cross-project mode the workflow accepts a `slugOverride` (e.g. `commander-deep-patch`) for plan-dir naming, the per-group subagent prompt drops the `Codebase root` line and instructs subagents to produce **universal** changelog-derived findings only (no codebase cross-reference), and `plan.md`'s structure switches to the cross-project shape (improvements tagged with affected projects, bump set keyed by project occurrences). Single-project callers (`/experiments:npm-update-deep-patch`) are unaffected.
- **Add `/experiments:commander-update-deep-patch` command** that invokes the orchestrator with `level: "patch"`, `target: "patch"`, `mode: "deep"`, mirroring `commander-update-patch`'s thin-wrapper posture. Takes no positional args or flags.
- **Reuse without modification**: `experiments:scan-npm-updates`, `experiments:group-packages-for-research`, `experiments:npm-changelog`. The override registry (`pkg-upgrade-overrides.yaml`) is also reused verbatim. Hard rules inherited from the shallow orchestrator and the single-project deep command apply globally: never run tests, lint, build; never create commits, branches, or PRs; never mutate `<HOME>/.claude/commander/projects.json`.
- **Plan-dir naming**: cross-project plans live under `~/.claude/experiments/plans/commander-deep-<level>-<unix-ts>[-N]/` with a slightly different layout than single-project deep plans (`scan-by-project.json` replaces `scan.json`; a new `cross-project-plan.json` captures the post-version-alignment aggregated plan; otherwise identical). The 10-day stale-cleanup pass in phase 0 of the workflow continues to apply.
- **Override registry IS consulted in cross-project deep** — explicit divergence from single-project deep ([MON-145](https://linear.app/monolab/issue/MON-145), which deliberately skips overrides). Rationale: in cross-project context, Storybook-style families spanning multiple projects need the same coordinated handling the shallow `commander-update-patch` already provides; degrading to "run shallow first, then deep" would defeat the one-command UX.
- Plugin version bump (experiments) follows the release-please flow already adopted in [MON-194](https://linear.app/monolab/issue/MON-194) — no manual edits to `plugin.json` / `package.json` / `marketplace.json`.

## Capabilities

### New Capabilities

- `commander-update-deep-patch-command`: Slash command `/experiments:commander-update-deep-patch` that invokes the orchestrator with `level=patch`, `target=patch`, `mode=deep`. Inherits all hard rules from `commander-update-patch` and `npm-update-deep-patch`. Patch-only by contract — the deep-minor / deep-major / deep-engines siblings will live in their own change.

### Modified Capabilities

- `commander-update-orchestrator-skill`: ADD a `mode` input and the deep-mode branch points (research insertion between version alignment and overrides; per-package "affected projects" tagging; apply-bumps-only option in the confirmation gate; unified plan-mode round after the bumps loop). The shallow path is unchanged.
- `parallel-research-workflow`: ADD `mode` and `slugOverride` inputs. ADD the cross-project research mode contract: universal-only findings, no codebase cross-reference, cross-project plan-mode synthesis template. Single-project mode is unchanged.
- `experiments-plugin`: ADD the new command file (`commander-update-deep-patch.md`) and the README listing. No new skill folder — both modified skills already exist.

## Impact

- **Affected code**:
    - `claude-plugins/experiments/commands/commander-update-deep-patch.md` (new)
    - `claude-plugins/experiments/skills/commander-update-orchestrator/SKILL.md` (modified — adds deep mode)
    - `claude-plugins/experiments/skills/parallel-research-workflow/SKILL.md` (modified — adds `mode` + `slugOverride`)
    - `claude-plugins/experiments/README.md` (modified — list the new command)
    - `claude-plugins/experiments/.claude-plugin/plugin.json` (version bump via release-please)
    - `claude-plugins/experiments/package.json` (version bump via release-please)
    - `.claude-plugin/marketplace.json` (version bump via release-please)
- **Affected user data**: reads `<HOME>/.claude/commander/projects.json` (no writes, byte-identical pre/post run); writes to each project's manifests (`package.json`, `pnpm-workspace.yaml`) via `ncu --upgrade`; writes one `<pm> install` per project; writes the plan-dir under `<HOME>/.claude/experiments/plans/commander-deep-patch-<unix-ts>/` (separate from the commander registry, separate from per-project deep plans).
- **Dependencies**: none new. Reuses `scan-npm-updates`, `group-packages-for-research`, `parallel-research-workflow`, `commander-update-orchestrator`, `npm-changelog`, `commander-registry` (read contract), `pkg-upgrade-overrides.yaml` (registry data file). Built-in tools only (`Read`, `Write`, `Edit`, `Bash`, `AskUserQuestion`, `Agent`, `Skill`).
- **Migration**: none — purely additive. Both modified skills accept the new optional inputs with backward-compatible defaults (`mode: "shallow"` for orchestrator, `mode: "single-project"` and unset `slugOverride` for the workflow). Existing callers (`/experiments:commander-update-patch`, `/experiments:npm-update-deep-patch`) are byte-equivalent to today.
- **Breaking changes**: none.
- **Linked tickets**: [MON-150](https://linear.app/monolab/issue/MON-150) (Commander epic), [MON-154](https://linear.app/monolab/issue/MON-154) (parent — `commander:update-deep-*` family), [MON-199](https://linear.app/monolab/issue/MON-199) (this feature). Siblings: [MON-200](https://linear.app/monolab/issue/MON-200), [MON-201](https://linear.app/monolab/issue/MON-201), [MON-202](https://linear.app/monolab/issue/MON-202) (deep-minor/major/engines — will reuse the same orchestrator deep-mode and workflow cross-project mode). Reused: [MON-194](https://linear.app/monolab/issue/MON-194) (shallow `commander-update-patch` + orchestrator), [MON-145](https://linear.app/monolab/issue/MON-145) (single-project `npm-update-deep-patch` + research workflow), [MON-144](https://linear.app/monolab/issue/MON-144) (parallel-research-workflow + grouping), [MON-152](https://linear.app/monolab/issue/MON-152) (cross-project orchestration layer), [MON-132](https://linear.app/monolab/issue/MON-132) (registry reader), [MON-135](https://linear.app/monolab/issue/MON-135) (`scan-npm-updates`).
