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

### Requirement: Delete Operation

The `delete(name)` operation SHALL remove a project record from the registry by its unique `name`.

The operation SHALL:

1. Reject the request if the registry file does not exist or contains no projects, with an explicit "no projects registered" error.
2. Reject the request if `name` is not a key in `projects`, with an explicit "project '<name>' is not registered" error.
3. On a valid target, remove the entry from `projects` and write the updated registry atomically (see "Atomic Write" requirement).
4. Preserve all other project records byte-equivalent in their fields (no reordering, no synthetic field changes).
5. Preserve the registry `version` value (no schema downgrade or upgrade triggered by deletion).
6. Return the removed record so callers can render a success message.

`delete` SHALL NOT create the registry file when none exists, and SHALL NOT modify the file when rejecting an unknown name.

#### Scenario: Successful delete

- **WHEN** `delete("investlab")` is invoked on a registry containing `investlab` and at least one other project
- **THEN** the registry file SHALL no longer contain a `projects.investlab` entry
- **AND** every other project entry SHALL remain present with its fields unchanged
- **AND** the operation SHALL return the removed record

#### Scenario: Delete on missing registry

- **WHEN** the registry file does not exist
- **AND** `delete("anything")` is invoked
- **THEN** the operation SHALL fail with a "no projects registered" error
- **AND** SHALL NOT create the file or directory

#### Scenario: Delete on empty registry

- **WHEN** the registry file exists with `{ "version": 2, "projects": {} }`
- **AND** `delete("anything")` is invoked
- **THEN** the operation SHALL fail with a "no projects registered" error
- **AND** the on-disk file SHALL remain unchanged

#### Scenario: Unknown name rejected

- **WHEN** `delete(name)` is invoked with a `name` that is not a key in `projects`
- **THEN** the operation SHALL fail with a "project '<name>' is not registered" error
- **AND** the on-disk file SHALL remain unchanged

#### Scenario: Atomic write on delete

- **WHEN** `delete(name)` succeeds
- **THEN** the persistence SHALL follow the same atomic recipe as `add` (serialize → write `projects.json.tmp` → rename over `projects.json`)
- **AND** if the process is interrupted before the rename, `projects.json` SHALL remain in its previous state with the target record still present

#### Scenario: Version preserved across delete

- **WHEN** `delete(name)` succeeds on a registry with `"version": 2`
- **THEN** the resulting file SHALL still have `"version": 2`

---

### Requirement: Update Operation

The registry SHALL expose an `update(name, patch)` write primitive that mutates a single record's editable fields in place.

The operation SHALL:

1. Reject with `"no projects registered"` if the registry file does not exist OR if it exists with `projects: {}`. MUST NOT create the file in this case.
2. Reject with `"project '<name>' is not registered"` if `name` is not a key in `projects`. MUST NOT modify the file.
3. Reject with `"field '<f>' is not editable"` if the patch contains a key outside the editable set `{ keywords, description, specialRules, repoType }`.
4. Reject with `"invalid repoType: <value>"` if `patch.repoType` is present and not exactly one of `"single-repo"`, `"monorepo"`, `"multi-monorepo"`.
5. Apply the patch field-by-field to a copy of the existing record. Fields absent from the patch SHALL remain byte-equivalent.
6. Set `updatedAt` on the patched record to the current UTC ISO-8601 timestamp.
7. Preserve `createdAt` byte-equivalent (the operation SHALL NOT touch `createdAt`).
8. Preserve key insertion order in `projects` — the updated record SHALL remain at its original position.
9. Preserve the registry `version` value (no schema downgrade or upgrade triggered by update).
10. Persist via the atomic write recipe (serialize → write `projects.json.tmp` → rename over `projects.json`).
11. Return the updated record so callers can render a success message.

`update` SHALL NOT create the registry file when none exists, and SHALL NOT modify the file when rejecting a patch.

#### Scenario: Successful update refreshes updatedAt only

- **WHEN** `update("investlab", { description: "..." })` is invoked on a registry containing `investlab`
- **THEN** the persisted `investlab` record SHALL have the new `description`
- **AND** `updatedAt` SHALL be set to the current UTC timestamp
- **AND** `createdAt` SHALL be byte-equivalent to its previous value
- **AND** all fields not in the patch SHALL be byte-equivalent to their previous values

#### Scenario: Update on missing registry rejected

- **WHEN** the registry file does not exist
- **AND** `update("anything", { ... })` is invoked
- **THEN** the operation SHALL fail with `"no projects registered"`
- **AND** SHALL NOT create the file or directory

#### Scenario: Update on empty registry rejected

- **WHEN** the registry file exists with `{ "version": 2, "projects": {} }`
- **AND** `update("anything", { ... })` is invoked
- **THEN** the operation SHALL fail with `"no projects registered"`
- **AND** the on-disk file SHALL remain unchanged

#### Scenario: Unknown name rejected

- **WHEN** `update(name, { ... })` is invoked with a `name` that is not a key in `projects`
- **THEN** the operation SHALL fail with `"project '<name>' is not registered"`
- **AND** the on-disk file SHALL remain unchanged

#### Scenario: Non-editable field rejected

- **WHEN** the patch contains a key not in `{ keywords, description, specialRules, repoType }` (e.g., `path`, `name`, `createdAt`)
- **THEN** the operation SHALL fail with `"field '<key>' is not editable"`
- **AND** the on-disk file SHALL remain unchanged

#### Scenario: Invalid repoType rejected

- **WHEN** `update(name, { repoType: "foo" })` is invoked
- **THEN** the operation SHALL fail with `"invalid repoType: foo"`
- **AND** the on-disk file SHALL remain unchanged

#### Scenario: Insertion order preserved

- **WHEN** a registry contains projects in order `[alpha, beta, gamma]`
- **AND** `update("beta", { ... })` succeeds
- **THEN** the serialized `projects` keys SHALL remain in the order `[alpha, beta, gamma]`

#### Scenario: createdAt preserved across update

- **WHEN** a record's pre-update `createdAt` is `"2026-04-19T12:00:00Z"`
- **AND** `update(name, patch)` succeeds
- **THEN** the persisted record's `createdAt` SHALL still be `"2026-04-19T12:00:00Z"`
- **AND** `updatedAt` SHALL be a later UTC ISO-8601 timestamp

#### Scenario: Atomic write on update

- **WHEN** `update(name, patch)` succeeds
- **THEN** the persistence SHALL follow the same atomic recipe as `add` and `delete` (serialize → write `projects.json.tmp` → rename over `projects.json`)
- **AND** if the process is interrupted before the rename, `projects.json` SHALL remain in its previous state with the pre-update record intact

#### Scenario: Version preserved across update

- **WHEN** `update(name, patch)` succeeds on a registry with `"version": 2`
- **THEN** the resulting file SHALL still have `"version": 2`

#### Scenario: Legacy v1 record gains repoType in place

- **WHEN** the target record predates v2 and has no `repoType` field
- **AND** `update(name, { repoType: "single-repo" })` is invoked
- **THEN** the persisted record SHALL contain `"repoType": "single-repo"`
- **AND** all other fields on that record SHALL be byte-equivalent
- **AND** the record's position in `projects` insertion order SHALL be preserved

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

### Requirement: Drift Signals Surfaced By Read Consumers

The registry contract SHALL recognize the following as "drift" — conditions that read consumers (such as `commander-list`) MUST surface to the user without auto-fixing. Drift SHALL NOT cause read operations themselves to fail; the responsibility for surfacing is the caller's.

The two recognized drift signals are:

- **Legacy v1 record**: a project record loaded from a registry whose file is `version: 2` but that lacks the `repoType` field (or has it as an empty string). This is the expected state for records written before the v2 schema and is preserved byte-for-byte by the v2 writer (see Requirement: Versioned Schema, "Writer upgrades v1 file on first v2 write").
- **Missing path**: a record whose `path` does not resolve to an existing directory at the time of the read. The path is recorded at write time and not validated again until a consumer surfaces this drift.

Read operations (`read`, `list`, `getByName`) SHALL continue to return such records as-is. The detection and presentation of drift is performed by the caller (e.g. the rendering logic of `commander-list`).

Remediation of the `repoType` drift signal is supported by the `update(name, patch)` write primitive: a caller (e.g. `commander-update`) MAY set `repoType` on a legacy v1 record via `update`, which writes the field in place while preserving the rest of the record byte-for-byte. The registry contract SHALL NOT auto-migrate (silently inject `repoType` on read or on unrelated writes); remediation is always user-initiated via `update`.

Remediation of the missing-path drift signal is NOT supported by `update` — `path` is not in the editable field set. Recovering from a missing path requires `delete` + `add` (or a future dedicated command); the registry contract treats this as an out-of-band recovery flow.

#### Scenario: Read returns legacy record unchanged

- **WHEN** `read()` or `list()` is invoked against a `version: 2` registry that contains a record without `repoType`
- **THEN** the operation SHALL return that record with `repoType` absent (no synthetic value injected)
- **AND** SHALL NOT raise an error

#### Scenario: Read returns missing-path record unchanged

- **WHEN** `read()` or `list()` is invoked against a registry whose record's `path` no longer exists on disk
- **THEN** the operation SHALL return the record with its original `path` string intact
- **AND** SHALL NOT raise an error
- **AND** SHALL NOT mutate the registry file

#### Scenario: Surfacing is the caller's job

- **WHEN** a caller performing a read/surfacing operation (e.g. `commander-list`) wants to alert the user to drift
- **THEN** the caller SHALL inspect each record for the two drift signals and produce its own user-facing annotations
- **AND** SHALL NOT call back into the registry from the read/surfacing path to "fix" the drift (no silent auto-mutation triggered by a read)
- **AND** user-initiated remediation via `update(name, { repoType: "<enum>" })` remains permitted as a separate, explicit write — see "User-initiated repoType backfill via update" below

#### Scenario: User-initiated repoType backfill via update

- **WHEN** a caller invokes `update(name, { repoType: "<enum>" })` against a legacy v1 record
- **THEN** the registry SHALL persist the new `repoType` in place (preserving `createdAt`, refreshing `updatedAt`)
- **AND** SHALL NOT auto-set `repoType` on any other record during the same operation

#### Scenario: Missing-path drift not remediable via update

- **WHEN** a caller attempts `update(name, { path: "<new path>" })`
- **THEN** the operation SHALL fail with `"field 'path' is not editable"`
- **AND** the on-disk file SHALL remain unchanged

