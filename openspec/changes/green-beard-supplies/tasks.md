## 1. Domain entities and ports

- [ ] 1.1 Create `MacetaMaterial` value object (string union + validation function)
- [ ] 1.2 Create `Material` entity — create(), reconstitute(), update(), precioLitro validation (positive)
- [ ] 1.3 Create `MaterialRepository` port (includes `findByIds`, `existsByNombre`)
- [ ] 1.4 Create `Maceta` entity — create(), reconstitute(), update(), margen validation (0-1), computed `pvp` getter
- [ ] 1.5 Create `MacetaRepository` port
- [ ] 1.6 Create `Sustrato` entity — create(), reconstitute(), update(), materiales array validation (non-empty, positive litros)
- [ ] 1.7 Create `SustratoRepository` port (includes `existsMaterialUsage`, atomic save/update with junction rows)
- [ ] 1.8 Add new error types if needed (e.g., `MaterialInUseError`)
- [ ] 1.9 Add new tokens to `tokens.ts` for all new repos and use cases

## 2. Domain use cases

- [ ] 2.1 Create Material use cases: Create, GetAll, GetById, Update, Delete (delete checks sustrato usage)
- [ ] 2.2 Create Maceta use cases: Create, GetAll, GetById, Update, Delete
- [ ] 2.3 Create Sustrato use cases: Create (validates materialIds via MaterialRepository.findByIds), GetAll, GetById, Update (atomic), Delete
- [ ] 2.4 Update `domainModule` ContainerModule with all new bindings
- [ ] 2.5 Write unit tests for Material entity (validation, create, update)
- [ ] 2.6 Write unit tests for Maceta entity (pvp computation, margen bounds)
- [ ] 2.7 Write unit tests for Sustrato entity (materiales validation)
- [ ] 2.8 Write unit tests for key use cases (delete material in use, create sustrato with invalid materialId)
- [ ] 2.9 Verify `pnpm nx run @m0n0lab/green-beard-domain:test:unit` passes

## 3. Shared DTOs

- [ ] 3.1 Create `MaterialDto`, `CreateMaterialRequest`, `UpdateMaterialRequest`
- [ ] 3.2 Create `MacetaDto` (includes pvp), `CreateMacetaRequest`, `UpdateMacetaRequest`
- [ ] 3.3 Create `SustratoDto`, `SustratoMaterialDto`, `SustratoMaterialInput`, `CreateSustratoRequest`, `UpdateSustratoRequest`
- [ ] 3.4 Verify `pnpm nx run @m0n0lab/green-beard-shared:build` succeeds

## 4. Data layer

- [ ] 4.1 Create `materiales` Drizzle schema — id, nombre (UNIQUE), precio_litro NUMERIC(10,2)
- [ ] 4.2 Create `macetas` Drizzle schema — id, nombre (UNIQUE), material VARCHAR, diametro_cm, alto_cm, volumen_litros, coste NUMERIC(10,2), margen NUMERIC(5,2)
- [ ] 4.3 Create `sustratos` Drizzle schema — id, nombre (UNIQUE), margen NUMERIC(5,2)
- [ ] 4.4 Create `sustrato_materiales` schema — composite PK (sustrato_id, material_id), litros NUMERIC(10,2), FK with ON DELETE CASCADE on sustrato_id
- [ ] 4.5 Generate migration via `pnpm nx run @m0n0lab/green-beard-data:db:generate`
- [ ] 4.6 Create Material mapper (toDomain/toRow — parse NUMERIC strings to numbers)
- [ ] 4.7 Create Maceta mapper
- [ ] 4.8 Create Sustrato mapper (includes junction table handling)
- [ ] 4.9 Create `PgMaterialRepository` (includes `findByIds` with `inArray`)
- [ ] 4.10 Create `PgMacetaRepository`
- [ ] 4.11 Create `PgSustratoRepository` — save/update atomically manage sustrato_materiales (delete+insert in transaction)
- [ ] 4.12 Update `dataModule` with new repository bindings
- [ ] 4.13 Verify `pnpm nx run @m0n0lab/green-beard-data:build` succeeds

## 5. API layer

- [ ] 5.1 Add error mapping for new error types (MaterialInUseError → 409)
- [ ] 5.2 Create DTO serializers (toMaterialDto, toMacetaDto — includes pvp, toSustratoDto — includes computed costs from material prices)
- [ ] 5.3 Create `materialRoutes(container)` — GET /, POST /, PATCH /:id, DELETE /:id
- [ ] 5.4 Create `macetaRoutes(container)` — GET /, POST /, PATCH /:id, DELETE /:id
- [ ] 5.5 Create `sustratoRoutes(container)` — GET /, GET /:id, POST /, PATCH /:id, DELETE /:id. GET endpoints join material prices for computed fields
- [ ] 5.6 Register new routes in app.ts
- [ ] 5.7 Verify `pnpm nx run @m0n0lab/green-beard-api:dev` — new endpoints respond

## 6. SvelteKit BFF pages

- [ ] 6.1 Create Material pages: list, create form, edit form, delete action
- [ ] 6.2 Create Maceta pages: list (showing pvp), create form (material enum select), edit form, delete action
- [ ] 6.3 Create Sustrato pages: list (showing coste+pvp), create/edit form with dynamic material rows (add/remove material + litros), delete action
- [ ] 6.4 Verify full flow: create materials → create maceta → create sustrato with materials → verify computed costs

## 7. Verification

- [ ] 7.1 `pnpm nx run-many -t build` — all projects build
- [ ] 7.2 `pnpm nx run @m0n0lab/green-beard-domain:test:unit` — all tests pass
- [ ] 7.3 Manual E2E: material CRUD → maceta CRUD → sustrato CRUD with computed prices
