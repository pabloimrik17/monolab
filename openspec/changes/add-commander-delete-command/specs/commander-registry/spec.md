# Commander Registry Specification Delta

## ADDED Requirements

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
