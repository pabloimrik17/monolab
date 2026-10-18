# Spec Delta

## Purpose

Defines how the monorepo tests its projects: the kinds of test, what each project category must carry, how tests are named and run, how legacy tests are contained, and how coverage thresholds are set and enforced.

## ADDED Requirements

### Requirement: Unit tests cover business models and library internals

A unit test SHALL exercise a business model (entity, value object, domain error) or the internals of a library, published or platform, in isolation, with nothing it owns mocked. Any other code SHALL be covered by integration or integration-platform tests.

#### Scenario: Business model

- **WHEN** a business package defines an entity or value object
- **THEN** its rules are tested by `*.test.ts` files next to it

#### Scenario: Mapper, DTO schema or repository

- **WHEN** a business package defines a mapper, a DTO schema, a repository or a use case
- **THEN** no new `*.test.ts` targets it, and the use-case integration tests reach it

### Requirement: Integration tests fake only beyond the system boundary

An integration test SHALL enter through a use case or a library's public API and run every piece of the system's own code for real. Only what lies beyond the system boundary SHALL be replaced: HTTP APIs by MSW, databases and caches by Testcontainers.

#### Scenario: Server use case

- **WHEN** an integration test runs a server use case that reads Postgres and calls Finnhub
- **THEN** Postgres runs in a Testcontainers container, Finnhub is answered by MSW, and the use case, repositories, mappers and platform code run unmocked

#### Scenario: Client use case

- **WHEN** an integration test runs a client use case
- **THEN** the real client repositories and HTTP client run, and only the app's own API is answered by MSW

#### Scenario: Library

- **WHEN** an integration test exercises a library
- **THEN** it imports the library's public entry, not internal files, and fakes only the I/O the library performs

### Requirement: Integration-platform tests fake only the use cases

An integration-platform test SHALL drive an app on its real platform, its UI rendered in a browser or a request to its API, and SHALL replace the use cases the app calls with fakes. Integration tests already cover the use cases, so they are not exercised again. The only other port an integration-platform test may fake is one whose real implementation leaves the app, such as external navigation.

#### Scenario: API route

- **WHEN** an integration-platform test sends a request to an API route
- **THEN** the route's middleware, validation, serialization and error mapping run for real against a faked use case

#### Scenario: UI page

- **WHEN** an integration-platform test renders a page in a browser
- **THEN** the page, its components and its router run for real and the use cases it calls are faked

### Requirement: E2E tests run against the deployed system

An e2e test SHALL drive the deployed system from its outermost edge, with real services and a database seeded for testing, and SHALL fake nothing. No e2e tests exist yet; this kind is reserved.

#### Scenario: Reserved kind

- **WHEN** a project adds its first e2e test
- **THEN** it runs against a deployed test environment with a seeded database, never against fakes

### Requirement: Type tests guard the public types of libraries

A published library that exports public types SHALL guard them with `*.test-d.ts` type tests. Another package MAY add type tests only for exported generic types that other packages build on. Apps and plugins SHALL NOT carry type tests.

#### Scenario: Library with public types

- **WHEN** `nx run @m0n0lab/ts-types:test:types` runs
- **THEN** its `*.test-d.ts` files are type-checked and fail on a type regression

#### Scenario: Shared generic type in a business package

- **WHEN** `investlab-core` exports the generic `RemotePortError<E>` that every module instantiates
- **THEN** a `*.test-d.ts` file may guard it

### Requirement: Each project category carries its required kinds

Each project SHALL belong to one category and carry the kinds of test that category requires: a business package carries unit tests for its models and integration tests per use case; a library, published or platform, carries unit tests for its internals and integration tests through its public API; an app carries integration-platform tests; a plugin with code carries unit tests.

#### Scenario: Business package

- **WHEN** `packages/investlab-portfolio` is inspected
- **THEN** its entities have unit tests and each use case has an integration test per side it exists on

#### Scenario: Platform package

- **WHEN** `packages/investlab-platform` is inspected
- **THEN** its HTTP client tests that use MSW are integration tests, and its config adapters are unit-tested

#### Scenario: App

- **WHEN** `apps/investlab-api` is inspected
- **THEN** its route tests are integration-platform tests

### Requirement: Apps carry no unit tests

An app SHALL NOT carry unit tests. The only exception is a piece so critical that its internal behaviour must be pinned down, and that exception SHALL be recorded in the policy ADR.

#### Scenario: App logic

- **WHEN** an app gains logic such as a form parser or a polling store
- **THEN** its behaviour is tested through the app's integration-platform tests, not through `*.test.ts`

### Requirement: Exempt projects carry no tests

A project with no executable logic of its own, only prompts or configuration, SHALL carry no tests and SHALL report no coverage. Today these are `ts-configs`, `vitest-config` and the commander, expo-developer and prompt-presets plugins.

#### Scenario: Exempt project

- **WHEN** `packages/ts-configs` is inspected
- **THEN** it has no test files, no test scripts and no Codecov flag

### Requirement: Every published library has a consumer in the repo

Every library published to a registry SHALL be used by at least one app or package in this monorepo. That dogfooding is what proves its packaged build, so no test imports a library's built output.

#### Scenario: New published library

- **WHEN** a library is first published
- **THEN** at least one other project in the monorepo depends on it

#### Scenario: Known gaps

- **WHEN** a published library has no consumer in the repo, as react-clean and http-client have today
- **THEN** the gap is tracked as an open issue until a consumer exists

### Requirement: Each kind has one name everywhere

A kind's file suffix, Vitest project name and script name SHALL use the same token: `unit` for `*.test.{ts,tsx}`, `integration` for `*.integration.{ts,tsx}`, `integration-platform` for `*.integration-platform.{ts,tsx}`, `types` for `*.test-d.ts`. A project that splits a kind by side SHALL name its Vitest projects `<kind>:<side>`.

#### Scenario: Integration-platform file

- **WHEN** a file is named `portfolio-items.routes.integration-platform.ts`
- **THEN** the `integration-platform` Vitest project collects it and no other project does

#### Scenario: Side split

- **WHEN** `packages/investlab-portfolio` defines server and client integration tests
- **THEN** its Vitest projects are `integration:server` and `integration:client`, and `test:integration` runs both

### Requirement: The aggregate runs every kind and filters mirror it

A project's `test` script SHALL run every Vitest project it defines. Each `test:<kind>` script SHALL run only that kind, and each SHALL offer the same variants as the aggregate: `:watch`, `:coverage` and `:changed`. `test:types` has no `:coverage`, since type tests execute no code. A project SHALL define scripts only for the kinds it has.

#### Scenario: New Vitest project

- **WHEN** a project adds a Vitest project for a new kind
- **THEN** `test` and `test:coverage` run it with no other script change

#### Scenario: Kind filter variants

- **WHEN** a project has integration tests
- **THEN** it defines `test:integration`, `test:integration:watch`, `test:integration:coverage` and `test:integration:changed`

### Requirement: The browser is an environment, not a kind

Whether a test runs in Node or a browser SHALL be set by its Vitest project, never by its file name or script name.

#### Scenario: React library tests

- **WHEN** react-hooks' tests run
- **THEN** they run in headless Chromium because their Vitest config enables the browser, and no file is named `*.browser.test.*`
- **AND** no project defines a `test:browser` script

### Requirement: Coverage counts every source file

Each project's coverage SHALL include every source file, whether or not a test loads it, and SHALL exclude test files, type tests and generated files.

#### Scenario: Untested file

- **WHEN** a source file is loaded by no test
- **THEN** the coverage report lists it with 0% instead of omitting it

### Requirement: Coverage is one figure per project

A project's coverage SHALL be measured over all its non-e2e kinds together, and its aggregate `test:coverage` run SHALL produce one report covering them.

#### Scenario: Business package

- **WHEN** `nx run @m0n0lab/investlab-quotes:test:coverage` runs
- **THEN** its report includes the lines executed by its unit and integration tests

### Requirement: Coverage thresholds are enforced on the aggregate run

Each project's `vitest.config.ts` SHALL declare thresholds for lines, branches, functions and statements, and they SHALL be enforced only when every kind runs together. A coverage run of a single kind SHALL be informational and never fail on thresholds.

#### Scenario: Aggregate run below threshold

- **WHEN** `test:coverage` measures 74% lines on a project whose lines threshold is 75
- **THEN** the run fails

#### Scenario: Single-kind run

- **WHEN** `test:unit:coverage` measures less than the project's thresholds
- **THEN** the run passes and reports the figures

### Requirement: Thresholds follow a target and only rise

The threshold target SHALL be 80 for each coverage metric. A project below 80 on a metric SHALL set that metric's threshold to its measured value rounded down to a multiple of 5, with 0 for projects with no tests. A threshold SHALL NOT be lowered, and it SHALL be raised when the measured value passes the next multiple of 5.

#### Scenario: Project meeting the target

- **WHEN** a project measures 93% lines
- **THEN** its lines threshold is 80

#### Scenario: Project below the target

- **WHEN** a project measures 53% lines
- **THEN** its lines threshold is 50

### Requirement: CI runs the aggregate test target

CI SHALL run `test:coverage` for affected projects on pull requests and for every project on pushes, so a project or kind that defines tests is tested without a pipeline edit.

#### Scenario: Plugin with tests

- **WHEN** a pull request changes `claude-plugins/experiments`
- **THEN** CI runs its tests through `test:coverage`

### Requirement: Legacy tests are marked by name

A test written under the strategy that predates this policy, and not yet replaced, SHALL be named `*.legacy.test.{ts,tsx}`. It SHALL be listed in the policy ADR under an open tracker issue, and SHALL be deleted once a test of the right kind covers its behaviour.

#### Scenario: Mocked use-case test

- **WHEN** `qup-domain` tests a use case against mocked repositories
- **THEN** the file is named `*.legacy.test.ts` and appears in the ADR's legacy list

### Requirement: The legacy set only shrinks

CI SHALL fail when a commit adds a `*.legacy.test.*` file that is not in the committed legacy list, and the list SHALL only lose entries.

#### Scenario: New legacy file

- **WHEN** a pull request adds `foo.legacy.test.ts`
- **THEN** the legacy check fails and names the file

#### Scenario: Legacy file deleted

- **WHEN** a pull request deletes a legacy test and its list entry
- **THEN** the legacy check passes
