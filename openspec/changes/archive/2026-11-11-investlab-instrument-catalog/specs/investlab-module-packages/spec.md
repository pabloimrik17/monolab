## MODIFIED Requirements

### Requirement: One package per business module

InvestLab business code SHALL live in one package per module: `@m0n0lab/investlab-catalog` (the instrument catalog), `@m0n0lab/investlab-portfolio` (portfolio items) and `@m0n0lab/investlab-quotes` (market data). A module package SHALL import another only along an edge declared in the lint configuration and only through the other's public entries, and the declared edges SHALL have no cycle. The declared edges SHALL be exactly: portfolio → catalog. A lint check SHALL fail CI on an undeclared import.

#### Scenario: Modules are independent

- **WHEN** the imports of `@m0n0lab/investlab-quotes` are listed
- **THEN** none points to `@m0n0lab/investlab-portfolio` or `@m0n0lab/investlab-catalog`, and neither of those imports quotes

#### Scenario: Undeclared import between modules

- **WHEN** a file in `@m0n0lab/investlab-quotes` imports `@m0n0lab/investlab-portfolio`
- **THEN** the boundary lint check fails

#### Scenario: Declared edge

- **WHEN** a file in `packages/investlab-portfolio/src/data/server/` imports the instruments table from `@m0n0lab/investlab-catalog/server`
- **THEN** the boundary lint check passes

#### Scenario: Edge in the wrong direction

- **WHEN** a file in `@m0n0lab/investlab-catalog` imports `@m0n0lab/investlab-portfolio`
- **THEN** the boundary lint check fails

#### Scenario: Cycle in the declared edges

- **WHEN** the declared edges are changed to contain a cycle
- **THEN** the lint configuration fails to load and every lint run fails

#### Scenario: Projects selected by name pattern

- **WHEN** `nx show projects -p '@m0n0lab/investlab*'` runs
- **THEN** it lists exactly `@m0n0lab/investlab`, `@m0n0lab/investlab-api`, `@m0n0lab/investlab-core`, `@m0n0lab/investlab-platform`, `@m0n0lab/investlab-database`, `@m0n0lab/investlab-catalog`, `@m0n0lab/investlab-portfolio` and `@m0n0lab/investlab-quotes`

### Requirement: Shared kernel package

`@m0n0lab/investlab-core` SHALL hold, in a single root entry, the base errors (`DomainError`, `ValidationError`, `PersistenceError`, `NetworkError`, `UnauthorizedError`), their `KernelError` union, the generic `RemotePortError<E extends DomainError = never>` (`KernelError | E`) and the API error envelope schema. Core SHALL NOT know module errors. It SHALL import no other InvestLab package and no infrastructure library. Every layer of a module package and the platform MAY import it.

#### Scenario: Module names its remote error union

- **WHEN** the catalog and portfolio modules declare the errors their client ports return
- **THEN** the catalog defines `CatalogRemoteError = RemotePortError<InstrumentNotFoundError | InstrumentInUseError | InstrumentAlreadyExistsError>`, portfolio defines `PortfolioRemoteError = RemotePortError<InstrumentNotFoundError | PortfolioItemNotFoundError | PortfolioItemConflictError>`, and core imports none of these errors

#### Scenario: Core depends on nothing of ours

- **WHEN** the imports of `@m0n0lab/investlab-core` are listed
- **THEN** none points to another `@m0n0lab/investlab-*` package, nor to `pg`, `drizzle-orm`, `ioredis`, `msw` or `varlock`

#### Scenario: Domain error extends the kernel

- **WHEN** the catalog module declares `InstrumentInUseError`
- **THEN** it extends `DomainError` imported from `@m0n0lab/investlab-core`

### Requirement: Entries per side

A module package SHALL export `.` (domain and DTOs), `./server` (server container module, tokens, use-case and error types), `./client` (the container module of a consumer that holds the API credential, its tokens, use-case and error types), `./testing` (builders) and, when it has code for a device runtime, one entry per such runtime, such as `./browser` (browser container module, its tokens and use-case types). A module that other modules depend on MAY also export from `./server` the table definitions they reference for foreign keys and read-query joins, with the mappers that rebuild its domain models from those joined rows, and from `./client` the mappers that rebuild its domain models from its DTOs. A repository interface belongs to the domain that `.` exports. Repository and datasource implementations and their tokens SHALL NOT be exported.

#### Scenario: Repository is not reachable from outside

- **WHEN** code outside `@m0n0lab/investlab-portfolio` tries to import the Postgres portfolio item repository or its token
- **THEN** no entry exports it and the import fails to resolve

#### Scenario: Table exported for dependants

- **WHEN** the `./server` and `./client` entries of `@m0n0lab/investlab-catalog` are read
- **THEN** `./server` exports the instruments table definition and the mapper from its row to `Instrument`, `./client` exports the mapper from `InstrumentDto` to `Instrument`, and neither exports an instrument repository implementation or its token

#### Scenario: Browser entry holds no credentialed code

- **WHEN** `@m0n0lab/investlab-quotes` is built
- **THEN** `dist/browser.js` and the chunks it imports contain no API repository and no InvestLab API client

#### Scenario: Module without browser code

- **WHEN** the entries of `@m0n0lab/investlab-portfolio` are listed
- **THEN** they are `.`, `./server`, `./client` and `./testing`

### Requirement: Apps import only their side

`apps/investlab` SHALL import module packages and the platform only through `.`, `./client` and `./browser`. It SHALL import any `./client` entry only from its route files in `src/routes/` and its server container `src/di/container.server.ts`, and any `./browser` entry only from its browser container `src/di/container.client.ts`. A type-only import SHALL follow the same rule: types the view needs come from the package's `.` entry or are re-exported by `src/di/`. `apps/investlab-api` SHALL import module packages and the platform only through `.` and `./server`. In both apps, a test file MAY import the entries its subject may, and only test files and harnesses MAY import `./testing`. Both apps MAY import `@m0n0lab/investlab-core`; `apps/investlab` SHALL NOT import `@m0n0lab/investlab-database`. A lint check SHALL fail CI on any other import.

#### Scenario: Web imports a server entry

- **WHEN** a file in `apps/investlab` imports `@m0n0lab/investlab-portfolio/server`
- **THEN** the boundary lint check fails

#### Scenario: Browser bundle stays free of server code

- **WHEN** `apps/investlab` is built
- **THEN** the browser bundle contains no `pg`, `ioredis` or `drizzle-orm` code, no InvestLab API client and no API token

#### Scenario: Component imports a client entry

- **WHEN** a file in `apps/investlab/src/quotes/component/` imports `@m0n0lab/investlab-quotes/client`
- **THEN** the boundary lint check fails

#### Scenario: Component imports a client type

- **WHEN** a file in `apps/investlab/src/quotes/component/` has `import type` from `@m0n0lab/investlab-quotes/client`
- **THEN** the boundary lint check fails

#### Scenario: Route file imports a client entry

- **WHEN** `apps/investlab/src/routes/portfolio.tsx` imports `@m0n0lab/investlab-portfolio/client`
- **THEN** the boundary lint check passes

#### Scenario: Browser container imports a client entry

- **WHEN** `apps/investlab/src/di/container.client.ts` imports `@m0n0lab/investlab-quotes/client`
- **THEN** the boundary lint check fails

#### Scenario: Server container test imports a client entry

- **WHEN** `apps/investlab/src/di/container.server.legacy.test.ts` imports `@m0n0lab/investlab-portfolio/client`
- **THEN** the boundary lint check passes

#### Scenario: API test imports builders

- **WHEN** `apps/investlab-api/src/catalog/route/instrument.route.integration-platform.ts` imports `@m0n0lab/investlab-catalog/testing`
- **THEN** the boundary lint check passes

#### Scenario: Production code imports builders

- **WHEN** a file in `apps/investlab-api/src/core/mapper/` imports `@m0n0lab/investlab-catalog/testing`
- **THEN** the boundary lint check fails

### Requirement: Apps are composition roots

Each app SHALL build one container per runtime by binding only its `Config` adapter and loading the platform module and the business modules of its side. The web's browser container SHALL bind nothing and load only the browser modules of the platform and the modules, from their `./browser` entries. Routes, loaders, actions and hooks SHALL call use cases and SHALL NOT resolve repositories or read the environment.

#### Scenario: API container

- **WHEN** `apps/investlab-api` builds its container
- **THEN** it binds the process-environment `Config` adapter and loads the platform, catalog, portfolio and quotes server modules, and binds nothing else

#### Scenario: Web server container

- **WHEN** `apps/investlab` builds its server container
- **THEN** it loads the platform, catalog, portfolio and quotes client modules

#### Scenario: Web loader

- **WHEN** the `/portfolio` loader runs
- **THEN** it resolves the client portfolio item list use case and calls it, without touching a repository

#### Scenario: Browser container

- **WHEN** `apps/investlab` builds its browser container
- **THEN** it loads the platform and quotes browser modules, binds no `Config`, and resolves the followed ticker use cases
