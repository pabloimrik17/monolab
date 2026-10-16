## Purpose

Defines how InvestLab code is packaged: one package per business module with its layers as folders and one entry per side, a shared kernel package, a layer rule checked in CI, static container modules with typed tokens, and apps reduced to composition roots.

## ADDED Requirements

### Requirement: One package per business module

InvestLab business code SHALL live in one package per module: `@m0n0lab/investlab-portfolio` (portfolio items and the instrument catalog) and `@m0n0lab/investlab-quotes` (market data). A business module SHALL NOT import another business module.

#### Scenario: Modules are independent

- **WHEN** the imports of `@m0n0lab/investlab-quotes` are listed
- **THEN** none points to `@m0n0lab/investlab-portfolio`, and the reverse also holds

#### Scenario: Projects selected by name pattern

- **WHEN** `nx show projects -p '@m0n0lab/investlab*'` runs
- **THEN** it lists exactly `@m0n0lab/investlab`, `@m0n0lab/investlab-api`, `@m0n0lab/investlab-core`, `@m0n0lab/investlab-platform`, `@m0n0lab/investlab-database`, `@m0n0lab/investlab-portfolio` and `@m0n0lab/investlab-quotes`

### Requirement: Shared kernel package

`@m0n0lab/investlab-core` SHALL hold, in a single root entry, the base errors (`DomainError`, `ValidationError`, `PersistenceError`, `NetworkError`, `UnauthorizedError`), their `KernelError` union, the generic `RemotePortError<E extends DomainError = never>` (`KernelError | E`) and the API error envelope schema. Core SHALL NOT know module errors. It SHALL import no other InvestLab package and no infrastructure library. Every layer of a module package and the platform MAY import it.

#### Scenario: Module names its remote error union

- **WHEN** the portfolio module declares the errors its client ports return
- **THEN** it defines `PortfolioRemoteError = RemotePortError<InstrumentNotFoundError | PortfolioItemNotFoundError | PortfolioItemConflictError | InstrumentInUseError | InstrumentAlreadyExistsError>` and core imports none of these errors

#### Scenario: Core depends on nothing of ours

- **WHEN** the imports of `@m0n0lab/investlab-core` are listed
- **THEN** none points to another `@m0n0lab/investlab-*` package, nor to `pg`, `drizzle-orm`, `ioredis`, `msw` or `varlock`

#### Scenario: Domain error extends the kernel

- **WHEN** the portfolio module declares `InstrumentInUseError`
- **THEN** it extends `DomainError` imported from `@m0n0lab/investlab-core`

### Requirement: Layer folders inside a module package

A module package SHALL hold `domain/` (entities, errors, ports), `application/server/` and `application/client/` (use cases per side), `data/contracts/` (wire DTOs), `data/server/` (persistence, datasources, table schema), `data/client/` (HTTP repositories), and `module.server.ts` and `module.client.ts`.

#### Scenario: Server and client use cases of one feature live in one package

- **WHEN** the portfolio item create use cases are located
- **THEN** the API one is in `packages/investlab-portfolio/src/application/server/` and the web one in `packages/investlab-portfolio/src/application/client/`

### Requirement: Entries per side

A module package SHALL export exactly three entries: `.` (domain and contracts), `./server` (server container module, tokens, use-case and error types) and `./client` (client container module, tokens, use-case and error types). Repositories, datasources and their tokens SHALL NOT be exported.

#### Scenario: Repository is not reachable from outside

- **WHEN** code outside `@m0n0lab/investlab-portfolio` tries to import the Postgres portfolio item repository or its token
- **THEN** no entry exports it and the import fails to resolve

### Requirement: Apps import only their side

`apps/investlab` SHALL import module packages only through `.` and `./client` and the platform only through `./client`, and any `./client` entry only from `.server.ts` files. `apps/investlab-api` SHALL import module packages only through `.` and `./server` and the platform only through `./server`. Both apps MAY import `@m0n0lab/investlab-core`; `apps/investlab` SHALL NOT import `@m0n0lab/investlab-database`. A lint check SHALL fail CI on any other import.

#### Scenario: Web imports a server entry

- **WHEN** a file in `apps/investlab` imports `@m0n0lab/investlab-portfolio/server`
- **THEN** the boundary lint check fails

#### Scenario: Browser bundle stays free of server code

- **WHEN** `apps/investlab` is built
- **THEN** the browser bundle contains no `pg`, `ioredis` or `drizzle-orm` code and no API token

### Requirement: Layer rule enforced by lint

Inside a package, `domain/` and `application/` SHALL NOT import `data/`, the platform, `@m0n0lab/investlab-database` or infrastructure libraries; they MAY import `@m0n0lab/investlab-core`. Only `data/server/`, `data/client/` and `module.*.ts` MAY import the platform entry of their side; `data/contracts/` SHALL NOT. Code under a `server/` folder SHALL NOT import a `client/` folder, nor the reverse. A lint check in CI SHALL fail on a violation.

#### Scenario: Use case imports a repository implementation

- **WHEN** a file in `application/server/` imports a file from `data/server/`
- **THEN** the boundary lint check fails

#### Scenario: Domain imports an infrastructure library

- **WHEN** a file in `domain/` imports `drizzle-orm`
- **THEN** the boundary lint check fails

### Requirement: Container module and entry imports

`module.server.ts` MAY import `domain/`, `application/server/`, `data/server/` and the platform `./server` entry; `module.client.ts` mirrors it for the client side. The entry files MAY import: `index.ts` → `domain/` and `data/contracts/`; `server.ts` → `domain/`, `application/server/` and `module.server.ts`; `client.ts` → `domain/`, `application/client/` and `module.client.ts`. The boundary lint check SHALL fail on any other import from these files.

#### Scenario: Module file binds domain tokens

- **WHEN** `module.server.ts` imports a repository port token from `domain/`
- **THEN** the boundary lint check passes

#### Scenario: Root entry reaches server code

- **WHEN** `index.ts` imports a file from `data/server/`
- **THEN** the boundary lint check fails

### Requirement: Test files may reach the composition

Test files under `application/` (`*.integration.ts`, `vitest-*-setup.ts`, `given.ts`) SHALL be exempt from the `application/` import rule: they MAY import the module's container modules, the platform entry of their side, `@m0n0lab/investlab-database` (server side) and test libraries. Use-case files SHALL remain bound by it.

#### Scenario: Server setup builds the container

- **WHEN** `application/server/vitest-integration-setup.ts` imports `module.server.ts`, the platform `./server` entry and `@m0n0lab/investlab-database`
- **THEN** the boundary lint check passes

### Requirement: Static container modules with typed tokens

Each module SHALL provide static container modules for each side, binding its use cases explicitly without autobinding and taking no parameters. Use-case tokens SHALL be grouped per module and side (for example `PORTFOLIO.ItemCreate`) and typed with the use case they resolve, so resolving one needs no cast.

#### Scenario: Typed resolution

- **WHEN** an app resolves `PORTFOLIO.ItemCreate` from a container that loaded the portfolio server module
- **THEN** the result is typed as the server portfolio item create use case without a type argument or cast

### Requirement: Apps are composition roots

Each app SHALL build its container by binding only its `Config` adapter and loading the platform module and the business modules of its side. Routes, loaders and actions SHALL call use cases and SHALL NOT resolve repositories or read the environment.

#### Scenario: API container

- **WHEN** `apps/investlab-api` builds its container
- **THEN** it binds the process-environment `Config` adapter and loads the platform, portfolio and quotes server modules, and binds nothing else

#### Scenario: Web loader

- **WHEN** the `/portfolio` loader runs
- **THEN** it resolves the client portfolio item list use case and calls it, without touching a repository

### Requirement: Layer packages removed

The packages `investlab-domain`, `investlab-data-contracts`, `investlab-data-server`, `investlab-data-client`, `investlab-application-server` and `investlab-application-client` SHALL NOT exist.

#### Scenario: Old packages are gone

- **WHEN** workspace projects are listed
- **THEN** none of the six layer packages appears
