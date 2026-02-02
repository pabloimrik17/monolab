## Context

The experiments plugin (`claude-plugins/experiments/`) is a staging area for beta features. Currently contains only `hello-experiments.md`. We're adding a new command that scaffolds Ralph loop infrastructure for autonomous AI coding.

Ralph loops (Matt Pocock / Geoffrey Huntley) run AI agents in a bash loop with:
- PRD file defining tasks with `passes: false`
- Progress file tracking work between iterations
- Prompt template read each iteration
- Stop condition: all PRD items `passes: true` or max iterations

Docker Sandbox API (4.58+) provides isolated microVM execution:
```bash
docker sandbox create claude .
docker sandbox run <name> -- "$(cat PROMPT.md)"
docker sandbox run <name> -- -p "$(cat PROMPT.md)"  # print mode for AFK
```

## Goals / Non-Goals

**Goals:**
- Single command generates all Ralph infrastructure
- Auto-generate PRD items from natural language description
- Scripts ready to run with Docker Sandbox
- Simple, no validation, no extra files

**Non-Goals:**
- Interactive PRD creation (future)
- Validation of existing files (future)
- Support for non-Docker execution
- Schema validation for PRD
- Multiple parallel loops (future)

## Decisions

### 1. Command as Markdown skill (not TypeScript)

**Decision**: Implement as `commands/ralph.md`

**Rationale**:
- Consistent with existing `hello-experiments.md`
- Claude Code plugins use markdown for commands/skills
- No build step, simpler to iterate

**Alternatives considered**:
- TypeScript command: Would require build tooling, overkill for scaffolding

### 2. Output files in current directory (not subdirectory)

**Decision**: Generate files directly in `./` where command runs

**Rationale**:
- Docker sandbox needs files at workspace root for permissions
- Simpler mental model
- Future: can add `.ralph/` subdirectory when we support multiple loops

**Alternatives considered**:
- `.ralph/` subdirectory: Cleaner but complicates sandbox file access

### 3. PRD as JSON (not Markdown)

**Decision**: `prd.json` with structured items

**Rationale**:
- Parseable by scripts (jq can check completion)
- Follows Matt Pocock's recommendation
- Agent can programmatically update `passes` field

**Alternatives considered**:
- Markdown checklist: More readable but harder to parse
- YAML: No clear advantage over JSON

### 4. Fixed sandbox name

**Decision**: Use `ralph-sandbox` as default name

**Rationale**:
- Simplicity for MVP
- User can modify scripts if needed
- Future: parameterize when supporting multiple loops

### 5. PROMPT.md includes @-references

**Decision**: Prompt starts with `@prd.json @progress.txt`

**Rationale**:
- Claude Code's `@` syntax loads file contents
- Agent sees full PRD and progress each iteration
- No need for complex file reading logic in prompt

## Risks / Trade-offs

**[Risk] User runs without Docker 4.58+** → Scripts fail with unclear error. Mitigation: Document requirement clearly in generated files.

**[Risk] Files already exist in directory** → Overwrite without warning. Mitigation: Acceptable for MVP, add validation later.

**[Risk] PRD auto-generation misinterprets user intent** → Wrong tasks generated. Mitigation: User can edit prd.json before running.

**[Trade-off] Single sandbox name** → Can't run multiple Ralph loops in parallel. Mitigation: Future enhancement when needed.
