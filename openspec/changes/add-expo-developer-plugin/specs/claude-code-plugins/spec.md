## ADDED Requirements

### Requirement: Expo Developer Plugin Structure

The `expo-developer` plugin SHALL follow the standard Claude Code plugin structure at `claude-plugins/expo-developer/`.

The plugin manifest SHALL include:
- `name`: "expo-developer"
- `version`: Semantic version starting at "0.1.0"
- `description`: Clear description of Expo/React Native development assistance
- `keywords`: ["expo", "react-native", "dependencies", "validation"]

#### Scenario: Plugin directory structure

- **GIVEN** a developer navigates to `claude-plugins/expo-developer/`
- **WHEN** examining its structure
- **THEN** it SHALL have `.claude-plugin/plugin.json` manifest
- **AND** it SHALL have `skills/expo-dependency-check.md`
- **AND** it SHALL have `package.json` with `"private": true`
- **AND** it SHALL have `README.md` documenting the plugin

---

### Requirement: Validating Expo Dependencies Skill

The `expo-dependency-check` skill SHALL detect when `package.json` is modified in Expo/React Native projects and propose dependency validation.

The skill SHALL:
- Trigger when `package.json` changes are detected (writes, edits)
- Verify the project is an Expo project (presence of `expo` in dependencies/devDependencies or `app.json`/`app.config.js`)
- Detect the package manager used in the project (npm, yarn, pnpm, bun, deno)
- Propose running `expo install --check` to validate versions
- Offer `expo install --fix` as an alternative to auto-fix issues

#### Scenario: Skill triggers on package.json modification

- **GIVEN** an Expo project with `expo` in dependencies
- **WHEN** Claude modifies `package.json` (adding, updating, or removing dependencies)
- **THEN** the skill SHALL activate
- **AND** it SHALL propose validating dependency versions with `expo install --check`

#### Scenario: Package manager detection - pnpm

- **GIVEN** an Expo project with `pnpm-lock.yaml` present
- **WHEN** the skill proposes validation commands
- **THEN** it SHALL use `pnpm exec expo install --check`
- **AND** it SHALL use `pnpm exec expo install --fix` for auto-fix

#### Scenario: Package manager detection - yarn

- **GIVEN** an Expo project with `yarn.lock` present
- **WHEN** the skill proposes validation commands
- **THEN** it SHALL use `yarn expo install --check`
- **AND** it SHALL use `yarn expo install --fix` for auto-fix

#### Scenario: Package manager detection - npm

- **GIVEN** an Expo project with `package-lock.json` present (or no lock file)
- **WHEN** the skill proposes validation commands
- **THEN** it SHALL use `npx expo install --check`
- **AND** it SHALL use `npx expo install --fix` for auto-fix

#### Scenario: Package manager detection - bun

- **GIVEN** an Expo project with `bun.lockb` or `bun.lock` present
- **WHEN** the skill proposes validation commands
- **THEN** it SHALL use `bunx expo install --check`
- **AND** it SHALL use `bunx expo install --fix` for auto-fix

#### Scenario: Package manager detection - deno

- **GIVEN** an Expo project with `deno.lock` present
- **WHEN** the skill proposes validation commands
- **THEN** it SHALL use `deno run -A npm:expo install --check`
- **AND** it SHALL use `deno run -A npm:expo install --fix` for auto-fix

#### Scenario: Non-Expo project ignored

- **GIVEN** a project without `expo` in dependencies and no `app.json`/`app.config.js`
- **WHEN** `package.json` is modified
- **THEN** the skill SHALL NOT activate

#### Scenario: User chooses to fix

- **GIVEN** the skill has detected dependency modifications
- **WHEN** user confirms they want to fix versions
- **THEN** the skill SHALL run the appropriate `expo install --fix` command
- **AND** it SHALL report the results to the user

#### Scenario: User chooses to only check

- **GIVEN** the skill has detected dependency modifications
- **WHEN** user wants to only validate without fixing
- **THEN** the skill SHALL run `expo install --check`
- **AND** it SHALL report any version mismatches found
- **AND** it SHALL NOT modify any files

---

### Requirement: Expo Developer Plugin Marketplace Registration

The `expo-developer` plugin SHALL be registered in the monolab marketplace.

#### Scenario: Plugin appears in marketplace

- **GIVEN** the root `.claude-plugin/marketplace.json`
- **WHEN** examining the plugins array
- **THEN** it SHALL include an entry for `expo-developer`
- **AND** the entry SHALL have `name`, `source`, `version`, and `description` fields

#### Scenario: Plugin installable from marketplace

- **GIVEN** a user has added the monolab marketplace
- **WHEN** they run `/plugin install expo-developer@monolab`
- **THEN** the expo-developer plugin SHALL be installed
- **AND** the `expo-dependency-check` skill SHALL be available
