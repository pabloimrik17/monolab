## MODIFIED Requirements

### Requirement: Experiments Plugin Structure

The `experiments` plugin SHALL exist at `claude-plugins/experiments/` and follow standard Claude Code plugin structure.

The plugin directory SHALL contain:
- `.claude-plugin/plugin.json` manifest
- `commands/` directory for slash commands
- `package.json` with `"private": true`
- `README.md` documenting the plugin

#### Scenario: Plugin directory exists

- **WHEN** navigating to `claude-plugins/experiments/`
- **THEN** the directory SHALL exist with `.claude-plugin/plugin.json` manifest

#### Scenario: Plugin manifest valid

- **WHEN** examining `.claude-plugin/plugin.json`
- **THEN** it SHALL include `name: "experiments"`, `version`, `description`, and `keywords`

## ADDED Requirements

### Requirement: npm-changelog Command File

The experiments plugin SHALL include `commands/npm-changelog.md` as a skill file.

The command file SHALL have YAML frontmatter with a `description` field.

The command SHALL be invocable as `/experiments:npm-changelog`.

#### Scenario: Command file exists

- **WHEN** examining `claude-plugins/experiments/commands/`
- **THEN** `npm-changelog.md` SHALL exist

#### Scenario: Command invocable

- **WHEN** user types `/experiments:npm-changelog react 18.0.0..19.0.0`
- **THEN** Claude SHALL execute the npm-changelog skill instructions

#### Scenario: Frontmatter present

- **WHEN** reading `commands/npm-changelog.md`
- **THEN** the file SHALL have YAML frontmatter with `description` field

---

### Requirement: Version Bump

When adding the npm-changelog command, the plugin version SHALL be bumped in both:
- `claude-plugins/experiments/.claude-plugin/plugin.json`
- `claude-plugins/experiments/package.json`

Both files SHALL have matching version numbers.

#### Scenario: Version consistency

- **WHEN** examining `plugin.json` and `package.json` after adding npm-changelog
- **THEN** both SHALL have the same version number, incremented from the previous version
