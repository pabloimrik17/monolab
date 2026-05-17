## ADDED Requirements

### Requirement: Commander Update Orchestrator Skill File

The `experiments` plugin SHALL include the directory `skills/commander-update-orchestrator/` with at minimum a `SKILL.md` file. The `SKILL.md` SHALL have YAML frontmatter declaring a non-empty `description` and a non-empty `name` (matching the directory name).

The skill SHALL be discoverable via the standard Claude Code plugin skill loading mechanism (auto-loaded from the plugin's `skills/` directory).

#### Scenario: Skill folder exists

- **WHEN** examining `claude-plugins/experiments/skills/`
- **THEN** the directory `commander-update-orchestrator/` SHALL exist
- **AND** SHALL contain a `SKILL.md` file with non-empty `name` and `description` frontmatter

#### Scenario: Skill is discoverable

- **WHEN** Claude Code loads the experiments plugin
- **THEN** the skill `commander-update-orchestrator` SHALL appear in the available-skills listing

---

### Requirement: Commander Update Patch Command File

The `experiments` plugin SHALL include `commands/commander-update-patch.md`.

The command file SHALL have YAML frontmatter with a non-empty `description` field. The command SHALL be invocable as `/experiments:commander-update-patch`.

#### Scenario: Command file exists

- **WHEN** examining `claude-plugins/experiments/commands/`
- **THEN** `commander-update-patch.md` SHALL exist

#### Scenario: Frontmatter present

- **WHEN** reading `commands/commander-update-patch.md`
- **THEN** the file SHALL have YAML frontmatter with a non-empty `description` field

#### Scenario: Command invocable

- **WHEN** the user types `/experiments:commander-update-patch`
- **THEN** Claude SHALL execute the command instructions

---

### Requirement: README Listing Updated

The plugin's `README.md` SHALL list the new command (`commander-update-patch`) and the new skill (`commander-update-orchestrator`) under their respective sections. Existing entries SHALL be preserved.

#### Scenario: README mentions new artifacts

- **WHEN** reading `claude-plugins/experiments/README.md` after this change
- **THEN** the file SHALL reference `commander-update-patch` in its commands section
- **AND** SHALL reference `commander-update-orchestrator` in its skills section

---

### Requirement: Plugin Version Bump

When `commander-update-patch.md` and the `commander-update-orchestrator` skill folder are added (or their behavior modified), the experiments plugin version SHALL be bumped consistently across:

- `claude-plugins/experiments/.claude-plugin/plugin.json`
- `claude-plugins/experiments/package.json`
- `.claude-plugin/marketplace.json` (the `experiments` entry)

All three files SHALL carry the same version number after the change.

#### Scenario: Version consistency post-change

- **WHEN** examining `plugin.json`, `package.json`, and `marketplace.json` (for the `experiments` entry) after this change lands
- **THEN** all three SHALL declare the same version number
- **AND** that version SHALL be strictly greater than the version on the previous commit
