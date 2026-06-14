# experiments-plugin Specification

## ADDED Requirements

### Requirement: `commander-config-add.md` command file present and listed in README

The `experiments` plugin SHALL include a slash command file at `claude-plugins/experiments/commands/commander-config-add.md` and SHALL list it in `claude-plugins/experiments/README.md` under the commands section. Existing entries SHALL be preserved.

The command file SHALL carry YAML frontmatter with a non-empty `description` field. The command SHALL be invocable as `/experiments:commander-config-add`. This is the staging home for the `commander:config-*` family (the same plugin as the `commander-update-*` commands); it graduates to the `commander` plugin later, exactly as the CRUD commands did.

#### Scenario: Command file present

- **WHEN** examining `claude-plugins/experiments/commands/`
- **THEN** `commander-config-add.md` SHALL exist
- **AND** SHALL contain YAML frontmatter with a non-empty `description` field

#### Scenario: Command invocable

- **WHEN** the user types `/experiments:commander-config-add`
- **THEN** Claude SHALL execute the command instructions

#### Scenario: README lists the new command

- **WHEN** examining `claude-plugins/experiments/README.md`
- **THEN** the commands section SHALL list `/experiments:commander-config-add` with a short blurb
- **AND** existing entries SHALL be preserved
