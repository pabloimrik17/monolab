## ADDED Requirements

### Requirement: Planta entity

The system SHALL model Planta as a domain entity in `green-beard-domain` with: id (UUID), nombre (string, non-empty, trimmed), familiaId (UUID, required), fotoUrl (string, nullable). Private constructor with `static create()` returning `Result<Planta, ValidationError>` and `static reconstitute()`.

#### Scenario: Create valid planta
- **WHEN** `Planta.create({ nombre: "Monstera Deliciosa", familiaId: "<valid-uuid>" })` is called
- **THEN** it returns `Ok<Planta>` with fotoUrl as null

#### Scenario: Create planta with foto
- **WHEN** `Planta.create({ nombre: "Monstera Deliciosa", familiaId: "<uuid>", fotoUrl: "https://..." })` is called
- **THEN** it returns `Ok<Planta>` with the provided fotoUrl

#### Scenario: Create planta with empty nombre
- **WHEN** `Planta.create({ nombre: "", familiaId: "<uuid>" })` is called
- **THEN** it returns `Err<ValidationError>`

### Requirement: PlantaRepository port

The system SHALL define a `PlantaRepository` interface in `green-beard-domain` with methods returning `ResultAsync`:
- `save(planta)`: persists and returns the planta
- `findById(id)`: returns planta or null
- `findAll()`: returns all plantas ordered by nombre
- `findByFamiliaId(familiaId)`: returns plantas for a familia
- `update(planta)`: updates and returns void
- `delete(id)`: deletes and returns void
- `existsByNombre(nombre)`: checks uniqueness

#### Scenario: Find plantas by familia
- **WHEN** `findByFamiliaId(familiaId)` is called
- **THEN** it returns `Ok<Planta[]>` containing only plantas with that familiaId

### Requirement: Planta CRUD use cases

The system SHALL provide injectable use cases:
- `CreatePlantaUseCase`: validates familiaId exists (via FamiliaRepository), validates nombre uniqueness, creates entity, persists
- `GetPlantasUseCase`: returns all plantas, accepts optional `familiaId` filter
- `GetPlantaByIdUseCase`: returns planta or NotFoundError
- `UpdatePlantaUseCase`: validates existence, validates familiaId if changed, validates nombre uniqueness (excluding self), updates
- `DeletePlantaUseCase`: validates existence, deletes

#### Scenario: Get non-existent planta
- **WHEN** `GetPlantaByIdUseCase` is executed with an unknown id
- **THEN** it returns `Err<NotFoundError>`

#### Scenario: Delete non-existent planta
- **WHEN** `DeletePlantaUseCase` is executed with an unknown id
- **THEN** it returns `Err<NotFoundError>`

#### Scenario: Create planta with non-existent familia
- **WHEN** `CreatePlantaUseCase` is executed with a familiaId that doesn't exist
- **THEN** it returns `Err<NotFoundError>` referencing "Familia"

#### Scenario: Create planta with duplicate nombre
- **WHEN** `CreatePlantaUseCase` is executed with nombre "Monstera Deliciosa" and it already exists
- **THEN** it returns `Err<DuplicateError>`

#### Scenario: Update planta foto
- **WHEN** `UpdatePlantaUseCase` is executed with a new fotoUrl
- **THEN** the planta's fotoUrl is updated

#### Scenario: Update non-existent planta
- **WHEN** `UpdatePlantaUseCase` is executed with an unknown id
- **THEN** it returns `Err<NotFoundError>`

### Requirement: Drizzle plantas table

The system SHALL define a `plantas` table: `id` (UUID PK, default random), `nombre` (VARCHAR 150, NOT NULL, UNIQUE), `familia_id` (UUID, NOT NULL, FK→familias.id), `foto_url` (TEXT, nullable).

#### Scenario: FK constraint enforced
- **WHEN** a planta is inserted with a non-existent familia_id
- **THEN** the database rejects the insert

#### Scenario: Unique nombre constraint
- **WHEN** two plantas with the same nombre are inserted
- **THEN** the database rejects the second insert

### Requirement: Planta domain-persistence mappers

The system SHALL provide `toDomain(row)` and `toRow(entity)` mapper functions in `green-beard-data`.

#### Scenario: Round-trip mapping with nullable foto
- **WHEN** a Planta with fotoUrl=null is mapped to row and back
- **THEN** the resulting entity preserves fotoUrl as null

### Requirement: Planta API routes

The system SHALL expose Hono routes:
- `GET /plantas` → list all (optional query `?familiaId=<uuid>` to filter)
- `GET /plantas/:id` → get by id
- `POST /plantas` → create (body: `{ nombre, familiaId, fotoUrl? }`)
- `PATCH /plantas/:id` → update (body: `{ nombre?, familiaId?, fotoUrl?: string | null }`)
- `DELETE /plantas/:id` → delete

#### Scenario: Create planta via API
- **WHEN** `POST /plantas` with `{ "nombre": "Monstera", "familiaId": "<uuid>" }`
- **THEN** returns 201 with `{ id, nombre, familiaId, familiaName, fotoUrl }`

#### Scenario: Get non-existent planta via API
- **WHEN** `GET /plantas/:id` with unknown id
- **THEN** returns 404 with error DTO

#### Scenario: List plantas filtered by familia
- **WHEN** `GET /plantas?familiaId=<uuid>`
- **THEN** returns 200 with only plantas belonging to that familia

#### Scenario: Create duplicate planta via API
- **WHEN** `POST /plantas` with duplicate nombre
- **THEN** returns 409 with error DTO

#### Scenario: Create planta with non-existent familia via API
- **WHEN** `POST /plantas` with a familiaId that doesn't exist
- **THEN** returns 404 with error DTO

#### Scenario: Update planta with non-existent familia via API
- **WHEN** `PATCH /plantas/:id` with a familiaId that doesn't exist
- **THEN** returns 404 with error DTO

#### Scenario: Update non-existent planta via API
- **WHEN** `PATCH /plantas/:id` with unknown id
- **THEN** returns 404 with error DTO

#### Scenario: Update planta to duplicate nombre via API
- **WHEN** `PATCH /plantas/:id` sets nombre to one that already exists
- **THEN** returns 409 with error DTO

#### Scenario: Delete non-existent planta via API
- **WHEN** `DELETE /plantas/:id` with unknown id
- **THEN** returns 404 with error DTO

### Requirement: Planta DTOs and request types

The system SHALL define in `green-beard-shared`:
- `PlantaDto`: `{ id: string, nombre: string, familiaId: string, familiaName: string, fotoUrl: string | null }`
- `CreatePlantaRequest`: `{ nombre: string, familiaId: string, fotoUrl?: string }`
- `UpdatePlantaRequest`: `{ nombre?: string, familiaId?: string, fotoUrl?: string | null }`

Note: `familiaName` in the DTO is denormalized — the API resolves it from the Familia entity.

#### Scenario: DTO includes familiaName
- **WHEN** API returns a planta
- **THEN** the response includes both familiaId and familiaName
