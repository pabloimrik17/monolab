## Why

Need a staging area for beta skills/commands before promoting to production plugins. Currently no way to test experimental features in isolation.

## What Changes

- New `experiments` plugin at `claude-plugins/experiments/`
- `/experiments:hello-experiments` command explaining plugin purpose
- Plugin registered in monolab marketplace

## Capabilities

### New Capabilities

- `experiments-plugin`: Plugin structure, manifest, marketplace registration, and hello-experiments command

### Modified Capabilities

None

## Impact

- New directory: `claude-plugins/experiments/`
- Updates: `.claude-plugin/marketplace.json` (add experiments entry)
- Updates: `pnpm-workspace.yaml` (already includes `claude-plugins/*`)
