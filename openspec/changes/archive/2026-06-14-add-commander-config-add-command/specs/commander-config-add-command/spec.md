# commander-config-add-command Specification

## ADDED Requirements

### Requirement: Commander Config-Add Command File

The `experiments` plugin SHALL include `commands/commander-config-add.md`.

The command file SHALL have YAML frontmatter with a non-empty `description` field. The command SHALL be invocable as `/experiments:commander-config-add`.

#### Scenario: Command file exists

- **WHEN** examining `claude-plugins/experiments/commands/`
- **THEN** `commander-config-add.md` SHALL exist

#### Scenario: Frontmatter present

- **WHEN** reading `claude-plugins/experiments/commands/commander-config-add.md`
- **THEN** the file SHALL have YAML frontmatter with a non-empty `description` field

#### Scenario: Command invocable

- **WHEN** the user types `/experiments:commander-config-add`
- **THEN** Claude SHALL execute the command instructions

---

### Requirement: Commander Config-Add Target Resolution

The `commander-config-add` command SHALL resolve the target **project** and the target **file path** using priority A→C.

For the project:

- **A) Explicit name**: if the user supplies a project name as `--project <value>` or the first positional argument, that name SHALL be the target project.
- **C) Interactive pick**: if no project is supplied, the command SHALL list all registered projects (via `commander-registry` `list()`) through `AskUserQuestion` and the user's selection SHALL become the target. The picker SHALL include an explicit cancel option.

When the project registry is missing or contains zero projects, the command SHALL print `"no projects registered"` (hinting `/commander:add`) and exit cleanly without prompting or writing.

For the file path:

- **A) Explicit path**: if the user supplies `--file <value>` or the second positional argument, that value SHALL be the candidate path.
- **C) Prompt**: if no path is supplied, the command SHALL prompt for it via `AskUserQuestion`. The path is interpreted relative to the resolved project's `path`.

The command SHALL NOT dispatch an auto-detection subagent; bulk discovery of config files is out of scope (handled by `config-scan`, MON-158).

#### Scenario: Explicit project and file skip prompts

- **WHEN** the user invokes `/experiments:commander-config-add --project investlab --file eslint.config.js`
- **AND** `investlab` is registered
- **THEN** the command SHALL skip the project picker and the file prompt and proceed to normalization and validation

#### Scenario: No project supplied with non-empty registry

- **WHEN** the user invokes `/experiments:commander-config-add` with no project
- **AND** the registry contains one or more projects
- **THEN** the command SHALL present the registered projects via `AskUserQuestion` for the user to select one
- **AND** the picker SHALL include a cancel option

#### Scenario: Empty registry exits without prompting

- **WHEN** the user invokes `/experiments:commander-config-add`
- **AND** the project registry is missing or contains zero projects
- **THEN** the command SHALL print `"no projects registered"`
- **AND** SHALL NOT prompt the user
- **AND** SHALL NOT create or modify any file

#### Scenario: Explicit project not registered

- **WHEN** the user invokes `/experiments:commander-config-add --project <name>` with a `name` not present in the registry
- **THEN** the command SHALL abort with `"project '<name>' is not registered"`
- **AND** no file SHALL be created or modified

#### Scenario: File path prompted when not supplied

- **WHEN** a project is resolved and no file path was supplied
- **THEN** the command SHALL prompt for the path relative to the chosen project via `AskUserQuestion`

---

### Requirement: Commander Config-Add Path Normalization and Validation

Before any write, the `commander-config-add` command SHALL normalize and validate the candidate file path against the resolved project's `path`:

1. **Normalize** to a project-relative POSIX path: strip a leading `./`, collapse redundant separators, and convert an absolute path that lies inside the project directory to its project-relative form.
2. **Reject escapes**: a path containing `..` segments that escape the project, or an absolute path outside the project directory, SHALL abort with `"config path must be inside the project"`. No write.
3. **Validate existence**: the resolved absolute path `<project.path>/<relpath>` MUST exist on disk and be a regular file. If it does not, the command SHALL abort with `"config file does not exist: <path>"`. No write.

#### Scenario: Relative path normalized and validated

- **WHEN** the user supplies `./eslint.config.js` for a project whose `path` contains that file
- **THEN** the command SHALL normalize it to `eslint.config.js`
- **AND** SHALL proceed once existence on disk is confirmed

#### Scenario: Absolute path inside the project converted to relative

- **WHEN** the user supplies an absolute path that lies inside the resolved project's directory
- **THEN** the command SHALL convert it to the project-relative form before persisting

#### Scenario: Path escaping the project rejected

- **WHEN** the normalized path contains `..` segments that escape the project, or is an absolute path outside the project directory
- **THEN** the command SHALL abort with `"config path must be inside the project"`
- **AND** no file SHALL be written

#### Scenario: Non-existent file rejected

- **WHEN** the resolved absolute path does not exist on disk or is not a regular file
- **THEN** the command SHALL abort with `"config file does not exist: <path>"`
- **AND** no file SHALL be written

---

### Requirement: Commander Config-Add Duplicate Handling

If the normalized path is already tracked for the resolved project, the command SHALL inform the user that it is already tracked and exit without writing. The on-disk `configs.json` SHALL remain byte-equivalent.

#### Scenario: Re-adding a tracked path is a no-op

- **WHEN** the user adds a path already present in `configs[project]`
- **THEN** the command SHALL print an `"already tracked"` message
- **AND** SHALL NOT modify `configs.json`

---

### Requirement: Commander Config-Add Confirmation and Write

Before writing, the `commander-config-add` command SHALL render the resolved project name and the normalized project-relative path and require an explicit confirmation via `AskUserQuestion` with two options: a "Save" option and a non-destructive "Cancel" option framed as the safe default.

On "Save" the command SHALL invoke the `commander-config-registry` `add(projectName, { path })` operation and surface a concise success message quoting the project and the tracked path. On "Cancel" (or abort) the `configs.json` file SHALL remain unchanged and the command SHALL exit with a neutral message and no error.

#### Scenario: User confirms

- **WHEN** the user selects "Save" at the confirmation prompt
- **THEN** the command SHALL invoke `commander-config-registry` `add(projectName, { path })`
- **AND** SHALL surface a success message quoting the project and the tracked path

#### Scenario: User cancels

- **WHEN** the user selects "Cancel" (or aborts the prompt)
- **THEN** `configs.json` SHALL remain unchanged
- **AND** the command SHALL exit with a neutral message and no error

#### Scenario: Confirmation shows project and path

- **WHEN** the confirmation prompt is rendered
- **THEN** it SHALL include the resolved project name and the normalized project-relative path so the user can verify before writing
