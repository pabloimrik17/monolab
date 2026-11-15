## ADDED Requirements

### Requirement: PlantaVenta model

The system SHALL model PlantaVenta in `domain/model/planta-venta.model.ts` with id, plantaId, identificador (positive integer), fotos (`{ key, url }[]`), altoPlantaCm (positive), macetaId, sustratoId and costePlanta (nullable: null for home-grown). It refers to Planta, Maceta and Sustrato by id only. `create()` returns `Result<PlantaVenta, ValidationError>` and receives `identificador` from the repository.

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

The model SHALL provide methods:
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

### Requirement: PlantaVenta list query

The system SHALL define a `PlantaVentaListQuery` port in `domain/query/planta-venta-list.query.ts` returning `PlantaVentaListReadModel` rows, ordered by planta nombre then identificador, optionally filtered by plantaId, and one row by id.

#### Scenario: List filtered by planta
- **WHEN** the query is run with a plantaId
- **THEN** only that planta's rows are returned, ordered by identificador

### Requirement: Display name derivation

The system SHALL derive a display name `"{planta.nombre} #{identificador}"` (e.g., "Monstera Deliciosa #2") in the read model returned by `PlantaVentaListQuery`, implemented with a SQL join in `data/server/query/planta-venta-list-pg.query.ts`. It is not stored.

#### Scenario: Display name format
- **WHEN** API returns a PlantaVenta for planta "Monstera" with identificador 3
- **THEN** displayName = "Monstera #3"

### Requirement: PlantaVenta repository and list query

The system SHALL define the `PlantaVentaRepository` port in `domain/repository/planta-venta.repository.ts` with `save`, `findById`, `findByPlantaId`, `update`, `delete` and `getNextIdentificador(plantaId)` (smallest free integer), implemented by `PlantaVentaPgRepository` and `PlantaVentaApiRepository`. It SHALL NOT call other aggregates' repositories.

#### Scenario: getNextIdentificador finds gap
- **WHEN** called for plantaId with existing [1, 3]
- **THEN** returns `Ok<2>`

#### Scenario: getNextIdentificador empty
- **WHEN** called for plantaId with no existing entries
- **THEN** returns `Ok<1>`

### Requirement: PlantaVenta CRUD use cases

The system SHALL provide server use cases in `application/server/use-case/planta-venta-<verb>.use-case.ts` (create, list, get, update, delete), with client counterparts in `application/client/use-case/` over the API repository. Create validates plantaId, macetaId and sustratoId, assigns the identificador and retries a bounded number of times on a unique collision. Delete removes the row, then cleans R2 best-effort.

#### Scenario: Create with non-existent planta
- **WHEN** `PlantaVentaCreateUseCase` is executed with non-existent plantaId
- **THEN** it returns `Err<PlantaNotFoundError>`

#### Scenario: Create with non-existent maceta
- **WHEN** executed with non-existent macetaId
- **THEN** it returns `Err<MacetaNotFoundError>`

#### Scenario: Create assigns auto-incrementing identifier
- **WHEN** executed for a plantaId that already has [#1, #3]
- **THEN** the new PlantaVenta gets identificador = 2

#### Scenario: Concurrent create for same plantaId
- **WHEN** two `PlantaVentaCreateUseCase` executions run concurrently for the same `plantaId`
- **THEN** both complete with distinct `identificador` values and no duplicate `(planta_id, identificador)`

#### Scenario: Delete with R2 cleanup failure
- **WHEN** `PlantaVentaDeleteUseCase` is executed and R2 deletion of foto keys fails
- **THEN** the PlantaVenta row is still deleted, cleanup failure is logged, and the use case returns `Ok<void>`

### Requirement: Drizzle plantas_venta table

The system SHALL define `plantas_venta` in `data/server/infra/db/planta-venta.table.ts` (migration generated in `@m0n0lab/green-beard-database`) with UUID `id`, NOT NULL FKs `planta_id`, `maceta_id`, `sustrato_id`, `identificador` (INTEGER >= 1), `fotos` (JSONB, default '[]'), `alto_planta_cm` (NUMERIC(10,2) > 0), nullable `coste_planta` (NUMERIC(10,2) >= 0) and UNIQUE `(planta_id, identificador)`.

#### Scenario: Unique constraint on planta+identificador
- **WHEN** two rows with same planta_id and identificador are inserted
- **THEN** the database rejects the second insert

#### Scenario: FK constraints enforced
- **WHEN** a row references non-existent planta_id, maceta_id, or sustrato_id
- **THEN** the database rejects the insert

### Requirement: PlantaVenta DTOs

The system SHALL define in `data/shared/dto/planta-venta.dto.ts` the DTOs `PlantaVentaFotoDto`, `PlantaVentaDto` (with denormalized names and displayName), `PlantaVentaCreateRequest` and `PlantaVentaUpdateRequest`. The identificador is auto-assigned, so it is not in the create request; plantaId cannot change after creation.

#### Scenario: DTO includes denormalized names
- **WHEN** API returns a PlantaVenta
- **THEN** DTO includes plantaNombre, familiaName, macetaNombre, sustratoNombre, and displayName

### Requirement: PlantaVenta API routes

The system SHALL expose from `apps/green-beard-api/src/nursery/route/planta-venta.route.ts`, a Hono sub-app mounted by `src/app.ts`: `GET /plantas-venta` (optional `?plantaId=`), `GET /:id`, `POST /`, `PATCH /:id`, `DELETE /:id`, `POST /:id/fotos` (multipart) and `DELETE /:id/fotos?key=<encoded-storage-key>`.

#### Scenario: Create planta venta via API
- **WHEN** `POST /plantas-venta` with valid body
- **THEN** returns 201 with PlantaVentaDto including auto-assigned identificador and displayName

#### Scenario: Upload photo
- **WHEN** `POST /plantas-venta/:id/fotos` with multipart file
- **THEN** photo uploaded to R2, foto entry added to the model, returns updated PlantaVentaDto
