## ADDED Requirements

### Requirement: Comment discipline registration

The `experiments` plugin SHALL provide the two comment-discipline skills and the one command, auto-discovered from the plugin's `skills/` and `commands/` directories with no manifest hand-edit. The skills are `writing-comments` and `purge-comment-noise`; the command is `/experiments:purge-comments`.

The plugin `README.md` SHALL list the two new skills and the new command alongside the existing entries.

No manual version edits SHALL be made to `claude-plugins/experiments/.claude-plugin/plugin.json`, `claude-plugins/experiments/package.json`, or the repo-root marketplace manifest at `/.claude-plugin/marketplace.json` as part of this change — the version bump is release-please's responsibility.

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
- **THEN** `claude-plugins/experiments/.claude-plugin/plugin.json`, `claude-plugins/experiments/package.json`, and the repo-root `/.claude-plugin/marketplace.json` SHALL NOT have manual version edits

---

### Requirement: Marketplace registration is repo-root only

The `experiments` plugin SHALL be registered for distribution solely in the repo-root marketplace manifest at `/.claude-plugin/marketplace.json`, which `release-please-config.json` names as the extra-file target for the plugin's version. That manifest SHALL be the authoritative registration.

No plugin-local marketplace manifest SHALL exist at `claude-plugins/experiments/.claude-plugin/marketplace.json`. The orphan copy carrying only a stale version field SHALL be deleted by this change, which is a removal of an unread file rather than a manual version edit: nothing resolves that path, and release-please never wrote it. Its removal SHALL leave `experiments` consistent with its sibling plugins, whose `.claude-plugin/` directories hold `plugin.json` alone.

#### Scenario: Orphan plugin-local manifest removed

- **WHEN** examining `claude-plugins/experiments/.claude-plugin/` after this change
- **THEN** it SHALL contain `plugin.json` only
- **AND** `marketplace.json` SHALL NOT be present

#### Scenario: Sibling plugins carry no plugin-local manifest

- **WHEN** examining every `.claude-plugin/` directory under `claude-plugins/`
- **THEN** none SHALL contain a `marketplace.json`

#### Scenario: Root registration is authoritative

- **WHEN** release-please bumps the `experiments` plugin version
- **THEN** it SHALL write the repo-root `/.claude-plugin/marketplace.json` named in `release-please-config.json`
- **AND** the deletion of the plugin-local copy SHALL NOT change what any tool resolves
