# Persistence Specification

## Purpose

PostgreSQL + Drizzle data layer for InvestLab following DDD patterns: pure `investlab-domain` package with entities and repository interfaces, and `investlab-data` package providing Drizzle-backed implementations with mappers and migrations.

## Requirements

### Requirement: Domain package is pure

The `investlab-domain` package SHALL contain only domain entities, value objects, repository interfaces, and Inversify metadata. It SHALL NOT depend on any infrastructure library (Drizzle, pg, ioredis, etc.). Only allowed dependencies: `inversify` (metadata) and `neverthrow` (error types).

#### Scenario: Domain package builds without infra deps

- **WHEN** `pnpm nx run investlab-domain:build` runs
- **THEN** the build succeeds
- **AND** package.json contains no drizzle, pg, or ioredis dependencies

### Requirement: Data package implements domain interfaces

The `investlab-data` package SHALL implement repository interfaces defined in `investlab-domain` using Drizzle ORM and PostgreSQL.

#### Scenario: Repository implementation satisfies interface

- **WHEN** `InstrumentRepositoryImpl` is instantiated
- **THEN** it implements `InstrumentRepository` interface from domain
- **AND** all methods return `ResultAsync<T, PersistenceError>`

### Requirement: Mapper pattern

Each repository SHALL use mappers to convert between Drizzle row types and domain entities.

#### Scenario: toDomain maps database row to entity

- **WHEN** a database row is fetched
- **THEN** `toDomain(row)` reconstructs the domain entity without re-validation (DB data is already valid)

#### Scenario: toRow maps entity to database row

- **WHEN** an entity is persisted
- **THEN** `toRow(entity)` converts it to the Drizzle insert/update shape

### Requirement: All repo methods return ResultAsync

Every repository method SHALL return `ResultAsync<T, E>` from neverthrow. Database errors are wrapped in `PersistenceError`.

#### Scenario: Successful query

- **WHEN** a repository query succeeds
- **THEN** `ResultAsync` contains the `Ok` value

#### Scenario: Database error

- **WHEN** a database operation fails
- **THEN** `ResultAsync` contains `Err(PersistenceError)` wrapping the original error
- **AND** no exception is thrown

### Requirement: Docker Compose for local dev

A `docker-compose.yml` SHALL provide PostgreSQL and Redis services for local development.

#### Scenario: Start local infrastructure

- **WHEN** `docker compose up` runs in the app directory
- **THEN** PostgreSQL is available on a configured port
- **AND** Redis is available on a configured port

### Requirement: Drizzle migrations

Schema changes SHALL be managed via drizzle-kit migrations.

#### Scenario: Generate migration

- **WHEN** the Drizzle schema is modified
- **THEN** `drizzle-kit generate` creates a new SQL migration file

#### Scenario: Apply migration

- **WHEN** `drizzle-kit migrate` runs
- **THEN** the database schema is updated to match the Drizzle schema definition
