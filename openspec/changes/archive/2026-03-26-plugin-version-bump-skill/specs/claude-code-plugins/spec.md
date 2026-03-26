## MODIFIED Requirements

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
- **WHEN** they run `/plugin marketplace add pabloimrik17/monolab`
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
