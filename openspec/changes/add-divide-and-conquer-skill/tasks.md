## 1. Create skill file structure

- [ ] 1.1 Create `claude-plugins/experiments/commands/divide-and-conquer.md` with frontmatter
- [ ] 1.2 Add skill overview: analyzes plans, routes to optimal execution strategy, executes directly

## 2. Input handling

- [ ] 2.1 Parse plan file path from args
- [ ] 2.2 Fallback: detect active OpenSpec change via `openspec list --json`
- [ ] 2.3 Prompt via AskUserQuestion if no args and no active change
- [ ] 2.4 Read and validate plan file exists

## 3. Task extraction

- [ ] 3.1 Parse checkbox format `- [ ] Task`
- [ ] 3.2 Parse numbered list format `1. Task`
- [ ] 3.3 Parse header-based format `### Task`
- [ ] 3.4 Extract task ID/number and description

## 4. File inference

- [ ] 4.1 Infer files per task from task text (entity names, paths)
- [ ] 4.2 Grep codebase for entity references
- [ ] 4.3 Infer new file paths from "Create X" / "Add X" patterns
- [ ] 4.4 Build task-to-files mapping

## 5. Dependency detection

- [ ] 5.1 Detect explicit deps ("after Task X", "depends on Y")
- [ ] 5.2 Infer implicit deps from task order and content
- [ ] 5.3 Detect file conflicts → inject deps between tasks sharing files
- [ ] 5.4 Build dependency DAG

## 6. Complexity assignment

- [ ] 6.1 Assign complexity 1-5 per task
- [ ] 6.2 Heuristics: single file=1-2, multiple files=3, tests=4, new patterns=5

## 7. Strategy decision

- [ ] 7.1 Compute independent task groups (connected components in conflict-free graph)
- [ ] 7.2 Evaluate strategy criteria: group count, file overlap, task complexity, inter-task communication needs
- [ ] 7.3 Route decision: sequential (≤1 group or high overlap), subagents (2-4 independent focused groups), team agents (3+ groups needing coordination or complex tasks)
- [ ] 7.4 Calculate estimated speedup and token cost multiplier
- [ ] 7.5 Present recommendation with rationale before executing

## 8. Sequential execution path

- [ ] 8.1 Order tasks respecting dependency DAG
- [ ] 8.2 Execute tasks in order (or hand back to caller)

## 9. Subagent execution path

- [ ] 9.1 Group tasks into parallel batches (no file conflicts within batch)
- [ ] 9.2 Generate Task tool calls per batch with full plan context + task subset
- [ ] 9.3 Execute batches: parallel within batch, sequential across batches

## 10. Team agents execution path

- [ ] 10.1 TeamCreate with descriptive team name
- [ ] 10.2 TaskCreate for each task with: subject, description, addBlockedBy from dep DAG
- [ ] 10.3 Compute optimal teammate count from independent group analysis
- [ ] 10.4 Compute file ownership per teammate (files from their task group)
- [ ] 10.5 Spawn teammates via Task with: team_name, name, prompt including file ownership constraints
- [ ] 10.6 Include in spawn prompt: "You own [files]. Do NOT modify [other files]."

## 11. Edge cases

- [ ] 11.1 Plans with <5 tasks → recommend sequential, skip analysis overhead
- [ ] 11.2 Circular dependencies → error message
- [ ] 11.3 Uncertain file inference → warn, default to adding dep (conservative)
- [ ] 11.4 Team agents not enabled → fallback to subagents with note
