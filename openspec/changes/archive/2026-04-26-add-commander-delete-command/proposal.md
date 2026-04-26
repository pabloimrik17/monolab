## Why

`commander:add` (MON-129) seeds the registry; users now need an inverse operation. Without `commander:delete`, stale projects accumulate in `~/.claude/commander/projects.json` and the only recourse is hand-editing JSON, which defeats the point of the registry. MON-130 closes the gap so the catalog can be curated through commands alone.

## What Changes

- Add a new slash command `/experiments:commander-delete` that removes a project record from the registry by `name`.
- Resolve the target with priority A→B: explicit `--name` (or first positional argument) → prompt the user via `AskUserQuestion` from the current `list()` of registered projects.
- Require explicit confirmation (`AskUserQuestion`, default = cancel) showing `name`, `path`, and `description` before any write.
- Persist removal via a new `delete(name)` registry operation that uses the same atomic temp-write + rename contract as `add`.
- If the target name does not exist, abort with a clear "project not registered" message and SHALL NOT touch the file.
- Ship in the `experiments` plugin alongside `commander-add`. Future Commander-plugin extraction is a pure rename of the namespace.
- Bump `experiments` plugin version across `plugin.json`, `package.json`, and the `experiments` entry in `.claude-plugin/marketplace.json`.

## Capabilities

### New Capabilities

None. This change extends existing capabilities only.

### Modified Capabilities

- `commander-registry`: ADD a `delete(name)` write operation (atomic, refuses unknown names, leaves file untouched on failure).
- `experiments-plugin`: ADD requirements for the `experiments:commander-delete` command (file location, frontmatter, target resolution, confirmation, deletion flow).

## Impact

- **Affected code**:
  - `claude-plugins/experiments/commands/commander-delete.md` (new)
  - `claude-plugins/experiments/.claude-plugin/plugin.json` (version bump)
  - `claude-plugins/experiments/package.json` (version bump)
  - `.claude-plugin/marketplace.json` (version bump on `experiments` entry)
- **Affected user data**: removes one entry from `~/.claude/commander/projects.json`. Schema version unchanged (still v2).
- **Dependencies**: none new. Uses Claude Code built-ins (`Read`, `Write`, `Bash` for `mv`, `AskUserQuestion`).
- **Migration**: none — purely additive.
- **Linked tickets**: MON-127 (epic), MON-130 (this feature). Sibling: MON-129 (add).
