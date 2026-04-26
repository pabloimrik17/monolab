## REMOVED Requirements

### Requirement: Plugin Version Bump Skill

**Reason**: The `plugin-version-bump` skill is retired in favor of automated version synchronization performed by `release-please` via its `extra-files` mechanism (see new capability `claude-plugin-release`). Keeping the skill would create two divergent sources of truth for plugin version bumps.

**Migration**: Plugin version bumps now happen automatically when conventional-commit feature/fix changes land on `main`. The release-please action opens a PR that updates `.claude-plugin/plugin.json`, the root `.claude-plugin/marketplace.json` entry, and the plugin's `package.json` atomically. Contributors no longer invoke a session-time skill; they rely on commit messages (`feat(experiments): ...`, `fix(experiments): ...`) to drive the bump. See the new `claude-plugin-release` capability for the full flow.
