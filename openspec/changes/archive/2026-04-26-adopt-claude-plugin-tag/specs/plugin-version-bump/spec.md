## REMOVED Requirements

### Requirement: Skill File Structure

**Reason**: The `plugin-version-bump` skill is retired. Plugin version synchronization is now performed automatically by `release-please` via its `extra-files` mechanism, eliminating the need for a session-time skill.

**Migration**: Delete `claude-plugins/experiments/skills/plugin-version-bump/`. Version bumping is handled by the new `claude-plugin-release` capability (release-please on push to `main`).

---

### Requirement: Plugin Detection

**Reason**: Plugin detection is no longer needed at session time; release-please identifies affected plugins via the `packages` keys in `release-please-config.json`.

**Migration**: Refer to `release-please-config.json` for the canonical list of plugin paths.

---

### Requirement: Trigger Conditions

**Reason**: The skill no longer exists, so trigger conditions no longer apply. Releases are triggered by conventional-commit pushes to `main`, not by in-session activity.

**Migration**: Use conventional commit prefixes (`feat(<plugin>)`, `fix(<plugin>)`, `BREAKING CHANGE:`) on commits that affect a plugin. Releases happen on the next push to `main` after the commit lands.

---

### Requirement: Semver Level Determination

**Reason**: Semver classification is no longer the agent's responsibility; release-please derives the bump level from conventional commit types.

**Migration**: Use the conventional-commit-to-bump mapping documented in the new `claude-plugin-release` capability (`feat` → minor, `fix` → patch, `BREAKING CHANGE:` → major).

---

### Requirement: Version File Synchronization

**Reason**: File synchronization is now performed by release-please's `extra-files` mechanism, which atomically bumps `plugin.json`, `marketplace.json`, and `package.json` (where applicable) within the same release PR.

**Migration**: See the `Version File Synchronization` requirement under the new `claude-plugin-release` capability.

---

### Requirement: Multi-Plugin Independence

**Reason**: Per-plugin version lifecycles are preserved by release-please's manifest-mode configuration, where each plugin path has its own entry and is bumped independently based on commits scoped to that path.

**Migration**: Each plugin entry in `release-please-config.json` and `.release-please-manifest.json` maintains its own version. No agent-time guidance is required.

---

### Requirement: Multiple Independent Tasks

**Reason**: Conventional commits already record logical units of work; release-please groups them per plugin and per release window, so the notion of "one bump per logical task" is preserved by the commit history rather than a skill.

**Migration**: Make one logical commit per change (already standard practice). release-please groups commits between releases automatically.
