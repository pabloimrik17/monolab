## MODIFIED Requirements

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

### Requirement: Plugin installation from marketplace

- **GIVEN** a user has added the monolab marketplace
- **WHEN** they run `/plugin install expo-developer@monolab`
- **THEN** the expo-developer plugin SHALL be installed
- **AND** its commands/skills SHALL be available

#### Scenario: Plugin installation from marketplace

- **GIVEN** a user has added the monolab marketplace
- **WHEN** they run `/plugin install expo-developer@monolab`
- **THEN** the expo-developer plugin SHALL be installed
- **AND** its skills SHALL be available

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

## REMOVED Requirements

### Requirement: Demo Plugin Hello World Command

**Reason**: Demo plugin removed - no production value, only served as tutorial example
**Migration**: Use expo-developer plugin as example for plugin development
