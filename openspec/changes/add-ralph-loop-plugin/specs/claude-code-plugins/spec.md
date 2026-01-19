## ADDED Requirements

### Requirement: Ralph Loop Plugin Structure

The `ralph-loop` plugin SHALL exist in `claude-plugins/ralph-loop/` with the standard plugin structure.

The plugin manifest SHALL include:
- `name`: "ralph-loop"
- `description`: "Generate platform-specific scripts for autonomous AI coding loops"
- `keywords`: ["automation", "loop", "ralph", "scripting", "autonomous"]

#### Scenario: Plugin directory exists

- **GIVEN** the monolab repository
- **WHEN** examining `claude-plugins/ralph-loop/`
- **THEN** the directory SHALL contain:
  - `.claude-plugin/plugin.json` manifest
  - `skills/` directory with at least one skill
  - `commands/` directory with help command
  - `package.json` for workspace integration

---

### Requirement: Ralph Loop Generate Skill

The plugin SHALL provide a skill at `skills/generate.md` that generates platform-appropriate loop scripts.

When invoked, the skill SHALL:
1. Detect the user's platform (darwin/linux → Bash, win32 → PowerShell)
2. Ask for task description and completion criteria
3. Generate a script with safety limits
4. Output the script with usage instructions

The generated script SHALL include:
- Maximum iteration limit (configurable, default 20)
- Clear prompt file reference (PROMPT.md or similar)
- Git commit after each successful iteration (optional)
- Completion detection via exit code or file marker

#### Scenario: Generate bash script on macOS/Linux

- **GIVEN** a user on macOS or Linux
- **WHEN** they invoke the generate skill with task "Migrate Jest to Vitest"
- **THEN** the skill SHALL generate a bash script containing:
  - A while loop structure
  - `--max-iterations` safety limit
  - PROMPT.md file with task description
  - Instructions for customizing completion criteria

#### Scenario: Generate PowerShell script on Windows

- **GIVEN** a user on Windows
- **WHEN** they invoke the generate skill
- **THEN** the skill SHALL generate a PowerShell script with equivalent functionality
- **AND** the script SHALL use PowerShell idioms (not bash translated)

#### Scenario: Skill includes safety warnings

- **GIVEN** the generate skill is invoked
- **WHEN** generating any script
- **THEN** the output SHALL include warnings about:
  - API cost implications (each iteration consumes tokens)
  - Recommended --max-iterations starting point (10-20)
  - How to monitor progress (git log, file changes)

---

### Requirement: Ralph Loop Help Command

The plugin SHALL provide a `/ralph-loop:help` command explaining the technique.

The help command SHALL cover:
- What the Ralph loop is and its origins
- When to use it (large refactors, migrations, batch operations)
- When NOT to use it (exploratory work, unclear requirements)
- Best practices for writing PROMPT.md files
- Cost considerations and safety limits

#### Scenario: Help command provides technique overview

- **GIVEN** the ralph-loop plugin is installed
- **WHEN** a user runs `/ralph-loop:help`
- **THEN** Claude SHALL explain the Ralph Wiggum technique
- **AND** provide guidance on effective usage
- **AND** include references to original sources

---

### Requirement: PROMPT.md Template Generation

The generate skill SHALL create a PROMPT.md template alongside the loop script.

The template SHALL include:
- Task description section
- Completion criteria section (what "done" looks like)
- Constraints section (what NOT to change)
- Context section (relevant files, patterns to follow)

#### Scenario: PROMPT.md follows declarative specification pattern

- **GIVEN** the skill generates a loop script
- **WHEN** examining the generated PROMPT.md
- **THEN** it SHALL use declarative language (WHAT, not HOW)
- **AND** include clear completion criteria
- **AND** provide placeholder sections for user customization

---

### Requirement: Platform Detection and Script Variants

The skill SHALL detect the operating system and generate appropriate script syntax.

Supported platforms:
- **Unix-like** (darwin, linux): Bash script
- **Windows**: PowerShell script

#### Scenario: Platform auto-detection

- **GIVEN** the user does not specify a platform
- **WHEN** invoking the generate skill
- **THEN** the skill SHALL detect the platform from environment
- **AND** generate the appropriate script variant

#### Scenario: Manual platform override

- **GIVEN** the user specifies `--platform powershell`
- **WHEN** on a Unix system
- **THEN** the skill SHALL generate a PowerShell script
- **AND** note that the user may need PowerShell installed
