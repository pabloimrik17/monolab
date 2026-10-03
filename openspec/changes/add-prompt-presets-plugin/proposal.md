# Proposal

## Why

Some community prompts are worth re-running verbatim, but retyping them is error-prone and drifts from the source. Matt Pocock's "prompt of the day" ([x.com/mattpocockuk/status/2105951409887949107](https://x.com/mattpocockuk/status/2105951409887949107)) audits recent agent sessions for repo-navigability problems; a one-word slash command makes it repeatable across every repo the marketplace reaches.

## What Changes

- New Claude Code plugin `prompt-presets` at `claude-plugins/prompt-presets/` (manifest, `package.json`, `README.md`, `CHANGELOG.md`).
- New command `commands/matt-retro.md` → invoked as `/prompt-presets:matt-retro`. Body = the tweet's prompt, verbatim, with no rewording or additions.
- Register plugin in root `.claude-plugin/marketplace.json` (appended last; array order matters for release-please jsonpaths).
- Wire release-please: `release-please-config.json` package entry + `.release-please-manifest.json` seed.
- Plugin is a new package; no change to existing plugins. No peer deps, no exports.

## Capabilities

### New Capabilities

- `prompt-presets-plugin`: plugin that ships curated, verbatim third-party prompts as slash commands; first preset `matt-retro`.

### Modified Capabilities

None. Generic plugin rules (`claude-code-plugins`, `claude-plugin-release`) already cover a new plugin; their per-plugin scenarios are examples, not exhaustive lists.

## Impact

- New files under `claude-plugins/prompt-presets/`.
- Edits: `.claude-plugin/marketplace.json`, `release-please-config.json`, `.release-please-manifest.json`, `claude-plugins/README.md` (plugin list, if present).
- pnpm workspace already globs `claude-plugins/*` → `pnpm install` picks up the new package; lockfile updates.
- No runtime code, no deps, no published npm/JSR exports.
