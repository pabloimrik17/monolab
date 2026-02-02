## Why

Developers using AI coding agents (Claude Code, Codex, etc.) want to run long-running autonomous loops that implement features while AFK. The "Ralph Wiggum" technique (popularized by Geoffrey Huntley and Matt Pocock) enables this by running agents in a loop with a PRD until all tasks are complete. Currently, setting up Ralph loops requires manual creation of PRD files, prompt templates, and bash scripts. A command that scaffolds this infrastructure would lower the barrier to entry.

## What Changes

- New `/experiments:ralph` command in the experiments plugin
- Command accepts a description string and generates:
  - `prd.json` - PRD items auto-generated from user description
  - `progress.txt` - Empty file for tracking between iterations
  - `PROMPT.md` - Prompt template filled with context
  - `ralph-once.sh` - HITL script (single iteration)
  - `ralph.sh` - AFK script (loop with max iterations)
- All scripts use Docker Sandbox exclusively (Docker Desktop 4.58+)
- Scripts use new Docker Sandbox API: `docker sandbox run <name> -- "$(cat PROMPT.md)"`

## Capabilities

### New Capabilities

- `ralph-loop-scaffolding`: Generate Ralph loop infrastructure (PRD, prompt, scripts) from a user description

### Modified Capabilities

(none)

## Impact

- **Code**: New command file in `claude-plugins/experiments/commands/`
- **Dependencies**: Requires Docker Desktop 4.58+ (user responsibility to verify)
- **User workflow**: Users can run `/experiments:ralph "description"` to scaffold Ralph loop files in current directory
