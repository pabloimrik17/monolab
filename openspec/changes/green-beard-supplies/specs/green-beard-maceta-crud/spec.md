## ADDED Requirements

### Requirement: MacetaMaterial value object

The system SHALL define a `MacetaMaterial` type as a string union: `"terracota" | "plastico" | "ceramica" | "fibra_coco" | "tela"`. A validation function SHALL verify input is one of the allowed values.

#### Scenario: Valid material
- **WHEN** "terracota" is validated as MacetaMaterial
- **THEN** it is accepted

#### Scenario: Invalid material
- **WHEN** "madera" is validated as MacetaMaterial
- **THEN** a ValidationError is returned

### Requirement: Maceta entity

The system SHALL model Maceta as a domain entity with: id (UUID), nombre (string, non-empty), material (MacetaMaterial), diametroCm (number, positive), altoCm (number, positive), volumenLitros (number, positive), coste (number, positive), margen (number, 0-1 inclusive). Private constructor with `create()`, `reconstitute()`, `update()`.

PVP is a computed getter: `coste × (1 + margen)`, rounded to 2 decimals. NOT stored.

#### Scenario: Create valid maceta
- **WHEN** `Maceta.create({ nombre: "Maceta 15cm", material: "terracota", diametroCm: 15, altoCm: 12, volumenLitros: 1.5, coste: 3.00, margen: 0.30 })` is called
- **THEN** it returns `Ok<Maceta>` with pvp = 3.90

#### Scenario: Margen out of range
- **WHEN** `Maceta.create()` is called with margen = 1.5
- **THEN** it returns `Err<ValidationError>` (margen must be 0-1)

#### Scenario: Negative dimensions
- **WHEN** `Maceta.create()` is called with diametroCm = -5
- **THEN** it returns `Err<ValidationError>`

### Requirement: MacetaRepository port

The system SHALL define a `MacetaRepository` interface with `ResultAsync` methods: `save`, `findById`, `findAll` (ordered by nombre), `update`, `delete`, `existsByNombre`.

#### Scenario: Find all macetas
- **WHEN** `findAll()` is called
- **THEN** it returns `Ok<Maceta[]>` ordered by nombre

### Requirement: Maceta CRUD use cases

The system SHALL provide injectable use cases: `CreateMacetaUseCase` (validates nombre uniqueness), `GetMacetasUseCase`, `GetMacetaByIdUseCase`, `UpdateMacetaUseCase`, `DeleteMacetaUseCase`.

#### Scenario: Create maceta with duplicate nombre
- **WHEN** `CreateMacetaUseCase` is executed with an existing nombre
- **THEN** it returns `Err<DuplicateError>`

### Requirement: Drizzle macetas table

The system SHALL define a `macetas` table: `id` (UUID PK), `nombre` (VARCHAR 100, NOT NULL, UNIQUE), `material` (VARCHAR 20, NOT NULL), `diametro_cm` (NUMERIC(10,2), NOT NULL), `alto_cm` (NUMERIC(10,2), NOT NULL), `volumen_litros` (NUMERIC(10,2), NOT NULL), `coste` (NUMERIC(10,2), NOT NULL), `margen` (NUMERIC(5,2), NOT NULL).

#### Scenario: Table schema correct
- **WHEN** macetas table is inspected
- **THEN** it has the specified columns with correct types

### Requirement: Maceta DTOs

The system SHALL define: `MacetaDto` (`{ id, nombre, material, diametroCm, altoCm, volumenLitros, coste, margen, pvp }`). Note: `pvp` is computed and included in the DTO. `CreateMacetaRequest`, `UpdateMacetaRequest`.

#### Scenario: DTO includes computed pvp
- **WHEN** API returns a maceta with coste=3.00, margen=0.30
- **THEN** the DTO includes pvp=3.90

### Requirement: Maceta API routes

The system SHALL expose: `GET /macetas`, `GET /macetas/:id`, `POST /macetas`, `PATCH /macetas/:id`, `DELETE /macetas/:id`.

#### Scenario: Create maceta via API
- **WHEN** `POST /macetas` with valid body
- **THEN** returns 201 with MacetaDto including computed pvp
