## Why

Issue #191: batch-registering 7 projects via `/experiments:commander-add` surfaced two gaps in the record shape. (1) The Haiku detector already classifies `monorepoType: none|single|multi` but the signal is discarded before write, forcing downstream `commander:*` commands to re-detect. (2) Keyword extraction is non-deterministic — the same tech lands in `keywords`, `specialRules`, or prose across runs, with zero aggregation for multi-package monorepos and no synonym normalization. A single normalization step between detect and persist closes both gaps.

## What Changes

- **BREAKING**: Registry schema bumps `version: 1` → `version: 2`. Adds required `repoType: "single-repo" | "monorepo" | "multi-monorepo"` on every record. Readers seeing unknown v2 fields in v1-era callers already abort per the existing "unsupported version" contract.
- `commander-add` persists `repoType` derived from Haiku's `monorepoType` (`none` → `single-repo`, `single` → `monorepo`, `multi` → `multi-monorepo`).
- New Step 2.5 "normalization pipeline" between Haiku detection and write: synonym expansion → vocabulary filter → ubiquitous-tool exclusion → multi-monorepo aggregation (union of subproject keywords) → promotion (terms in `description`/`specialRules` matching vocab must appear in `keywords`) → dedup + sort.
- New skill `commander-normalize` at `claude-plugins/experiments/skills/commander-normalize/` encapsulates the pipeline and ships a `references/vocabulary.json` sidecar (controlled vocabulary + synonyms + excludes). Future `commander-update` and `commander-list` commands will call the same skill.
- Vocabulary evolution loop: when the pipeline drops a Haiku-emitted term absent from the vocab, `commander-add` post-write offers `AskUserQuestion` to open a GitHub issue via `gh` suggesting the term for addition.
- No auto-migration of existing v1 records. Future `commander-update`/`commander-list` commands (out of scope here) SHALL detect records missing `repoType` and surface a drift warning directing the user to re-register or run `update`.

## Capabilities

### New Capabilities

- `commander-normalize-skill`: controlled-vocabulary + aggregation + promotion pipeline reusable across `commander:*` commands, with a sidecar `vocabulary.json` and an issue-suggestion escape hatch for unknown terms.

### Modified Capabilities

- `commander-registry`: schema version 1 → 2; new required `repoType` field on every record; readers enforce unknown-version abort against v2.
- `experiments-plugin`: `commander-add` command contract gains Step 2.5 normalization, `repoType` persistence, and the vocabulary-evolution `AskUserQuestion`.

## Impact

- **Code**: `claude-plugins/experiments/commands/commander-add.md`, new `claude-plugins/experiments/skills/commander-normalize/` tree.
- **Specs**: delta for `commander-registry` (schema v2 + `repoType`), delta for `experiments-plugin` (command contract additions), new spec for `commander-normalize-skill`.
- **Registry data**: existing records at `~/.claude/commander/projects.json` become "drift" under v2 until re-registered; no destructive action — future `update`/`list` commands surface and fix.
- **Plugin version**: bump `claude-plugins/experiments` (per repo `plugin_version_bump` convention).
- **Docs**: `claude-plugins/experiments/README.md` mentions the new skill.
