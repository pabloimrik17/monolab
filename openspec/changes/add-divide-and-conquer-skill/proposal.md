## Why

Large implementation plans (>10 tasks) executed linearly waste time when tasks could run in parallel across multiple Claude Code sessions. Currently no tooling helps identify parallelization opportunities or guide multi-session execution safely.

## What Changes

- New skill `divide-and-conquer` in the `experiments` plugin
- Analyzes existing implementation plans to identify parallelization opportunities
- Generates phase-based execution strategy with parallel sessions per phase
- Ensures zero file conflicts within a phase (different sessions don't touch same files)
- Provides ready-to-use `claude -p` commands for each session
- Evaluates if parallelization is worth it (minimum ~20% speedup threshold)

## Capabilities

### New Capabilities
- `divide-and-conquer-skill`: Skill that analyzes plans, detects dependencies and file conflicts, generates optimal phase/session division with execution instructions

### Modified Capabilities
<!-- None - this is a new standalone skill -->

## Impact

- **Code**: New skill file in `claude-plugins/experiments/commands/divide-and-conquer.md`
- **Dependencies**: None - uses existing Claude Code capabilities (plan reading, codebase analysis)
- **Users**: Can parallelize large plans, potentially 2x+ speedup on suitable plans
