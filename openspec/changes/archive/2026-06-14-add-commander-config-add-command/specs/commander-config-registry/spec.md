# commander-config-registry Specification

## ADDED Requirements

### Requirement: Config Registry File Location

The config registry SHALL be stored as a single JSON file at `<HOME>/.claude/commander/configs.json` — a sibling of the project registry `projects.json`, in the same Claude Code data directory.

The directory and file SHALL be created lazily on first write. Before any entries exist, reads SHALL behave as if the config registry were empty. The project registry `projects.json` SHALL NOT be read, written, or otherwise affected by config registry operations.

#### Scenario: Path resolves to user home

- **WHEN** any `experiments:commander-config-*` command accesses the config registry
- **THEN** the path SHALL resolve to `<HOME>/.claude/commander/configs.json`
- **AND** `<HOME>` SHALL follow platform conventions (`$HOME` on POSIX, `%USERPROFILE%` on Windows)

#### Scenario: Config registry missing on first use

- **WHEN** the `configs.json` file does not exist
- **AND** a command performs a read operation
- **THEN** the operation SHALL return an empty config registry (zero tracked configs) without raising an error
- **AND** SHALL NOT create the file or directory

#### Scenario: Directory missing on first write

- **WHEN** the `configs.json` file does not exist
- **AND** a command performs a write operation
- **THEN** the parent directory `<HOME>/.claude/commander/` SHALL be created recursively
- **AND** `configs.json` SHALL be created with the full versioned schema

---

### Requirement: Config Registry Versioned Schema

The config registry file SHALL contain a top-level object with a `version` integer and a `configs` object keyed by project name. Each value SHALL be an array of config entries (see "Config Entry Shape").

For this change the schema version SHALL be `1`. Future schema changes SHALL increment the version and SHALL remain loadable (or explicitly migrated) by all subsequent `experiments:commander-config-*` commands. The config registry version is independent of the `projects.json` registry version.

#### Scenario: Valid schema shape

- **WHEN** the config registry file is parsed
- **THEN** it SHALL match `{ "version": 1, "configs": { [projectName]: ConfigEntry[] } }`

#### Scenario: Unknown version rejected

- **WHEN** a command reads a config registry whose `version` is greater than the version it knows (`> 1`)
- **THEN** the command SHALL abort with an explicit `"unsupported config registry version"` message
- **AND** SHALL NOT overwrite the file

---

### Requirement: Config Entry Shape

Each entry in a project's config array SHALL be a JSON object with the following field:

- `path` (string, required): the config file location **relative to the owning project's `path`**, expressed with POSIX separators (`/`), without a leading `./`, without any `..` segments, and never absolute.

Entries SHALL be objects (not bare strings) so that future per-file metadata can be added as additional optional fields without a breaking shape change.

Archetype and config `type` SHALL NOT be persisted on the entry. The applicable archetype of a tracked file is derived from the owning project's `keywords` in `projects.json` (resolved via the project-name key); the config `type` is derived from the path. A v1 writer SHALL NOT synthesize either field.

#### Scenario: Entry carries only a project-relative path

- **WHEN** a config entry is persisted
- **THEN** it SHALL contain a non-empty `path` field
- **AND** `path` SHALL be project-relative, POSIX-separated, with no leading `./` and no `..` segments
- **AND** the entry SHALL NOT contain an `archetypes` field
- **AND** the entry SHALL NOT contain a synthesized `type` field

---

### Requirement: Config Registry Read Operations

The config registry SHALL expose the following non-mutating read operations:

- `read()`: return the full parsed `{ version, configs }` object; return `{ version: 1, configs: {} }` when the file is missing.
- `list(projectName)`: return the array of config entries for the given project, or `[]` when the project has no tracked configs or the file is missing.

Read operations SHALL NOT create the config registry file.

#### Scenario: read on missing file

- **WHEN** the `configs.json` file does not exist
- **AND** `read()` is invoked
- **THEN** it SHALL return `{ version: 1, configs: {} }`
- **AND** SHALL NOT create the file or directory

#### Scenario: list for a project with no tracked configs

- **WHEN** `list("investlab")` is invoked
- **AND** `investlab` has no entry in `configs`
- **THEN** it SHALL return `[]`
- **AND** SHALL NOT create or modify the file

---

### Requirement: Config Registry Add Operation

The `add(projectName, entry)` operation SHALL append a config entry to a project's tracked list.

The operation SHALL:

1. Reject with `"path already tracked"` if an entry whose normalized `path` equals `entry.path` already exists for `projectName`. The on-disk file SHALL remain unchanged.
2. Create `configs[projectName]` as an empty array if it does not yet exist, then append `entry`.
3. Preserve the insertion order of existing entries and of other projects' arrays.
4. Preserve the config registry `version` value.
5. Persist via the atomic write recipe (see "Config Registry Atomic Write").

The `add` operation is the low-level persistence primitive. It does not consult `projects.json`; verifying that `projectName` is a registered project is the responsibility of the command layer (see `commander-config-add-command`).

#### Scenario: First config for a project creates the array

- **WHEN** `add("investlab", { path: "eslint.config.js" })` is invoked
- **AND** `configs` has no `investlab` key
- **THEN** `configs.investlab` SHALL be created as `[ { "path": "eslint.config.js" } ]`

#### Scenario: Subsequent config appends in order

- **WHEN** `add("investlab", { path: ".prettierrc" })` is invoked
- **AND** `configs.investlab` already contains `[ { "path": "eslint.config.js" } ]`
- **THEN** `configs.investlab` SHALL be `[ { "path": "eslint.config.js" }, { "path": ".prettierrc" } ]`

#### Scenario: Duplicate path rejected

- **WHEN** `add(projectName, entry)` is invoked with a `path` already present for that project
- **THEN** the operation SHALL fail with a `"path already tracked"` error
- **AND** the on-disk file SHALL remain unchanged

---

### Requirement: Config Registry Atomic Write

All write operations SHALL be synchronous and atomic, using the same recipe as the project registry:

1. Serialize the updated config registry to JSON with 2-space indentation and a single trailing newline.
2. Write the content to a sibling temporary file `<HOME>/.claude/commander/configs.json.tmp` (overwriting any pre-existing temp).
3. Rename the temporary file over `configs.json`.

If any step fails, `configs.json` SHALL remain in its previous state.

#### Scenario: Crash between temp write and rename

- **WHEN** the process is interrupted after the temp file is written but before the rename
- **THEN** `configs.json` SHALL remain unchanged from its previous state
- **AND** the temp file MAY remain on disk; subsequent writes SHALL overwrite it

#### Scenario: JSON formatting

- **WHEN** the config registry is written
- **THEN** the file SHALL be valid JSON with 2-space indentation
- **AND** SHALL end with a single trailing newline character

---

### Requirement: Config Drift Surfaced By Read Consumers

The config registry contract SHALL recognize the following as "drift" — conditions that read consumers (such as a future `config-list`) MUST surface without auto-fixing. Drift SHALL NOT cause read operations to fail; surfacing is the caller's responsibility.

The two recognized drift signals are:

- **Orphan entry**: a `configs` key whose project name is not present in `projects.json`. This arises when a project is deleted from the project registry without its config entries being cleaned up. Cleanup is out of scope for this change (config CRUD, MON-157).
- **Missing file**: a config entry whose resolved absolute path (`<project.path>/<entry.path>`) does not exist on disk at read time. The path is validated only at add time and not re-validated on read.

Read operations (`read`, `list`) SHALL continue to return such entries as-is. The config registry SHALL NOT auto-remove orphan or missing-file entries.

#### Scenario: Read returns orphan entry unchanged

- **WHEN** `read()` is invoked against a `configs.json` that has a key for a project absent from `projects.json`
- **THEN** the operation SHALL return that project's entries as-is
- **AND** SHALL NOT raise an error
- **AND** SHALL NOT mutate the file

#### Scenario: Read returns missing-file entry unchanged

- **WHEN** `list(projectName)` is invoked and one entry's resolved absolute path no longer exists on disk
- **THEN** the operation SHALL return the entry with its `path` intact
- **AND** SHALL NOT raise an error
- **AND** SHALL NOT mutate the file
