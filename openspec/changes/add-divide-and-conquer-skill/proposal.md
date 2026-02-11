## Why

Large implementation plans executed linearly waste time when tasks could run in parallel. Claude Code now offers three execution mechanisms (sequential, subagents, team agents) but no tooling analyzes a plan to choose the optimal strategy or protect against file conflicts.

## What Changes

- New skill `divide-and-conquer` in the `experiments` plugin
- Analyzes existing implementation plans: parses tasks, infers files, builds dependency graph, detects file conflicts
- Decides optimal execution strategy: sequential, subagents, or team agents
- Executes directly using appropriate tool calls (Task for subagents, TeamCreate/TaskCreate/Task for teams)
- Configures file ownership and dependency constraints to prevent destructive overwrites

## Capabilities

### New Capabilities
- `divide-and-conquer-skill`: Analyzes plans, detects conflicts, routes to optimal execution strategy, executes directly

### Modified Capabilities
<!-- None - standalone skill -->

## Impact

- **Code**: New skill file in `claude-plugins/experiments/commands/divide-and-conquer.md`
- **Dependencies**: Requires `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` for team agents strategy (subagents/sequential work without it)
- **Users**: Optimal parallelization with file conflict protection, 2-4x speedup on suitable plans
