# expo-version-fix Specification

## Purpose

Provide a Claude Code skill that automatically runs `npx expo install --fix` after package installations in Expo projects to prevent SDK version incompatibilities.

## ADDED Requirements

### Requirement: Plugin Directory Structure

The `react-native` plugin SHALL exist at `claude-plugins/react-native/` following the established plugin conventions.

#### Scenario: Plugin directory structure

- **GIVEN** the monolab repository
- **WHEN** examining `claude-plugins/react-native/`
- **THEN** the following structure SHALL exist:
  ```
  claude-plugins/react-native/
  ├── .claude-plugin/
  │   ├── plugin.json
  │   └── marketplace.json
  ├── skills/
  │   └── expo-version-fix/
  │       └── SKILL.md
  ├── package.json
  └── README.md
  ```

---

### Requirement: Plugin Manifest

The plugin manifest SHALL identify the plugin as `react-native` with appropriate metadata.

#### Scenario: Plugin manifest content

- **GIVEN** the file `claude-plugins/react-native/.claude-plugin/plugin.json`
- **WHEN** examining its contents
- **THEN** it SHALL contain:
  - `name`: "react-native"
  - `version`: semantic version string
  - `description`: description mentioning React Native development
  - `author`: object with `name` field
  - `keywords`: array including "react-native", "expo"

---

### Requirement: Skill Frontmatter

The skill SHALL have YAML frontmatter with `name` and `description` fields optimized for automatic detection.

#### Scenario: Skill frontmatter format

- **GIVEN** the file `claude-plugins/react-native/skills/expo-version-fix/SKILL.md`
- **WHEN** examining its YAML frontmatter
- **THEN** it SHALL contain:
  - `name`: "expo-version-fix"
  - `description`: text that includes triggers for detection:
    - "Expo" or "expo"
    - Package installation keywords ("install", "add", "update", "upgrade")
    - "React Native" or "react-native"
    - Version/SDK compatibility mention

#### Scenario: Description enables automatic detection

- **GIVEN** a user working in an Expo project
- **WHEN** the user asks Claude to install a package (e.g., "install react-native-reanimated")
- **THEN** Claude SHALL automatically discover and invoke the skill based on the description match

---

### Requirement: Expo Project Detection

The skill SHALL instruct Claude to detect Expo projects before applying version fixes.

#### Scenario: Detection via app.json

- **GIVEN** the skill is invoked
- **WHEN** Claude checks for Expo project indicators
- **THEN** Claude SHALL look for `app.json` containing an `expo` key

#### Scenario: Detection via app.config

- **GIVEN** the skill is invoked
- **WHEN** Claude checks for Expo project indicators
- **THEN** Claude SHALL look for `app.config.js` or `app.config.ts` files

#### Scenario: Detection via package.json

- **GIVEN** the skill is invoked
- **WHEN** Claude checks for Expo project indicators
- **THEN** Claude SHALL look for `expo` in `package.json` dependencies or devDependencies

#### Scenario: Non-Expo project handling

- **GIVEN** a project without Expo indicators
- **WHEN** the skill is invoked
- **THEN** Claude SHALL proceed with normal package installation without running `expo install --fix`

---

### Requirement: Package Manager Detection

The skill SHALL instruct Claude to detect the project's package manager and use the equivalent `expo install --fix` command.

Package manager detection via lockfiles:
- `bun.lockb` or `bun.lock` → bun → `bunx expo install --fix`
- `package-lock.json` → npm → `npx expo install --fix`
- `pnpm-lock.yaml` → pnpm → `pnpm dlx expo install --fix`
- `yarn.lock` → yarn → `yarn dlx expo install --fix`
- `deno.lock` → deno → `deno run -A npm:expo install --fix`

#### Scenario: Auto-detection via lockfile

- **GIVEN** an Expo project with a single lockfile
- **WHEN** Claude needs to run expo install --fix
- **THEN** Claude SHALL use the command corresponding to the detected lockfile

#### Scenario: Multiple lockfiles present

- **GIVEN** an Expo project with multiple lockfiles (e.g., both `yarn.lock` and `package-lock.json`)
- **WHEN** Claude needs to run expo install --fix
- **THEN** Claude SHALL use the same package manager as the installation command just executed

#### Scenario: No lockfile present

- **GIVEN** an Expo project without any lockfile
- **WHEN** Claude needs to run expo install --fix
- **THEN** Claude SHALL use the same package manager as the installation command just executed

---

### Requirement: Post-Installation Version Fix

The skill SHALL instruct Claude to run the appropriate `expo install --fix` command after package installation operations.

#### Scenario: Fix after npm install

- **GIVEN** an Expo project
- **WHEN** Claude executes `npm install <package>`
- **THEN** Claude SHALL run `npx expo install --fix`

#### Scenario: Fix after yarn add

- **GIVEN** an Expo project
- **WHEN** Claude executes `yarn add <package>`
- **THEN** Claude SHALL run `yarn dlx expo install --fix`

#### Scenario: Fix after pnpm add

- **GIVEN** an Expo project
- **WHEN** Claude executes `pnpm add <package>`
- **THEN** Claude SHALL run `pnpm dlx expo install --fix`

#### Scenario: Fix after bun add

- **GIVEN** an Expo project
- **WHEN** Claude executes `bun add <package>`
- **THEN** Claude SHALL run `bunx expo install --fix`

#### Scenario: Fix after deno add

- **GIVEN** an Expo project
- **WHEN** Claude executes `deno add <package>`
- **THEN** Claude SHALL run `deno run -A npm:expo install --fix`

#### Scenario: Fix after expo install without --fix

- **GIVEN** an Expo project
- **WHEN** Claude executes `expo install <package>` without `--fix` flag (via any package manager)
- **THEN** Claude SHALL run `expo install --fix` using the same package manager

---

### Requirement: User Feedback

The skill SHALL instruct Claude to report version corrections to the user.

#### Scenario: Corrections made

- **GIVEN** `npx expo install --fix` corrects package versions
- **WHEN** the command output shows version changes
- **THEN** Claude SHALL report which packages had versions corrected

#### Scenario: No corrections needed

- **GIVEN** `npx expo install --fix` finds no version issues
- **WHEN** all packages are already compatible
- **THEN** Claude SHALL NOT report anything (silent success)

---

### Requirement: Workspace Integration

The plugin SHALL be integrated into the pnpm workspace.

#### Scenario: Package.json exists

- **GIVEN** the plugin at `claude-plugins/react-native/`
- **WHEN** examining `package.json`
- **THEN** it SHALL have:
  - `name`: "@m0n0lab/plugin-react-native"
  - `private`: true

#### Scenario: Workspace recognition

- **GIVEN** `pnpm-workspace.yaml` includes `claude-plugins/*`
- **WHEN** running `pnpm install` from root
- **THEN** the react-native plugin SHALL be recognized as a workspace member

---

## MODIFIED Requirements

### Requirement: Marketplace Registration (from claude-code-plugins)

The marketplace manifest SHALL include the `react-native` plugin.

#### Scenario: Plugin listed in marketplace

- **GIVEN** the file `.claude-plugin/marketplace.json`
- **WHEN** examining the `plugins` array
- **THEN** it SHALL include an entry for `react-native` plugin with:
  - `name`: "react-native"
  - `source`: "claude-plugins/react-native"
  - `description`: description mentioning Expo version compatibility
