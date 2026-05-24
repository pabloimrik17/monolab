## ADDED Requirements

### Requirement: Commander Update Command File

The `commander` plugin SHALL include `commands/update.md`.

The command file SHALL have YAML frontmatter with a non-empty `description` field. The command SHALL be invocable as `/commander:update`.

#### Scenario: Command file exists

- **WHEN** examining `claude-plugins/commander/commands/`
- **THEN** `update.md` SHALL exist

#### Scenario: Frontmatter present

- **WHEN** reading `claude-plugins/commander/commands/update.md`
- **THEN** the file SHALL have YAML frontmatter with a non-empty `description` field

#### Scenario: Command invocable

- **WHEN** the user types `/commander:update`
- **THEN** Claude SHALL execute the command instructions

## MODIFIED Requirements

### Requirement: Invocation Surface

The `commander` plugin SHALL expose a `/commander:update` slash command that edits a single registered project record in place.

Invocation form:

```text
/commander:update [<name> | --name <name>] [--keywords <csv>] [--description <text>] [--rules <csv>] [--repo-type <enum>] [--refresh]
```

All flags are optional. Both positional `<name>` and `--name <name>` are accepted and equivalent for target identification. If both are supplied and their values differ, the command SHALL abort with `"conflicting target name inputs"` and SHALL NOT modify the registry.

#### Scenario: Command discovered by Claude Code

- **WHEN** the `commander` plugin is installed
- **THEN** `/commander:update` SHALL appear in the slash-command list
- **AND** SHALL be invocable with the documented argument forms

#### Scenario: Unknown flag rejected

- **WHEN** `ARGUMENTS` contains a flag not in `{ --name, --keywords, --description, --rules, --repo-type, --refresh }`
- **THEN** the command SHALL abort with `"unknown flag: <name>"`
- **AND** SHALL NOT modify the registry

#### Scenario: Positional name and --name disagree

- **WHEN** `ARGUMENTS` contains both a positional `<name>` token and `--name <value>`
- **AND** the two values are not byte-equal
- **THEN** the command SHALL abort with `"conflicting target name inputs"`
- **AND** SHALL NOT prompt the user further
- **AND** SHALL NOT modify the registry

---

### Requirement: Target Resolution Priority A → B

The command SHALL resolve which project record to edit using a two-step priority:

- **A) Explicit name** — first positional argument or `--name <value>`. When supplied, the command SHALL skip Priority B.
- **B) Interactive picker** — when no name is supplied, the command SHALL invoke `list()` and present projects via a single `AskUserQuestion`, one option per project plus a final `"Cancel"`.

Option labels in the picker SHALL be `<name> — <path>`, mirroring `commander-delete`. The empty-registry path is the only exit before picker render.

#### Scenario: Explicit name resolves directly

- **WHEN** the user invokes `/commander:update investlab`
- **AND** `investlab` is a key in `projects`
- **THEN** the target SHALL be set to `investlab`
- **AND** the interactive picker SHALL NOT be shown

#### Scenario: Explicit name not registered aborts

- **WHEN** the user invokes `/commander:update <name>` and `<name>` is not in the registry
- **THEN** the command SHALL abort with `"project '<name>' is not registered"`
- **AND** SHALL NOT enter the picker as a fallback
- **AND** SHALL NOT modify the registry

#### Scenario: No name supplied opens picker

- **WHEN** the user invokes `/commander:update` with no positional argument and no `--name`
- **AND** the registry contains at least one project
- **THEN** the command SHALL present every registered project plus `"Cancel"` via `AskUserQuestion`
- **AND** the user's selection SHALL become the target

#### Scenario: Empty registry exits cleanly

- **WHEN** the registry file is missing or `projects` is `{}`
- **THEN** the command SHALL print `"no projects registered"` and exit
- **AND** SHALL NOT prompt the user
- **AND** SHALL NOT create or modify any file

#### Scenario: Picker cancel exits without write

- **WHEN** the user selects `"Cancel"` in the picker (or aborts the prompt)
- **THEN** the command SHALL exit with `"update cancelled"`
- **AND** SHALL NOT modify the registry
