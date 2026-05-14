## ADDED Requirements

### Requirement: `commander-update-deep-patch.md` command file present and listed in README

The `experiments` plugin SHALL include a slash command file at `claude-plugins/experiments/commands/commander-update-deep-patch.md` and SHALL list it in `claude-plugins/experiments/README.md` under the commands section adjacent to its shallow sibling `commander-update-patch.md`.

The command file SHALL carry YAML frontmatter with a non-empty `description` field that explicitly states the "deep" research posture and the "patch level only" scope.

#### Scenario: Command file present

- **WHEN** examining `claude-plugins/experiments/commands/`
- **THEN** `commander-update-deep-patch.md` SHALL exist
- **AND** SHALL contain YAML frontmatter with a non-empty `description` field

#### Scenario: README lists the new command

- **WHEN** examining `claude-plugins/experiments/README.md`
- **THEN** the commands section SHALL list `/experiments:commander-update-deep-patch` with a short blurb
- **AND** the listing SHALL appear near `/experiments:commander-update-patch` for discoverability

---

### Requirement: Plugin version bump driven by release-please

The `experiments` plugin version SHALL be bumped on the next release-please PR triggered by the `feat(experiments): /experiments:commander-update-deep-patch command (MON-199)` commit message. No manual edits to `claude-plugins/experiments/.claude-plugin/plugin.json`, `claude-plugins/experiments/package.json`, or `.claude-plugin/marketplace.json` SHALL be made as part of this change — the version bump is the responsibility of the release-please flow adopted in [MON-194](https://linear.app/monolab/issue/MON-194) (commit `3ea84bd feat(plugins)!: adopt claude-plugin-tag release flow`).

#### Scenario: No manual version edits

- **WHEN** examining the diff for this change
- **THEN** `claude-plugins/experiments/.claude-plugin/plugin.json`, `claude-plugins/experiments/package.json`, and `.claude-plugin/marketplace.json` SHALL NOT have manual version edits in any of the change's commits
- **AND** the version bump is deferred to release-please's next PR
