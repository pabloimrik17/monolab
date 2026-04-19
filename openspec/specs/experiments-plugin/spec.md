# experiments-plugin Specification

## Purpose

Beta skills and commands staging area for the monolab Claude Code marketplace.

## Requirements

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

#### Scenario: Skills directory exists

- **WHEN** examining the plugin structure
- **THEN** `skills/` directory SHALL exist at the plugin root

#### Scenario: package.json is private

- **WHEN** examining `package.json` at the plugin root
- **THEN** it SHALL contain `"private": true`

#### Scenario: README exists

- **WHEN** examining the plugin root at `claude-plugins/experiments/`
- **THEN** `README.md` SHALL exist

---

### Requirement: Plugin Manifest Content

The plugin manifest SHALL include:
- `name`: "experiments"
- `version`: Starting at "0.1.0"
- `description`: "Beta skills and commands staging area for monolab"
- `keywords`: ["experiments", "beta", "staging", "skills"]

#### Scenario: Manifest has required fields

- **WHEN** parsing `plugin.json`
- **THEN** all required fields SHALL be present and valid

---

### Requirement: Hello Experiments Command

The plugin SHALL provide `/experiments:hello-experiments` command.

When invoked, the command SHALL:
- Explain the plugin's purpose as a staging area for beta features
- List any experimental skills/commands currently available (or state none if empty)
- Mention that features here may graduate to production plugins

#### Scenario: Command invocation

- **WHEN** user types `/experiments:hello-experiments`
- **THEN** Claude SHALL respond with the plugin purpose explanation

#### Scenario: Command file location

- **WHEN** examining the plugin structure
- **THEN** `commands/hello-experiments.md` SHALL exist

---

### Requirement: Marketplace Registration

The experiments plugin SHALL be registered in `.claude-plugin/marketplace.json`.

#### Scenario: Plugin in marketplace

- **WHEN** examining `.claude-plugin/marketplace.json` plugins array
- **THEN** it SHALL include an entry for `experiments` with name, source, version, description

#### Scenario: Plugin installable

- **WHEN** user runs `/plugin install experiments@monolab`
- **THEN** the experiments plugin SHALL install successfully

---

### Requirement: Workspace Integration

The plugin SHALL be recognized as a pnpm workspace member.

#### Scenario: Package.json exists

- **WHEN** examining `claude-plugins/experiments/package.json`
- **THEN** it SHALL have `name: "@m0n0lab/plugin-experiments"` and `"private": true`

#### Scenario: Workspace recognition

- **WHEN** running `pnpm install` from root
- **THEN** the experiments plugin SHALL be recognized as workspace member

---

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

---

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

---

### Requirement: Commander Add Command File

The `experiments` plugin SHALL include `commands/commander-add.md`.

The command file SHALL have YAML frontmatter with a `description` field. The command SHALL be invocable as `/experiments:commander-add`.

#### Scenario: Command file exists

- **WHEN** examining `claude-plugins/experiments/commands/`
- **THEN** `commander-add.md` SHALL exist

#### Scenario: Frontmatter present

- **WHEN** reading `commands/commander-add.md`
- **THEN** the file SHALL have YAML frontmatter with a non-empty `description` field

#### Scenario: Command invocable

- **WHEN** user types `/experiments:commander-add`
- **THEN** Claude SHALL execute the command instructions

---

### Requirement: Commander Add Metadata Capture Priority

The `commander-add` command SHALL collect project metadata (name, path, keywords, description, special rules) using priority A→B→C:

- **A) Explicit arguments**: fields provided by the user as command arguments are taken as-is.
- **B) Auto-detection**: fields not provided by A are inferred by dispatching a subagent with `model: "haiku"` that inspects the target directory. Detected values SHALL be shown to the user for confirmation or edit before persisting.
- **C) Prompt**: fields still missing after B SHALL be requested from the user field-by-field via `AskUserQuestion`.

#### Scenario: All fields provided as arguments

- **WHEN** the user invokes `/experiments:commander-add` with all metadata fields supplied as arguments
- **THEN** the command SHALL NOT dispatch the Haiku subagent
- **AND** SHALL NOT prompt the user for any field except the final save confirmation

#### Scenario: Auto-detection confirmation step

- **WHEN** the command auto-detects any field
- **THEN** it SHALL present the detected values to the user before writing
- **AND** SHALL allow the user to confirm, edit, or reject each field

#### Scenario: Prompted field when undetectable

- **WHEN** a required field cannot be supplied by A or B
- **THEN** the command SHALL prompt the user explicitly for that field

---

### Requirement: Commander Add Monorepo Handling

When the target directory is a monorepo, the `commander-add` command SHALL classify it as single-project or multi-project.

- **Single-project monorepo**: keywords and description SHALL be extracted from the entire repository.
- **Multi-project monorepo**: the command SHALL ask the user which subproject to register. The `path` field SHALL record the chosen subproject directory (not the monorepo root). Keywords AND description SHALL be scoped to the chosen subproject (the auto-detection subagent emits a per-subproject `description`; the top-level monorepo description is used only as a fallback when the subagent omits it, and the user SHALL be invited to edit it in the confirmation step). The optional `monorepoRoot` field SHALL record the monorepo root path.

#### Scenario: Multi-project monorepo prompts for subproject

- **WHEN** the target directory contains workspace markers (e.g., `pnpm-workspace.yaml`, `nx.json`, `turbo.json`, `lerna.json`) with multiple independent projects
- **AND** the user did not indicate a subproject via arguments
- **THEN** the command SHALL present the detected subprojects via `AskUserQuestion` for the user to choose one

#### Scenario: Keywords and description scoped to chosen subproject

- **WHEN** the user picks a subproject in a multi-project monorepo
- **THEN** the persisted `keywords` SHALL be extracted from that subproject only
- **AND** the persisted `description` SHALL be the subproject-level summary emitted by the auto-detection subagent (or, if absent, the monorepo-level description flagged for user edit at confirmation)
- **AND** the persisted `path` SHALL be the subproject's absolute directory

#### Scenario: Single-project monorepo aggregates keywords

- **WHEN** the target directory is a monorepo with a single coherent project
- **THEN** keywords SHALL be aggregated across the repository

---

### Requirement: Commander Add Registration Flow

The `commander-add` command SHALL, before persisting:

1. Validate that `path` exists on disk.
2. Validate that `name` is not already present in the registry.
3. Show the final record to the user and require an explicit confirmation.

On confirmation the command SHALL invoke the `commander-registry` `add` operation.

#### Scenario: User cancels at final confirmation

- **WHEN** the user declines the final confirmation
- **THEN** the registry file SHALL remain unchanged
- **AND** the command SHALL exit without error

#### Scenario: Duplicate name blocked before prompt

- **WHEN** the proposed `name` already exists in the registry
- **THEN** the command SHALL inform the user and SHALL NOT proceed to write
- **AND** SHALL offer the user the option to pick a different name or abort

#### Scenario: Path does not exist

- **WHEN** the resolved `path` does not exist on disk
- **THEN** the command SHALL abort with a clear message identifying the invalid path
