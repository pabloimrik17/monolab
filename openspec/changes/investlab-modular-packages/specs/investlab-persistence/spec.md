## RENAMED Requirements

- FROM: `### Requirement: Domain package is pure`
- TO: `### Requirement: Domain layer is pure`

- FROM: `### Requirement: Data package implements domain interfaces`
- TO: `### Requirement: Server data layer implements domain interfaces`

## MODIFIED Requirements

### Requirement: Domain layer is pure

The `domain/` folder of every InvestLab module package SHALL contain only entities, value objects, read models, errors and repository/query ports. It SHALL NOT import any infrastructure library (Drizzle, pg, ioredis, etc.), the module's `data/` folder or the platform's `./server` and `./client` entries. Allowed imports: `neverthrow`, the platform's kernel entry and the module's own `domain/`.

#### Scenario: Domain package builds without infra deps

- **WHEN** the boundary lint check runs over `packages/investlab-portfolio/src/domain/`
- **THEN** it reports no import of drizzle, pg, ioredis, `data/` or a platform side entry

### Requirement: Server data layer implements domain interfaces

The `data/server/` folder of each module package SHALL implement the repository and query ports of that module's `domain/` using Drizzle ORM and PostgreSQL, through the Postgres client provided by the platform.

#### Scenario: Repository implementation satisfies interface

- **WHEN** the Postgres instrument repository is instantiated
- **THEN** it implements the `InstrumentRepository` port of the portfolio module
- **AND** all methods return `ResultAsync<T, PersistenceError>`

### Requirement: Drizzle migrations

Schema changes SHALL be managed via drizzle-kit migrations owned by `apps/investlab-api`. Each module SHALL declare its tables in its `data/server/schema.ts`, and the API's drizzle config SHALL list every module's schema file.

#### Scenario: Generate migration

- **WHEN** a module's Drizzle schema is modified and the API's `db:generate` runs
- **THEN** a new SQL migration file is created in `apps/investlab-api/drizzle`

#### Scenario: Apply migration

- **WHEN** the API's `db:migrate` runs
- **THEN** the database schema is updated to match the Drizzle schema of every module

#### Scenario: Moved migrations are not re-applied

- **WHEN** `db:migrate` runs against a database that applied the migrations before they moved to `apps/investlab-api`
- **THEN** only migrations added after the move are applied
