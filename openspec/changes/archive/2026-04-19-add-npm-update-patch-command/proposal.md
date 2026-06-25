## Why

Updating npm dependencies by hand is recurring friction: opening every `package.json`, comparing versions, applying bumps, validating catalogs. Patches are the safest and most frequent case, so starting with them enables an incremental flow (`patch` today, `minor`/`major`/`engines` later) sharing one scanning skill. Covers MON-134 (spike), MON-135 (shared skill) and MON-136 (patch command).

## What Changes

- Add the `/experiments:npm-update-patch` command to the `experiments` plugin, which scans, presents, and applies confirmed patches (bump + install).
- Add a shared `scan-npm-updates` skill to the `experiments` plugin: it detects the package manager and repo type, invokes the scanning tool, filters by update type (`patch|minor|major|engines`), respects `minimumReleaseAge`, and returns structured results. The API is designed for all 4 levels even though this change only exposes patch.
- Tool decision (spike outcome): `taze` as the default, with `ncu` as a documented fallback. Full rationale and research findings in `design.md`.
- Project-agnostic behavior: the command manages bump + install; no commits, no tests, no lint. Verification is delegated to the invoking dev/agent.
- UI: a single "apply all / pick subset / cancel" prompt; in "pick subset" exclusions are requested by name. Patches-friendly default = everything.
- Catalogs: treated as first-class. If a package is in `catalog:`, the skill updates the corresponding entry.
- Bump the `experiments` plugin version after adding the skill + command.

## Capabilities

### New Capabilities

- none

### Modified Capabilities

- `experiments-plugin`: adds Requirements for the `scan-npm-updates` skill and the `npm-update-patch` command. The plugin version bump is applied mechanically via the `plugin-version-bump` skill and is not encoded as a Requirement.

## Impact

- Code: new files at `claude-plugins/experiments/skills/scan-npm-updates/SKILL.md` and `claude-plugins/experiments/commands/npm-update-patch.md`. Bump in `plugin.json`, `package.json` and `marketplace.json`.
- Deps: no new npm dep in the workspace; the tool (`taze`/`ncu`) is invoked via `npx`/`pnpm dlx` on-demand inside the skill.
- External surface: two new entry points for plugin users (`/experiments:npm-update-patch` and the `scan-npm-updates` skill). Does not affect app runtime.
- Unblocks: MON-137/138/139 (minor/major/engines) and MON-153 (commander cross-project) will reuse the same skill.
- No breaking changes.
