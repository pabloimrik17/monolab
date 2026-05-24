## Why

Commander has outgrown its experimental home. The CRUD surface (`add` / `list` / `update` / `delete`) plus the `commander-normalize` skill plus the `commander-registry` filesystem contract already form a coherent, production-ready capability with its own specs and pipelines — yet they live under `claude-plugins/experiments/`, the documented "staging area" for beta features. Graduating commander to its own plugin gives it independent versioning, a marketplace identity, and lets experiments resume its real job (incubating betas).

## What Changes

- **NEW plugin** `claude-plugins/commander/` (initial version `0.1.0`) — first release-please bump lands it at `1.0.0`.
- **MOVE** four CRUD commands from `claude-plugins/experiments/commands/` to `claude-plugins/commander/commands/` with renamed files:
    - `commander-add.md`    → `add.md`    (slash: `/experiments:commander-add` → `/commander:add`)
    - `commander-list.md`   → `list.md`   (slash: `/experiments:commander-list` → `/commander:list`)
    - `commander-update.md` → `update.md` (slash: `/experiments:commander-update` → `/commander:update`)
    - `commander-delete.md` → `delete.md` (slash: `/experiments:commander-delete` → `/commander:delete`)
- **MOVE** skill `claude-plugins/experiments/skills/commander-normalize/` → `claude-plugins/commander/skills/commander-normalize/`.
- **KEEP in experiments** (with updated internal references): `commander-update-patch`, `commander-update-deep-patch`, and skill `commander-update-orchestrator`. They consume the registry and reference the moved CRUD slash commands.
- **UPDATE slash-command references** across all moved AND remaining files (commands, skills, READMEs) from `/experiments:commander-*` to `/commander:*` for the four moved CRUD commands.
- **REGISTER** the new plugin in root `.claude-plugin/marketplace.json`, `release-please-config.json` (tag prefix `commander--v`), `.release-please-manifest.json`, and pnpm workspace.
- **UPDATE** READMEs: drop the CRUD section from `experiments/README.md` and add a "see commander plugin" pointer; author a fresh `commander/README.md`.
- **BREAKING**: every invocation site of `/experiments:commander-{add,list,update,delete}` (user aliases, scripts, prior session muscle memory) is severed. No legacy aliases preserved — user is sole operator and has accepted the clean cut.

## Capabilities

### New Capabilities

- `commander-plugin`: Plugin shell — directory structure, `plugin.json` manifest content, marketplace registration, workspace integration, release-please coupling.
- `commander-add-command`: Behavior of `/commander:add` (metadata capture priority A→B→C, monorepo handling, normalization pipeline, repoType persistence, vocabulary suggestion flow, registration flow). Extracted from `experiments-plugin`.
- `commander-list-command`: Behavior of `/commander:list` (read-only contract, empty-registry message, render format, drift surfacing, unsupported-version handling, no-arguments handling). Extracted from `experiments-plugin`.
- `commander-delete-command`: Behavior of `/commander:delete` (target resolution A→B, confirmation flow). Extracted from `experiments-plugin`.

### Modified Capabilities

- `commander-registry`: Slash-command references in normative text and scenarios change from `/experiments:commander-*` to `/commander:*` for the four moved CRUD commands. Filesystem contract (`<HOME>/.claude/commander/projects.json`) is unchanged.
- `commander-normalize-skill`: Skill file path changes to `claude-plugins/commander/skills/commander-normalize/`. Owner plugin is `commander`, not `experiments`. References to invoking slash commands change to `/commander:*` for the CRUD callers.
- `commander-update-command`: Command file path changes to `claude-plugins/commander/commands/update.md`; slash command renames to `/commander:update`. Owner plugin is `commander`.
- `commander-update-patch-command`: Stays in experiments. Internal references to the four moved CRUD slash commands rename to `/commander:*`.
- `commander-update-deep-patch-command`: Stays in experiments. Same reference rename.
- `commander-update-orchestrator-skill`: Stays in experiments. Same reference rename. Registry filesystem path unchanged (still `<HOME>/.claude/commander/projects.json`).
- `experiments-plugin`: Drop all requirements for `commander-add`, `commander-list`, `commander-delete`, and `commander-update` command files / behavior. Retain requirements for `commander-update-patch`, `commander-update-deep-patch`, and `commander-update-orchestrator`. README listing requirement updated accordingly.
- `claude-plugin-release`: Add scenarios mandating a `claude-plugins/commander` package entry in `release-please-config.json` and `.release-please-manifest.json`, plus a `commander--v{version}` tag-format scenario.

## Impact

- **Affected directories**: `claude-plugins/commander/` (new), `claude-plugins/experiments/{commands,skills,README.md}` (commander-* and references removed/edited), `openspec/specs/` (specs renamed/relocated).
- **Affected config files**: `.claude-plugin/marketplace.json` (new entry), `release-please-config.json` (new package entry with `commander--v` tag prefix), `.release-please-manifest.json` (seed `claude-plugins/commander: 0.1.0`), `commitlint.config.ts` (add `commander` to allowed scopes if scope list is restricted), `pnpm-workspace.yaml` (workspace member if matched by glob — verify), `nx.json` / `knip.config.ts` (verify entries).
- **CI**: release-please job picks up the new package entry; conventional-commit scope `commander` becomes a first-class release driver.
- **User-facing**: `/experiments:commander-{add,list,update,delete}` stop working. `/commander:{add,list,update,delete}` work after `/plugin install commander@monolab`. The two orchestration commands keep their `/experiments:` namespace.
- **Filesystem state**: `<HOME>/.claude/commander/projects.json` is unchanged in shape, location, or read/write contract — the move is purely about plugin packaging.
