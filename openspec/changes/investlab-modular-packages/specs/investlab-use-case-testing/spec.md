## Purpose

Defines where InvestLab use-case tests live, how each side's test setup builds the real composition, what the tests may fake, and how they seed, observe and assert, so the tests read as business scenarios and survive refactors of the data layer.

## ADDED Requirements

### Requirement: Integration tests colocated per side

Use-case integration tests SHALL live next to their use case as `*.integration.ts` in `application/server/` or `application/client/` of the module package. Each side SHALL have one `vitest-integration-setup.ts` and one `given.ts` in that folder, and the setup file SHALL be listed in `setupFiles` of that side's vitest integration project. No `src/testing/` harness SHALL exist.

#### Scenario: Running a module's integration tests

- **WHEN** `nx run @m0n0lab/investlab-portfolio:test:integration` runs
- **THEN** the server and client integration tests of the portfolio module run, each side with its own setup file

### Requirement: Setup files are named by test type

Vitest setup files SHALL be named `vitest-<testtype>-setup.ts` (for example `vitest-integration-setup.ts`).

#### Scenario: Setup file name

- **WHEN** the setup files of the module packages are listed
- **THEN** every one matches `vitest-<testtype>-setup.ts`

### Requirement: Server setup isolates each test

The server setup SHALL start Postgres and Redis containers once per run and migrate a template database once with the `migrate` helper of `@m0n0lab/investlab-database`, seed included. Each test SHALL get its own clone of the template and a flushed Redis logical database, dropped after the test, so tests share no state and files run in parallel.

#### Scenario: Parallel files do not see each other's data

- **WHEN** two server integration files create portfolio items at the same time
- **THEN** each file's list use case returns only the items that file created

#### Scenario: Tests in one file do not see each other's data

- **WHEN** one test creates a portfolio item and a later test in the same file lists portfolio items
- **THEN** the later test sees none of the first test's items

#### Scenario: Seeded catalog available

- **WHEN** a server integration file lists instruments before creating any
- **THEN** the seeded catalog is returned

### Requirement: Setup builds the real composition

Each side's setup SHALL build the container (on the server side per test: built in `beforeEach`, released with `await container.unbindAllAsync()` in `afterEach`) from the platform module and the module under test, binding only a constant `Config` that points to the test infrastructure. Tests SHALL resolve the use case with `container.get(<token>)` in `beforeEach` into a `let` variable, with no helper function wrapping the resolution.

#### Scenario: Test resolves the use case per test

- **WHEN** a test file for the portfolio item create use case runs
- **THEN** it declares `let` for the use case and assigns `container.get(PORTFOLIO.ItemCreate)` in `beforeEach`

### Requirement: Only what leaves the system is faked

Tests SHALL run the real use cases, repositories and platform code. Only external systems SHALL be faked: Postgres and Redis with Testcontainers, Finnhub and the InvestLab API with MSW using `onUnhandledRequest: "error"`. Faked responses SHALL carry values that make the use case output predictable.

#### Scenario: Unexpected outbound request

- **WHEN** a use case under test calls an endpoint no scenario declared
- **THEN** the test fails

### Requirement: Tests assert only outputs

Tests SHALL assert only use-case results and domain errors. They SHALL NOT assert on outgoing requests, routes, headers or bodies, and SHALL NOT record requests.

#### Scenario: Client delete test

- **WHEN** the client portfolio item delete test checks a successful deletion
- **THEN** it asserts only that the result is a success, with no assertion on the HTTP request

### Requirement: State seeded and observed through public use cases

Server tests SHALL create state through public use cases (portfolio items via create, instruments from the seed migration or via create) and observe it through public use cases (list). Client tests SHALL declare the faked API's answers through `given.ts` helpers. Tests SHALL NOT resolve repositories or run SQL directly.

#### Scenario: Server update test

- **WHEN** the server portfolio item update test needs an existing item
- **THEN** it creates one through the create use case and verifies the change through the list use case

### Requirement: Scenarios in business language

Each side's `given.ts` SHALL expose scenario helpers named in business terms (for example `givenPortfolioWith`, `givenQuotesFor`, `givenApiUnavailable`) that hide MSW handlers and SQL. `describe`, `it` and helper names SHALL NOT mention DTOs, routes, HTTP status codes or data-layer classes. Each test SHALL follow given, when, then.

#### Scenario: Unavailable API

- **WHEN** a client test calls `givenApiUnavailable()` and then runs a use case
- **THEN** the use case fails with `NetworkError` and the test title says nothing about HTTP

### Requirement: Unit tests only for pure logic

Unit tests SHALL exist only for pure logic: entities, mappers, contract and form schemas and other side-effect-free functions. Tests that mock drivers or stub `fetch` SHALL NOT exist, and type tests (`*.test-d.ts`) SHALL NOT exist. A vitest `unit` project SHALL exist only in packages that have unit tests.

#### Scenario: No type tests

- **WHEN** InvestLab packages are searched for `*.test-d.ts`
- **THEN** none is found
