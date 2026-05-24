# commander-delete-command Specification

## Purpose

Defines the `/commander:delete` slash command — the user-facing entry point for removing a project record from the user-scoped Commander registry at `<HOME>/.claude/commander/projects.json`. The command resolves the deletion target via priority A→B (explicit name → interactive picker), gates the destructive write behind an explicit Delete / Cancel confirmation that exposes the target's full record, and persists via the `commander-registry` `delete(name)` operation. The command is owned by the `commander` plugin.

## Requirements

### Requirement: Commander Delete Command File

The `commander` plugin SHALL include `commands/delete.md`.

The command file SHALL have YAML frontmatter with a non-empty `description` field. The command SHALL be invocable as `/commander:delete`.

#### Scenario: Command file exists

- **WHEN** examining `claude-plugins/commander/commands/`
- **THEN** `delete.md` SHALL exist

#### Scenario: Frontmatter present

- **WHEN** reading `claude-plugins/commander/commands/delete.md`
- **THEN** the file SHALL have YAML frontmatter with a non-empty `description` field

#### Scenario: Command invocable

- **WHEN** the user types `/commander:delete`
- **THEN** Claude SHALL execute the command instructions

---

### Requirement: Commander Delete Target Resolution

The `commander-delete` command SHALL resolve the deletion target using priority A→B:

- **A) Explicit name**: if the user supplies a project name as the first positional argument or as `--name <value>`, that name SHALL be used as the target.
- **B) Interactive pick**: if no name is supplied, the command SHALL list all registered projects via `AskUserQuestion` and the user's selection SHALL become the target. The picker SHALL include an explicit cancel option.

When the registry is missing or contains zero projects, the command SHALL print "no projects registered" and exit cleanly without prompting.

#### Scenario: Explicit name supplied

- **WHEN** the user invokes `/commander:delete investlab` (or `--name investlab`)
- **AND** `investlab` is registered
- **THEN** the command SHALL skip the interactive picker and proceed to confirmation with `investlab` as the target

#### Scenario: No name supplied with non-empty registry

- **WHEN** the user invokes `/commander:delete` with no arguments
- **AND** the registry contains one or more projects
- **THEN** the command SHALL present the registered projects via `AskUserQuestion` for the user to select one
- **AND** the picker SHALL include a cancel option

#### Scenario: Empty registry exits without prompting

- **WHEN** the user invokes `/commander:delete`
- **AND** the registry file is missing or contains zero projects
- **THEN** the command SHALL print "no projects registered"
- **AND** SHALL NOT prompt the user
- **AND** SHALL NOT create or modify any file

#### Scenario: Explicit name not found

- **WHEN** the user invokes `/commander:delete <name>` with a `name` not present in the registry
- **THEN** the command SHALL abort with "project '<name>' is not registered"
- **AND** the on-disk file SHALL remain unchanged

---

### Requirement: Commander Delete Confirmation

Before any write, the `commander-delete` command SHALL render the targeted project's `name`, `path`, and `description` and require an explicit confirmation via `AskUserQuestion` with two options: a destructive "Delete" option and a non-destructive "Cancel" option.

The prompt copy SHALL communicate that deletion is irreversible and SHALL frame "Cancel" as the safe default.

#### Scenario: User confirms deletion

- **WHEN** the user selects the "Delete" option at the confirmation prompt
- **THEN** the command SHALL invoke the `commander-registry` `delete(name)` operation
- **AND** SHALL surface a concise success message quoting the removed `name` and `path`

#### Scenario: User cancels at confirmation

- **WHEN** the user selects the "Cancel" option (or aborts the prompt)
- **THEN** the registry file SHALL remain unchanged
- **AND** the command SHALL exit with a neutral "deletion cancelled" message and no error

#### Scenario: Confirmation shows full record

- **WHEN** the confirmation prompt is rendered
- **THEN** the prompt SHALL include the target's `name`, `path`, and `description` so the user can verify the record before deleting
