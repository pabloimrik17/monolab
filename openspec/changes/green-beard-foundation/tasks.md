## 1. Scaffold packages

- [ ] 1.1 Create `packages/green-beard-domain/` — package.json (name: `@m0n0lab/green-beard-domain`, private, ESM, inversify+neverthrow deps), tsconfig, project.json, tsdown.config.ts
- [ ] 1.2 Create `packages/green-beard-data/` — package.json (deps: `workspace:*` gb-domain, drizzle-orm, pg, drizzle-kit dev), tsconfig, project.json, tsdown.config.ts
- [ ] 1.3 Create `packages/green-beard-shared/` — package.json (zero runtime deps), tsconfig, project.json, tsdown.config.ts
- [ ] 1.4 Create `apps/green-beard-api/` — package.json (deps: gb-domain, gb-data, gb-shared, hono, @hono/node-server, inversify), tsconfig, project.json, tsdown.config.ts
- [ ] 1.5 Run `pnpm install` from workspace root, verify all packages resolve
- [ ] 1.6 Verify `pnpm nx run-many -t build --projects=@m0n0lab/green-beard-domain,@m0n0lab/green-beard-data,@m0n0lab/green-beard-shared,@m0n0lab/green-beard-api` succeeds

## 2. Domain foundation (green-beard-domain)

- [ ] 2.1 Create error hierarchy: `DomainError` (abstract), `ValidationError`, `NotFoundError(entity, id)`, `DuplicateError(entity, field)`, `PersistenceError(cause)`
- [ ] 2.2 Create `tokens.ts` with DI symbols for all repositories and use cases
- [ ] 2.3 Create `Familia` entity — private constructor, `create()`, `reconstitute()`, `update()`, getters
- [ ] 2.4 Create `FamiliaRepository` port interface
- [ ] 2.5 Create Familia use cases: `CreateFamiliaUseCase`, `GetFamiliasUseCase`, `GetFamiliaByIdUseCase`, `UpdateFamiliaUseCase`, `DeleteFamiliaUseCase` — all @injectable
- [ ] 2.6 Create `Planta` entity — private constructor, `create()`, `reconstitute()`, `update()`, FK to familiaId, nullable fotoUrl
- [ ] 2.7 Create `PlantaRepository` port interface (includes `findByFamiliaId`)
- [ ] 2.8 Create Planta use cases: `CreatePlantaUseCase` (validates familiaId via FamiliaRepository), `GetPlantasUseCase`, `GetPlantaByIdUseCase`, `UpdatePlantaUseCase`, `DeletePlantaUseCase`
- [ ] 2.9 Create `domainModule` ContainerModule binding all use cases
- [ ] 2.10 Export everything from `index.ts`
- [ ] 2.11 Write unit tests for Familia entity (create, update, validation)
- [ ] 2.12 Write unit tests for Planta entity (create, update, validation)
- [ ] 2.13 Write unit tests for key use cases (create with duplicate, create with non-existent FK)
- [ ] 2.14 Verify `pnpm nx run @m0n0lab/green-beard-domain:test:unit` passes

## 3. Shared DTOs (green-beard-shared)

- [ ] 3.1 Create `FamiliaDto`, `CreateFamiliaRequest`, `UpdateFamiliaRequest`
- [ ] 3.2 Create `PlantaDto` (includes `familiaName`), `CreatePlantaRequest`, `UpdatePlantaRequest`
- [ ] 3.3 Create `ApiErrorDto` type
- [ ] 3.4 Export from `index.ts`, verify `pnpm nx run @m0n0lab/green-beard-shared:build` succeeds

## 4. Data layer (green-beard-data)

- [ ] 4.1 Create Docker Compose with PostgreSQL (`green_beard` db)
- [ ] 4.2 Create Drizzle config (`drizzle.config.ts`)
- [ ] 4.3 Create `familias` schema — id UUID PK, nombre VARCHAR(100) UNIQUE NOT NULL
- [ ] 4.4 Create `plantas` schema — id UUID PK, nombre VARCHAR(150) UNIQUE NOT NULL, familia_id UUID FK→familias, foto_url TEXT nullable
- [ ] 4.5 Generate initial migration via `pnpm nx run @m0n0lab/green-beard-data:db:generate`
- [ ] 4.6 Create Familia mapper (`toDomain`, `toRow`)
- [ ] 4.7 Create Planta mapper (`toDomain`, `toRow`)
- [ ] 4.8 Create `PgFamiliaRepository` implementing FamiliaRepository — all methods with ResultAsync
- [ ] 4.9 Create `PgPlantaRepository` implementing PlantaRepository
- [ ] 4.10 Create `DATA_TOKENS` with DrizzleDb symbol
- [ ] 4.11 Create `dataModule` ContainerModule binding repositories
- [ ] 4.12 Export from `index.ts`, verify `pnpm nx run @m0n0lab/green-beard-data:build` succeeds

## 5. API layer (green-beard-api)

- [ ] 5.1 Create error mapping: `errorToHttp()` + `toApiError()` (NotFound→404, Validation→422, Duplicate→409, Persistence→500)
- [ ] 5.2 Create DTO serializers (`toFamiliaDto`, `toPlantaDto`)
- [ ] 5.3 Create `familiaRoutes(container)` — GET /, POST /, PATCH /:id, DELETE /:id
- [ ] 5.4 Create `plantaRoutes(container)` — GET / (?familiaId filter), GET /:id, POST /, PATCH /:id, DELETE /:id
- [ ] 5.5 Create `createContainer()` composition root loading domainModule + dataModule, binding DrizzleDb
- [ ] 5.6 Create `app.ts` wiring Hono app with routes, CORS middleware
- [ ] 5.7 Create `index.ts` entry point with @hono/node-server
- [ ] 5.8 Add `dev` script (tsx watch) and `start` script
- [ ] 5.9 Verify `pnpm nx run @m0n0lab/green-beard-api:dev` starts and responds to requests

## 6. SvelteKit BFF wiring

- [ ] 6.1 Create API client utility in `apps/green-beard/src/lib/server/api-client.ts` for typed HTTP calls to Hono API
- [ ] 6.2 Add `GREEN_BEARD_API_URL` env var support
- [ ] 6.3 Create Familia pages: list (+page.server.ts load), create form, edit form, delete action
- [ ] 6.4 Create Planta pages: list (with familia filter), create form (familia select), edit form, delete action
- [ ] 6.5 Verify full flow: Docker up → API dev → SvelteKit dev → CRUD operations work in browser

## 7. Verification

- [ ] 7.1 `pnpm nx run-many -t build` — all projects build
- [ ] 7.2 `pnpm nx run @m0n0lab/green-beard-domain:test:unit` — tests pass
- [ ] 7.3 Manual E2E: create familia → create planta with that familia → update → delete
