## MODIFIED Requirements

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
