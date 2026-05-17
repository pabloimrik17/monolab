## ADDED Requirements

### Requirement: Plugin Version Bump Skill

The experiments plugin SHALL include a `plugin-version-bump` skill at `skills/plugin-version-bump/SKILL.md`.

The skill SHALL:
- Guide the AI agent to bump plugin versions after completing plugin modifications
- Provide a semver classification table for determining bump level
- Instruct synchronization of version across plugin.json, package.json, and marketplace.json

#### Scenario: Skill directory exists

- **WHEN** examining `claude-plugins/experiments/skills/`
- **THEN** `plugin-version-bump/SKILL.md` SHALL exist

#### Scenario: Skill discoverable by Claude Code

- **WHEN** the experiments plugin is installed
- **THEN** the `plugin-version-bump` skill SHALL appear in the available skills list
