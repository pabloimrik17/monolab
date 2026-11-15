Paths are relative to `packages/green-beard-nursery/src/` unless stated. Imports use `#<folder>/*` aliases. Targets are `pnpm nx run <project>:<target>`.

## 1. Platform: S3 client and R2 Config **[attw]**

- [ ] 1.1 Add `@aws-sdk/client-s3` to `@m0n0lab/green-beard-platform` and create the generic S3-compatible client `server/storage/s3.client.ts`
- [ ] 1.2 Add R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL to the platform's server Config port and its env implementation; export the client from `./server`
- [ ] 1.3 Verify: `pnpm nx run @m0n0lab/green-beard-platform:build` and `:test` pass; `build:check-exports` passes for the new `./server` exports

## 2. Domain

- [ ] 2.1 Create `domain/error/planta-venta.error.ts` — `PlantaVentaNotFoundError` (extends the kernel `DomainError`). Add `StorageError` to `@m0n0lab/green-beard-core` as `domain/error/storage.error.ts` and to its `KernelError` union: like `PersistenceError` and `NetworkError`, it is a medium failure any module can hit **[attw]**
- [ ] 2.2 Create `domain/model/planta-venta.model.ts` — create(), reconstitute(), update(), addFoto(), removeFoto(), getFotos(). Validate: identificador ≥ 1, altoPlantaCm > 0, costePlanta > 0 if present. References Planta, Maceta and Sustrato by id only
- [ ] 2.3 Create `domain/repository/planta-venta.repository.ts` (port, includes `getNextIdentificador`, `findByPlantaId`)
- [ ] 2.4 Create `domain/read-model/planta-venta-list.read-model.ts` and `domain/query/planta-venta-list.query.ts` (list with optional plantaId filter, get by id; includes denormalized names and displayName)
- [ ] 2.5 Write `domain/model/planta-venta.model.test.ts` (create, validation, foto management)
- [ ] 2.6 Verify: `pnpm nx run @m0n0lab/green-beard-nursery:test:unit` passes

## 3. Shared DTOs **[attw]**

- [ ] 3.1 Create `data/shared/dto/planta-venta.dto.ts` — `PlantaVentaFotoDto`, `PlantaVentaDto` (displayName, denormalized names), `PlantaVentaCreateRequest`, `PlantaVentaUpdateRequest`, with zod schemas
- [ ] 3.2 Verify: `pnpm nx run @m0n0lab/green-beard-nursery:build` succeeds and `build:check-exports` passes for the changed entries

## 4. Server application

- [ ] 4.1 Create `application/server/port/photo-storage.port.ts` (upload, delete, deleteMany)
- [ ] 4.2 Create use cases in `application/server/use-case/`: `planta-venta-create` (validates plantaId, macetaId and sustratoId through their repositories, gets next identificador, persists, bounded retry on unique collision), `planta-venta-list`, `planta-venta-get-by-id`, `planta-venta-update` (validates FK changes), `planta-venta-delete` (collects foto keys, deletes, best-effort `deleteMany`), `planta-venta-foto-upload`, `planta-venta-foto-delete`
- [ ] 4.3 Verify: `pnpm nx run @m0n0lab/green-beard-nursery:build` succeeds (integration tests come in section 5)

## 5. Server data and migration

- [ ] 5.1 Create `data/server/infra/db/planta-venta.table.ts` — id, planta_id FK, identificador INTEGER, fotos JSONB DEFAULT '[]', alto_planta_cm NUMERIC(10,2), maceta_id FK, sustrato_id FK, coste_planta NUMERIC(10,2) nullable. Composite UNIQUE (planta_id, identificador). No separate photo table
- [ ] 5.2 Generate the migration with `pnpm nx run @m0n0lab/green-beard-database:db:generate` (its drizzle config picks the table up by glob) and check the SQL
- [ ] 5.3 Create `data/server/repository/planta-venta-pg.repository.ts` — includes `getNextIdentificador` via generate_series + LEFT JOIN query; JSONB fotos and NUMERIC parsing stay private to the file
- [ ] 5.4 Create `data/server/query/planta-venta-list-pg.query.ts` — SQL join of Planta, Familia, Maceta and Sustrato names, computes displayName
- [ ] 5.5 Create the photo storage implementation in `data/server/infra/storage/photo-r2.storage.ts` (`PhotoR2Storage`) over the platform S3 client
- [ ] 5.6 Bind repository, query and photo storage in `di/server.module.ts`
- [ ] 5.7 Write `application/server/use-case/planta-venta-create.use-case.integration.ts` and one integration test per other server use case, against Postgres via Testcontainers, photo storage faked at its HTTP boundary with MSW. Cover gap reuse, concurrent create, FK validation, R2 cleanup failure on delete
- [ ] 5.8 Verify: `pnpm nx run @m0n0lab/green-beard-nursery:test:integration` passes; `pnpm nx run @m0n0lab/green-beard-database:db:migrate` applies the migration to a clean database

## 6. Client side **[attw]**

- [ ] 6.1 Create `data/client/repository/planta-venta-api.repository.ts` and client use cases in `application/client/use-case/` (create, list, get, update, delete, foto upload, foto delete)
- [ ] 6.2 Bind them in `di/client.module.ts`; export what the app needs from the `./client` entry
- [ ] 6.3 Write client use case integration tests with the API faked with MSW
- [ ] 6.4 Verify: `pnpm nx run @m0n0lab/green-beard-nursery:test:integration` passes and `build:check-exports` passes for the changed entries

## 7. API app

- [ ] 7.1 Create `apps/green-beard-api/src/nursery/route/planta-venta.route.ts` — GET / (?plantaId), GET /:id, POST /, PATCH /:id, DELETE /:id, POST /:id/fotos (multipart, validate type and size), DELETE /:id/fotos?key=
- [ ] 7.2 Configure the Hono body size limit (10MB) for multipart uploads; map the kernel `StorageError` to 502 in `core/mapper/error-http.mapper.ts`
- [ ] 7.3 Mount the sub-app in `src/app.ts`; wire R2 variables through the platform server Config
- [ ] 7.4 Create the route harness next to the route and `planta-venta.route.integration-platform.ts` (valid upload, 422 on wrong type and size, 404, 502 mapping)
- [ ] 7.5 Verify: `pnpm nx run @m0n0lab/green-beard-api:test:integration-platform` and `:build` pass

## 8. SvelteKit app

- [ ] 8.1 Under `apps/green-beard/src/nursery/`: list page (displayName, foto thumbnail, maceta, sustrato), create form, detail/edit page with foto gallery
- [ ] 8.2 Foto upload component (file input, preview) and foto delete action; loaders in `loader/<x>.loader.server.ts`, actions in `action/<x>.action.server.ts`, forms in `form/`
- [ ] 8.3 Add thin shells in `src/routes/` re-exporting the module's pages, loaders and actions
- [ ] 8.4 Verify: `pnpm nx run @m0n0lab/green-beard:test:integration-platform` and `:build` pass

## 9. Verification

- [ ] 9.1 `pnpm nx run-many -t build` — all projects build
- [ ] 9.2 `pnpm nx run-many -t test -p @m0n0lab/green-beard-nursery,@m0n0lab/green-beard-platform,@m0n0lab/green-beard-api,@m0n0lab/green-beard` — all pass
- [ ] 9.3 Manual E2E: create planta venta (auto-ID #1) → create another (#2) → delete #1 → create another (gets #1 via gap reuse)
- [ ] 9.4 Manual E2E: upload photo → verify in R2 → delete planta venta → verify R2 cleanup
