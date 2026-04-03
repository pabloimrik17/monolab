## ADDED Requirements

### Requirement: Familia entity

The system SHALL model Familia as a domain entity in `green-beard-domain` with: id (UUID, auto-generated), nombre (string, non-empty, trimmed). Private constructor with `static create()` returning `Result<Familia, ValidationError>` and `static reconstitute()` for DB hydration. `update()` method for mutations.

#### Scenario: Create valid familia
- **WHEN** `Familia.create({ nombre: "Araceae" })` is called
- **THEN** it returns `Ok<Familia>` with a UUID id and trimmed nombre

#### Scenario: Create familia with empty name
- **WHEN** `Familia.create({ nombre: "  " })` is called
- **THEN** it returns `Err<ValidationError>`

#### Scenario: Update familia nombre
- **WHEN** `familia.update({ nombre: "Marantaceae" })` is called with a valid name
- **THEN** the nombre is updated and `Ok<void>` is returned

### Requirement: FamiliaRepository port

The system SHALL define a `FamiliaRepository` interface in `green-beard-domain` with methods returning `ResultAsync`:
- `save(familia)`: persists and returns the familia
- `findById(id)`: returns familia or null
- `findAll()`: returns all familias ordered by nombre
- `update(familia)`: updates and returns void
- `delete(id)`: deletes and returns void
- `existsByNombre(nombre)`: checks uniqueness

#### Scenario: Find all familias ordered
- **WHEN** `findAll()` is called with familias "Cactaceae", "Araceae" in DB
- **THEN** it returns `Ok<Familia[]>` ordered alphabetically: Araceae, Cactaceae

#### Scenario: Check nombre uniqueness
- **WHEN** `existsByNombre("Araceae")` is called and "Araceae" exists
- **THEN** it returns `Ok<true>`

### Requirement: Familia CRUD use cases

The system SHALL provide injectable use cases:
- `CreateFamiliaUseCase`: validates nombre uniqueness, creates entity, persists
- `GetFamiliasUseCase`: returns all familias
- `GetFamiliaByIdUseCase`: returns familia or NotFoundError
- `UpdateFamiliaUseCase`: validates existence + nombre uniqueness (excluding self), updates
- `DeleteFamiliaUseCase`: validates existence, deletes

#### Scenario: Get non-existent familia
- **WHEN** `GetFamiliaByIdUseCase` is executed with an unknown id
- **THEN** it returns `Err<NotFoundError>`

#### Scenario: Create familia with duplicate nombre
- **WHEN** `CreateFamiliaUseCase` is executed with nombre "Araceae" and "Araceae" already exists
- **THEN** it returns `Err<DuplicateError>`

#### Scenario: Delete non-existent familia
- **WHEN** `DeleteFamiliaUseCase` is executed with an unknown id
- **THEN** it returns `Err<NotFoundError>`

#### Scenario: Update familia nombre to existing
- **WHEN** `UpdateFamiliaUseCase` is executed changing nombre to one that already exists
- **THEN** it returns `Err<DuplicateError>`

### Requirement: Drizzle familias table

The system SHALL define a `familias` table: `id` (UUID PK, default random), `nombre` (VARCHAR 100, NOT NULL, UNIQUE).

#### Scenario: Table has unique constraint on nombre
- **WHEN** two rows with the same nombre are inserted
- **THEN** the database rejects the second insert

### Requirement: Familia domain-persistence mappers

The system SHALL provide `toDomain(row)` and `toRow(entity)` mapper functions in `green-beard-data` for Familia.

#### Scenario: Round-trip mapping
- **WHEN** a Familia entity is mapped to a row and back via reconstitute
- **THEN** the resulting entity has identical id and nombre

### Requirement: Familia API routes

The system SHALL expose Hono routes:
- `GET /familias` → list all
- `POST /familias` → create (body: `{ nombre }`)
- `PATCH /familias/:id` → update (body: `{ nombre }`)
- `DELETE /familias/:id` → delete

#### Scenario: Create familia via API
- **WHEN** `POST /familias` with `{ "nombre": "Araceae" }`
- **THEN** returns 201 with `{ id, nombre }`

#### Scenario: Delete familia via API
- **WHEN** `DELETE /familias/:id` with valid id
- **THEN** returns 204

#### Scenario: Create duplicate familia via API
- **WHEN** `POST /familias` with duplicate nombre
- **THEN** returns 409 with error DTO

### Requirement: Familia DTOs and request types

The system SHALL define in `green-beard-shared`:
- `FamiliaDto`: `{ id: string, nombre: string }`
- `CreateFamiliaRequest`: `{ nombre: string }`
- `UpdateFamiliaRequest`: `{ nombre?: string }`

#### Scenario: DTO matches API response shape
- **WHEN** API returns a familia
- **THEN** the response body matches `FamiliaDto` shape
