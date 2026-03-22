## ADDED Requirements

### Requirement: Skill file exists

The hookify skill SHALL exist at `claude-plugins/experiments/skills/hookify/SKILL.md` with valid frontmatter including name, description, and version.

#### Scenario: Skill file location

- **WHEN** examining the experiments plugin structure
- **THEN** `skills/hookify/SKILL.md` SHALL exist with YAML frontmatter containing `name: hookify`

---

### Requirement: Auto-trigger once per session

The skill's autonomous trigger (via description match) SHALL fire at most once per session. Explicit user invocations (`/experiments:hookify`) SHALL always execute regardless of prior runs.

#### Scenario: First autonomous trigger

- **WHEN** the skill auto-triggers for the first time in a session
- **THEN** it SHALL proceed with full analysis

#### Scenario: Second autonomous trigger attempt

- **WHEN** the skill would auto-trigger a second time in the same session
- **THEN** it SHALL skip and take no action

#### Scenario: Explicit invocation after auto-trigger

- **WHEN** the user explicitly runs `/experiments:hookify` after the skill already auto-triggered
- **THEN** it SHALL proceed with full analysis normally

---

### Requirement: Read project instruction files

The skill SHALL read CLAUDE.md and AGENTS.md from the project root (`$CLAUDE_PROJECT_DIR`).

#### Scenario: Both files exist

- **WHEN** the skill is invoked and both CLAUDE.md and AGENTS.md exist
- **THEN** both files SHALL be read and analyzed

#### Scenario: Only CLAUDE.md exists

- **WHEN** the skill is invoked and only CLAUDE.md exists
- **THEN** only CLAUDE.md SHALL be analyzed without error

#### Scenario: Neither file exists

- **WHEN** the skill is invoked and neither file exists
- **THEN** the skill SHALL report "No CLAUDE.md or AGENTS.md found"

---

### Requirement: Skip managed sections

The skill SHALL ignore content between `<!-- X start-->` and `<!-- X end-->` HTML comment delimiters (case-insensitive, flexible whitespace).

#### Scenario: Nx managed section

- **WHEN** CLAUDE.md contains `<!-- nx configuration start-->` ... `<!-- nx configuration end-->`
- **THEN** all instructions within that block SHALL be excluded from analysis

#### Scenario: Multiple managed sections

- **WHEN** a file contains multiple `<!-- X start/end -->` sections
- **THEN** all managed sections SHALL be excluded and only content outside them SHALL be analyzed

#### Scenario: No managed sections

- **WHEN** a file has no HTML comment delimiters
- **THEN** the entire file content SHALL be analyzed

---

### Requirement: Classify instructions

The skill SHALL classify each non-managed instruction as hookifiable or not.

An instruction is hookifiable when it:
- Contains a deterministic directive (always/never/must/don't + concrete CLI action)
- Can be enforced via pattern matching on Bash tool input
- Does not require understanding intent or context

#### Scenario: Deterministic package manager rule

- **WHEN** CLAUDE.md contains "Always use bun instead of npm/yarn/pnpm"
- **THEN** the skill SHALL classify it as hookifiable (PreToolUse Bash, command hook)

#### Scenario: Conceptual guidance

- **WHEN** CLAUDE.md contains "Prefer composition over inheritance"
- **THEN** the skill SHALL classify it as NOT hookifiable

#### Scenario: Ambiguous rule

- **WHEN** CLAUDE.md contains "Try to keep functions small"
- **THEN** the skill SHALL classify it as NOT hookifiable

---

### Requirement: Propose one instruction per invocation

The skill SHALL propose at most ONE hookifiable instruction per run, selected by highest gain.

Gain factors:
- Violation frequency (common actions rank higher)
- Determinism (exact pattern match ranks higher)
- Token savings (larger instruction blocks rank higher)
- Failure impact (destructive action prevention ranks higher)

#### Scenario: Multiple hookifiable instructions

- **WHEN** analysis finds 3 hookifiable instructions
- **THEN** the skill SHALL propose only the highest-gain one

#### Scenario: Nothing hookifiable

- **WHEN** analysis finds no hookifiable instructions (all managed or conceptual)
- **THEN** the skill SHALL report that everything looks good and no hooks needed

---

### Requirement: Present proposal with rationale

The skill SHALL present the proposed hook with: the original instruction, what hook it becomes, why it's more effective as a hook, and what the hook script will do.

#### Scenario: Proposal presentation

- **WHEN** proposing to hookify "Always use bun instead of npm"
- **THEN** the skill SHALL show: the original text, the hook type (PreToolUse Bash), the enforcement mechanism (blocks npm/yarn/pnpm commands), and the gain (deterministic enforcement vs soft instruction)

---

### Requirement: User confirmation before implementation

The skill SHALL ask the user for confirmation before creating any files or modifying any settings.

#### Scenario: User accepts

- **WHEN** user confirms the proposal
- **THEN** the skill SHALL proceed to generate the hook

#### Scenario: User declines

- **WHEN** user declines the proposal
- **THEN** the skill SHALL stop without making any changes

---

### Requirement: Generate bash hook script

On confirmation, the skill SHALL create a bash script at `.claude/hooks/hookify-<slug>.sh`.

The script SHALL:
- Read JSON from stdin
- Extract relevant fields via jq
- Pattern match against the rule
- Exit 2 with descriptive stderr on violation
- Exit 0 on pass

#### Scenario: Package manager enforcement hook

- **WHEN** generating a hook for "use bun not npm"
- **THEN** the script SHALL be at `.claude/hooks/hookify-enforce-bun.sh`
- **AND** it SHALL extract `.tool_input.command` from stdin
- **AND** it SHALL block commands starting with `npm`, `yarn`, or `pnpm`
- **AND** stderr SHALL include the equivalent bun command suggestion

#### Scenario: Script is executable

- **WHEN** the hook script is created
- **THEN** it SHALL have executable permissions (`chmod +x`)

---

### Requirement: Update settings.json with hook config

On confirmation, the skill SHALL add the hook entry to `.claude/settings.json` under `hooks.PreToolUse`.

#### Scenario: Settings file exists without hooks

- **WHEN** `.claude/settings.json` exists but has no `hooks` key
- **THEN** the skill SHALL add the `hooks` key with the new hook entry

#### Scenario: Settings file exists with existing hooks

- **WHEN** `.claude/settings.json` already has `hooks.PreToolUse` entries
- **THEN** the skill SHALL append the new entry without removing existing ones

#### Scenario: Settings file does not exist

- **WHEN** `.claude/settings.json` does not exist
- **THEN** the skill SHALL create it with the hook configuration

---

### Requirement: Remove hookified instruction from source file

On confirmation, the skill SHALL remove the hookified instruction from the source CLAUDE.md or AGENTS.md file.

#### Scenario: Single instruction removal

- **WHEN** the hookified instruction is a single line or paragraph
- **THEN** that content SHALL be removed from the file
- **AND** no orphaned empty headers or excess blank lines SHALL remain

#### Scenario: Instruction with supporting content

- **WHEN** the hookified instruction includes a reference table (e.g., npm-to-bun equivalents)
- **THEN** both the instruction AND supporting content SHALL be removed (the hook's stderr feedback replaces the reference)

---

### Requirement: Verify jq availability

Before generating hooks, the skill SHALL verify that `jq` is available on the system.

#### Scenario: jq is installed

- **WHEN** `which jq` succeeds
- **THEN** the skill SHALL proceed normally

#### Scenario: jq is not installed

- **WHEN** `which jq` fails
- **THEN** the skill SHALL warn the user and suggest installing jq before proceeding
