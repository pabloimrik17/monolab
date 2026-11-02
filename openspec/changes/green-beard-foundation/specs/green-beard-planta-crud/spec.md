## ADDED Requirements

### Requirement: Planta model

The system SHALL model Planta in `packages/green-beard-nursery/src/domain/model/planta.model.ts`, with unit tests in `planta.model.test.ts`, with: id (UUID, auto-generated), nombre (string, non-empty, trimmed), familiaId (UUID, required), fotoUrl (string, nullable). Private constructor with `static create()` returning `Result<Planta, ValidationError>` and `static reconstitute()` for DB hydration. `update()` method for mutations.

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

The nursery package SHALL declare a `PlantaRepository` port in `src/domain/repository/planta.repository.ts`, implemented by `PlantaPgRepository` (server) and `PlantaApiRepository` (client). Its methods SHALL return `ResultAsync`:

- `save(planta)`: persists and returns the planta
- `findById(id)`: returns planta or null
- `update(planta)`: updates and returns void
- `delete(id)`: deletes and returns void
- `existsByNombre(nombre)`: checks uniqueness

#### Scenario: Check nombre uniqueness

- **WHEN** `existsByNombre("Monstera Deliciosa")` is called and "Monstera Deliciosa" exists
- **THEN** it returns `Ok<true>`

### Requirement: Planta with familia read query

Planta reads show the familia name, which belongs to another aggregate, so they SHALL go through the `PlantaWithFamiliaQuery` read query (`src/domain/query/planta-with-familia.query.ts`). It returns `PlantaWithFamiliaReadModel` and is implemented with a SQL join on the server and over the API on the client:

- `list({ familiaId? })`: plantas ordered by nombre, optionally of one familia
- `findById(id)`: one planta, or null

#### Scenario: Find plantas by familia

- **WHEN** `list({ familiaId })` is called
- **THEN** it returns `Ok<PlantaWithFamiliaReadModel[]>` containing only plantas with that familiaId, each with its familia name

### Requirement: Planta CRUD use cases

The nursery package SHALL provide the server use cases `PlantaCreateUseCase`, `PlantaListUseCase`, `PlantaGetByIdUseCase`, `PlantaUpdateUseCase` and `PlantaDeleteUseCase` in `src/application/server/use-case/`, each with an integration test beside it. Create and update SHALL check that the familia exists and nombre is unique (excluding itself on update). Get, update and delete SHALL return `NotFoundError` for an unknown id. List (optional `familiaId` filter) and get SHALL use the read query.

#### Scenario: Get non-existent planta

- **WHEN** `PlantaGetByIdUseCase` is executed with an unknown id
- **THEN** it returns `Err<NotFoundError>`

#### Scenario: Delete non-existent planta

- **WHEN** `PlantaDeleteUseCase` is executed with an unknown id
- **THEN** it returns `Err<NotFoundError>`

#### Scenario: Create planta with non-existent familia

- **WHEN** `PlantaCreateUseCase` is executed with a familiaId that doesn't exist
- **THEN** it returns `Err<NotFoundError>` referencing "Familia"

#### Scenario: Create planta with duplicate nombre

- **WHEN** `PlantaCreateUseCase` is executed with nombre "Monstera Deliciosa" and it already exists
- **THEN** it returns `Err<DuplicateError>`

#### Scenario: Update planta foto

- **WHEN** `PlantaUpdateUseCase` is executed with a new fotoUrl
- **THEN** the planta's fotoUrl is updated

#### Scenario: Update non-existent planta

- **WHEN** `PlantaUpdateUseCase` is executed with an unknown id
- **THEN** it returns `Err<NotFoundError>`

### Requirement: Planta writes return the familia name

`PlantaCreateUseCase` and `PlantaUpdateUseCase` SHALL return the saved planta read back through `PlantaWithFamiliaQuery`, so every Planta response carries the familia name.

#### Scenario: Create returns the familia name

- **WHEN** `PlantaCreateUseCase` is executed for familia "Araceae"
- **THEN** it returns the new planta with `familiaName` "Araceae"

### Requirement: Planta client use cases

The nursery package SHALL provide client use cases with the same names in `src/application/client/use-case/`, each with an integration test against the API faked with MSW. They SHALL reach the API through `PlantaApiRepository` and `PlantaWithFamiliaApiQuery` and return the kernel error that matches the API's error code, or `NetworkError` when the API cannot be reached.

#### Scenario: Missing familia reported by the API

- **WHEN** the client `PlantaCreateUseCase` runs and the API answers 404 for the familia
- **THEN** it returns `Err<NotFoundError>`

### Requirement: Drizzle plantas table

The system SHALL define a `plantas` table in `packages/green-beard-nursery/src/data/server/infra/db/planta.table.ts`: `id` (UUID PK, default random), `nombre` (VARCHAR 150, NOT NULL, UNIQUE), `familia_id` (UUID, NOT NULL, FK→familias.id), `foto_url` (TEXT, nullable).

#### Scenario: FK constraint enforced

- **WHEN** a planta is inserted with a non-existent familia_id
- **THEN** the database rejects the insert

#### Scenario: Unique nombre constraint

- **WHEN** two plantas with the same nombre are inserted
- **THEN** the database rejects the second insert

### Requirement: Planta Postgres mapping

`PlantaPgRepository` SHALL map between rows and the Planta model in private methods, rebuilding models with `reconstitute()`. A `planta-pg.mapper.ts` file SHALL exist only once a second file needs the same mapping.

#### Scenario: Round-trip mapping with nullable foto

- **WHEN** a Planta with fotoUrl=null is saved and then found by id
- **THEN** the found model preserves fotoUrl as null

### Requirement: Planta API routes

The API SHALL expose these routes from `src/nursery/route/planta.route.ts`, mounted at `/plantas` and tested through a harness beside it:

- `GET /plantas` → list all (optional query `?familiaId=<uuid>` to filter)
- `GET /plantas/:id` → get by id
- `POST /plantas` → create (body: `{ nombre, familiaId, fotoUrl? }`)
- `PATCH /plantas/:id` → update (body: `{ nombre?, familiaId?, fotoUrl?: string | null }`)
- `DELETE /plantas/:id` → delete

#### Scenario: Create planta via API

- **WHEN** `POST /plantas` with `{ "nombre": "Monstera", "familiaId": "<uuid>" }`
- **THEN** returns 201 with `{ id, nombre, familiaId, familiaName, fotoUrl }`

#### Scenario: Get planta via API

- **WHEN** `GET /plantas/:id` with valid id
- **THEN** returns 200 with `PlantaDto`

#### Scenario: Update planta via API

- **WHEN** `PATCH /plantas/:id` with valid id and valid body
- **THEN** returns 200 with updated `PlantaDto`

#### Scenario: Delete planta via API

- **WHEN** `DELETE /plantas/:id` with valid id
- **THEN** returns 204

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

The nursery package SHALL define in `src/data/shared/dto/planta.dto.ts`, as zod schemas:

- `PlantaDto`: `{ id: string, nombre: string, familiaId: string, familiaName: string, fotoUrl: string | null }`
- `PlantaCreateRequest`: `{ nombre: string, familiaId: string, fotoUrl?: string }`
- `PlantaUpdateRequest`: `{ nombre?: string, familiaId?: string, fotoUrl?: string | null }`

#### Scenario: DTO includes familiaName

- **WHEN** API returns a planta
- **THEN** the response includes both familiaId and familiaName, taken from `PlantaWithFamiliaReadModel`
