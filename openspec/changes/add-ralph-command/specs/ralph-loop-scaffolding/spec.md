## ADDED Requirements

### Requirement: Command invocation

The system SHALL provide a `/experiments:ralph` command that accepts a project description as argument.

#### Scenario: Command with description
- **WHEN** user runs `/experiments:ralph "Build auth system with login and logout"`
- **THEN** system generates Ralph loop infrastructure files in current directory

#### Scenario: Command without description
- **WHEN** user runs `/experiments:ralph` without arguments
- **THEN** system prompts user for project description

### Requirement: PRD generation

The system SHALL generate a `prd.json` file with PRD items extracted from the user description.

#### Scenario: PRD structure
- **WHEN** user provides description "Build auth with login, logout, password reset"
- **THEN** system creates `prd.json` with structure:
  ```json
  {
    "name": "<project-name>",
    "items": [
      {
        "id": "<kebab-case-id>",
        "description": "<task description>",
        "successCriteria": "<criteria>",
        "passes": false
      }
    ]
  }
  ```

#### Scenario: Multiple items from description
- **WHEN** description mentions multiple features
- **THEN** each feature becomes a separate PRD item with `passes: false`

### Requirement: Progress file generation

The system SHALL generate an empty `progress.txt` file.

#### Scenario: Empty progress file
- **WHEN** command completes
- **THEN** `progress.txt` exists and is empty

### Requirement: Prompt template generation

The system SHALL generate a `PROMPT.md` file containing the prompt template for Ralph iterations.

#### Scenario: Prompt structure
- **WHEN** command completes
- **THEN** `PROMPT.md` contains:
  - `@prd.json @progress.txt` references at top
  - Project name/context from user description
  - Instructions for single-task iteration
  - `<promise>COMPLETE</promise>` completion sigil instruction

### Requirement: HITL script generation

The system SHALL generate a `ralph-once.sh` script for human-in-the-loop execution.

#### Scenario: HITL script content
- **WHEN** command completes
- **THEN** `ralph-once.sh`:
  - Is executable (`chmod +x`)
  - Creates Docker sandbox if not exists
  - Runs single iteration with `docker sandbox run`
  - Passes PROMPT.md content to Claude

#### Scenario: HITL script execution
- **WHEN** user runs `./ralph-once.sh`
- **THEN** script executes one Ralph iteration in Docker sandbox

### Requirement: AFK script generation

The system SHALL generate a `ralph.sh` script for autonomous loop execution.

#### Scenario: AFK script content
- **WHEN** command completes
- **THEN** `ralph.sh`:
  - Is executable (`chmod +x`)
  - Accepts max iterations as argument (default 10)
  - Creates Docker sandbox if not exists
  - Loops until `<promise>COMPLETE</promise>` or max iterations
  - Uses `-p` flag for print mode

#### Scenario: AFK script completion detection
- **WHEN** agent outputs `<promise>COMPLETE</promise>`
- **THEN** script exits with success message

#### Scenario: AFK script max iterations
- **WHEN** max iterations reached without completion
- **THEN** script exits with warning message

### Requirement: Docker Sandbox exclusive

The system SHALL generate scripts that use Docker Sandbox exclusively.

#### Scenario: Sandbox API usage
- **WHEN** scripts are generated
- **THEN** scripts use `docker sandbox create claude .` and `docker sandbox run ralph-sandbox --`

#### Scenario: No non-Docker option
- **WHEN** command runs
- **THEN** no option exists to generate non-Docker scripts

### Requirement: File output location

The system SHALL generate all files in the current working directory.

#### Scenario: Files in current directory
- **WHEN** command completes
- **THEN** files `prd.json`, `progress.txt`, `PROMPT.md`, `ralph-once.sh`, `ralph.sh` exist in current directory
