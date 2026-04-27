## Why

There is no automated way to ensure a project has the skills.sh skills relevant to its stack installed. Each session starts without knowing whether useful skills are missing, and after installing them manually there is no mechanism to make them persist across `pnpm install`.

## What Changes

- New `skill-terraformer` skill at `claude-plugins/experiments/skills/`
- Curated list embedded in the skill: stack → relevant skills.sh skills mapping
- Automatic project stack detection (package.json, configs, frameworks)
- Install missing skills via `bunx skills add` (project-level)
- Ensure `postinstall` script in package.json with `bunx skills experimental_install` when skills are managed

## Capabilities

### New Capabilities

- `skill-terraformer`: Skill that, when activated, detects the project stack, compares against the curated skills.sh list, installs the missing ones, and ensures a postinstall script in package.json

### Modified Capabilities

- `experiments-plugin`: Adds a `skills/` directory with the plugin's first skill

## Impact

- `claude-plugins/experiments/` — new `skills/skill-terraformer/` directory
- `claude-plugins/experiments/.claude-plugin/plugin.json` — possible version bump
- `package.json` (root) — `postinstall` script may be added/modified
- External dependency: `skills` CLI (npx, not installed as a dep)
- Generates `skills-lock.json` at the project root
