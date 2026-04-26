---
name: expo-dependency-check
description: Validate Expo project dependencies after package.json modifications
---

# Expo Dependency Check

Use this skill when `package.json` has been modified in an Expo/React Native project.

## Detection

**Is this an Expo project?** Check for:

- `expo` in dependencies/devDependencies in `package.json`
- `app.json`, `app.config.js`, or `app.config.ts` in project root

If neither indicator exists, skip this workflow.

## Package Manager Detection

If `${user_config.package_manager_override}` is non-empty, use it directly as the package-manager source — skip lockfile detection. Accepted override values: `npm`, `pnpm`, `yarn`, `bun`.

Otherwise, check for lock files (first match wins):

| Lock File                 | Package Manager | Command Prefix                         |
| ------------------------- | --------------- | -------------------------------------- |
| `bun.lockb` or `bun.lock` | bun             | `bunx`                                 |
| `pnpm-lock.yaml`          | pnpm            | `pnpx`                                 |
| `yarn.lock`               | yarn            | `yarn dlx` (yarn 2+) or `npx` (yarn 1) |
| `package-lock.json`       | npm             | `npx`                                  |
| (none)                    | npm (default)   | `npx`                                  |

When the override is set, map it to the equivalent prefix:

| Override value | Command Prefix |
| -------------- | -------------- |
| `npm`          | `npx`          |
| `pnpm`         | `pnpx`         |
| `yarn`         | `yarn dlx`     |
| `bun`          | `bunx`         |

## Workflow

Branch on `${user_config.default_action}`:

- `ask` (default): prompt the user to choose between **Check only**, **Auto-fix**, or **Skip**, then execute the chosen command.
- `check`: run `<prefix> expo install --check` directly, without prompting.
- `fix`: run `<prefix> expo install --fix` directly, without prompting.

Action commands:

- **Check only**: `<prefix> expo install --check` — report incompatible versions
- **Auto-fix**: `<prefix> expo install --fix` — update to compatible versions
- **Skip**: do nothing

Report results after execution.

## Examples

**npm project:**

```bash
npx expo install --check
npx expo install --fix
```

**pnpm project:**

```bash
pnpx expo install --check
pnpx expo install --fix
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
