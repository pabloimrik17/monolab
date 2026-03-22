## Why

Plugin versioning is fully manual — version lives in 3 files (`plugin.json`, `package.json`, `marketplace.json`) and there's no automation to keep them in sync. marketplace.json is already stale (experiments shows 0.1.0 vs actual 0.2.1). Anthropic's official plugin-dev skills only say "update version manually". A skill that handles this automatically fills a real gap for any Claude Code plugin author.

## What Changes

- New skill in `experiments` plugin that detects plugin modifications and bumps versions
- Skill determines semver level (patch/minor/major) based on change type
- Updates `plugin.json` (source of truth), `package.json`, and `marketplace.json` in one pass
- Triggers at work completion, not per individual file edit
- Fix current marketplace.json staleness as part of implementation

## Capabilities

### New Capabilities
- `plugin-version-bump`: Skill that detects plugin changes, determines semver bump type, and synchronizes version across all version-bearing files (`plugin.json`, `package.json`, `marketplace.json`)

### Modified Capabilities
- `claude-code-plugins`: marketplace.json version field policy — clarify whether version is required or optional, and document sync expectations
- `experiments-plugin`: register the new skill as a component of the experiments plugin

## Impact

- `claude-plugins/experiments/skills/plugin-version-bump/SKILL.md` — new skill file
- `.claude-plugin/marketplace.json` — updated by skill + fix current staleness
- `openspec/specs/claude-code-plugins/spec.md` — updated versioning requirements
- `openspec/specs/experiments-plugin/spec.md` — register new skill
