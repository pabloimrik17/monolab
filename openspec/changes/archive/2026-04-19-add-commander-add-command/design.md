# Design: Commander Registry and `commander-add`

## Context

MON-127 introduces Commander, a user-scoped project catalog consumed by five slash commands (`add`, `delete`, `update`, `list`, `config-add`). Before any command exists, we need a durable location, schema, and contract. MON-128 is the spike that answers *where* and *how*; MON-129 is the first feature to consume it.

Existing patterns in `~/.claude/`:

- `~/.claude/changelogs/` — used by `experiments:npm-changelog` to cache npm changelogs.
- `~/.claude/plans/`, `~/.claude/projects/`, `~/.claude/skills/` — first-party Claude Code data.
- `~/.claude/plugins/cache/` — **managed by Claude Code itself** (clones of installed marketplace plugins). User data written there is at risk of being overwritten on plugin reinstall.

Constraint: no runtime code. Commands are Markdown with instructions and dispatch built-in tools. No Node/Python module to import. The "registry contract" is a spec that every command re-implements via `Read`/`Write`/`Glob`.

## Goals / Non-Goals

**Goals**

- Define a forward-compatible on-disk format for the project registry.
- Ship `commander-add` as the first consumer.
- Keep metadata-capture cost low (Haiku, not Opus).
- Avoid lockstep coupling to the current plugin layout so the extraction to a dedicated `commander` plugin is a pure move.

**Non-Goals**

- Delete / update / list / config-add commands (separate tickets: MON-130/131/132/156).
- Concurrency safety across multiple simultaneous `commander:*` invocations (lockfile, retries, CAS).
- Schema migration infrastructure (not needed at v1).
- Syncing the registry across machines.

## Decisions

### Decision 1 — Storage location: `~/.claude/commander/projects.json`

Sibling of `~/.claude/changelogs/`. Single file, JSON, 2-space indented, keyed by project name.

**Why:**
- Matches the convention already used by first-party data and by `experiments:npm-changelog`.
- Safe from plugin reinstall: `~/.claude/commander/` is not touched by Claude Code's plugin installer.
- Easy to debug: `cat ~/.claude/commander/projects.json`.
- Survives the `experiments → commander` plugin extraction without migration.

**Rejected alternatives:**
- `~/.claude/plugins/cache/...` — invalidated by plugin reinstall. This was the user's initial instinct; worth naming explicitly as *rejected* so future readers don't revisit it.
- `~/.claude/plugins/data/commander/...` — invents a convention no other plugin uses.
- One file per project (`projects/<name>.json`) — cleaner merges but more code (list = N reads). Deferred to a later optimization if we hit friction.

### Decision 2 — Versioned, keyed-by-name schema

```json
{
  "version": 1,
  "projects": {
    "investlab": {
      "name": "investlab",
      "path": "/Users/.../monolab/apps/investlab",
      "monorepoRoot": "/Users/.../monolab",
      "keywords": ["react", "solid-start", "typescript"],
      "description": "Portfolio tracker, SolidStart-based, lives inside monolab monorepo.",
      "specialRules": ["No ESLint"],
      "createdAt": "2026-04-18T21:00:00Z",
      "updatedAt": "2026-04-18T21:00:00Z"
    }
  }
}
```

**Why keyed by name instead of an array:**
- Uniqueness of `name` is enforced by the data shape (O(1) check).
- `getByName` is a direct lookup.
- `name` is still duplicated inside each record to simplify code paths that receive a record standalone.

**Why `version: 1`:**
- Cheap insurance. If we ever need to change the shape, readers can branch on version instead of guessing.

### Decision 3 — Path stores the effective project directory

`path` points at the directory the user considers "the project". If that's a subproject of a monorepo, `path` is the subproject directory and `monorepoRoot` records the outer root.

**Why:** future commands (hypothetical `commander:cd investlab`) want the directory where work happens, not the monorepo root. Keeping `monorepoRoot` separate avoids losing the monorepo context when it's relevant (e.g., for `pnpm`/`nx` detection).

### Decision 4 — Haiku subagent for auto-detection

Auto-detection (priority B) runs via `Agent({ model: "haiku", subagent_type: "general-purpose", prompt: "..." })`.

**Why Haiku:**
- Detecting stack from `package.json`, `nx.json`, etc. is classification, not reasoning. Haiku is sufficient.
- Cost: a few thousand input tokens; negligible per invocation.
- Latency: Haiku responds fast enough that the user stays in the flow.

**Why subagent over direct API call:**
- Subagents use the same built-in tools (`Read`, `Glob`, `Grep`) and return text. No Node/Python runtime to wire up.
- The command stays a single Markdown file.

**Subagent contract:** return a single JSON object with `{ isMonorepo, monorepoType, subprojects, keywords, description, specialRules }`. The calling command parses that JSON, shows it to the user, and asks for confirmation.

### Decision 5 — Synchronous atomic write (temp + rename), no lockfile

**Why atomic write:**
- Rename is atomic on POSIX and Windows on the same filesystem. Cheap protection against half-written files on crash/interrupt.

**Why no lockfile:**
- v1 assumes single-user, single-invocation. Two concurrent `commander:add` invocations on different projects is a YAGNI-level concern. Adding a lockfile complicates the contract and every future command.
- If we ever see a collision we add the lockfile behind the same contract.

### Decision 6 — Ship in `experiments` first; plug-and-play move later

Location: `claude-plugins/experiments/commands/commander-add.md`. Command name: `/experiments:commander-add`.

**Why now in experiments:**
- Commander is a new subsystem; experiments is the staging area.
- Avoids a premature dedicated plugin with one command.

**Extraction path:**
- When extracting, copy the command file into `claude-plugins/commander/commands/add.md`.
- Command name becomes `/commander:add`.
- Registry path and schema are unchanged — zero data migration.

### Decision 7 — Classify monorepo type by marker files + subproject count

Single-project vs multi-project detection by Haiku, using these signals:

- Marker files present: `pnpm-workspace.yaml`, `nx.json`, `turbo.json`, `lerna.json`, `rush.json`, `package.json#workspaces`, `Cargo.toml [workspace]`, `go.work`.
- Number and independence of workspace packages: single primary app + internal libs → single; multiple independent apps → multi.

Haiku returns the classification; when multi, the command presents the subprojects via `AskUserQuestion`.

**Trade-off:** the heuristic can misclassify edge cases (e.g., two apps where one is clearly dominant). Mitigation: confirmation step always shows the user what was decided and lets them override.

## Risks / Trade-offs

- **Registry file corrupted by external edit** → registry becomes unparseable. *Mitigation:* commands fail with a clear "registry invalid JSON" message pointing at the file. User fixes by hand (intentionally simple data structure).
- **Haiku hallucinates a keyword** → wrong metadata registered. *Mitigation:* mandatory confirmation step before write. User has veto.
- **Command-level uniqueness check races with file writes** → since writes are sync inside a single command invocation, impossible within a single run. Cross-invocation races are out of scope (Decision 5).
- **Schema evolution** → adding optional fields is safe (`version` stays 1). Removing or renaming required fields bumps `version` and all commands must handle both. Accepted cost.
- **`monorepoRoot` detection false positive** → storing a spurious path. *Mitigation:* only set when a workspace marker is actually found above `path`.

## Migration Plan

First registration creates `~/.claude/commander/` and `projects.json`. No prior state exists, so migration is a no-op.

Rollback: delete `~/.claude/commander/` and uninstall the command. No other state is touched.

## Open Questions

- **Windows path normalization**: should we normalize `path` to forward slashes for portability? Current leaning: store the platform-native form; normalize only when comparing. Punt until a Windows user hits an issue.
- **Keyword casing**: Haiku may return `React Native` or `react-native`. Leaning: canonicalize to lowercase kebab-case before persisting, keep user-provided forms verbatim if supplied via A. Punt until the `list` command surfaces this.
