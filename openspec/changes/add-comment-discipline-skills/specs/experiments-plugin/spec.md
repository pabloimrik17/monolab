## ADDED Requirements

### Requirement: Comment discipline registration

The `experiments` plugin SHALL provide the two comment-discipline skills and the one command, auto-discovered from the plugin's `skills/` and `commands/` directories with no manifest hand-edit. The skills are `writing-comments` and `purge-comment-noise`; the command is `/experiments:purge-comments`.

The plugin `README.md` SHALL list the two new skills and the new command alongside the existing entries.

No manual version edits SHALL be made to `claude-plugins/experiments/.claude-plugin/plugin.json`, `claude-plugins/experiments/package.json`, or `.claude-plugin/marketplace.json` as part of this change — the version bump is release-please's responsibility.

#### Scenario: Skills auto-discovered

- **WHEN** examining the plugin structure
- **THEN** `skills/writing-comments/SKILL.md` and `skills/purge-comment-noise/SKILL.md` SHALL exist
- **AND** neither SHALL be registered by hand in `plugin.json`

#### Scenario: Command auto-discovered

- **WHEN** examining the plugin structure
- **THEN** `commands/purge-comments.md` SHALL exist
- **AND** SHALL NOT be registered by hand in `plugin.json`

#### Scenario: README listing updated

- **WHEN** examining `claude-plugins/experiments/README.md`
- **THEN** it SHALL list `writing-comments`, `purge-comment-noise`, and `/experiments:purge-comments`

#### Scenario: No manual version edits

- **WHEN** examining the diff for this change
- **THEN** `plugin.json`, `package.json`, and `.claude-plugin/marketplace.json` SHALL NOT have manual version edits
