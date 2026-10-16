## ADDED Requirements

### Requirement: Wrapped client returns ResultAsync

The package SHALL export a function that wraps a Drizzle database instance and an error factory, returning a client whose supported operations return `ResultAsync<T, E>`, where `E` is produced by the factory from the thrown cause.

#### Scenario: Successful query
- **WHEN** a supported select runs through the wrapped client and Drizzle resolves rows
- **THEN** the result is `Ok` with those rows

#### Scenario: Failing query
- **WHEN** Drizzle rejects with a driver error
- **THEN** the result is `Err` with the value returned by the caller's error factory for that cause

### Requirement: On-demand surface

The package SHALL expose only operations that a consumer in the monorepo uses, each covered by a test against a real Postgres started by Testcontainers.

#### Scenario: Unsupported operation
- **WHEN** a consumer needs a Drizzle operation the wrapper lacks
- **THEN** the operation is added to the wrapper with its test, instead of calling Drizzle directly with `ResultAsync.fromPromise`

### Requirement: Published package

The package SHALL be published as `@m0n0lab/drizzle-neverthrow` to JSR and npm, ESM-only, with `drizzle-orm` and `neverthrow` as peer dependencies and exports validated by `attw --pack`.

#### Scenario: Peer dependencies not bundled
- **WHEN** the package is built
- **THEN** the output does not contain Drizzle or neverthrow code
