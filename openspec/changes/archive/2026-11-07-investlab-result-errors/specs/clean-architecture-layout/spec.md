## ADDED Requirements

### Requirement: Failures are values in InvestLab code

InvestLab code outside tests SHALL return every failure it expects as a neverthrow `Result` or `ResultAsync`, wrapping each library call that throws or rejects where it is made, and SHALL NOT use `try`/`catch` for control flow. A `throw` SHALL be allowed only for an invariant that should never break and where the framework requires it: the Finnhub client's missing API key guard, environment reads failing fast at boot, the React Router server entry and loaders throwing a `Response`.

#### Scenario: Expected failure returned

- **WHEN** Finnhub has no data for a symbol
- **THEN** the Finnhub datasource returns an error value for it instead of throwing

#### Scenario: Library call that throws

- **WHEN** the quote cache datasource parses a cached entry
- **THEN** it calls `JSON.parse` through `Result.fromThrowable`, and text that is not JSON reads as a cache miss with no `try`/`catch`

#### Scenario: Allowed throws only

- **WHEN** the InvestLab packages and apps, tests excluded, are searched for `throw` statements
- **THEN** each one is the Finnhub client's API key guard, an environment read failing at boot, or a loader throwing a `Response`

### Requirement: External and persisted shapes validated by their adapter

The shape of data InvestLab reads from an external system or from storage it writes, such as Finnhub responses, Redis cache entries and browser storage values, SHALL be declared by a schema private to the adapter that reads it. Every read SHALL check the data against that schema instead of casting it, and data that fails it SHALL become an error value or a miss of that adapter.

#### Scenario: External response

- **WHEN** the Finnhub client reads a quote body
- **THEN** it checks the body against a schema declared in `packages/investlab-quotes/src/data/server/infra/http/finnhub.client.ts` and not exported

#### Scenario: Persisted value

- **WHEN** the ticker storage repository reads the followed tickers
- **THEN** it passes its own unexported schema to the key-value storage, and stored data of another shape reads as no followed tickers
