# Proposal: Add React Native Plugin

## Summary

Add a new Claude Code plugin `react-native` with a skill that automatically runs `npx expo install --fix` after package installations in Expo projects, preventing SDK version incompatibilities.

## Motivation

React Native packages are not backwards compatible. When users install or update packages in Expo projects, they may inadvertently install versions incompatible with their Expo SDK version. This causes runtime errors and debugging headaches.

Expo CLI provides `npx expo install --fix` which automatically corrects package versions to match the SDK. This plugin makes Claude Code aware of this requirement and automatically applies the fix after any package installation operation.

## Scope

### In Scope

- New `react-native` plugin in `claude-plugins/react-native/`
- Skill `expo-version-fix` that detects Expo projects and triggers version validation
- Integration with existing `claude-code-plugins` spec conventions

### Out of Scope

- Other React Native tools/skills (future work)
- React web plugin (separate proposal)
- JS frontend plugin (separate proposal)

## Approach

Use a **skill-based approach** rather than hooks because:

1. Skills allow Claude to understand context before acting
2. Can detect if project uses Expo before applying
3. Provides transparency to user about what's happening
4. More flexible than blind post-install hooks

The skill will:

1. Detect Expo projects via `app.json`, `app.config.js`, or `expo` in `package.json`
2. Activate when user requests package installation/update
3. Instruct Claude to run `npx expo install --fix` after installation
4. Report any version corrections made

## References

- [Expo CLI Version Validation](https://docs.expo.dev/more/expo-cli/#version-validation)
- Existing spec: `openspec/specs/claude-code-plugins/spec.md`

## Spec Deltas

- `specs/expo-version-fix/spec.md` - New capability for Expo version fix skill
