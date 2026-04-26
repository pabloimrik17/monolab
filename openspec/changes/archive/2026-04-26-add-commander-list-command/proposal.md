## Why

[MON-132](https://linear.app/monolab/issue/MON-132/commanderlist-listar-proyectos-registrados) (child of MON-127). Once a user has registered projects via `/experiments:commander-add`, there is no way to inspect the registry without manually opening `~/.claude/commander/projects.json`. `commander:list` is the first read-only consumer of the registry and the natural place to surface drift the schema-v2 transition deliberately deferred (legacy v1 records lacking `repoType`, registry entries whose `path` no longer exists on disk).

## What Changes

- Add `/experiments:commander-list` slash command at `claude-plugins/experiments/commands/commander-list.md` (frontmatter + flow).
- Render registered projects as a per-project YAML-ish block (one block per record, blank line between blocks):
    - Show `path`, `monorepoRoot` (if set), `repoType`, `keywords` (CSV), `description`, `specialRules` (bulleted, if non-empty), `registered` (createdAt date; append `(updated <date>)` when `updatedAt > createdAt`).
    - Final line: `<N> project(s) registered.`
- Order: registry insertion order (matches the existing `commander-registry` `list()` contract — no resort).
- Empty registry: print `No projects registered. Use /experiments:commander-add to register one.` and exit cleanly.
- Drift surfacing (inline next to the project name, never as a separate section):
    - **Legacy v1**: record loaded from a `version: 2` file but missing `repoType` → suffix `[legacy: missing repoType]`.
    - **Missing path**: `path` does not exist on disk at render time → suffix `[missing path]`, and the `path:` line is annotated with ` (NOT FOUND)`.
    - Multiple drift conditions on one record stack: `[legacy: missing repoType] [missing path]`.
- Abort behavior preserved: on `version > 2` the existing reader contract (`unsupported registry version`) applies; the command surfaces that error and exits non-zero without overwriting the file.
- No flags in v1. No filtering, no sorting flags, no `--format` flag, no `--name` shortcut. Add only when a real caller asks.
- Bump experiments plugin version (plugin.json + package.json + marketplace.json) per the project-wide plugin-version-bump policy.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `experiments-plugin`: ADDED requirements describing the `commander-list` command file and its rendering / drift / empty-registry / no-flags behavior. Plugin version bump requirement reaffirmed for this change.
- `commander-registry`: ADDED a single requirement describing the drift signals `commander-list` must surface (the `read`/`list`/`getByName` contract itself is unchanged — the existing spec already promises drift would be surfaced "by future `commander-list`"). This formalizes that promise without altering reader behavior.

## Impact

- **New file**: `claude-plugins/experiments/commands/commander-list.md`.
- **Edited files**: `claude-plugins/experiments/.claude-plugin/plugin.json`, `claude-plugins/experiments/package.json`, `.claude-plugin/marketplace.json`, `claude-plugins/experiments/README.md` (add command to the listing).
- **Specs touched (deltas)**: `experiments-plugin/spec.md`, `commander-registry/spec.md`.
- **No code dependencies added.** The command uses only built-in tools (`Read`, `Bash test -d`, output rendering).
- **Registry contract unchanged.** The on-disk schema, atomic-write recipe, and `add` flow are untouched. v1→v2 auto-migration remains a non-goal (deferred to `commander-update`).
- **No breaking changes.** Read-only consumer.
