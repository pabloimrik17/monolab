## MODIFIED Requirements

### Requirement: Layer folders inside a module package

A module package SHALL follow the package layout of `clean-architecture-layout`: `domain/` (models, value objects, read models, errors, repository and read query ports), `application/server/` and `application/client/` (use cases per side), `data/shared/` (DTOs), `data/server/` (Postgres repositories and read queries, datasources, infra), `data/client/` (API repositories and read queries, browser storage repositories), `di/` and `testing/`.

#### Scenario: Server and client use cases of one feature live in one package

- **WHEN** the portfolio item create use cases are located
- **THEN** the API one is in `packages/investlab-portfolio/src/application/server/use-case/` and the web one in `packages/investlab-portfolio/src/application/client/use-case/`

### Requirement: Layer rule enforced by lint

Inside a package, `domain/` and `application/` SHALL NOT import `data/`, the platform, `@m0n0lab/investlab-database` or infrastructure libraries; they MAY import `@m0n0lab/investlab-core`. Only `data/server/`, `data/client/` and `di/` MAY import the platform entry of their side; `data/shared/` SHALL NOT. Code under a `server/` folder SHALL NOT import a `client/` folder, nor the reverse. A lint check in CI SHALL fail on a violation.

#### Scenario: Use case imports a repository implementation

- **WHEN** a file in `application/server/use-case/` imports a file from `data/server/`
- **THEN** the boundary lint check fails

#### Scenario: Domain imports an infrastructure library

- **WHEN** a file in `domain/` imports `drizzle-orm`
- **THEN** the boundary lint check fails

### Requirement: Container module and entry imports

`di/server.module.ts` MAY import `domain/`, `application/server/`, `data/server/` and the platform `./server` entry; `di/client.module.ts` and `di/browser.module.ts` mirror it for the client side with the platform `./client` entry. The entry files MAY import: `index.ts` → `domain/` and `data/shared/`; `server.ts` → `domain/`, `application/server/` and `di/server.module.ts`; `client.ts` → `domain/`, `application/client/`, `di/client.module.ts` and `di/browser.module.ts`; `testing.ts` → `testing/shared/`. The boundary lint check SHALL fail on any other import from these files.

#### Scenario: Module file binds a repository to its port

- **WHEN** `di/server.module.ts` imports a repository port from `domain/repository/`
- **THEN** the boundary lint check passes

#### Scenario: Root entry reaches server code

- **WHEN** `index.ts` imports a file from `data/server/`
- **THEN** the boundary lint check fails

#### Scenario: Testing entry reaches scenario helpers

- **WHEN** `testing.ts` imports `testing/server/given.ts`
- **THEN** the boundary lint check fails

### Requirement: Test files may reach the composition

Use-case integration tests (`*.use-case.integration.ts`) and the files under `testing/server/` and `testing/client/` SHALL be exempt from the `application/` import rule: they MAY import the module's container modules in `di/`, the platform entry of their side, `@m0n0lab/investlab-database` (server side), `testing/shared/` and test libraries. Use-case files SHALL remain bound by it.

#### Scenario: Server setup builds the container

- **WHEN** `testing/server/vitest-integration-setup.ts` imports `di/server.module.ts`, the platform `./server` entry and `@m0n0lab/investlab-database`
- **THEN** the boundary lint check passes

#### Scenario: Use case reaches the container

- **WHEN** `application/server/use-case/instrument-create.use-case.ts` imports `di/server.module.ts`
- **THEN** the boundary lint check fails

### Requirement: Apps import only their side

`apps/investlab` SHALL import module packages only through `.` and `./client` and the platform only through `./client`, and any `./client` entry only from `.server.ts` files and from its browser container `src/di/container.client.ts`, which SHALL load only browser modules. `apps/investlab-api` SHALL import module packages only through `.` and `./server` and the platform only through `./server`. Both apps MAY import `@m0n0lab/investlab-core`; `apps/investlab` SHALL NOT import `@m0n0lab/investlab-database`. A lint check SHALL fail CI on any other import.

#### Scenario: Web imports a server entry

- **WHEN** a file in `apps/investlab` imports `@m0n0lab/investlab-portfolio/server`
- **THEN** the boundary lint check fails

#### Scenario: Browser bundle stays free of server code

- **WHEN** `apps/investlab` is built
- **THEN** the browser bundle contains no `pg`, `ioredis` or `drizzle-orm` code, no InvestLab API client and no API token

#### Scenario: Component imports a client entry

- **WHEN** a file in `apps/investlab/src/quotes/component/` imports `@m0n0lab/investlab-quotes/client`
- **THEN** the boundary lint check fails

### Requirement: Apps are composition roots

Each app SHALL build one container per runtime by binding only its `Config` adapter and loading the platform module and the business modules of its side. The web's browser container SHALL bind nothing and load only the platform and module browser modules. Routes, loaders, actions and hooks SHALL call use cases and SHALL NOT resolve repositories or read the environment.

#### Scenario: API container

- **WHEN** `apps/investlab-api` builds its container
- **THEN** it binds the process-environment `Config` adapter and loads the platform, portfolio and quotes server modules, and binds nothing else

#### Scenario: Web loader

- **WHEN** the `/portfolio` loader runs
- **THEN** it resolves the client portfolio item list use case and calls it, without touching a repository

#### Scenario: Browser container

- **WHEN** `apps/investlab` builds its browser container
- **THEN** it loads the platform and quotes browser modules, binds no `Config`, and resolves the followed ticker use cases
