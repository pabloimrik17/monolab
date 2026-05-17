## 1. Domain entities and ports

- [ ] 1.1 Create `StorageError` extending DomainError
- [ ] 1.2 Create `PhotoStorage` port interface (upload, delete, deleteMany)
- [ ] 1.3 Create `PlantaVenta` entity — create(), reconstitute(), update(), addFoto(), removeFoto(), getFotos(). Validate: identificador ≥ 1, altoPlantaCm > 0, costePlanta > 0 if present
- [ ] 1.4 Create `PlantaVentaRepository` port (includes `getNextIdentificador`, `findByPlantaId`)
- [ ] 1.5 Add new tokens for PlantaVentaRepository, PhotoStorage, and all new use cases

## 2. Domain use cases

- [ ] 2.1 Create `CreatePlantaVentaUseCase` — validates plantaId (PlantaRepository), macetaId (MacetaRepository), sustratoId (SustratoRepository), calls getNextIdentificador, creates entity, persists
- [ ] 2.2 Create `GetPlantasVentaUseCase` and `GetPlantaVentaByIdUseCase`
- [ ] 2.3 Create `UpdatePlantaVentaUseCase` — validates FK changes, updates
- [ ] 2.4 Create `DeletePlantaVentaUseCase` — gets foto keys, deletes entity, calls PhotoStorage.deleteMany best-effort
- [ ] 2.5 Create `UploadPlantaVentaFotoUseCase` — validates existence, generates key, uploads via PhotoStorage, adds foto to entity, updates
- [ ] 2.6 Create `DeletePlantaVentaFotoUseCase` — validates existence, removes foto from entity, deletes from R2, updates
- [ ] 2.7 Update `domainModule` with new bindings
- [ ] 2.8 Write unit tests for PlantaVenta entity (create, foto management, validation)
- [ ] 2.9 Write unit tests for auto-numbering use case (gap reuse scenarios)
- [ ] 2.10 Write unit tests for foto use cases (upload, delete, cleanup on entity delete)
- [ ] 2.11 Verify `pnpm nx run @m0n0lab/green-beard-domain:test:unit` passes

## 3. Shared DTOs

- [ ] 3.1 Create `PlantaVentaFotoDto`, `PlantaVentaDto` (includes displayName, denormalized names), `CreatePlantaVentaRequest`, `UpdatePlantaVentaRequest`
- [ ] 3.2 Verify `pnpm nx run @m0n0lab/green-beard-shared:build` succeeds

## 4. Data layer

- [ ] 4.1 Create `plantas_venta` Drizzle schema — id, planta_id FK, identificador INTEGER, fotos JSONB DEFAULT '[]', alto_planta_cm NUMERIC(10,2), maceta_id FK, sustrato_id FK, coste_planta NUMERIC(10,2) nullable. Composite UNIQUE (planta_id, identificador)
- [ ] 4.2 Generate migration via `pnpm nx run @m0n0lab/green-beard-data:db:generate`
- [ ] 4.3 Create PlantaVenta mapper (toDomain/toRow — handle JSONB fotos, NUMERIC parsing)
- [ ] 4.4 Create `PgPlantaVentaRepository` — includes `getNextIdentificador` via generate_series + LEFT JOIN query
- [ ] 4.5 Create `R2PhotoStorage` implementing PhotoStorage — @aws-sdk/client-s3 configured for R2 endpoint
- [ ] 4.6 Add `@aws-sdk/client-s3` dependency to green-beard-data
- [ ] 4.7 Add `STORAGE_TOKENS` with PhotoStorage symbol
- [ ] 4.8 Update `dataModule` with PgPlantaVentaRepository + R2PhotoStorage bindings
- [ ] 4.9 Verify `pnpm nx run @m0n0lab/green-beard-data:build` succeeds

## 5. API layer

- [ ] 5.1 Create `toPlantaVentaDto` serializer — joins Planta.nombre, Familia.nombre, Maceta.nombre, Sustrato.nombre for denormalized fields, computes displayName
- [ ] 5.2 Create `plantaVentaRoutes(container)` — GET / (?plantaId), GET /:id, POST /, PATCH /:id, DELETE /:id
- [ ] 5.3 Add foto routes: POST /:id/fotos (multipart, validate type+size), DELETE /:id/fotos/:key
- [ ] 5.4 Configure Hono body size limit (10MB) for multipart uploads
- [ ] 5.5 Update container with R2 config from env vars (R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL)
- [ ] 5.6 Register new routes in app.ts
- [ ] 5.7 Add error mapping for StorageError → 502
- [ ] 5.8 Verify `pnpm nx run @m0n0lab/green-beard-api:dev` — new endpoints respond

## 6. SvelteKit BFF pages

- [ ] 6.1 Create PlantaVenta list page — shows displayName, foto thumbnail, maceta, sustrato
- [ ] 6.2 Create PlantaVenta create form — planta select, maceta select, sustrato select, alto, coste opcional
- [ ] 6.3 Create PlantaVenta detail/edit page — shows all fields, foto gallery
- [ ] 6.4 Create foto upload component — file input, preview, upload to API
- [ ] 6.5 Create foto delete action
- [ ] 6.6 Verify full flow: create planta venta → upload fotos → verify auto-numbering → delete

## 7. Verification

- [ ] 7.1 `pnpm nx run-many -t build` — all projects build
- [ ] 7.2 `pnpm nx run @m0n0lab/green-beard-domain:test:unit` — all tests pass
- [ ] 7.3 Manual E2E: create planta venta (auto-ID #1) → create another (#2) → delete #1 → create another (gets #1 via gap reuse)
- [ ] 7.4 Manual E2E: upload photo → verify in R2 → delete planta venta → verify R2 cleanup
