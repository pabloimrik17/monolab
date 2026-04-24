# Commander Registry Specification

## Purpose

Defines the persistence layer for Commander: a user-scoped registry of a user's projects stored at `~/.claude/commander/projects.json`. The registry provides a stable, versioned JSON schema and a read/write contract (read, list, getByName, add, atomic persist) consumed by every `commander:*` command. All writes are synchronous and atomic; no lockfile in v1. Future Commander plugin extraction is a pure move — registry path and schema stay identical.

## Requirements

### Requirement: Registry File Location

The registry SHALL be stored as a single JSON file at `~/.claude/commander/projects.json` (user home, Claude Code data directory).

The directory and file SHALL be created lazily on first write. Before any records exist, reads SHALL behave as if the registry were empty.

#### Scenario: Path resolves to user home

- **WHEN** any `commander:*` command accesses the registry
- **THEN** the path SHALL resolve to `<HOME>/.claude/commander/projects.json`
- **AND** `<HOME>` SHALL follow platform conventions (`$HOME` on POSIX, `%USERPROFILE%` on Windows)

#### Scenario: Registry missing on first use

- **WHEN** the registry file does not exist
- **AND** a command performs a read operation
- **THEN** the operation SHALL return an empty registry (zero projects) without raising an error

#### Scenario: Registry directory missing on first write

- **WHEN** the registry file does not exist
- **AND** a command performs a write operation
- **THEN** the parent directory `~/.claude/commander/` SHALL be created recursively
- **AND** the file SHALL be created with the full versioned schema

---

### Requirement: Versioned Schema

The registry file SHALL contain a top-level object with a `version` integer and a `projects` object keyed by project name.

For this change the schema version SHALL be `2`. Future schema changes SHALL increment the version and SHALL remain loadable (or explicitly migrated) by all subsequent `commander:*` commands.

Writers that produce `version: 2` records SHALL populate every record with the v2-required fields defined in "Project Record Shape".

#### Scenario: Valid schema shape

- **WHEN** the registry file is parsed
- **THEN** it SHALL match `{ "version": 2, "projects": { [name]: ProjectRecord } }`

#### Scenario: Unknown version rejected

- **WHEN** a command reads a registry whose `version` is greater than the version it knows
- **THEN** the command SHALL abort with an explicit "unsupported registry version" message
- **AND** SHALL NOT overwrite the file

#### Scenario: Writer upgrades v1 file on first v2 write

- **WHEN** a v2-aware writer opens an existing registry with `"version": 1`
- **AND** performs an `add` operation
- **THEN** the serialized output SHALL have `"version": 2`
- **AND** existing records that predate v2 SHALL be preserved byte-for-byte in their fields (no synthetic `repoType` added)

---

### Requirement: Project Record Shape

Each project record SHALL contain the following fields:

- `name` (string, required): the unique identifier, kebab-case or plain lowercase.
- `path` (string, required): absolute path to the effective project directory.
- `keywords` (string[], required): non-empty list of technologies (frameworks, languages, tools, patterns), normalized via the `commander-normalize` skill's controlled vocabulary (`vocabulary.json`) and deterministic pipeline.
- `description` (string, required): short summary, 10–15 words.
- `createdAt` (string, required): ISO-8601 timestamp of first registration.
- `updatedAt` (string, required): ISO-8601 timestamp of last modification.
- `repoType` (string, required in v2): one of `"single-repo"`, `"monorepo"`, `"multi-monorepo"`.
- `specialRules` (string[], optional): free-form rules not evident in code.
- `monorepoRoot` (string, optional): absolute path to the monorepo root if `path` is a subproject.

The `repoType` field is required for any record written by a v2-aware writer. Records that predate v2 and do not carry `repoType` remain readable; the absence of the field is treated as "drift" and SHALL be surfaced by future `commander-update`/`commander-list` commands (out of scope for this change).

#### Scenario: Required fields present on v2 writes

- **WHEN** a v2-aware writer persists a project record
- **THEN** `name`, `path`, `keywords`, `description`, `createdAt`, `updatedAt`, `repoType` SHALL be present and non-empty
- **AND** `keywords` SHALL contain at least one entry

#### Scenario: Timestamps are ISO-8601

- **WHEN** a project is first registered
- **THEN** `createdAt` and `updatedAt` SHALL be equal and set to the current UTC time in ISO-8601 format

#### Scenario: repoType enumeration

- **WHEN** a v2-aware writer persists a project record
- **THEN** `repoType` SHALL be exactly one of `"single-repo"`, `"monorepo"`, or `"multi-monorepo"`
- **AND** any other value SHALL be rejected at write time

#### Scenario: Legacy records without repoType remain readable

- **WHEN** a v2-aware reader loads a registry whose file is `"version": 2` but contains one or more records that lack `repoType`
- **THEN** the read SHALL NOT fail
- **AND** those records SHALL be returned as-is so callers can surface drift

---

### Requirement: Read Operations

The registry SHALL expose the following read operations, all of which are non-mutating:

- `read()`: return the full parsed registry.
- `list()`: return an array of all project records.
- `getByName(name)`: return the record for the given name, or `null` if absent.

Read operations SHALL NOT create the registry file.

#### Scenario: getByName on missing registry

- **WHEN** the registry file does not exist
- **AND** `getByName("anything")` is invoked
- **THEN** it SHALL return `null`
- **AND** SHALL NOT create the file or directory

#### Scenario: list returns records in insertion order

- **WHEN** `list()` is invoked
- **THEN** it SHALL return project records in the order they appear in the `projects` object (JSON insertion order)

---

### Requirement: Add Operation

The `add(record)` operation SHALL persist a new project record to the registry.

The operation SHALL:

1. Reject the record if `name` already exists, with an explicit "project name already registered" error.
2. Reject the record if `path` does not exist on disk, with an explicit "path does not exist" error.
3. Set `createdAt` and `updatedAt` to the current UTC ISO-8601 timestamp.
4. Write the updated registry atomically (see Atomic Write requirement).

#### Scenario: Successful add

- **WHEN** `add({ name: "investlab", path: "<existing>", keywords: ["react"], description: "..." })` is invoked on an empty registry
- **THEN** the registry file SHALL contain exactly one project with that name
- **AND** `createdAt` and `updatedAt` SHALL be set to the current UTC timestamp

#### Scenario: Duplicate name rejected

- **WHEN** `add(record)` is invoked with a name that already exists in the registry
- **THEN** the operation SHALL fail with a "project name already registered" error
- **AND** the on-disk file SHALL remain unchanged

#### Scenario: Non-existent path rejected

- **WHEN** `add(record)` is invoked with a `path` that does not exist on disk
- **THEN** the operation SHALL fail with a "path does not exist" error
- **AND** the on-disk file SHALL remain unchanged

---

### Requirement: Atomic Write

All write operations SHALL be synchronous and atomic.

The registry SHALL be persisted by:

1. Serializing the updated registry to JSON with 2-space indentation and a trailing newline.
2. Writing the content to a sibling temporary file (e.g., `projects.json.tmp`).
3. Renaming the temporary file over `projects.json`.

If any step fails the registry file SHALL remain in its previous state.

#### Scenario: Crash between temp write and rename

- **WHEN** the process is interrupted after the temp file is written but before the rename
- **THEN** `projects.json` SHALL remain unchanged from its previous state
- **AND** the temp file MAY remain on disk; subsequent writes SHALL overwrite it

#### Scenario: JSON formatting

- **WHEN** the registry is written
- **THEN** the file SHALL be valid JSON with 2-space indentation
- **AND** SHALL end with a single trailing newline character
