## 1. Create skill file structure

- [ ] 1.1 Create `claude-plugins/experiments/commands/divide-and-conquer.md` with frontmatter (description field)
- [ ] 1.2 Add skill overview section explaining purpose and when to use

## 2. Input handling

- [ ] 2.1 Add ARGUMENTS parsing section - extract plan file path from command args
- [ ] 2.2 Add fallback logic: if no args, detect active OpenSpec change via `openspec list --json`
- [ ] 2.3 Add prompt for plan path using AskUserQuestion if no args and no active change
- [ ] 2.4 Add instruction to read and validate plan file exists

## 3. Task extraction

- [ ] 3.1 Add section for parsing plan file - handle checkbox format `- [ ] Task`
- [ ] 3.2 Add parsing for numbered list format `1. Task`
- [ ] 3.3 Add parsing for header-based format `### Task`
- [ ] 3.4 Add instruction to extract task ID/number and description for each task

## 4. File inference

- [ ] 4.1 Add section for inferring files per task from task text (entity names, paths mentioned)
- [ ] 4.2 Add instruction to grep codebase for entity references (class names, function names)
- [ ] 4.3 Add instruction to infer new file paths from "Create X" / "Add X" patterns
- [ ] 4.4 Add instruction to build task-to-files mapping

## 5. Dependency detection

- [ ] 5.1 Add section for detecting explicit dependencies ("after Task X", "depends on Y")
- [ ] 5.2 Add instruction to infer implicit dependencies from task order and content
- [ ] 5.3 Add instruction to build dependency graph (task → depends on tasks)

## 6. Complexity assignment

- [ ] 6.1 Add section for assigning complexity 1-5 per task
- [ ] 6.2 Add heuristics: single file = 1-2, multiple files = 3, tests = 4, new patterns = 5
- [ ] 6.3 Add instruction to annotate each task with complexity score

## 7. Division algorithm

- [ ] 7.1 Add section for computing task levels (level 0 = no deps, level N = deps in levels < N)
- [ ] 7.2 Add instruction to group tasks by level (each level = potential phase)
- [ ] 7.3 Add instruction to detect file conflicts within level
- [ ] 7.4 Add instruction to split level into sessions where no session has file conflicts
- [ ] 7.5 Add 30% threshold check: only add session if reduces phase time by ≥30%

## 8. Speedup evaluation

- [ ] 8.1 Add section for calculating linear time (sum of all task complexities)
- [ ] 8.2 Add calculation for parallel time (sum of max complexity per phase)
- [ ] 8.3 Add speedup threshold check: if < 1.2, recommend linear execution
- [ ] 8.4 Add output message for insufficient speedup case

## 9. Output generation

- [ ] 9.1 Add section for generating analysis summary (tasks, speedup, phases, sessions)
- [ ] 9.2 Add template for phase headers with session count
- [ ] 9.3 Add template for session blocks with task list and `claude -p` command
- [ ] 9.4 Add instruction: command references full plan file + "implement tasks X, Y, Z only"

## 10. Edge cases and warnings

- [ ] 10.1 Add handling for plans with < 5 tasks (likely not worth parallelizing)
- [ ] 10.2 Add warning output when file inference is uncertain
- [ ] 10.3 Add handling for circular dependencies (error message)
