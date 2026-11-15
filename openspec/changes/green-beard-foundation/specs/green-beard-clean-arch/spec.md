## Purpose

Defines how Green Beard is built: one business module package plus core, platform and database packages, an API and a SvelteKit BFF as composition roots, typed errors, and local Postgres. Where files go and how they are named comes from the `clean-architecture-layout` spec; this spec only adds what is specific to Green Beard.

## ADDED Requirements

### Requirement: Green Beard projects

Green Beard SHALL consist of the packages `@m0n0lab/green-beard-nursery`, `@m0n0lab/green-beard-core`, `@m0n0lab/green-beard-platform` and `@m0n0lab/green-beard-database`, and the apps `apps/green-beard-api` and `apps/green-beard`. Every project except the database package SHALL follow `clean-architecture-layout`. No layer package (`green-beard-domain`, `green-beard-data`, `green-beard-shared`) SHALL exist.

#### Scenario: Workspace projects

- **WHEN** workspace projects are listed
- **THEN** the four packages and two apps appear, and no `green-beard-domain`, `green-beard-data` or `green-beard-shared` project exists

#### Scenario: Projects build

- **WHEN** `pnpm nx run-many -t build -p '@m0n0lab/green-beard*'` runs
- **THEN** every Green Beard project builds

### Requirement: One business module

`@m0n0lab/green-beard-nursery` SHALL hold every Green Beard business concept, Familia and Planta in this change, laid out per `clean-architecture-layout`. Its entries SHALL be `.`, `./server`, `./client` and `./testing`, and `./testing` SHALL export only builders, from `src/testing.ts`.

#### Scenario: Use case location

- **WHEN** the server use case that creates a Familia is located
- **THEN** it is `packages/green-beard-nursery/src/application/server/use-case/familia-create.use-case.ts`

#### Scenario: Exports are valid

- **WHEN** `pnpm nx run @m0n0lab/green-beard-nursery:build:check-exports` runs
- **THEN** every entry passes

### Requirement: Core package

`@m0n0lab/green-beard-core` SHALL hold, behind a single root entry, the kernel errors in `src/domain/error/<concept>.error.ts` and the API error envelope schema in `src/data/shared/dto/api-error.dto.ts`. It SHALL import no Green Beard package and no infrastructure library.

#### Scenario: Core depends on nothing of ours

- **WHEN** the imports of `@m0n0lab/green-beard-core` are listed
- **THEN** none points to another `@m0n0lab/green-beard-*` package, nor to `pg`, `drizzle-orm`, `hono` or `inversify`

### Requirement: Platform package

`@m0n0lab/green-beard-platform` SHALL export `./server` and `./client` only. The server side SHALL provide `Config` and the Postgres handle; the client side SHALL provide `Config`, the HTTP client and the Green Beard API client. Each side SHALL have one `Config` adapter per runtime that reads the environment, and static container modules in `src/di/`.

#### Scenario: Only Config adapters read the environment

- **WHEN** Green Beard source files that read `process.env` or `$env` are listed
- **THEN** only the platform's `Config` adapters appear

### Requirement: Database package

`@m0n0lab/green-beard-database` SHALL own the drizzle config, the migrations folder, a `migrate(databaseUrl)` helper and the `db:generate` and `db:migrate` scripts. Its drizzle config SHALL list the module's `src/data/server/infra/db/*.table.ts` files by glob, so a new table needs no config change.

#### Scenario: Migration creates tables

- **WHEN** `pnpm nx run @m0n0lab/green-beard-database:db:migrate` runs against an empty database
- **THEN** the `familias` and `plantas` tables are created

#### Scenario: Table found by glob

- **WHEN** a new `*.table.ts` file is added under `packages/green-beard-nursery/src/data/server/infra/db/` and `db:generate` runs
- **THEN** a migration for it is generated without editing the drizzle config

### Requirement: Dependency direction between packages

The nursery module SHALL depend on core and on the platform side it runs on. The platform SHALL depend on core only. The API SHALL import the nursery `.` and `./server` entries and the platform `./server` entry; the SvelteKit app SHALL import the nursery `.` and `./client` entries and the platform `./client` entry.

#### Scenario: Web never imports server code

- **WHEN** the imports of `apps/green-beard` are listed
- **THEN** none points to `@m0n0lab/green-beard-nursery/server` or `@m0n0lab/green-beard-platform/server`

### Requirement: Container modules per side

The nursery module SHALL bind its use cases, repositories and read queries in static Inversify container modules, `src/di/server.module.ts` and `src/di/client.module.ts`. The platform SHALL do the same for its own pieces. Each token SHALL live in the `tokens.ts` at the root of the side folder that injects it.

#### Scenario: Server module resolves a use case

- **WHEN** a container loads the platform and nursery server modules with a `Config` bound
- **THEN** every server use case token resolves, backed by the Postgres repositories and read queries

### Requirement: Apps are composition roots

Each app SHALL build its container in `src/di/`: the API in `container.ts`, the SvelteKit app in `container.server.ts`. A container SHALL bind only its runtime's `Config` adapter and load the platform and nursery modules of its side. Routes, loaders and actions SHALL call use cases and SHALL NOT resolve repositories or read the environment.

#### Scenario: API container

- **WHEN** `apps/green-beard-api/src/di/container.ts` is read
- **THEN** it binds the platform's process-env `Config` adapter and loads the platform and nursery server modules, and binds nothing else

### Requirement: Typed errors with neverthrow

Repositories, read queries and use cases SHALL return `ResultAsync` and SHALL NOT throw for expected failures. Kernel errors SHALL live in core: `ValidationError`, `NotFoundError` (concept name and id), `DuplicateError`, `PersistenceError` (wraps a database failure) and `NetworkError` (the API could not be reached), each with a stable `code`.

#### Scenario: Use case returns a typed error

- **WHEN** a use case looks up an id that does not exist
- **THEN** it returns `Err<NotFoundError>` with the concept name and id

#### Scenario: Repository wraps a database failure

- **WHEN** a database operation fails unexpectedly
- **THEN** the repository returns `Err<PersistenceError>` wrapping the original error

### Requirement: Hono routes as module sub-apps

Each concept's routes SHALL live in `apps/green-beard-api/src/nursery/route/<concept>.route.ts`, exporting a Hono sub-app built from the container that `src/app.ts` mounts. Request bodies SHALL be validated against the DTO schemas. `src/core/mapper/error-http.mapper.ts` SHALL map error codes to HTTP status: not found 404, validation 422, duplicate 409, persistence 500.

#### Scenario: Successful call

- **WHEN** a valid request reaches a CRUD route
- **THEN** the route calls its use case and answers the DTO with the route's success status

#### Scenario: Error call

- **WHEN** a request ends in a kernel error
- **THEN** the API answers the error envelope `{ code, message, statusCode }` with the mapped HTTP status

### Requirement: SvelteKit BFF through client use cases

`apps/green-beard` SHALL keep pages, components, loaders, actions and forms in `src/nursery/`. Files in `src/routes/` SHALL be thin: `+page.svelte` only renders a module page, and `+page.server.ts` only re-exports `load` and `actions` from `src/nursery/`. Loaders and actions SHALL call client use cases, which reach the API through the platform's API client. The browser SHALL NOT call the API.

#### Scenario: Load function reads data

- **WHEN** the Familia list page is requested
- **THEN** `src/nursery/loader/familia-list.loader.server.ts` calls the client list use case, whose API repository calls the API through the platform's API client

#### Scenario: Form action mutates data

- **WHEN** the Familia create form is submitted
- **THEN** an action in `src/nursery/action/` calls the client create use case and redirects, or returns the error to the form

#### Scenario: Thin route file

- **WHEN** `apps/green-beard/src/routes/familias/+page.server.ts` is read
- **THEN** it only re-exports `load` and `actions` from `src/nursery/`

### Requirement: Tests follow the test policy

Tests SHALL follow ADR 0008. Models SHALL have unit tests (`<x>.model.test.ts`). Each use case SHALL have an integration test next to it (`<x>.use-case.integration.ts`): server side against Postgres through Testcontainers, client side against the API faked with MSW. Each API route SHALL have a harness and an integration-platform test next to it. No use-case test SHALL mock a repository.

#### Scenario: Server use case test

- **WHEN** the integration test of the server Familia create use case runs
- **THEN** it uses the real Postgres repository against a Testcontainers database, built from the nursery server module

#### Scenario: Route test

- **WHEN** the Familia routes are tested
- **THEN** `apps/green-beard-api/src/nursery/route/familia.route.integration-platform.ts` drives them through `familia.route.harness.ts`, which extends `src/core/harness/api.harness.ts`

### Requirement: Green Beard under the layout lint

Every Green Beard project in scope SHALL be checked by the `clean-architecture-layout` lint through one factory call with the `green-beard` prefix, and CI SHALL fail on a violation.

#### Scenario: Lint passes

- **WHEN** `pnpm nx run-many -t lint:eslint -p '@m0n0lab/green-beard*'` runs
- **THEN** every Green Beard project except the database package is checked against the layout, and all pass

### Requirement: Docker Compose for local PostgreSQL

`apps/green-beard-api/docker-compose.yml` SHALL provide a PostgreSQL instance for local development, with a database named `green_beard`.

#### Scenario: Docker Compose starts PostgreSQL

- **WHEN** `docker compose up -d` runs in `apps/green-beard-api`
- **THEN** PostgreSQL is reachable on `localhost:5432` with the configured credentials and the `green_beard` database
