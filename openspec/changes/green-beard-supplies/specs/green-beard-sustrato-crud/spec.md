## ADDED Requirements

### Requirement: Sustrato model

The system SHALL model Sustrato in `domain/model/sustrato.model.ts` with id (UUID), nombre, margen (0-1) and materiales (`{ materialId, litros }[]`), via `create()`, `reconstitute()`, `update()`. `create()` SHALL validate non-empty nombre, margen 0-1, at least one material and positive litros. Coste and PVP are not stored; they come from the list read query.

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

The system SHALL define a `SustratoRepository` port in `domain/repository/sustrato.repository.ts`, implemented by `data/server/repository/sustrato-pg.repository.ts`, with `save`, `findById`, `findAll`, `update` (atomic replace of material lines), `delete` (cascade), `existsByNombre` and `existsMaterialUsage`. It SHALL load and save the material lines with the root and never call the Material repository.

#### Scenario: Save persists junction rows
- **WHEN** `save()` is called with a sustrato having 3 materials
- **THEN** 1 row in sustratos + 3 rows in sustrato_materiales are persisted

#### Scenario: Update replaces junction rows
- **WHEN** `update()` is called changing materials from [A, B] to [B, C]
- **THEN** sustrato_materiales for this sustrato contains only B and C

### Requirement: Sustrato CRUD use cases

The system SHALL provide injectable use cases:
- (in `application/server/use-case/sustrato-<verb>.use-case.ts`) `SustratoCreateUseCase`: validates nombre uniqueness, validates all materialIds exist (via MaterialRepository.findByIds), persists
- `SustratoListUseCase`: returns all sustratos
- `SustratoGetByIdUseCase`: returns sustrato or NotFoundError
- `SustratoUpdateUseCase`: validates existence, validates materialIds, atomic update
- `SustratoDeleteUseCase`: validates existence, deletes

#### Scenario: Create sustrato with non-existent material
- **WHEN** `SustratoCreateUseCase` is executed with a materialId that doesn't exist
- **THEN** it returns `Err<NotFoundError>` referencing "Material"

#### Scenario: Create sustrato with duplicate nombre
- **WHEN** `SustratoCreateUseCase` is executed with an existing nombre
- **THEN** it returns `Err<DuplicateError>`

### Requirement: Drizzle sustratos and sustrato_materiales tables

The system SHALL define in `data/server/infra/db/sustrato.table.ts` and `sustrato-material.table.ts`:
- `sustratos` table: `id` (UUID PK), `nombre` (VARCHAR 100, NOT NULL, UNIQUE), `margen` (NUMERIC(5,2), NOT NULL)
- `sustrato_materiales` table: `sustrato_id` (UUID, FK→sustratos, ON DELETE CASCADE), `material_id` (UUID, FK→materiales), `litros` (NUMERIC(10,2), NOT NULL). Composite PK: (sustrato_id, material_id)

#### Scenario: Cascade delete
- **WHEN** a sustrato is deleted
- **THEN** its sustrato_materiales rows are also deleted

#### Scenario: Composite PK prevents duplicates
- **WHEN** the same material_id is inserted twice for the same sustrato_id
- **THEN** the database rejects the second insert

### Requirement: Sustrato list read query

The system SHALL define a `SustratoListQuery` port (`domain/query/sustrato-list.query.ts`) with `findAll` and `findById`, returning `SustratoListReadModel` (`domain/read-model/sustrato-list.read-model.ts`), implemented in `data/server/query/sustrato-list-pg.query.ts` with a SQL join of sustrato_materiales and materiales. Coste is Σ(precioLitro × litros); pvp is coste × (1 + margen).

#### Scenario: Cost reflects current material price
- **WHEN** a material's precioLitro changes and the list query is read again
- **THEN** the sustrato's coste and pvp use the new price

#### Scenario: Unknown id
- **WHEN** `findById` is called with an id that does not exist
- **THEN** it returns `Err<NotFoundError>`

### Requirement: Sustrato DTOs

The system SHALL define in `data/shared/dto/sustrato.dto.ts` `SustratoDto` (`{ id, nombre, margen, materiales: SustratoMaterialDto[], coste, pvp }`), `SustratoMaterialDto` (`{ materialId, materialNombre, litros, costeParcial }`), `SustratoMaterialInput` (`{ materialId, litros }`), `SustratoCreateRequest` and `SustratoUpdateRequest` (all optional, `materiales` replaces the set).

#### Scenario: DTO includes computed costs
- **WHEN** API returns a sustrato with materials [Perlita 2L @ 2.50€/L, Turba 3L @ 1.00€/L] and margen=0.25
- **THEN** coste = 8.00, pvp = 10.00, and each material has its costeParcial

### Requirement: Sustrato API routes

The system SHALL expose, from `src/nursery/route/sustrato.route.ts` in `apps/green-beard-api`: `GET /sustratos`, `GET /sustratos/:id`, `POST /sustratos`, `PATCH /sustratos/:id`, `DELETE /sustratos/:id`.

The GET endpoints SHALL read through `SustratoListQuery` and return DTOs with computed coste and pvp.

#### Scenario: Create sustrato via API
- **WHEN** `POST /sustratos` with `{ "nombre": "Tropical", "margen": 0.25, "materiales": [{ "materialId": "...", "litros": 2.5 }] }`
- **THEN** returns 201 with SustratoDto including computed costs

#### Scenario: Get sustrato includes material details
- **WHEN** `GET /sustratos/:id`
- **THEN** response includes materiales array with materialNombre, litros, and costeParcial for each
