# Expo Developer Plugin

Developer tools for Expo/React Native projects with automatic dependency validation.

## Skills

### `expo-dependency-check`

Automatically detects when `package.json` is modified in Expo projects and offers to validate dependency versions using `expo install --check` or `expo install --fix`.

**Features:**

- Detects Expo projects (expo in dependencies, app.json/app.config.js)
- Identifies package manager (npm, yarn, pnpm, bun)
- Offers check-only or auto-fix validation

## Testing

```bash
claude --plugin-dir ./claude-plugins/expo-developer
```

The skill triggers automatically when modifying `package.json` in an Expo project.
