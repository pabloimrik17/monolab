## ADDED Requirements

### Requirement: Drift Signals Surfaced By Read Consumers

The registry contract SHALL recognize the following as "drift" — conditions that read consumers (such as `commander-list`) MUST surface to the user without auto-fixing. Drift SHALL NOT cause read operations themselves to fail; the responsibility for surfacing is the caller's.

The two recognized drift signals are:

- **Legacy v1 record**: a project record loaded from a registry whose file is `version: 2` but that lacks the `repoType` field (or has it as an empty string). This is the expected state for records written before the v2 schema and is preserved byte-for-byte by the v2 writer (see Requirement: Versioned Schema, "Writer upgrades v1 file on first v2 write").
- **Missing path**: a record whose `path` does not resolve to an existing directory at the time of the read. The path is recorded at write time and not validated again until a consumer surfaces this drift.

Read operations (`read`, `list`, `getByName`) SHALL continue to return such records as-is. The detection and presentation of drift is performed by the caller (e.g. the rendering logic of `commander-list`). Auto-migration (writing `repoType` onto a legacy record, or relocating a missing path) is NOT part of this contract and is deferred to `commander-update`.

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

- **WHEN** a caller (e.g. `commander-list`) wants to alert the user to drift
- **THEN** the caller SHALL inspect each record for the two drift signals and produce its own user-facing annotations
- **AND** SHALL NOT call back into the registry to "fix" the drift
