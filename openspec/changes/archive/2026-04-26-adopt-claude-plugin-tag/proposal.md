## Why

Claude Code 2.1.119 added `claude plugin tag` for creating release git tags with cross-file version validation, and 2.1.110 introduced semver-range plugin dependencies that resolve against tags formatted `{name}--v{X.Y.Z}`. Today monolab's two plugins (`experiments`, `expo-developer`) ship without git tags — every commit on the default branch is treated as the latest version, users cannot pin releases, and the local skill `plugin-version-bump` keeps `plugin.json` and `marketplace.json` in sync by hand. This change adopts the standard tagging + release-please pipeline so plugin releases match the rest of the monorepo's release model and become discoverable by the new dependency-resolution mechanism.

## What Changes

- ADD release-please integration for `claude-plugins/*` reusing the existing `release-please.yml` workflow (`target-branch: main`).
- ADD per-plugin entries to `release-please-config.json` and `.release-please-manifest.json`. Plugin entries use `release-type: simple`, `tag-separator: "--"`, `include-v-in-tag: true`, and bump both `.claude-plugin/plugin.json` and the matching entry in the root `.claude-plugin/marketplace.json` via `extra-files` (`type: json`, `jsonpath` with array index).
- ADD `userConfig` to `claude-plugins/expo-developer/.claude-plugin/plugin.json` with `default_action` (`ask` / `check` / `fix`) and `package_manager_override` keys, consumed by the `expo-dependency-check` skill via `${user_config.default_action}` substitution.
- REMOVE the `plugin-version-bump` skill from the experiments plugin (file deletion + spec retirement). Its file-sync responsibility is replaced by release-please's `extra-files` entries.
- DOCUMENT the tag convention `{plugin-name}--v{version}` and the weekly `develop → main → release` cadence in the root README and each plugin's README.
- **BREAKING** for skill consumers: `experiments:plugin-version-bump` no longer exists after this change.

## Capabilities

### New Capabilities

- `claude-plugin-release`: How plugin releases are tagged, versioned, and published via release-please using the `{plugin-name}--v{version}` convention; defines the file-sync contract between `plugin.json` and `marketplace.json`.
- `expo-developer-plugin`: The expo-developer plugin's structure and the user-configurable defaults that drive its `expo-dependency-check` skill.

### Modified Capabilities

- `experiments-plugin`: Remove the requirement that the plugin contains the `plugin-version-bump` skill.
- `plugin-version-bump`: REMOVE the capability entirely — the skill no longer exists.

## Impact

- `release-please-config.json`, `.release-please-manifest.json` (extended with plugin entries).
- `.github/workflows/release-please.yml` (no change — release-please-action auto-detects new manifest entries).
- `claude-plugins/experiments/skills/plugin-version-bump/` (deleted).
- `claude-plugins/expo-developer/.claude-plugin/plugin.json` (`userConfig` block added).
- `claude-plugins/expo-developer/skills/expo-dependency-check/SKILL.md` (uses `${user_config.default_action}` substitution).
- `claude-plugins/*/README.md`, root `README.md` (release flow documentation).
- `openspec/specs/plugin-version-bump/` (removed when this change is archived).
- Pre-requisite outside this PR: `develop → main` merge so `main` carries `marketplace.json` and the plugin trees before release-please can run.
- Until the GitHub default branch flips from `develop` to `main` (separate decision), users adding `pabloimrik17/monolab` continue reading from `develop` and receive commit-SHA versions; tags created on `main` are accessible only via explicit `@ref` pinning.
