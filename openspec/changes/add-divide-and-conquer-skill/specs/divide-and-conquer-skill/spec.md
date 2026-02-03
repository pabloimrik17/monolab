## ADDED Requirements

### Requirement: Skill accepts plan file as input
The skill SHALL accept a path to an existing plan file (tasks.md, plan.md, or similar format with enumerated tasks). If no path provided, the skill SHALL detect active OpenSpec change and use its tasks file.

#### Scenario: Explicit plan path provided
- **WHEN** user invokes `/experiments:divide-and-conquer path/to/tasks.md`
- **THEN** skill reads and parses that file as the plan

#### Scenario: No path provided with active OpenSpec change
- **WHEN** user invokes `/experiments:divide-and-conquer` without arguments
- **AND** an active OpenSpec change exists
- **THEN** skill uses the change's tasks.md file

#### Scenario: No path and no active change
- **WHEN** user invokes skill without arguments
- **AND** no active OpenSpec change exists
- **THEN** skill prompts user to provide plan path

### Requirement: Skill extracts tasks from plan
The skill SHALL parse the plan file and extract individual tasks regardless of format variations (numbered lists, checkboxes, headers).

#### Scenario: Checkbox format
- **WHEN** plan contains `- [ ] Task description`
- **THEN** skill extracts "Task description" as a task

#### Scenario: Numbered list format
- **WHEN** plan contains `1. Task description`
- **THEN** skill extracts "Task description" as a task

### Requirement: Skill infers files per task
The skill SHALL infer which files each task will touch using task text analysis and codebase grep.

#### Scenario: Task mentions entity name
- **WHEN** task text mentions "UserService"
- **AND** codebase contains file defining UserService
- **THEN** skill associates that file path with the task

#### Scenario: Task implies new file creation
- **WHEN** task text says "Create X" or "Add X"
- **THEN** skill infers likely file path based on project conventions

### Requirement: Skill detects task dependencies
The skill SHALL detect dependencies between tasks from explicit mentions and implicit order.

#### Scenario: Explicit dependency reference
- **WHEN** task text says "after Task 3" or "depends on user model"
- **THEN** skill marks that task as dependent on the referenced task

#### Scenario: Implicit order dependency
- **WHEN** task B uses output of task A (inferred from text)
- **THEN** skill marks B as dependent on A

### Requirement: Skill assigns relative complexity
The skill SHALL assign each task a complexity score from 1-5 units based on scope indicators.

#### Scenario: Simple task
- **WHEN** task involves single file, straightforward change
- **THEN** skill assigns complexity 1-2

#### Scenario: Complex task
- **WHEN** task involves multiple files, new patterns, or testing
- **THEN** skill assigns complexity 3-5

### Requirement: Skill generates phase-based division
The skill SHALL organize tasks into sequential phases where tasks within a phase can run in parallel.

#### Scenario: Independent tasks grouped in same phase
- **WHEN** tasks A, B, C have no dependencies on each other
- **AND** they don't share files
- **THEN** skill places them in the same phase as parallel sessions

#### Scenario: Dependent tasks in sequential phases
- **WHEN** task C depends on task A
- **THEN** task A is in an earlier phase than task C

### Requirement: Skill ensures zero file conflicts within phase
The skill SHALL guarantee that within a single phase, no two sessions touch the same file.

#### Scenario: File conflict detected
- **WHEN** tasks A and B would both modify `src/index.ts`
- **THEN** skill places them in same session OR different phases

#### Scenario: No conflict
- **WHEN** tasks A and B touch completely different files
- **THEN** skill may place them in parallel sessions within same phase

### Requirement: Skill evaluates parallelization worthiness
The skill SHALL calculate expected speedup and only recommend parallelization if speedup >= 1.2 (20%).

#### Scenario: Speedup insufficient
- **WHEN** calculated speedup < 1.2
- **THEN** skill outputs "Parallelization not recommended. Execute linearly with /opsx:apply"

#### Scenario: Speedup sufficient
- **WHEN** calculated speedup >= 1.2
- **THEN** skill outputs the phase-based division plan

### Requirement: Skill avoids orphan sessions
The skill SHALL not create sessions that contribute < 30% reduction to phase time.

#### Scenario: Orphan session detected
- **WHEN** adding session would only reduce phase time by 10%
- **THEN** skill merges those tasks into another session

### Requirement: Skill outputs executable instructions
The skill SHALL output clear instructions with `claude -p` commands for each session.

#### Scenario: Session command format
- **WHEN** generating output for a session
- **THEN** output includes: session identifier, tasks to implement, exact `claude -p "..."` command

#### Scenario: Phase structure
- **WHEN** generating output
- **THEN** output organizes sessions by phase with clear phase boundaries

### Requirement: Each session receives full plan with task subset
The skill SHALL instruct each session to receive the complete plan file but only implement specified tasks.

#### Scenario: Session instruction format
- **WHEN** generating session command
- **THEN** command references full plan file AND specifies "implement tasks X, Y, Z only"

### Requirement: Skill outputs analysis summary
The skill SHALL output analysis summary including total tasks, estimated speedup, and number of phases/sessions.

#### Scenario: Summary content
- **WHEN** generating output
- **THEN** output includes: task count, linear time estimate (units), parallel time estimate (units), speedup factor, phase count, total sessions
