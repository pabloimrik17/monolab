# claude-code-plugins Specification

## Purpose
TBD - created by archiving change add-claude-code-marketplace. Update Purpose after archive.
## Requirements
### Requirement: Plugins Directory Structure

The monorepo SHALL have a `claude-plugins/` directory at the root level for hosting Claude Code plugins.

Each plugin directory SHALL follow the Claude Code plugin structure:
- `.claude-plugin/plugin.json` manifest file (required)
- `commands/` directory for slash commands (optional)
- `skills/` directory for agent skills (optional)
- `agents/` directory for subagents (optional)
- `hooks/` directory for event handlers (optional)

#### Scenario: Plugin directory exists

- **GIVEN** the monolab repository
- **WHEN** a developer navigates to the root
- **THEN** a `claude-plugins/` directory SHALL exist at the same level as `packages/` and `apps/`

#### Scenario: Plugin follows structure conventions

- **GIVEN** a plugin named `expo-developer` in `claude-plugins/expo-developer/`
- **WHEN** examining its structure
- **THEN** it SHALL have `.claude-plugin/plugin.json` at minimum
- **AND** any component directories (commands/, skills/, etc.) SHALL be at the plugin root, NOT inside `.claude-plugin/`

---

### Requirement: Marketplace Registration

The repository SHALL be registered as a Claude Code marketplace via a root-level `.claude-plugin/marketplace.json` file.

The marketplace manifest SHALL include:
- `name`: Marketplace identifier (string)
- `owner`: Object with `name` and optional `email`
- `metadata`: Object with `description`, `version`, and `pluginRoot`
- `plugins`: Array of plugin entries with `name`, `source`, `version`, and `description`

Plugin entry `version` fields SHALL be kept in sync with each plugin's `.claude-plugin/plugin.json` version. The `plugin.json` is the source of truth; marketplace.json versions are informational for discovery.

#### Scenario: Marketplace manifest exists

- **GIVEN** the monolab repository
- **WHEN** checking the root directory
- **THEN** `.claude-plugin/marketplace.json` SHALL exist

#### Scenario: Users can add marketplace

- **GIVEN** a user with Claude Code installed
- **WHEN** they run `/plugin marketplace add pabloimrrik17/monolab`
- **THEN** the monolab marketplace SHALL be registered in their Claude Code configuration
- **AND** plugins from monolab SHALL appear in the Discover tab

#### Scenario: Plugin installation from marketplace

- **GIVEN** a user has added the monolab marketplace
- **WHEN** they run `/plugin install expo-developer@monolab`
- **THEN** the expo-developer plugin SHALL be installed
- **AND** its skills SHALL be available

#### Scenario: Version consistency

- **WHEN** examining marketplace.json plugin entries
- **THEN** each entry's `version` SHALL match the corresponding `claude-plugins/<name>/.claude-plugin/plugin.json` version

---

### Requirement: Plugin Package Integration

Each plugin SHALL have a `package.json` for workspace tooling integration.

The package.json SHALL:
- Use naming convention `@m0n0lab/plugin-{name}`
- Set `"private": true` (plugins are not npm-published)
- Be included in pnpm workspace for linting and formatting

#### Scenario: Plugin included in workspace

- **GIVEN** a plugin with `package.json` at `claude-plugins/expo-developer/package.json`
- **WHEN** running `pnpm install` from root
- **THEN** the plugin SHALL be recognized as a workspace member

#### Scenario: Plugin linting works

- **GIVEN** a plugin with markdown files in `skills/`
- **WHEN** running markdownlint on the repository
- **THEN** plugin skill files SHALL be linted according to project standards

---

### Requirement: Workspace Configuration Updates

The pnpm workspace configuration SHALL include the `claude-plugins/*` pattern.

#### Scenario: Workspace includes plugins

- **GIVEN** `pnpm-workspace.yaml` at repository root
- **WHEN** examining its `packages` array
- **THEN** `claude-plugins/*` SHALL be included as a workspace pattern

#### Scenario: TypeScript configuration

- **GIVEN** plugins may contain TypeScript files in the future
- **WHEN** TypeScript configuration is needed
- **THEN** plugin tsconfig files SHALL extend the base configuration from `@m0n0lab/ts-configs`

---

### Requirement: Expo Developer Plugin Structure

The `expo-developer` plugin SHALL follow the standard Claude Code plugin structure at `claude-plugins/expo-developer/`.

The plugin manifest SHALL include:
- `name`: "expo-developer"
- `version`: Semantic version starting at "0.1.0"
- `description`: Clear description of Expo/React Native development assistance
- `keywords`: ["expo", "react-native", "dependency-validation", "package-manager"]

#### Scenario: Plugin directory structure

- **GIVEN** a developer navigates to `claude-plugins/expo-developer/`
- **WHEN** examining its structure
- **THEN** it SHALL have `.claude-plugin/plugin.json` manifest
- **AND** it SHALL have `skills/expo-dependency-check/SKILL.md`
- **AND** it SHALL have `package.json` with `"private": true`
- **AND** it SHALL have `README.md` documenting the plugin

---

### Requirement: Validating Expo Dependencies Skill

The `expo-dependency-check` skill SHALL detect when `package.json` is modified in Expo/React Native projects and propose dependency validation.

The skill SHALL:
- Trigger when `package.json` changes are detected (writes, edits)
- Verify the project is an Expo project (presence of `expo` in dependencies/devDependencies or `app.json`/`app.config.js`)
- Detect the package manager used in the project (npm, yarn, pnpm, bun)
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
- **THEN** it SHALL use `pnpx expo install --check`
- **AND** it SHALL use `pnpx expo install --fix` for auto-fix

#### Scenario: Package manager detection - yarn

- **GIVEN** an Expo project with `yarn.lock` present
- **WHEN** the skill proposes validation commands
- **THEN** it SHALL use `npx expo install --check` (yarn classic) or `yarn dlx expo install --check` (yarn 2+)
- **AND** it SHALL use the corresponding `--fix` variant for auto-fix

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

