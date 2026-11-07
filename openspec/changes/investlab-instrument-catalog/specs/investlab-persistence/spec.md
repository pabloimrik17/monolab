## MODIFIED Requirements

### Requirement: Server data layer implements domain interfaces

The `data/server/` folder of each module package SHALL implement the repository and query ports of that module's `domain/` using Drizzle ORM and PostgreSQL, through the Postgres client provided by the platform.

#### Scenario: Repository implementation satisfies interface

- **WHEN** the Postgres instrument repository is instantiated
- **THEN** it implements the `InstrumentRepository` port of the catalog module
- **AND** all methods return `ResultAsync<T, PersistenceError | E>`, `E` being the domain errors the port names

### Requirement: All repo methods return ResultAsync

Every repository method SHALL return `ResultAsync<T, PersistenceError | E>` from neverthrow, `E` being the domain errors the port names. Database errors are wrapped in `PersistenceError`, except a constraint violation the port names: a foreign key violation on instrument delete becomes `InstrumentInUseError`, whichever table references the instrument; a foreign key violation on a portfolio item insert becomes `InstrumentNotFoundError`; and a unique symbol violation becomes `InstrumentAlreadyExistsError`.

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

#### Scenario: Foreign key violation on item save

- **WHEN** a portfolio item is saved with an `instrumentId` no instrument has
- **THEN** `ResultAsync` contains `Err(InstrumentNotFoundError)` for that id
- **AND** no exception is thrown
