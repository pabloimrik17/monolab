# Design

## Context

Green Beard is a plant sales management dashboard. The SvelteKit 5 scaffold exists at `apps/green-beard/` (`src/routes/` with a layout and one page, `src/lib/`). No backend package exists yet.

The monorepo has settled how Clean Architecture projects are built:

- [ADR 0007](../../../docs/adr/0007-investlab-package-per-module.md): one package per business module, plus core, platform and database packages. Apps are composition roots.
- [ADR 0009](../../../docs/adr/0009-clean-architecture-layout.md) and the `clean-architecture-layout` spec: what goes inside packages and apps, how files are named, aliases, and the lint that checks it.
- [ADR 0008](../../../docs/adr/0008-test-policy.md): which tests each kind of project carries.

This change bootstraps Green Beard on that layout and proves it with two simple CRUDs, Familia and Planta. InvestLab, already migrated by `clean-architecture-layout`, is the reference to copy.

## Goals / Non-Goals

**Goals:**

- Four packages (`green-beard-nursery`, `-core`, `-platform`, `-database`) and the `green-beard-api` app, laid out per `clean-architecture-layout` from the first commit.
- A full vertical slice: model → port → use case → Postgres repository → Hono route → client use case → SvelteKit loader or action → page.
- Familia CRUD (no foreign keys) and Planta CRUD (foreign key to Familia, optional photo URL).
- Docker Compose for local PostgreSQL.

**Non-Goals:**

- UI styling and a design system.
- Auth and sessions: a single-user dashboard, no auth for v1.
- Supply concepts (Material, Maceta, Sustrato): `green-beard-supplies`.
- PlantaVenta and photo uploads: `green-beard-inventory`.
- Deployment and hosting.
- Integration-platform tests for the SvelteKit app. ADR 0008 settles the UI harness with the first UI test (`agentic-task-3ao3`); until it lands, the pages are checked by hand.

## Decisions

### 1. Packages and layout from ADR 0007 and ADR 0009

The earlier plan copied qup's layer packages. ADR 0007 replaced that split: each layer package had one consumer, a feature touched every package, and no package owned its composition. Green Beard starts on the replacement:

```text
packages/green-beard-core      → kernel errors, API error envelope (no Green Beard deps)
packages/green-beard-platform  → Config, Postgres handle, HTTP + API clients (deps: core)
packages/green-beard-nursery   → every business concept (deps: core, platform)
packages/green-beard-database  → drizzle config, migrations, migrate() (reads nursery tables by glob)
apps/green-beard-api           → Hono; nursery `.` + `./server`, platform `./server`
apps/green-beard               → SvelteKit BFF; nursery `.` + `./client`, platform `./client`
```

**One module, `nursery`.** Familia, Planta and the later Material, Maceta, Sustrato and PlantaVenta all share one business area. PlantaVenta joins Planta, Maceta and Sustrato, and ADR 0007 forbids one module importing another. A split would only buy boundaries with no second consumer.

**Platform sides.** The browser never calls the API, so the HTTP client and the API client sit on the platform's client side (`client/http/`), used only from the SvelteKit server. There is no `shared/` side. `Config` has one port per side and one adapter per runtime: `server/config/process-env.config.ts` for the API, `client/config/ssr-env.config.ts` for the SvelteKit server.

### 2. Where code goes

Paths are relative to `packages/green-beard-nursery/src/` unless noted.

| Piece | Location |
| --- | --- |
| Models | `domain/model/familia.model.ts`, `planta.model.ts` |
| Repository ports | `domain/repository/familia.repository.ts`, `planta.repository.ts` |
| Read query and read model | `domain/query/planta-with-familia.query.ts`, `domain/read-model/planta-with-familia.read-model.ts` |
| Server use cases | `application/server/use-case/<concept>-<verb>.use-case.ts`, tokens in `application/server/tokens.ts` |
| Client use cases | `application/client/use-case/<concept>-<verb>.use-case.ts`, tokens in `application/client/tokens.ts` |
| DTOs | `data/shared/dto/familia.dto.ts`, `planta.dto.ts` |
| Postgres | `data/server/repository/<concept>-pg.repository.ts`, `data/server/query/planta-with-familia-pg.query.ts`, `data/server/infra/db/<concept>.table.ts` |
| API client side | `data/client/repository/<concept>-api.repository.ts`, `data/client/query/planta-with-familia-api.query.ts` |
| Container modules | `di/server.module.ts`, `di/client.module.ts` |
| Builders, test support | `testing/shared/builder/<concept>.builder.ts`, `testing/server/`, `testing/client/` |
| Kernel errors | `packages/green-beard-core/src/domain/error/<concept>.error.ts` |
| Error envelope | `packages/green-beard-core/src/data/shared/dto/api-error.dto.ts` |
| Routes and harnesses | `apps/green-beard-api/src/nursery/route/<concept>.route.ts`, `.route.harness.ts`, `.route.integration-platform.ts` |
| API core | `apps/green-beard-api/src/core/{middleware,mapper,error,harness}/` |
| Pages and BFF | `apps/green-beard/src/nursery/{page,component,loader,action,form}/` |

Mappings stay private methods of the repository or query that needs them until a second file needs one. Imports use `#<folder>/*` aliases: `#domain`, `#application`, `#data`, `#di` and `#testing` in the nursery, `#domain` and `#data` in core, `#server`, `#client` and `#di` in the platform, `#core`, `#di` and `#nursery` in the apps. SvelteKit declares them in `kit.alias`.

### 3. SvelteKit as BFF through client use cases

```text
Browser ──form/fetch──▶ SvelteKit loader/action ──client use case──▶ API repository ──API client──▶ Hono API
```

Loaders (`familia-list.loader.server.ts`) and actions (`familia.action.server.ts`) call client use cases resolved from `src/di/container.server.ts`. The use cases reach the API through `<concept>-api.repository.ts`, which uses the platform's API client and maps the error envelope's `code` back to the kernel error. Files in `src/routes/` stay thin: `+page.svelte` renders a page component from `src/nursery/page/`, and `+page.server.ts` re-exports `load` and `actions`.

**Why**: the same BFF rationale as before. The API stays hidden, SvelteKit gives SSR and progressive enhancement, and Green Beard has no real-time need. The `.server.ts` suffix keeps the container and the API token out of the browser bundle.

**Alternative**: the browser calls the API directly. Rejected: it loses SSR and exposes the API.

### 4. Hono routes as module sub-apps

Each `src/nursery/route/<concept>.route.ts` exports a function that takes the container and returns a Hono sub-app; `src/app.ts` mounts them at `/familias` and `/plantas`, as InvestLab's API does. Routes resolve use cases only. Request bodies are validated against the DTO schemas, and `src/core/mapper/error-http.mapper.ts` turns an error's `code` into the HTTP status and the error envelope. Response mapping stays a private method of the route until two routes share it.

`src/di/container.ts` binds the platform's process-env `Config` adapter and loads the platform and nursery server modules, nothing else.

### 5. Read across aggregates: Planta with its familia name

`PlantaDto` carries `familiaName`, which belongs to Familia. Per the layout, a read that combines aggregates is a read query, so `PlantaWithFamiliaQuery` returns `PlantaWithFamiliaReadModel`, implemented with a SQL join on the server and with `GET /plantas` on the client. The `PlantaRepository` keeps only what writes need. Create and update read the saved planta back through the query, so every Planta response has the same shape.

**Alternative**: the route calls the Familia use case to fill the name. Rejected: routes would hold logic, and every list would make one extra call per planta.

### 6. Drizzle + PostgreSQL with Docker Compose

Each table sits in the module as `data/server/infra/db/<concept>.table.ts`. `@m0n0lab/green-beard-database` lists them by the glob `../green-beard-*/src/data/server/infra/db/*.table.ts`, owns the `drizzle/` migrations and exposes `migrate(databaseUrl)` for the API and the integration tests. Local development uses `apps/green-beard-api/docker-compose.yml`, next to the API as in qup, with a single `green_beard` database.

**Why**: Drizzle is thin and does not impose a model on the domain. A separate database package lets module tests migrate without reading an app folder (ADR 0007).

### 7. Error hierarchy in core

```text
DomainError (abstract, `code`)
├── ValidationError
├── NotFoundError (concept name and id)
├── DuplicateError (unique constraint violations)
├── PersistenceError (wraps unknown database errors)
└── NetworkError (client side: the API could not be reached)
```

**Why**: Green Beard CRUDs are simpler than qup's state machines, so a generic `NotFoundError("Familia", id)` is enough. Kernel errors live in core so the module, the platform and both apps share them; module-specific errors go to the nursery's `domain/error/` when one is needed. `NetworkError` is new: client use cases need a typed failure when the API is down.

### 8. Models follow the existing pattern

- Private constructor, `static create()` returning `Result<T, ValidationError>`, `static reconstitute()` for database hydration.
- Getters for read access, `update()` for changes.
- `@injectable()` on use cases, repositories and queries; `@inject(TOKEN)` for dependencies.

### 9. Planta.foto_url as a plain string

`foto_url` is a nullable URL string. No upload integration; the R2 upload flow comes with `green-beard-inventory`, where PlantaVenta needs several photos.

**Why**: it keeps the foundation small. Planta's single photo URL can be set by hand or by a later upload endpoint.

### 10. Project config and tests

Each package uses tsdown for builds, Vitest for tests and `tsc --noEmit` for type checks, with the same `package.json` shape as InvestLab's packages; Nx infers targets from scripts. Tests follow ADR 0008:

- `test:unit`: model unit tests.
- `test:integration`: one integration test per use case, in the `integration:server` (Postgres through Testcontainers, migrated with `migrate()`) and `integration:client` (the API faked with MSW) Vitest projects.
- `test:integration-platform` in the API: route harnesses on `core/harness/api.harness.ts`, with the real container, boundary guards and use-case fakes.

No use-case test mocks a repository.

**Alternative**: Nx generators. Rejected: manual scaffolding by copying InvestLab is simpler for four private packages.

## Risks / Trade-offs

- **[No auth on the API]** → Acceptable for a single-user v1. Add a PIN or session auth later.
- **[Docker needed for local development and integration tests]** → Postgres runs in Docker Compose, and Testcontainers needs a Docker-compatible daemon, as in InvestLab.
- **[Two Node servers in development]** → Run `@m0n0lab/green-beard:dev` and `@m0n0lab/green-beard-api:dev` together through `nx run-many`.
- **[`experimentalDecorators` for Inversify]** → Every Green Beard package that holds injectable classes needs `experimentalDecorators` and `emitDecoratorMetadata`. The SvelteKit app consumes the packages from `dist/`, so it compiles no decorators itself.
- **[Aliases in three toolchains]** → `paths` for tsc, tsdown and Vitest, and `kit.alias` for SvelteKit. `clean-architecture-layout` already proves the first three; task 7.1 proves SvelteKit before any page is written.
- **[foto_url without upload]** → The user enters URLs by hand until `green-beard-inventory` adds R2 upload.
- **[No UI integration-platform tests yet]** → The pages are checked by hand until the UI harness lands (`agentic-task-3ao3`).
