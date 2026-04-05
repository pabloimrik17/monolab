## ADDED Requirements

### Requirement: Sustrato entity

The system SHALL model Sustrato as a domain entity with: id (UUID), nombre (string, non-empty), margen (number, 0-1), materiales (array of `{ materialId: string, litros: number }`). Private constructor with `create()`, `reconstitute()`, `update()`.

`create()` SHALL validate: non-empty nombre, margen 0-1, at least one material, all litros positive.

Coste and PVP are NOT stored — they are computed at the API/DTO layer where material prices are available.

#### Scenario: Create valid sustrato
- **WHEN** `Sustrato.create({ nombre: "Tropical Mix", margen: 0.25, materiales: [{ materialId: "...", litros: 2.5 }] })` is called
- **THEN** it returns `Ok<Sustrato>`

#### Scenario: Create sustrato without materiales
- **WHEN** `Sustrato.create()` is called with empty materiales array
- **THEN** it returns `Err<ValidationError>`

#### Scenario: Create sustrato with zero litros
- **WHEN** a material entry has litros = 0
- **THEN** it returns `Err<ValidationError>`

#### Scenario: Margen out of range
- **WHEN** `Sustrato.create()` is called with margen = -0.1
- **THEN** it returns `Err<ValidationError>`

### Requirement: SustratoRepository port

The system SHALL define a `SustratoRepository` interface with `ResultAsync` methods:
- `save(sustrato)`: persists sustrato + sustrato_materiales rows
- `findById(id)`: returns sustrato with its materiales composition
- `findAll()`: returns all sustratos with materiales, ordered by nombre
- `update(sustrato)`: replaces sustrato + sustrato_materiales atomically
- `delete(id)`: deletes sustrato + cascade sustrato_materiales
- `existsByNombre(nombre)`: checks uniqueness
- `existsMaterialUsage(materialId)`: checks if a material is used by any sustrato

#### Scenario: Save persists junction rows
- **WHEN** `save()` is called with a sustrato having 3 materials
- **THEN** 1 row in sustratos + 3 rows in sustrato_materiales are persisted

#### Scenario: Update replaces junction rows
- **WHEN** `update()` is called changing materials from [A, B] to [B, C]
- **THEN** sustrato_materiales for this sustrato contains only B and C

### Requirement: Sustrato CRUD use cases

The system SHALL provide injectable use cases:
- `CreateSustratoUseCase`: validates nombre uniqueness, validates all materialIds exist (via MaterialRepository.findByIds), persists
- `GetSustratosUseCase`: returns all sustratos
- `GetSustratoByIdUseCase`: returns sustrato or NotFoundError
- `UpdateSustratoUseCase`: validates existence, validates materialIds, atomic update
- `DeleteSustratoUseCase`: validates existence, deletes

#### Scenario: Create sustrato with non-existent material
- **WHEN** `CreateSustratoUseCase` is executed with a materialId that doesn't exist
- **THEN** it returns `Err<NotFoundError>` referencing "Material"

#### Scenario: Create sustrato with duplicate nombre
- **WHEN** `CreateSustratoUseCase` is executed with an existing nombre
- **THEN** it returns `Err<DuplicateError>`

### Requirement: Drizzle sustratos and sustrato_materiales tables

The system SHALL define:
- `sustratos` table: `id` (UUID PK), `nombre` (VARCHAR 100, NOT NULL, UNIQUE), `margen` (NUMERIC(5,2), NOT NULL)
- `sustrato_materiales` table: `sustrato_id` (UUID, FK→sustratos, ON DELETE CASCADE), `material_id` (UUID, FK→materiales), `litros` (NUMERIC(10,2), NOT NULL). Composite PK: (sustrato_id, material_id)

#### Scenario: Cascade delete
- **WHEN** a sustrato is deleted
- **THEN** its sustrato_materiales rows are also deleted

#### Scenario: Composite PK prevents duplicates
- **WHEN** the same material_id is inserted twice for the same sustrato_id
- **THEN** the database rejects the second insert

### Requirement: Sustrato DTOs

The system SHALL define:
- `SustratoMaterialDto`: `{ materialId, materialNombre, litros, costeParcial }` (costeParcial = precioLitro × litros)
- `SustratoDto`: `{ id, nombre, margen, materiales: SustratoMaterialDto[], coste, pvp }` (coste = Σ costeParcial, pvp = coste × (1 + margen))
- `SustratoMaterialInput`: `{ materialId, litros }`
- `CreateSustratoRequest`: `{ nombre, margen, materiales: SustratoMaterialInput[] }`
- `UpdateSustratoRequest`: `{ nombre?, margen?, materiales?: SustratoMaterialInput[] }`

#### Scenario: DTO includes computed costs
- **WHEN** API returns a sustrato with materials [Perlita 2L @ 2.50€/L, Turba 3L @ 1.00€/L] and margen=0.25
- **THEN** coste = 8.00, pvp = 10.00, and each material has its costeParcial

### Requirement: Sustrato API routes

The system SHALL expose: `GET /sustratos`, `GET /sustratos/:id`, `POST /sustratos`, `PATCH /sustratos/:id`, `DELETE /sustratos/:id`.

The GET endpoints SHALL return DTOs with computed coste and pvp by joining material prices.

#### Scenario: Create sustrato via API
- **WHEN** `POST /sustratos` with `{ "nombre": "Tropical", "margen": 0.25, "materiales": [{ "materialId": "...", "litros": 2.5 }] }`
- **THEN** returns 201 with SustratoDto including computed costs

#### Scenario: Get sustrato includes material details
- **WHEN** `GET /sustratos/:id`
- **THEN** response includes materiales array with materialNombre, litros, and costeParcial for each
