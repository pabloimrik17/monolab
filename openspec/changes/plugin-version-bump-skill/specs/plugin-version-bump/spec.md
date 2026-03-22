## ADDED Requirements

### Requirement: Skill File Structure

The skill SHALL exist at `claude-plugins/experiments/skills/plugin-version-bump/SKILL.md`.

The SKILL.md SHALL include frontmatter with:
- `name`: "Plugin Version Bump"
- `description`: Trigger-optimized description for detecting plugin modification work

#### Scenario: Skill file exists

- **WHEN** examining `claude-plugins/experiments/skills/plugin-version-bump/`
- **THEN** `SKILL.md` SHALL exist with valid frontmatter

---

### Requirement: Trigger Conditions

The skill SHALL activate when the agent completes modifications to any plugin under `claude-plugins/`.

The skill SHALL NOT activate:
- During ongoing work (mid-task)
- For changes outside `claude-plugins/`
- For changes that only affect non-plugin files (e.g., openspec/, packages/)

#### Scenario: Agent finishes adding a new skill to a plugin

- **WHEN** agent completes creating a new skill file under `claude-plugins/<plugin>/skills/`
- **THEN** the skill SHALL activate and guide version bumping

#### Scenario: Agent edits files outside claude-plugins

- **WHEN** agent modifies files only in `packages/` or `apps/`
- **THEN** the skill SHALL NOT activate

#### Scenario: Agent is mid-task in a plugin

- **WHEN** agent has edited one skill file but is about to edit another as part of the same task
- **THEN** the skill SHALL NOT activate until the task is complete

---

### Requirement: Semver Level Determination

The skill SHALL instruct the agent to classify changes and determine the semver bump level:

| Change Type | Semver Level |
|---|---|
| New skill, command, agent, or hook added | minor |
| Existing component edited (content, description, fix) | patch |
| Component removed or renamed (breaking) | major |
| Metadata-only change (plugin.json fields, README) | patch |

#### Scenario: New command added

- **WHEN** agent has added a new command file to a plugin
- **THEN** the skill SHALL guide the agent to apply a minor version bump

#### Scenario: Existing skill content edited

- **WHEN** agent has edited the content of an existing SKILL.md
- **THEN** the skill SHALL guide the agent to apply a patch version bump

#### Scenario: Command removed

- **WHEN** agent has removed a command file from a plugin
- **THEN** the skill SHALL guide the agent to apply a major version bump

---

### Requirement: Version File Synchronization

The skill SHALL instruct the agent to update ALL version-bearing files for the affected plugin:

1. `.claude-plugin/plugin.json` — `version` field (source of truth)
2. `package.json` — `version` field
3. Root `.claude-plugin/marketplace.json` — `plugins[].version` for the matching plugin entry (matched by `name` field)

All three files SHALL contain the same version string after the bump.

#### Scenario: All files updated after bump

- **WHEN** agent bumps experiments plugin from 0.2.1 to 0.3.0
- **THEN** `claude-plugins/experiments/.claude-plugin/plugin.json` version SHALL be "0.3.0"
- **AND** `claude-plugins/experiments/package.json` version SHALL be "0.3.0"
- **AND** `.claude-plugin/marketplace.json` experiments entry version SHALL be "0.3.0"

#### Scenario: Marketplace entry matched by name

- **WHEN** agent bumps a plugin named "expo-developer"
- **THEN** the agent SHALL find the marketplace entry where `name` equals "expo-developer"
- **AND** update that entry's `version` field

#### Scenario: Plugin not in marketplace

- **WHEN** agent bumps a plugin that has no entry in marketplace.json
- **THEN** the agent SHALL add a new entry to the `plugins` array with `name`, `source`, `version`, and `description`

---

### Requirement: Multi-Plugin Independence

When a task modifies multiple plugins, the skill SHALL guide the agent to bump each plugin's version independently.

#### Scenario: Two plugins modified in same task

- **WHEN** agent modifies files in both `claude-plugins/experiments/` and `claude-plugins/expo-developer/`
- **THEN** the skill SHALL guide separate version bumps for each plugin
- **AND** each bump SHALL reflect only that plugin's changes

---

### Requirement: Multiple Independent Tasks

When the agent performs multiple independent tasks on the same plugin in one session, the skill SHALL guide a version bump after each logical unit of work completes.

#### Scenario: Two independent changes to same plugin

- **WHEN** agent adds a new skill to experiments, then later fixes a command in experiments (separate tasks)
- **THEN** the skill SHALL guide a bump after the first task (minor)
- **AND** a second bump after the second task (patch)

#### Scenario: Related changes grouped

- **WHEN** agent adds a new skill and its supporting command as part of a single feature
- **THEN** the skill SHALL guide a single bump (minor, since new component added)
