---
name: expo-dependency-check
description: Validate Expo project dependencies after package.json modifications
---

# Expo Dependency Check

Use this skill when `package.json` has been modified in an Expo/React Native project.

## Detection

**Is this an Expo project?** Check for:

-   `expo` in dependencies/devDependencies in `package.json`
-   `app.json` or `app.config.js` in project root

If neither indicator exists, skip this workflow.

## Package Manager Detection

Check for lock files (first match wins):

| Lock File                 | Package Manager | Command Prefix                         |
| ------------------------- | --------------- | -------------------------------------- |
| `bun.lockb` or `bun.lock` | bun             | `bunx`                                 |
| `pnpm-lock.yaml`          | pnpm            | `pnpm dlx`                             |
| `yarn.lock`               | yarn            | `yarn dlx` (yarn 2+) or `npx` (yarn 1) |
| `package-lock.json`       | npm             | `npx`                                  |
| (none)                    | npm (default)   | `npx`                                  |

## Workflow

1. Ask the user which action to take:

    - **Check only**: Run `<prefix> expo install --check` to see incompatible versions
    - **Auto-fix**: Run `<prefix> expo install --fix` to update to compatible versions
    - **Skip**: Do nothing

2. Execute the chosen command and report results.

## Examples

**npm project:**

```bash
npx expo install --check
npx expo install --fix
```

**pnpm project:**

```bash
pnpm dlx expo install --check
pnpm dlx expo install --fix
```

**bun project:**

```bash
bunx expo install --check
bunx expo install --fix
```

**yarn (classic) project:**

```bash
npx expo install --check
npx expo install --fix
```

**yarn (berry/2+) project:**

```bash
yarn dlx expo install --check
yarn dlx expo install --fix
```
