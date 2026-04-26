# Expo Developer Plugin

Developer tools for Expo/React Native projects with automatic dependency validation.

## Skills

### `expo-dependency-check`

Automatically detects when `package.json` is modified in Expo projects and offers to validate dependency versions using `expo install --check` or `expo install --fix`.

**Features:**

- Detects Expo projects (expo in dependencies, app.json/app.config.js)
- Identifies package manager (npm, yarn, pnpm, bun)
- Offers check-only or auto-fix validation, or runs the action directly when configured

## User Configuration

The plugin exposes two `userConfig` keys (set them via `/plugin config expo-developer` or in your plugin settings):

| Key                        | Type   | Default | Accepted values                    | Effect                                                                                                                                               |
| -------------------------- | ------ | ------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `default_action`           | string | `ask`   | `ask`, `check`, `fix`              | `ask` prompts the user (default behavior). `check` runs `<prefix> expo install --check` directly. `fix` runs `<prefix> expo install --fix` directly. |
| `package_manager_override` | string | `""`    | `""`, `npm`, `pnpm`, `yarn`, `bun` | When non-empty, overrides lockfile-based package-manager detection. Useful in monorepos with multiple lockfiles or unusual setups.                   |

Both keys default to values that preserve the original interactive behavior — you only need to set them to opt into non-interactive runs.

## Testing

```bash
claude --plugin-dir ./claude-plugins/expo-developer
```

The skill triggers automatically when modifying `package.json` in an Expo project.

## Releases

This plugin is released via git tags formatted `expo-developer--v{version}`.

Triggers: a `feat(expo-developer)` or `fix(expo-developer)` conventional-commit on `main` causes `release-please` to open a release PR. Merging that PR bumps `.claude-plugin/plugin.json`, `package.json`, and the matching entry in the root `.claude-plugin/marketplace.json`, then creates the tag and a GitHub release.

See [`RELEASE.md`](../../RELEASE.md) at the repo root for the full flow, the conventional-commit-to-bump mapping, and the `develop → main` cadence.
