# Commander Plugin

CRUD over the user-scoped Commander registry at `~/.claude/commander/projects.json`. The registry catalogs the projects you regularly work on with Claude — name, path, keywords, description, optional special-rules — so cross-project tooling (e.g. the `/experiments:commander-update-patch` orchestrator) can fan out across them.

The filesystem contract is identical to the legacy `/experiments:commander-*` commands — only the slash-command namespace and the home plugin have changed.

## Commands

### `/commander:add`

Register the current (or specified) project in the registry. Collects `name`, `path`, `keywords`, `description`, and optional `specialRules` via **A → B → C** priority: explicit args, then a Haiku auto-detection subagent, then `AskUserQuestion` prompts. Writes are atomic.

```bash
/commander:add
/commander:add --name investlab --path /Users/me/code/investlab --keywords react,typescript --description "Portfolio tracker built with SolidStart."
```

### `/commander:list`

List every project registered in the registry. Read-only — never creates, modifies, or deletes `~/.claude/commander/projects.json`. Each project renders as a vertically-aligned YAML-ish block (insertion order); the project name is suffixed inline with `[legacy: missing repoType]` for v1 records and `[missing path]` when the recorded `path` no longer exists on disk. Empty registry prints a discoverability hint pointing to `/commander:add`.

```bash
/commander:list
```

### `/commander:update`

Patch one or more editable fields (`keywords`, `description`, `specialRules`, `repoType`) on a registered project in place. Resolves the target via **A → B** (explicit name or interactive picker); resolves each field's proposed value via **A → B → C** (explicit flag → opt-in Haiku re-scan via `--refresh` → `AskUserQuestion`). Preserves `createdAt`, refreshes `updatedAt`, and reuses `/commander:add`'s atomic-write recipe. A `Save` / `Edit` / `Abort` gate renders a side-by-side diff (`+`/`–` markers on `keywords`/`specialRules`, `← drift backfill` annotation when a legacy v1 record gains `repoType`); `Abort` is the safe default and leaves `projects.json` byte-equivalent. Empty diffs short-circuit to `"no changes"` without bumping `updatedAt`. The vocab-suggestion flow (`gh issue create` for dropped terms) is reused from `/commander:add` and shares the session-skip flag.

```bash
/commander:update                              # interactive picker + field-pick menu
/commander:update investlab --description "New summary."
/commander:update investlab --refresh          # re-scan via Haiku before diff
/commander:update investlab --repo-type single-repo  # legacy v1 backfill
```

### `/commander:delete`

Remove a project record from the registry by `name`. Resolves the target via **A → B** priority: explicit name (positional or `--name`), else interactive pick from `list()` via `AskUserQuestion`. A confirmation prompt (default = cancel) renders `name`, `path`, and `description` before the atomic temp-write + rename. Empty/missing registry exits cleanly without prompting; unknown names abort without touching the file.

```bash
/commander:delete                # interactive picker
/commander:delete investlab      # explicit positional
/commander:delete --name investlab
```

## Skills

### `commander-normalize`

Controlled-vocabulary keyword normalization for the registry. Used by `/commander:add` (Step 2.5) and `/commander:update` to turn raw, stochastic Haiku-detected keywords into the deterministic, alphabetically-sorted list persisted in `~/.claude/commander/projects.json`. Ships `references/vocabulary.json` with `canonical`, `synonyms`, and `excludes` lists; reports `droppedTerms` so callers can surface vocabulary gaps via a `gh issue create` suggestion flow.

## Testing

```bash
claude --plugin-dir ./claude-plugins/commander
```

Then run `/commander:list` (or any of the CRUD commands) in the Claude Code CLI.

## Releases

This plugin is released via git tags formatted `commander--v{version}`.

Triggers: a `feat(commander)` or `fix(commander)` conventional-commit on `main` causes `release-please` to open a release PR. Merging that PR bumps `.claude-plugin/plugin.json`, `package.json`, and the matching entry in the root `.claude-plugin/marketplace.json`, then creates the tag and a GitHub release.

See [`RELEASE.md`](../../RELEASE.md) at the repo root for the full flow, the conventional-commit-to-bump mapping, and the `develop → main` cadence.
