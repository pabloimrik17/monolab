## Why

MON-127 introduces `commander:*`: a user-scoped registry of the user's projects that all future Commander commands consume. MON-128 (spike, blocker) defines the persistence layer and MON-129 adds the first command (`commander:add`). This change combines both so the persistence contract is defined alongside its first consumer, avoiding artifact churn across two nearly-empty changes.

## What Changes

- Introduce a persistent project registry under the user's Claude Code data directory, keyed by unique project name, with versioned JSON schema.
- Expose a stable read/write contract (read, list, getByName, add, atomic persist) that future `commander:*` commands (delete, update, list, config-add) will consume without further schema changes.
- Add a new slash command `/experiments:commander-add` that captures project metadata (name, path, keywords, description, special rules) with A→B→C priority: explicit args → Haiku subagent auto-detection → field-by-field prompt.
- Handle monorepos: single-project monorepos extract keywords from the whole repo; multi-project monorepos prompt the user to pick a subproject, and `path` records the subproject directory (not the monorepo root).
- Validate on registration: `path` must exist on disk; `name` must be unique.
- Writes are synchronous and atomic (write-to-temp then rename); no lockfile in v1.
- Ship the command in the `experiments` plugin. When Commander graduates to its own plugin, only the plugin namespace changes (`experiments:commander-add` → `commander:add`); registry path and schema stay identical.
- Bump `experiments` plugin version across `plugin.json`, `package.json`, and the `experiments` entry in `.claude-plugin/marketplace.json`.

## Capabilities

### New Capabilities

- `commander-registry`: File location, schema version, record shape, and read/write/query operations for the user-scoped project registry. Consumed by every `commander:*` command.

### Modified Capabilities

- `experiments-plugin`: ADD requirement for the `experiments:commander-add` command (file location, frontmatter, invocation contract).

## Impact

- **Affected code**:
  - `claude-plugins/experiments/commands/commander-add.md` (new)
  - `claude-plugins/experiments/.claude-plugin/plugin.json` (version bump)
  - `claude-plugins/experiments/package.json` (version bump)
  - `.claude-plugin/marketplace.json` (version bump on `experiments` entry)
- **Affected user data**:
  - New file `~/.claude/commander/projects.json` created on first registration.
- **Dependencies**: none new. Uses Claude Code built-ins (`Read`, `Write`, `Glob`, `Grep`, `Agent` with `model: haiku`, `AskUserQuestion`).
- **Migration**: future Commander-plugin extraction is a pure move — no data migration required.
- **Linked tickets**: MON-127 (epic), MON-128 (spike, blocker), MON-129 (feature).
