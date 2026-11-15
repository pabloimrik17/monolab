## ADDED Requirements

### Requirement: Material model

The system SHALL model Material in `domain/model/material.model.ts` of `@m0n0lab/green-beard-nursery` with: id (UUID), nombre (string, non-empty, trimmed), precioLitro (number, positive). Private constructor with `static create()` returning `Result<Material, ValidationError>` and `static reconstitute()`.

#### Scenario: Create valid material
- **WHEN** `Material.create({ nombre: "Perlita", precioLitro: 2.50 })` is called
- **THEN** it returns `Ok<Material>` with trimmed nombre and precioLitro

#### Scenario: Create material with zero price
- **WHEN** `Material.create({ nombre: "Perlita", precioLitro: 0 })` is called
- **THEN** it returns `Err<ValidationError>` (price must be positive)

#### Scenario: Create material with negative price
- **WHEN** `Material.create({ nombre: "Perlita", precioLitro: -1 })` is called
- **THEN** it returns `Err<ValidationError>`

### Requirement: MaterialRepository port

The system SHALL define a `MaterialRepository` port in `domain/repository/material.repository.ts` and implement it in `data/server/repository/material-pg.repository.ts`, with `ResultAsync` methods: `save`, `findById`, `findAll` (ordered by nombre), `findByIds(ids[])`, `update`, `delete`, `existsByNombre`.

#### Scenario: Find materials by IDs
- **WHEN** `findByIds(["id1", "id2"])` is called
- **THEN** it returns `Ok<Material[]>` containing only the matching materials

### Requirement: Material CRUD use cases

The system SHALL provide injectable use cases: `MaterialCreateUseCase` (validates nombre uniqueness), `MaterialListUseCase`, `MaterialGetByIdUseCase`, `MaterialUpdateUseCase`, `MaterialDeleteUseCase`.

Use cases live in `application/server/use-case/material-<verb>.use-case.ts`. `MaterialDeleteUseCase` SHALL check, through `SustratoRepository.existsMaterialUsage`, whether any sustrato uses the material and return a `MaterialInUseError` (`domain/error/material.error.ts`) if so.

#### Scenario: Delete material used by sustrato
- **WHEN** `MaterialDeleteUseCase` is executed for a material referenced in sustrato_materiales
- **THEN** it returns an error indicating the material is in use

#### Scenario: Create material with duplicate nombre
- **WHEN** `MaterialCreateUseCase` is executed with an existing nombre
- **THEN** it returns `Err<DuplicateError>`

### Requirement: Drizzle materiales table

The system SHALL define a `materiales` table in `data/server/infra/db/material.table.ts`: `id` (UUID PK, default random), `nombre` (VARCHAR 100, NOT NULL, UNIQUE), `precio_litro` (NUMERIC(10,2), NOT NULL).

#### Scenario: Unique nombre constraint
- **WHEN** two materials with the same nombre are inserted
- **THEN** the database rejects the second insert

### Requirement: Material DTOs

The system SHALL define in `data/shared/dto/material.dto.ts`: `MaterialDto` (`{ id, nombre, precioLitro }`), `MaterialCreateRequest` (`{ nombre, precioLitro }`), `MaterialUpdateRequest` (`{ nombre?, precioLitro? }`).

#### Scenario: DTO precioLitro is a number
- **WHEN** API returns a material
- **THEN** precioLitro is a number, not a string

### Requirement: Material API routes

The system SHALL expose, from `src/nursery/route/material.route.ts` in `apps/green-beard-api`: `GET /materiales`, `GET /materiales/:id`, `POST /materiales`, `PATCH /materiales/:id`, `DELETE /materiales/:id`.

#### Scenario: Create material via API
- **WHEN** `POST /materiales` with `{ "nombre": "Perlita", "precioLitro": 2.50 }`
- **THEN** returns 201 with MaterialDto

#### Scenario: Delete material in use
- **WHEN** `DELETE /materiales/:id` for a material used by a sustrato
- **THEN** returns 409 with error DTO
