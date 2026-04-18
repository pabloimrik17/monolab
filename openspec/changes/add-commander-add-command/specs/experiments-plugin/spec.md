# experiments-plugin Specification Delta

## ADDED Requirements

### Requirement: Commander Add Command File

The `experiments` plugin SHALL include `commands/commander-add.md`.

The command file SHALL have YAML frontmatter with a `description` field. The command SHALL be invocable as `/experiments:commander-add`.

#### Scenario: Command file exists

- **WHEN** examining `claude-plugins/experiments/commands/`
- **THEN** `commander-add.md` SHALL exist

#### Scenario: Frontmatter present

- **WHEN** reading `commands/commander-add.md`
- **THEN** the file SHALL have YAML frontmatter with a non-empty `description` field

#### Scenario: Command invocable

- **WHEN** user types `/experiments:commander-add`
- **THEN** Claude SHALL execute the command instructions

---

### Requirement: Commander Add Metadata Capture Priority

The `commander-add` command SHALL collect project metadata (name, path, keywords, description, special rules) using priority A→B→C:

- **A) Explicit arguments**: fields provided by the user as command arguments are taken as-is.
- **B) Auto-detection**: fields not provided by A are inferred by dispatching a subagent with `model: "haiku"` that inspects the target directory. Detected values SHALL be shown to the user for confirmation or edit before persisting.
- **C) Prompt**: fields still missing after B SHALL be requested from the user field-by-field via `AskUserQuestion`.

#### Scenario: All fields provided as arguments

- **WHEN** the user invokes `/experiments:commander-add` with all metadata fields supplied as arguments
- **THEN** the command SHALL NOT dispatch the Haiku subagent
- **AND** SHALL NOT prompt the user for any field except the final save confirmation

#### Scenario: Auto-detection confirmation step

- **WHEN** the command auto-detects any field
- **THEN** it SHALL present the detected values to the user before writing
- **AND** SHALL allow the user to confirm, edit, or reject each field

#### Scenario: Prompted field when undetectable

- **WHEN** a required field cannot be supplied by A or B
- **THEN** the command SHALL prompt the user explicitly for that field

---

### Requirement: Commander Add Monorepo Handling

When the target directory is a monorepo, the `commander-add` command SHALL classify it as single-project or multi-project.

- **Single-project monorepo**: keywords SHALL be extracted from the entire repository.
- **Multi-project monorepo**: the command SHALL ask the user which subproject to register. The `path` field SHALL record the chosen subproject directory (not the monorepo root). Keywords SHALL be extracted only from the chosen subproject. The optional `monorepoRoot` field SHALL record the monorepo root path.

#### Scenario: Multi-project monorepo prompts for subproject

- **WHEN** the target directory contains workspace markers (e.g., `pnpm-workspace.yaml`, `nx.json`, `turbo.json`, `lerna.json`) with multiple independent projects
- **AND** the user did not indicate a subproject via arguments
- **THEN** the command SHALL present the detected subprojects via `AskUserQuestion` for the user to choose one

#### Scenario: Keywords scoped to chosen subproject

- **WHEN** the user picks a subproject in a multi-project monorepo
- **THEN** the persisted `keywords` SHALL be extracted from that subproject only
- **AND** the persisted `path` SHALL be the subproject's absolute directory

#### Scenario: Single-project monorepo aggregates keywords

- **WHEN** the target directory is a monorepo with a single coherent project
- **THEN** keywords SHALL be aggregated across the repository

---

### Requirement: Commander Add Registration Flow

The `commander-add` command SHALL, before persisting:

1. Validate that `path` exists on disk.
2. Validate that `name` is not already present in the registry.
3. Show the final record to the user and require an explicit confirmation.

On confirmation the command SHALL invoke the `commander-registry` `add` operation.

#### Scenario: User cancels at final confirmation

- **WHEN** the user declines the final confirmation
- **THEN** the registry file SHALL remain unchanged
- **AND** the command SHALL exit without error

#### Scenario: Duplicate name blocked before prompt

- **WHEN** the proposed `name` already exists in the registry
- **THEN** the command SHALL inform the user and SHALL NOT proceed to write
- **AND** SHALL offer the user the option to pick a different name or abort

#### Scenario: Path does not exist

- **WHEN** the resolved `path` does not exist on disk
- **THEN** the command SHALL abort with a clear message identifying the invalid path
