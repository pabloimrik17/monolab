---
name: plugin-version-bump
description: This skill should be used after completing modifications to a Claude Code plugin (any directory with .claude-plugin/plugin.json) to "bump version", "update plugin version", or "sync version files". Also trigger proactively after finishing plugin changes — not mid-task.
---

# Plugin Version Bump

Use this skill **after completing all modifications** to a Claude Code plugin. Do NOT use mid-task.

## Plugin Detection

A Claude Code plugin is any directory containing `.claude-plugin/plugin.json`. Identify affected plugins by finding `.claude-plugin/plugin.json` in the directory tree of modified files. Do NOT rely on hardcoded paths.

If no modified files belong to a plugin directory, this skill does not apply.

## Semver Classification

Determine bump level from the type of change made:

| Change Type                                | Bump  | Examples                               |
| ------------------------------------------ | ----- | -------------------------------------- |
| New skill, command, agent, or hook         | minor | Add `skills/foo/SKILL.md`, new command |
| Existing component edited                  | patch | Fix typo in skill, update description  |
| Component removed or renamed (breaking)    | major | Remove a command users depend on       |
| Metadata-only (plugin.json fields, README) | patch | Update description or keywords         |

If the correct level is unclear, ask the user.

## File Update Order

For each affected plugin:

1. **Read** current version from `.claude-plugin/plugin.json` (source of truth)
2. **Compute** new version using the semver level determined above
3. **Update** `.claude-plugin/plugin.json` `version` field
4. **Update** `package.json` `version` field (if present in plugin root)
5. **Update** root `.claude-plugin/marketplace.json` (registry file) — find the plugin entry by `name` field (not array index) and update its `version`
    - If the plugin has no marketplace entry, add one with `name`, `source`, `version`, and `description`

All files MUST contain the same version string after the bump.

## Multi-Plugin / Multi-Task Rules

- If a single task modifies **multiple plugins**, bump each independently — each plugin has its own version lifecycle
- If performing **multiple independent tasks** on the same plugin in one session, bump after each logical unit of work completes
- If multiple changes are part of a **single feature** (e.g., new skill + supporting command), apply a single bump at the highest applicable level
