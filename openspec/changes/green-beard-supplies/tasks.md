Paths below are inside `packages/green-beard-nursery/src/` unless stated. Tasks marked **[attw]** change a package's exports: also run `pnpm nx run @m0n0lab/green-beard-nursery:build:check-exports`.

## 1. Domain (models, value objects, ports, errors)

- [ ] 1.1 Create `domain/value-object/maceta-material.value-object.ts` (string union + validation). Verify: unit test `maceta-material.value-object.test.ts` passes
- [ ] 1.2 Create `domain/model/material.model.ts` — create(), reconstitute(), update(), precioLitro positive. Verify: `material.model.test.ts` passes
- [ ] 1.3 Create `domain/repository/material.repository.ts` (includes `findByIds`, `existsByNombre`). Verify: `pnpm nx run @m0n0lab/green-beard-nursery:typecheck`
- [ ] 1.4 Create `domain/model/maceta.model.ts` — create(), reconstitute(), update(), margen 0-1, computed `pvp`. Verify: `maceta.model.test.ts` passes (pvp, margen bounds)
- [ ] 1.5 Create `domain/repository/maceta.repository.ts`. Verify: typecheck
- [ ] 1.6 Create `domain/model/sustrato.model.ts` — create(), reconstitute(), update(), materiales validation (non-empty, positive litros). Verify: `sustrato.model.test.ts` passes
- [ ] 1.7 Create `domain/repository/sustrato.repository.ts` (includes `existsMaterialUsage`; the root saves and loads its material lines). Verify: typecheck
- [ ] 1.8 Create `domain/query/sustrato-list.query.ts` and `domain/read-model/sustrato-list.read-model.ts` (coste, pvp, lines with costeParcial). Verify: typecheck
- [ ] 1.9 Create `domain/error/material.error.ts` (`MaterialInUseError`) and other module errors if needed. Verify: typecheck
- [ ] 1.10 Run `pnpm nx run @m0n0lab/green-beard-nursery:test:unit`. Verify: all unit tests pass

## 2. Application (server use cases)

- [ ] 2.1 Create `application/server/use-case/material-{create,list,get,update,delete}.use-case.ts` (delete checks `SustratoRepository.existsMaterialUsage`). Verify: typecheck
- [ ] 2.2 Create `application/server/use-case/maceta-{create,list,get,update,delete}.use-case.ts`. Verify: typecheck
- [ ] 2.3 Create `application/server/use-case/sustrato-{create,list,get,update,delete}.use-case.ts` (create and update validate materialIds with `MaterialRepository.findByIds`; list and get read through `SustratoListQuery`). Verify: typecheck
- [ ] 2.4 Add the new bindings to `di/server.module.ts`. Verify: typecheck
- [ ] 2.5 Write `<concept>-<verb>.use-case.integration.ts` next to the use cases that carry rules (material delete in use, sustrato create with unknown materialId, duplicate nombre) against Postgres via Testcontainers; no mocked repositories. Verify: `pnpm nx run @m0n0lab/green-beard-nursery:test:integration` passes (needs Docker)

## 3. Data (DTOs, tables, Postgres)

- [ ] 3.1 **[attw]** Create `data/shared/dto/{material,maceta,sustrato}.dto.ts` (`MaterialDto`, `MacetaDto` with pvp, `SustratoDto`, `SustratoMaterialDto`, `SustratoMaterialInput`, create and update requests) and export them from the package entry. Verify: `pnpm nx run @m0n0lab/green-beard-nursery:build` and `:build:check-exports` pass
- [ ] 3.2 Create `data/server/infra/db/material.table.ts` — id, nombre (UNIQUE), precio_litro NUMERIC(10,2). Verify: typecheck
- [ ] 3.3 Create `data/server/infra/db/maceta.table.ts` — id, nombre (UNIQUE), material VARCHAR, diametro_cm, alto_cm, volumen_litros, coste NUMERIC(10,2), margen NUMERIC(5,2). Verify: typecheck
- [ ] 3.4 Create `data/server/infra/db/sustrato.table.ts` — id, nombre (UNIQUE), margen NUMERIC(5,2). Verify: typecheck
- [ ] 3.5 Create `data/server/infra/db/sustrato-material.table.ts` — composite PK (sustrato_id, material_id), litros NUMERIC(10,2), ON DELETE CASCADE on sustrato_id. Verify: typecheck
- [ ] 3.6 Generate the migration with `pnpm nx run @m0n0lab/green-beard-database:db:generate`. Verify: the SQL creates the four tables and applies to a clean Postgres
- [ ] 3.7 Create `data/server/repository/material-pg.repository.ts` (mapping private; `findByIds` with `inArray`). Verify: covered by 2.5
- [ ] 3.8 Create `data/server/repository/maceta-pg.repository.ts`. Verify: covered by 2.5
- [ ] 3.9 Create `data/server/repository/sustrato-pg.repository.ts` — loads and saves the material lines; save and update replace junction rows in one transaction. Verify: covered by 2.5 (update [A, B] to [B, C])
- [ ] 3.10 Create `data/server/query/sustrato-list-pg.query.ts` with a SQL join and SUM. Verify: integration test (cost follows a changed material price)
- [ ] 3.11 Create `data/client/repository/{material,maceta,sustrato}-api.repository.ts` and the client use cases in `application/client/use-case/` for the BFF. Verify: integration test with the API faked by MSW
- [ ] 3.12 **[attw]** Add the new bindings to `di/server.module.ts` and `di/client.module.ts`, and update the `./server` and `./client` entries. Verify: `pnpm nx run @m0n0lab/green-beard-nursery:build` and `:build:check-exports` pass

## 4. API (apps/green-beard-api)

- [ ] 4.1 Map the new errors in the API error mapping (`MaterialInUseError` → 409). Verify: covered by 4.5
- [ ] 4.2 Create `src/nursery/route/material.route.ts` — GET /, GET /:id, POST /, PATCH /:id, DELETE /:id. Verify: typecheck
- [ ] 4.3 Create `src/nursery/route/maceta.route.ts` (responses include pvp). Verify: typecheck
- [ ] 4.4 Create `src/nursery/route/sustrato.route.ts` (GETs use `SustratoListQuery`). Verify: typecheck
- [ ] 4.5 Mount the three sub-apps in `src/app.ts` and write a route harness plus `<concept>.route.integration-platform.ts` next to each route. Verify: `pnpm nx run @m0n0lab/green-beard-api:test:integration-platform` passes (201 with pvp, 409 on material in use, computed sustrato costs)

## 5. SvelteKit BFF (apps/green-beard)

- [ ] 5.1 Material: `src/nursery/{page,component,loader,action,form}/` files (list, create, edit, delete) and thin shells in `src/routes/`. Verify: `pnpm nx run @m0n0lab/green-beard:typecheck`
- [ ] 5.2 Maceta: same, list shows pvp, create form has the material enum select. Verify: `check`
- [ ] 5.3 Sustrato: same, list shows coste and pvp, form has dynamic material rows (add and remove material + litros). Verify: `check`
- [ ] 5.4 Write integration-platform tests for the three sections through the page harness. Verify: `pnpm nx run @m0n0lab/green-beard:test:integration-platform` passes

## 6. Verification

- [ ] 6.1 `pnpm nx run-many -t build,typecheck,lint -p @m0n0lab/green-beard-nursery,@m0n0lab/green-beard-database,@m0n0lab/green-beard-api,@m0n0lab/green-beard`. Verify: all succeed
- [ ] 6.2 `pnpm nx run-many -t test -p @m0n0lab/green-beard-nursery,@m0n0lab/green-beard-api,@m0n0lab/green-beard`. Verify: all pass
- [ ] 6.3 Manual check in the running apps: material CRUD → maceta CRUD → sustrato CRUD with computed prices. Verify: costs match the spec examples
