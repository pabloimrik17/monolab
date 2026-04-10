## ADDED Requirements

### Requirement: PlantaVenta entity

The system SHALL model PlantaVenta as a domain entity with: id (UUID), plantaId (UUID, required), identificador (positive integer, assigned automatically), fotos (array of `{ key: string, url: string }`), altoPlantaCm (number, positive), macetaId (UUID, required), sustratoId (UUID, required), costePlanta (number, nullable — present for purchased, null for home-grown).

Private constructor with `static create()` returning `Result<PlantaVenta, ValidationError>` and `static reconstitute()`.

`create()` receives `identificador` as a parameter (computed by the use case, not the entity).

#### Scenario: Create valid planta venta
- **WHEN** `PlantaVenta.create({ plantaId: "...", identificador: 1, altoPlantaCm: 30, macetaId: "...", sustratoId: "...", costePlanta: 15.00 })` is called
- **THEN** it returns `Ok<PlantaVenta>` with empty fotos array

#### Scenario: Create planta venta without cost (home-grown)
- **WHEN** `PlantaVenta.create()` is called without costePlanta
- **THEN** it returns `Ok<PlantaVenta>` with costePlanta = null

#### Scenario: Invalid dimensions
- **WHEN** `PlantaVenta.create()` is called with altoPlantaCm = 0
- **THEN** it returns `Err<ValidationError>`

#### Scenario: Invalid identificador
- **WHEN** `PlantaVenta.create()` is called with identificador = 0
- **THEN** it returns `Err<ValidationError>` (must be ≥ 1)

### Requirement: PlantaVenta photo management

The entity SHALL provide methods:
- `addFoto(foto: { key: string, url: string })`: adds photo to array
- `removeFoto(key: string)`: removes photo by key, returns the removed foto or null
- `getFotos()`: returns copy of fotos array

#### Scenario: Add foto
- **WHEN** `addFoto({ key: "abc/def.jpg", url: "https://..." })` is called
- **THEN** fotos array length increases by 1

#### Scenario: Remove foto
- **WHEN** `removeFoto("abc/def.jpg")` is called with an existing key
- **THEN** the foto is removed and returned

#### Scenario: Remove non-existent foto
- **WHEN** `removeFoto("nonexistent.jpg")` is called
- **THEN** null is returned, fotos array unchanged

### Requirement: Auto-numbering with gap reuse

The system SHALL assign `identificador` as the smallest positive integer not currently in use for a given `plantaId`.

#### Scenario: First plant of a variety
- **WHEN** no PlantaVenta exists for plantaId "X"
- **THEN** identificador = 1

#### Scenario: Sequential assignment
- **WHEN** plantaId "X" has [#1, #2, #3]
- **THEN** next identificador = 4

#### Scenario: Gap reuse
- **WHEN** plantaId "X" has [#1, #3, #4] (gap at #2)
- **THEN** next identificador = 2

#### Scenario: Multiple gaps — uses smallest
- **WHEN** plantaId "X" has [#1, #4, #7]
- **THEN** next identificador = 2

### Requirement: Display name derivation

The system SHALL derive a display name: `"{planta.nombre} #{identificador}"` (e.g., "Monstera Deliciosa #2"). This is computed in the DTO, not stored.

#### Scenario: Display name format
- **WHEN** API returns a PlantaVenta for planta "Monstera" with identificador 3
- **THEN** displayName = "Monstera #3"

### Requirement: PlantaVentaRepository port

The system SHALL define a `PlantaVentaRepository` interface with `ResultAsync` methods:
- `save(plantaVenta)`: persists
- `findById(id)`: returns with fotos
- `findAll()`: returns all, ordered by planta nombre then identificador
- `findByPlantaId(plantaId)`: returns all for a planta
- `update(plantaVenta)`: updates including fotos JSONB
- `delete(id)`: deletes entity (R2 cleanup handled separately)
- `getNextIdentificador(plantaId)`: returns next available integer (smallest gap)

#### Scenario: getNextIdentificador finds gap
- **WHEN** called for plantaId with existing [1, 3]
- **THEN** returns `Ok<2>`

#### Scenario: getNextIdentificador empty
- **WHEN** called for plantaId with no existing entries
- **THEN** returns `Ok<1>`

### Requirement: PlantaVenta CRUD use cases

The system SHALL provide injectable use cases:
- `CreatePlantaVentaUseCase`: validates plantaId (exists in PlantaRepository, returns PlantaNotFoundError if not), macetaId (exists in MacetaRepository, returns MacetaNotFoundError if not), sustratoId (exists in SustratoRepository, returns SustratoNotFoundError if not), gets next identificador, creates entity, persists atomically; on unique-collision retries allocation with bounded attempts
- `GetPlantasVentaUseCase`: returns all
- `GetPlantaVentaByIdUseCase`: returns PlantaVenta or PlantaVentaNotFoundError
- `UpdatePlantaVentaUseCase`: validates existence (PlantaVentaNotFoundError), validates FK changes (entity-specific NotFoundError), updates
- `DeletePlantaVentaUseCase`: validates existence (PlantaVentaNotFoundError), gets foto keys for R2 cleanup, deletes entity

Photo upload/delete are handled by separate use cases (see photo-storage spec).

#### Scenario: Create with non-existent planta
- **WHEN** `CreatePlantaVentaUseCase` is executed with non-existent plantaId
- **THEN** it returns `Err<PlantaNotFoundError>`

#### Scenario: Create with non-existent maceta
- **WHEN** executed with non-existent macetaId
- **THEN** it returns `Err<MacetaNotFoundError>`

#### Scenario: Create assigns auto-incrementing identifier
- **WHEN** executed for a plantaId that already has [#1, #3]
- **THEN** the new PlantaVenta gets identificador = 2

#### Scenario: Concurrent create for same plantaId
- **WHEN** two `CreatePlantaVentaUseCase` executions run concurrently for the same `plantaId`
- **THEN** both complete with distinct `identificador` values and no duplicate `(planta_id, identificador)`

### Requirement: Drizzle plantas_venta table

The system SHALL define a `plantas_venta` table: `id` (UUID PK), `planta_id` (UUID FK→plantas, NOT NULL), `identificador` (INTEGER, NOT NULL), `fotos` (JSONB, NOT NULL, DEFAULT '[]'), `alto_planta_cm` (NUMERIC(10,2), NOT NULL), `maceta_id` (UUID FK→macetas, NOT NULL), `sustrato_id` (UUID FK→sustratos, NOT NULL), `coste_planta` (NUMERIC(10,2), nullable).

Composite UNIQUE constraint: `(planta_id, identificador)`.

#### Scenario: Unique constraint on planta+identificador
- **WHEN** two rows with same planta_id and identificador are inserted
- **THEN** the database rejects the second insert

#### Scenario: FK constraints enforced
- **WHEN** a row references non-existent planta_id, maceta_id, or sustrato_id
- **THEN** the database rejects the insert

### Requirement: PlantaVenta DTOs

The system SHALL define in `green-beard-shared`:
- `PlantaVentaFotoDto`: `{ key: string, url: string }`
- `PlantaVentaDto`: `{ id, plantaId, plantaNombre, familiaName, identificador, displayName, fotos: PlantaVentaFotoDto[], altoPlantaCm, macetaId, macetaNombre, sustratoId, sustratoNombre, costePlanta: number | null }`
- `CreatePlantaVentaRequest`: `{ plantaId, altoPlantaCm, macetaId, sustratoId, costePlanta? }`
- `UpdatePlantaVentaRequest`: `{ altoPlantaCm?, macetaId?, sustratoId?, costePlanta?: number | null }`

Note: identificador is auto-assigned, not in create request. plantaId cannot be changed after creation.

#### Scenario: DTO includes denormalized names
- **WHEN** API returns a PlantaVenta
- **THEN** DTO includes plantaNombre, familiaName, macetaNombre, sustratoNombre, and displayName

### Requirement: PlantaVenta API routes

The system SHALL expose:
- `GET /plantas-venta` → list all (optional `?plantaId=<uuid>` filter)
- `GET /plantas-venta/:id` → get by id
- `POST /plantas-venta` → create (auto-assigns identificador)
- `PATCH /plantas-venta/:id` → update
- `DELETE /plantas-venta/:id` → delete (triggers R2 cleanup)
- `POST /plantas-venta/:id/fotos` → upload photo(s) (multipart)
- `DELETE /plantas-venta/:id/fotos?key=<encoded-storage-key>` → delete specific photo

#### Scenario: Create planta venta via API
- **WHEN** `POST /plantas-venta` with valid body
- **THEN** returns 201 with PlantaVentaDto including auto-assigned identificador and displayName

#### Scenario: Upload photo
- **WHEN** `POST /plantas-venta/:id/fotos` with multipart file
- **THEN** photo uploaded to R2, foto entry added to entity, returns updated PlantaVentaDto
