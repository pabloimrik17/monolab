## Context

Plugin versioning is manual across 3 files per plugin: `.claude-plugin/plugin.json` (source of truth, read by Claude Code), `package.json` (workspace tooling), and root `.claude-plugin/marketplace.json` (discovery catalog). Anthropic's plugin-dev skills offer zero automation — "update version manually" is the official guidance.

The skill lives in the `experiments` plugin but is designed to be fully portable — it identifies plugins by structure (presence of `.claude-plugin/plugin.json`), not by hardcoded path.

## Goals / Non-Goals

**Goals:**
- Skill that the AI agent uses when finishing work on a plugin to bump version + sync all files
- Determine semver level from change type (new skill/command = minor, edit existing = patch, breaking = major)
- Update plugin.json, package.json, and marketplace.json atomically
- Work for any Claude Code plugin (detected by `.claude-plugin/plugin.json` presence, not hardcoded path)

**Non-Goals:**
- CHANGELOG generation (deferred — no official plugin CHANGELOG convention exists)
- Release Please integration (orthogonal — can be added later)
- Triggering automatically via hooks (this is a skill, not a hook)
- Publishing or git tagging (separate concern)

## Decisions

### Decision 1: Skill, not Hook

Use a skill (SKILL.md) that the agent invokes at task completion, not a PostToolUse hook.

**Rationale:** Hooks fire per tool use — wrong granularity. The agent needs to understand "I'm done modifying this plugin" which requires semantic understanding, not file-watching. A skill description like "use after completing plugin modifications" lets the model decide timing.

**Alternatives considered:**
- PostToolUse hook on Write/Edit in claude-plugins/ → fires too often, can't batch
- CLAUDE.md instruction → not portable, no structured guidance
- Slash command → requires user to remember; skill auto-triggers

### Decision 2: Semver Determination via Change Classification

The skill instructs the agent to classify changes:

| Change Type | Semver | Examples |
|---|---|---|
| New skill, command, agent, or hook | minor | Add `skills/foo/SKILL.md` |
| Edit existing component | patch | Fix typo in skill, update description |
| Remove component or rename | major (if breaking) | Remove a command users depend on |
| Metadata-only (description, keywords) | patch | Update plugin.json description |

Agent makes the judgment call — the skill provides the classification table.

**Rationale:** The agent already knows what it changed. Trying to diff files programmatically is fragile and unnecessary when the agent has full context.

### Decision 3: File Update Order

1. Read current version from `plugin.json` (source of truth)
2. Compute new version
3. Update `plugin.json`
4. Update `package.json`
5. Update `marketplace.json` (find entry by plugin name)

**Rationale:** plugin.json is authoritative per Claude Code docs. Others sync from it.

### Decision 4: Marketplace Entry Matching

Match plugin in marketplace.json by `name` field, not array index.

**Rationale:** Array indices are fragile. Plugin names are unique identifiers.

### Decision 5: Plugin Detection by Structure

Identify plugins by the presence of `.claude-plugin/plugin.json` in any ancestor directory of the modified files, not by a hardcoded path like `claude-plugins/`.

**Rationale:** Makes the skill portable to any repo layout. A plugin is a plugin regardless of where it lives. The agent should recognize it's editing a plugin when any modified file has a `.claude-plugin/plugin.json` in its directory tree.

**Alternatives considered:**
- Hardcode `claude-plugins/` path → breaks portability, excludes plugins in other locations
- Check only working directory → misses nested plugin structures

### Decision 6: Multi-Plugin Awareness

If a single task modifies multiple plugins, the skill instructs the agent to bump each independently.

**Rationale:** Each plugin has its own version lifecycle. A change to experiments shouldn't bump expo-developer.

### Decision 7: Skill Location

Place in `experiments` plugin: `claude-plugins/experiments/skills/plugin-version-bump/SKILL.md`

**Rationale:** experiments is the staging area for beta skills. If proven, could graduate to a standalone plugin or be contributed upstream to plugin-dev.

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| Agent forgets to use skill | Skill description optimized for high trigger rate on plugin work |
| Agent bumps version mid-work (not at end) | Skill explicitly says "use AFTER completing all modifications" |
| Wrong semver level chosen | Classification table in skill guides decision; agent can ask user if unclear |
| marketplace.json missing the plugin entry | Skill instructs agent to add entry if missing |
| Multiple independent tasks in same session | Skill instructs: one bump per logical unit of work; if doing two unrelated changes, bump after each |
