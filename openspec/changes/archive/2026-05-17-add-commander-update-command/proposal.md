# Proposal: add-commander-update-command

Linear: [MON-131](https://linear.app/monolab/issue/MON-131/commanderupdate-actualizar-metadata-de-un-proyecto) (parent: MON-127, blocked-by MON-129 ✅)

## Why

Commander registry is now create-only-then-delete: once a project is registered, its metadata is frozen. Users need to refresh a record when keywords change (new framework adopted), descriptions get stale, or `specialRules` evolve — without `commander-delete` + `commander-add`, which loses `createdAt` and racy if other commands read mid-flow. Registry spec already earmarks `commander-update` as the owner of legacy-v1 drift remediation (`repoType` backfill).

## What Changes

- New command `/experiments:commander-update <name|--name> [--keywords <csv>] [--description <text>] [--rules <csv>] [--repo-type <enum>] [--refresh]`.
- New registry primitive `update(name, patch)`: in-place field patch, preserves `createdAt`, refreshes `updatedAt`, atomic write recipe identical to `add`/`delete`.
- Editable fields: `keywords`, `description`, `specialRules`, `repoType`. **Out of scope**: `path`, `monorepoRoot`, `name` (rename) — separate ticket if needed.
- Target resolution `A → B`: explicit name (positional / `--name`) → interactive picker (mirrors `commander-delete` Step 2).
- Per-field source priority `A → B → C` (mirrors `commander-add`):
  - **A** explicit flag value (verbatim, with same `--keywords` normalization bypass).
  - **B** Haiku auto-detect — **only when `--refresh` is passed** or the user picks "Re-scan" in the edit menu. Off by default (update ≠ initial registration).
  - **C** `AskUserQuestion` per field selected for editing.
- Diff render: side-by-side `current → proposed`, only fields that change, including a `repoType: ∅ → "<value>"` row when a legacy v1 record is being backfilled.
- Confirmation gate (`Save` / `Edit` / `Abort`) before any write; abort leaves `projects.json` byte-equivalent.
- `commander-normalize` re-invoked on edited keywords (skipped when `--keywords` is explicit, same as `add`); `droppedTerms` feeds Step 7 vocab suggestion verbatim.
- Drift surfaced (not auto-fixed): legacy v1 record (missing `repoType`) shows in the diff with `∅ → ?` and the picker offers `repoType` as the first editable field.

## Capabilities

### New Capabilities

- `commander-update-command`: contract for the `/experiments:commander-update` command — invocation, A→B target resolution, per-field A→B→C source priority, diff render, confirmation, atomic write, vocab suggestion.

### Modified Capabilities

- `commander-registry`: add **Update Operation** requirement (`update(name, patch)`: reject on missing registry / unknown name / invalid `repoType`; preserve `createdAt`, refresh `updatedAt`, preserve insertion order, atomic write). No schema bump (still v2).

## Impact

- **Code (new)**: `claude-plugins/experiments/commands/commander-update.md` (command body).
- **Code (touched)**: none — registry primitives are documented contracts, each command re-implements them via built-in tools (`Read` / `Write` / `Bash`).
- **Plugin manifest**: register the new command in `claude-plugins/experiments/plugin.json` and bump version per release-please flow (no manual edit).
- **Specs**: new `commander-update-command/spec.md`; delta on `commander-registry/spec.md` (Update Operation requirement + drift remediation scenarios).
- **Skills consumed**: `commander-normalize` (no change to skill).
- **Dependencies**: none new. Uses existing `gh` (optional, vocab suggestion) and Haiku subagent (opt-in only).
- **Backward compatibility**: read path unchanged; writes preserve v2 schema. Legacy v1 records remain readable; an update on a v1 record produces a v2 record in-place (consistent with `add`'s "writer upgrades v1 file on first v2 write" rule).
