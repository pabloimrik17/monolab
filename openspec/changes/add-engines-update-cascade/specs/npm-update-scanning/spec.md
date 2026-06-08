## MODIFIED Requirements

### Requirement: Level input validation

El skill SHALL aceptar exactamente uno de `patch`, `minor`, `major` como input `level`. `engines` **ya NO** es un nivel válido para este skill: el bump de toolchain (runtime / package manager) se resuelve mediante `detect-toolchain-surfaces` (capability `engine-surface-scanning`), no mediante el escaneo de dependencias. Cualquier otro valor —incluido `engines`— SHALL abortar con un mensaje de la forma `Error: invalid level "<value>". Expected patch|minor|major.`

#### Scenario: Valid level accepted

- **WHEN** el caller pasa `level=patch`
- **THEN** el skill procede más allá de esta precondición sin error

#### Scenario: Invalid level aborts

- **WHEN** el caller pasa `level=beta`
- **THEN** el skill aborta con el error invalid-level (`Expected patch|minor|major.`) y no invoca ncu

#### Scenario: Engines is no longer a dependency-scan level

- **WHEN** el caller pasa `level=engines`
- **THEN** el skill aborta con `Error: invalid level "engines". Expected patch|minor|major.` y no invoca ncu (el toolchain bump se maneja por `detect-toolchain-surfaces`)
