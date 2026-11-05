# Persistence Specification

## Purpose

PostgreSQL + Drizzle data layer for InvestLab following DDD patterns: pure `investlab-domain` package with entities and repository interfaces, and `investlab-data` package providing Drizzle-backed implementations with mappers and migrations.

## Requirements

### Requirement: Domain layer is pure

The `domain/` folder of every InvestLab module package SHALL contain only entities, value objects, read models, errors and repository/query ports. It SHALL NOT import any infrastructure library (Drizzle, pg, ioredis, etc.), the module's `data/` folder, the platform or the database package. Allowed imports: `neverthrow`, `@m0n0lab/investlab-core` and the module's own `domain/`.

#### Scenario: Domain package builds without infra deps

- **WHEN** the boundary lint check runs over `packages/investlab-portfolio/src/domain/`
- **THEN** it reports no import of drizzle, pg, ioredis, `data/`, the platform or the database package

### Requirement: Server data layer implements domain interfaces

The `data/server/` folder of each module package SHALL implement the repository and query ports of that module's `domain/` using Drizzle ORM and PostgreSQL, through the Postgres client provided by the platform.

#### Scenario: Repository implementation satisfies interface

- **WHEN** the Postgres instrument repository is instantiated
- **THEN** it implements the `InstrumentRepository` port of the portfolio module
- **AND** all methods return `ResultAsync<T, PersistenceError | E>`, `E` being the domain errors the port names

### Requirement: Mapper pattern

Each repository SHALL use mappers to convert between Drizzle row types and domain entities.

#### Scenario: toDomain maps database row to entity

- **WHEN** a database row is fetched
- **THEN** `toDomain(row)` reconstructs the domain entity without re-validation (DB data is already valid)

#### Scenario: toRow maps entity to database row

- **WHEN** an entity is persisted
- **THEN** `toRow(entity)` converts it to the Drizzle insert/update shape

### Requirement: All repo methods return ResultAsync

Every repository method SHALL return `ResultAsync<T, PersistenceError | E>` from neverthrow, `E` being the domain errors the port names. Database errors are wrapped in `PersistenceError`, except a constraint violation the port names: a foreign key violation on instrument delete becomes `InstrumentInUseError` and a unique symbol violation becomes `InstrumentAlreadyExistsError`.

#### Scenario: Successful query

- **WHEN** a repository query succeeds
- **THEN** `ResultAsync` contains the `Ok` value

#### Scenario: Database error

- **WHEN** a database operation fails
- **THEN** `ResultAsync` contains `Err(PersistenceError)` wrapping the original error
- **AND** no exception is thrown

#### Scenario: Foreign key violation on delete

- **WHEN** an instrument delete violates a foreign key because portfolio items reference it
- **THEN** `ResultAsync` contains `Err(InstrumentInUseError)`
- **AND** no exception is thrown

### Requirement: Docker Compose for local dev

A `docker-compose.yml` SHALL provide PostgreSQL and Redis services for local development.

#### Scenario: Start local infrastructure

- **WHEN** `docker compose up` runs in the app directory
- **THEN** PostgreSQL is available on a configured port
- **AND** Redis is available on a configured port

### Requirement: Drizzle migrations

Schema changes SHALL be managed via drizzle-kit migrations owned by `@m0n0lab/investlab-database`. Each module SHALL declare each of its tables in its own `data/server/infra/db/<concept>.table.ts`; the database package's drizzle config SHALL list the modules' table files by glob, without importing them. The API's `db:generate` and `db:migrate` scripts SHALL delegate to the database package.

#### Scenario: Generate migration

- **WHEN** a module's Drizzle schema is modified and `db:generate` runs
- **THEN** a new SQL migration file is created in `packages/investlab-database/drizzle`

#### Scenario: Apply migration

- **WHEN** the API's `db:migrate` runs
- **THEN** the database schema is updated to match the Drizzle schema of every module

#### Scenario: Moved migrations are not re-applied

- **WHEN** `db:migrate` runs against a database that applied the migrations before they moved to `packages/investlab-database`
- **THEN** only migrations added after the move are applied

#### Scenario: Tables split per file generate no migration

- **WHEN** `db:generate` runs right after the tables move from `schema.ts` to one `*.table.ts` file each
- **THEN** drizzle-kit reports no schema change and writes no migration

#### Scenario: New table picked up by the glob

- **WHEN** a module adds `data/server/infra/db/<concept>.table.ts`
- **THEN** `db:generate` includes it without editing the drizzle config

### Requirement: Database package

`@m0n0lab/investlab-database` SHALL hold the drizzle config, the `drizzle/` migrations folder (including the instrument seed migration) and an exported `migrate(databaseUrl)` helper that applies every migration with the drizzle-orm migrator. It SHALL import no other InvestLab package, so no Nx dependency runs from it to a module. Its consumers are the API scripts and the modules' integration test setups.

#### Scenario: Tests migrate through the package

- **WHEN** a module's server integration setup prepares its template database
- **THEN** it calls `migrate` from `@m0n0lab/investlab-database` and reads no file outside its own package and its dependencies

#### Scenario: New migration invalidates module tests

- **WHEN** a migration is added to `packages/investlab-database/drizzle`
- **THEN** the `test:integration` targets of the modules are affected through their devDependency on `@m0n0lab/investlab-database`

#### Scenario: No dependency cycle

- **WHEN** the Nx project graph is computed
- **THEN** `@m0n0lab/investlab-database` has no dependency on any module package
