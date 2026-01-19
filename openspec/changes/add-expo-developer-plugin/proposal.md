# Change: Add expo-developer Plugin with Dependency Validation Skill

## Why

React Native/Expo projects require strict version alignment between Expo SDK and third-party packages. Using incompatible versions causes side effects ranging from subtle bugs to completely broken applications. Expo provides `expo install --check` and `expo install --fix` commands for validation, but developers often forget to run them after modifying dependencies.

A Claude Code skill can automatically detect `package.json` dependency modifications and prompt the developer to validate versions, preventing version drift before it causes problems.

## What Changes

- New plugin: `claude-plugins/expo-developer/`
- New skill: `expo-dependency-check` (skill file in `skills/` directory)
- Skill triggers when `package.json` is modified in Expo/React Native projects
- Detects project's package manager (npm, yarn, pnpm, bun, deno)
- Offers to run `expo install --check` or `expo install --fix`

## Impact

- Affected specs: `claude-code-plugins`
- New files:
  - `claude-plugins/expo-developer/.claude-plugin/plugin.json`
  - `claude-plugins/expo-developer/skills/expo-dependency-check.md`
  - `claude-plugins/expo-developer/package.json`
  - `claude-plugins/expo-developer/README.md`
- Marketplace registration: Update `/.claude-plugin/marketplace.json`
