## ADDED Requirements

### Requirement: Engines update cascade registration

The `experiments` plugin SHALL provide the four engines-level commands and the two engines skills, auto-discovered from the plugin's `commands/` and `skills/` directories (no manifest hand-edit; the plugin version is release-please-driven). The commands are `/experiments:npm-update-engines`, `/experiments:npm-update-deep-engines`, `/experiments:commander-update-engines`, and `/experiments:commander-update-deep-engines`; the skills are `detect-toolchain-surfaces` and `apply-engine-bumps`. The plugin `README.md` SHALL list the four new commands alongside the existing patch/minor/major rows.

#### Scenario: Engines commands present and discoverable

- **WHEN** examining `claude-plugins/experiments/commands/`
- **THEN** `npm-update-engines.md`, `npm-update-deep-engines.md`, `commander-update-engines.md`, and `commander-update-deep-engines.md` SHALL exist, each with non-empty `description` frontmatter

#### Scenario: Engines skills present

- **WHEN** examining `claude-plugins/experiments/skills/`
- **THEN** `detect-toolchain-surfaces/SKILL.md` and `apply-engine-bumps/SKILL.md` SHALL exist with non-empty `description` frontmatter

#### Scenario: README documents the engines row

- **WHEN** reading `claude-plugins/experiments/README.md`
- **THEN** it SHALL list the four engines commands
