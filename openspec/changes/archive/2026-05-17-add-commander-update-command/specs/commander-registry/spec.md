# commander-registry Delta — add-commander-update-command

## ADDED Requirements

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

## MODIFIED Requirements

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
