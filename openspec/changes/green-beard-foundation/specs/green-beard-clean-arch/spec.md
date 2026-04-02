## ADDED Requirements

### Requirement: Package structure with strict dependency direction

The system SHALL provide 4 new projects following Clean Architecture:

- `packages/green-beard-domain`: entities, ports, use cases, tokens, errors. Deps: inversify, neverthrow only
- `packages/green-beard-data`: Drizzle schema, mappers, repository implementations. Deps: green-beard-domain, drizzle-orm, pg
- `packages/green-beard-shared`: DTOs, request types. Zero runtime deps
- `apps/green-beard-api`: Hono REST API, route factories, error mapping, DI composition root. Deps: green-beard-domain, green-beard-data, green-beard-shared, hono, inversify

Domain SHALL NOT import data, shared, or api packages. Data SHALL NOT import api. Shared SHALL NOT import domain or data.

#### Scenario: Domain has no infrastructure imports
- **WHEN** green-beard-domain source is inspected
- **THEN** it has no imports from drizzle-orm, pg, hono, or any green-beard package except neverthrow and inversify

#### Scenario: Build succeeds with workspace deps
- **WHEN** `pnpm nx run-many -t build --projects=@m0n0lab/green-beard-domain,@m0n0lab/green-beard-data,@m0n0lab/green-beard-shared,@m0n0lab/green-beard-api` is executed
- **THEN** all 4 projects build successfully

### Requirement: Inversify DI wiring with ContainerModule per package

Each package SHALL export a `ContainerModule` that binds its services. The API composition root SHALL load all modules into a single `Container`.

- `green-beard-domain` exports `domainModule` binding use cases
- `green-beard-data` exports `dataModule` binding repository implementations
- `green-beard-api` defines `createContainer()` loading domainModule + dataModule + binding DrizzleDb

#### Scenario: Container resolves use cases
- **WHEN** `createContainer()` is called with a valid DATABASE_URL
- **THEN** all use case tokens resolve to their implementations

#### Scenario: Container resolves repositories
- **WHEN** `createContainer()` is called
- **THEN** all repository tokens resolve to Drizzle-backed implementations

### Requirement: neverthrow typed errors throughout

All repository methods SHALL return `ResultAsync<T, PersistenceError>`. All use cases SHALL return `ResultAsync<T, DomainError>`. No try/catch in domain or use case layer.

Error hierarchy:
- `DomainError` (abstract): `code` property
- `ValidationError`: input validation failures
- `NotFoundError`: entity not found (takes entity name + id)
- `DuplicateError`: unique constraint violations
- `PersistenceError`: wraps unknown DB errors

#### Scenario: Use case returns typed error on not found
- **WHEN** a use case looks up a non-existent entity
- **THEN** it returns `Err<NotFoundError>` with entity name and id

#### Scenario: Repository wraps DB errors
- **WHEN** a database operation fails
- **THEN** the repository returns `Err<PersistenceError>` wrapping the original error

### Requirement: Hono REST API with route factories

The API SHALL use Hono with route factory functions that receive the Inversify `Container`. Each route resolves use cases from the container and maps `Result` to HTTP responses.

Error mapping: `NotFoundError` → 404, `ValidationError` → 422, `DuplicateError` → 409, `PersistenceError` → 500.

#### Scenario: Successful API call
- **WHEN** a valid request is made to a CRUD endpoint
- **THEN** the route resolves the use case, executes it, and returns the DTO with appropriate status code

#### Scenario: Error API call
- **WHEN** a request results in a domain error
- **THEN** the route returns `{ code, message, statusCode }` with the mapped HTTP status

### Requirement: SvelteKit BFF via server routes

The SvelteKit app SHALL call the Hono API from `+page.server.ts` load functions and form actions. The browser SHALL NOT call the Hono API directly.

An HTTP client utility SHALL be provided in the SvelteKit app for making typed requests to the API.

#### Scenario: Load function fetches data
- **WHEN** a page with a load function is requested
- **THEN** the SvelteKit server calls the Hono API and returns data to the page

#### Scenario: Form action mutates data
- **WHEN** a form is submitted
- **THEN** the SvelteKit form action calls the Hono API and redirects/returns result

### Requirement: Drizzle + PostgreSQL schema and migrations

The system SHALL use Drizzle ORM with PostgreSQL. Schema files SHALL be in `green-beard-data/src/schema/`. Migrations SHALL be generated via `drizzle-kit generate` and applied via `drizzle-kit migrate`.

#### Scenario: Migration creates tables
- **WHEN** `pnpm nx run @m0n0lab/green-beard-data:db:migrate` is executed against an empty database
- **THEN** all schema tables are created

### Requirement: Docker Compose for local PostgreSQL

A `docker-compose.yml` SHALL provide a PostgreSQL instance for local development. Database name: `green_beard`.

#### Scenario: Docker Compose starts PostgreSQL
- **WHEN** `docker compose up -d` is run
- **THEN** PostgreSQL is accessible at `localhost:5432` with the configured credentials
