## Why

[MON-194](https://linear.app/monolab/issue/MON-194) (sub-issue of [MON-153](https://linear.app/monolab/issue/MON-153) — `commander:update-{patch,minor,major,engines}`). Commander now lets users register projects (`commander-add`), inspect them (`commander-list`), and remove them (`commander-delete`). The next step is **acting on the catalog**: applying npm updates across every registered project from a single invocation, instead of `cd`-hopping and re-running `/experiments:npm-update-patch` N times. This change ships the patch-level command and, alongside it, the cross-project orchestration layer ([MON-152](https://linear.app/monolab/issue/MON-152)) that the upcoming `-minor` / `-major` / `-engines` siblings ([MON-195](https://linear.app/monolab/issue/MON-195)/[MON-196](https://linear.app/monolab/issue/MON-196)/[MON-197](https://linear.app/monolab/issue/MON-197)) and the deep variants ([MON-154](https://linear.app/monolab/issue/MON-154)) will reuse.

## What Changes

- Add a new shared skill `experiments:commander-update-orchestrator` that encapsulates the cross-project pipeline: list+filter projects → fan-out parallel scan via Haiku subagents → deduplicate updates → version-align (max-wins with per-project fallback) → render unified plan → sequential apply with stop-on-fail → cross-project summary. Closes [MON-152](https://linear.app/monolab/issue/MON-152).
- Add a new slash command `/experiments:commander-update-patch` that invokes the orchestrator skill with `level=patch` and surfaces the patch-specific UX (`AskUserQuestion` multi-select for project subset, `apply-all` / `pick-subset` / `cancel` prompt, plus the `pkg-upgrade-overrides` registry inherited from `npm-update-patch`).
- Reuse `experiments:scan-npm-updates` skill verbatim — one scan invocation per project, dispatched in parallel from a single message containing N `Agent` tool calls.
- Reuse the `pkg-upgrade-overrides.yaml` registry (Storybook-style families) from `npm-update-patch`. Override prompts SHALL be raised once across the whole run, not once per project.
- Hard rules inherited from `npm-update-patch` apply globally: never run tests, lint, build; never create commits or PRs; never modify files on `cancel` or when every accepted update is excluded.
- Drift-aware list consumption: registry records whose `path` no longer exists on disk are skipped with a warning (mirrors the `[missing path]` signal `commander-list` already surfaces). Legacy v1 records are accepted as-is.
- Bump `experiments` plugin version across `plugin.json`, `package.json`, and the `experiments` entry in `.claude-plugin/marketplace.json`.

## Capabilities

### New Capabilities

- `commander-update-orchestrator-skill`: Cross-project orchestration pipeline used by every `commander:update-*` and `commander:update-deep-*` command. Owns project resolution, parallel scan dispatch, cross-project deduplication and version alignment, unified plan rendering, sequential apply, and aggregated summary. Pure built-in tools (`Read`, `Bash`, `AskUserQuestion`, `Agent`); no new runtime dependency.
- `commander-update-patch-command`: Slash command `/experiments:commander-update-patch` that invokes the orchestrator with `level=patch`, wires the patch-specific override registry, and inherits the `npm-update-patch` hard rules.

### Modified Capabilities

- `experiments-plugin`: ADD requirements for the `commander-update-patch` command file and the `commander-update-orchestrator` skill folder (locations, frontmatter, README listing). Plugin version bump reaffirmed.

## Impact

- **Affected code**:
  - `claude-plugins/experiments/commands/commander-update-patch.md` (new)
  - `claude-plugins/experiments/skills/commander-update-orchestrator/SKILL.md` (new)
  - `claude-plugins/experiments/.claude-plugin/plugin.json` (version bump)
  - `claude-plugins/experiments/package.json` (version bump)
  - `.claude-plugin/marketplace.json` (version bump on `experiments` entry)
  - `claude-plugins/experiments/README.md` (add command + skill to the listings)
- **Affected user data**: reads `~/.claude/commander/projects.json` (no writes); writes to each registered project's manifests (`package.json`, `pnpm-workspace.yaml`) via `ncu --upgrade` and runs one `<pm> install` per project. No registry mutation.
- **Dependencies**: none new. Reuses `scan-npm-updates`, `pkg-upgrade-overrides.yaml`, `commander-registry` reader contract. Built-in tools only.
- **Migration**: none — purely additive. Registry schema unchanged (still v2).
- **Breaking changes**: none.
- **Linked tickets**: [MON-150](https://linear.app/monolab/issue/MON-150) (epic), [MON-152](https://linear.app/monolab/issue/MON-152) (orchestration layer — closed by the skill), [MON-153](https://linear.app/monolab/issue/MON-153) (parent — `update-{patch,minor,major,engines}`), [MON-194](https://linear.app/monolab/issue/MON-194) (this feature). Siblings: [MON-195](https://linear.app/monolab/issue/MON-195), [MON-196](https://linear.app/monolab/issue/MON-196), [MON-197](https://linear.app/monolab/issue/MON-197) (will reuse the orchestrator skill). Reused: [MON-132](https://linear.app/monolab/issue/MON-132) (`commander-list` reader), [MON-135](https://linear.app/monolab/issue/MON-135) (`scan-npm-updates`), [MON-136](https://linear.app/monolab/issue/MON-136) (`npm:update-patch` apply logic).
