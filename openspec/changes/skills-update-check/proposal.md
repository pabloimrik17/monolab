## Why

No mechanism exists to notify users when their globally-installed skills.sh skills have updates available. Users must manually run `skills check -g` to discover updates, which they rarely do. A session-start skill in the experiments plugin can automate this check non-intrusively.

## What Changes

- Add a new skill `skills-update-check` to the `experiments` plugin that:
  - Detects the package runner available in the session (lockfile-based, then global binary, fallback `npx`)
  - Runs `<runner> skills check -g` to detect available updates for global skills.sh skills
  - Handles three states: updates available (prompt user), all up to date (brief message), no global skills (inform + suggest `skills add -g`)
  - Self-limits to one execution per session via prompt instruction ("do not re-run if already executed this session")
- Creates `skills/` directory in the experiments plugin (first skill in this plugin)

## Capabilities

### New Capabilities

- `skills-update-check`: Session-start skill that checks for global skills.sh updates and offers to apply them

### Modified Capabilities

- `experiments-plugin`: Adding `skills/` directory to the plugin structure (currently only has `commands/`)

## Impact

- **Files**: `claude-plugins/experiments/skills/skills-update-check/SKILL.md` (new)
- **Dependencies**: Requires `skills` npm package available via `npx`/`bunx`/`pnpx` at runtime
- **Scope**: Claude Code only (v1). Future: OpenCode, then other agents.
- **Performance note**: If background skill execution causes noticeable latency, migrate to `SessionStart` hook approach
