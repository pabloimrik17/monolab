## ADDED Requirements

### Requirement: Familia model

The system SHALL model Familia in `packages/green-beard-nursery/src/domain/model/familia.model.ts` with: id (UUID, auto-generated), nombre (string, non-empty, trimmed). Private constructor with `static create()` returning `Result<Familia, ValidationError>` and `static reconstitute()` for DB hydration. `update()` method for mutations. Unit tests sit next to it in `familia.model.test.ts`.

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

The nursery package SHALL declare a `FamiliaRepository` port in `src/domain/repository/familia.repository.ts`, implemented by `FamiliaPgRepository` and `FamiliaApiRepository`, with methods returning `ResultAsync`:

- `save(familia)`: persists, returns the familia
- `findById(id)`: returns familia or null
- `findAll()`: returns all familias ordered by nombre
- `update(familia)`: updates, returns void
- `delete(id)`: deletes, returns void
- `existsByNombre(nombre)`: checks uniqueness

#### Scenario: Find all familias ordered

- **WHEN** `findAll()` is called with familias "Cactaceae", "Araceae" in DB
- **THEN** it returns `Ok<Familia[]>` ordered alphabetically: Araceae, Cactaceae

#### Scenario: Check nombre uniqueness

- **WHEN** `existsByNombre("Araceae")` is called and "Araceae" exists
- **THEN** it returns `Ok<true>`

### Requirement: Familia CRUD use cases

The nursery package SHALL provide the server use cases `FamiliaCreateUseCase`, `FamiliaListUseCase`, `FamiliaGetByIdUseCase`, `FamiliaUpdateUseCase` and `FamiliaDeleteUseCase` in `src/application/server/use-case/familia-<verb>.use-case.ts`, each with an integration test beside it. Create and update SHALL check that nombre is unique (excluding itself on update). Get, update and delete SHALL return `NotFoundError` for an unknown id. List SHALL return all familias.

#### Scenario: Get non-existent familia

- **WHEN** `FamiliaGetByIdUseCase` is executed with an unknown id
- **THEN** it returns `Err<NotFoundError>`

#### Scenario: Create familia with duplicate nombre

- **WHEN** `FamiliaCreateUseCase` is executed with nombre "Araceae" and "Araceae" already exists
- **THEN** it returns `Err<DuplicateError>`

#### Scenario: Delete non-existent familia

- **WHEN** `FamiliaDeleteUseCase` is executed with an unknown id
- **THEN** it returns `Err<NotFoundError>`

#### Scenario: Update familia nombre to existing

- **WHEN** `FamiliaUpdateUseCase` is executed changing nombre to one that already exists
- **THEN** it returns `Err<DuplicateError>`

#### Scenario: Update non-existent familia

- **WHEN** `FamiliaUpdateUseCase` is executed with an unknown id
- **THEN** it returns `Err<NotFoundError>`

### Requirement: Familia client use cases

The nursery package SHALL provide client use cases with the same names in `src/application/client/use-case/`, each with an integration test against the API faked with MSW. They SHALL reach the API through `FamiliaApiRepository` and return the kernel error that matches the API's error code, or `NetworkError` when the API cannot be reached.

#### Scenario: Duplicate reported by the API

- **WHEN** the client `FamiliaCreateUseCase` runs and the API answers 409 with a duplicate error code
- **THEN** it returns `Err<DuplicateError>`

#### Scenario: API unreachable

- **WHEN** the client `FamiliaListUseCase` runs and the API cannot be reached
- **THEN** it returns `Err<NetworkError>`

### Requirement: Drizzle familias table

The system SHALL define a `familias` table in `packages/green-beard-nursery/src/data/server/infra/db/familia.table.ts`: `id` (UUID PK, default random), `nombre` (VARCHAR 100, NOT NULL, UNIQUE).

#### Scenario: Table has unique constraint on nombre

- **WHEN** two rows with the same nombre are inserted
- **THEN** the database rejects the second insert

### Requirement: Familia Postgres mapping

`FamiliaPgRepository` SHALL map between rows and the Familia model in private methods, rebuilding models with `reconstitute()`. A `familia-pg.mapper.ts` file SHALL exist only once a second file needs the same mapping.

#### Scenario: Round-trip mapping

- **WHEN** a Familia is saved and then found by id
- **THEN** the found model has identical id and nombre

### Requirement: Familia API routes

The system SHALL expose Hono routes in `apps/green-beard-api/src/nursery/route/familia.route.ts`, mounted at `/familias`, with `familia.route.harness.ts` and `familia.route.integration-platform.ts` next to it:

- `GET /familias` → list all
- `GET /familias/:id` → get by id
- `POST /familias` → create (body: `{ nombre }`)
- `PATCH /familias/:id` → update (body: `{ nombre? }`)
- `DELETE /familias/:id` → delete

#### Scenario: List familias via API

- **WHEN** `GET /familias`
- **THEN** returns 200 with `FamiliaDto[]` ordered by nombre

#### Scenario: Get familia by id via API

- **WHEN** `GET /familias/:id` with valid id
- **THEN** returns 200 with `FamiliaDto`

#### Scenario: Create familia via API

- **WHEN** `POST /familias` with `{ "nombre": "Araceae" }`
- **THEN** returns 201 with `{ id, nombre }`

#### Scenario: Update familia via API

- **WHEN** `PATCH /familias/:id` with valid id and valid body
- **THEN** returns 200 with updated `FamiliaDto`

#### Scenario: Delete familia via API

- **WHEN** `DELETE /familias/:id` with valid id
- **THEN** returns 204

#### Scenario: Delete non-existent familia via API

- **WHEN** `DELETE /familias/:id` with unknown id
- **THEN** returns 404 with error DTO

#### Scenario: Create duplicate familia via API

- **WHEN** `POST /familias` with duplicate nombre
- **THEN** returns 409 with error DTO

#### Scenario: Get non-existent familia via API

- **WHEN** `GET /familias/:id` with unknown id
- **THEN** returns 404 with error DTO

#### Scenario: Update familia to duplicate nombre via API

- **WHEN** `PATCH /familias/:id` sets nombre to one that already exists
- **THEN** returns 409 with error DTO

#### Scenario: Update non-existent familia via API

- **WHEN** `PATCH /familias/:id` with unknown id
- **THEN** returns 404 with error DTO

### Requirement: Familia DTOs and request types

The system SHALL define in `packages/green-beard-nursery/src/data/shared/dto/familia.dto.ts`, as zod schemas with their inferred types:

- `FamiliaDto`: `{ id: string, nombre: string }`
- `FamiliaCreateRequest`: `{ nombre: string }`
- `FamiliaUpdateRequest`: `{ nombre?: string }`

#### Scenario: DTO matches API response shape

- **WHEN** API returns a familia
- **THEN** the response body matches `FamiliaDto` shape
