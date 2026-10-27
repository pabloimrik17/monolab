## Purpose

Defines where code lives and how files are named in the monorepo's Clean Architecture projects (InvestLab, qup, green-beard), so every package and app reads the same way and a lint check keeps the layout. Terms follow the Clean Architecture section of `docs/GLOSSARY.md`.

## ADDED Requirements

### Requirement: Projects in scope

The layout SHALL apply to the module, core and platform packages and to the apps of every product that applies Clean Architecture: InvestLab, qup and green-beard. Published libraries, database packages and projects of other products SHALL be exempt.

#### Scenario: Published library is exempt

- **WHEN** the layer lint runs over `packages/react-clean`
- **THEN** it applies no layout rule to it

#### Scenario: Database package is exempt

- **WHEN** the layer lint runs over `packages/investlab-database`
- **THEN** it applies no layout rule to it

### Requirement: Source code under src

Each project in scope SHALL keep all its source code under `src/`; only tool configuration files SHALL sit at the project root.

#### Scenario: Web app code

- **WHEN** the files of `apps/investlab` are listed
- **THEN** its application code is under `apps/investlab/src/` and no `app/` folder exists

### Requirement: Package layers

The `src/` folder of a module package SHALL hold only the layer folders `domain/`, `application/` and `data/`, the `di/` and `testing/` folders and the entry files. A package SHALL NOT hold presentation code.

#### Scenario: Presentation folder in a package

- **WHEN** a file is added at `packages/investlab-quotes/src/presentation/quote.page.tsx`
- **THEN** the layer lint fails

### Requirement: Sides per layer

`domain/` SHALL have no side folder. `application/` SHALL split into `server/` and `client/` only. `data/` SHALL split into `shared/`, `server/` and `client/`. The side of a piece SHALL follow the runtime it needs and the secrets it holds, not who uses it today.

#### Scenario: Domain with a side

- **WHEN** a file is added under `domain/server/`
- **THEN** the layer lint fails

#### Scenario: Shared application code

- **WHEN** a file is added under `application/shared/`
- **THEN** the layer lint fails

#### Scenario: Client with a secret key

- **WHEN** an infra client needs a third-party secret key
- **THEN** it lives under `data/server/`, even if only one app uses it

### Requirement: Nesting order

Inside a package, folders SHALL nest as layer, then side, then kind, for example `data/server/repository/`.

#### Scenario: Kind before side

- **WHEN** a file is added at `data/repository/server/instrument-pg.repository.ts`
- **THEN** the layer lint fails

### Requirement: Kind folder matches the file suffix

Each kind of code SHALL live in one singular kebab-case folder named exactly like its file suffix, for example `model/instrument.model.ts` or `use-case/instrument-create.use-case.ts`. A file whose folder and suffix disagree SHALL fail the lint.

#### Scenario: Matching folder and suffix

- **WHEN** the layer lint runs over `domain/model/instrument.model.ts`
- **THEN** it passes

#### Scenario: Suffix missing

- **WHEN** a file is added at `domain/model/instrument.ts`
- **THEN** the layer lint fails

#### Scenario: Suffix from another kind

- **WHEN** a file is added at `domain/model/isin.value-object.ts`
- **THEN** the layer lint fails

### Requirement: Package kinds per layer

Domain SHALL hold `model/`, `value-object/`, `read-model/`, `event/`, `error/`, `repository/` and `query/`. Each application side SHALL hold `use-case/` and `port/`. Each data side SHALL hold `repository/`, `query/`, `datasource/`, `mapper/` and `infra/`; `data/shared/` SHALL hold `dto/`, `mapper/` and `infra/`. A kind in any other layer SHALL fail the lint.

#### Scenario: Use case in domain

- **WHEN** a file is added at `domain/use-case/instrument-create.use-case.ts`
- **THEN** the layer lint fails

#### Scenario: DTO on one side

- **WHEN** a file is added at `data/server/dto/instrument.dto.ts`
- **THEN** the layer lint fails

### Requirement: New kinds are added deliberately

A file that fits no listed kind SHALL be a private function of the only file that uses it. When it is reused it SHALL move to the kind it acts as, to infra, or to the platform. A new kind SHALL exist only once it is added to this spec and to the lint; no catch-all folder (`util/`, `lib/`, `helpers/`, `common/`) SHALL exist.

#### Scenario: Catch-all folder

- **WHEN** a file is added at `apps/investlab-api/src/core/util/reply.util.ts`
- **THEN** the layer lint fails

### Requirement: Business ports in domain, technical ports in application

A repository or read query port SHALL live in `domain/repository/` or `domain/query/`. A port for a mechanism a flow needs, such as publishing events or reading the clock, SHALL live in `application/<side>/port/`. Every port implementation SHALL live in data.

#### Scenario: Repository port

- **WHEN** the quote repository port is located
- **THEN** it is `packages/investlab-quotes/src/domain/repository/quote.repository.ts`

#### Scenario: Technical port

- **WHEN** a server use case needs an event bus port
- **THEN** the port is `application/server/port/event-bus.port.ts`

### Requirement: Infra per medium

Code that talks to one concrete medium SHALL live in `data/<side>/infra/<medium>/` (for example `http`, `db`, `redis`, `storage`), named `<name>.<role>.ts`, and SHALL know nothing of the business. An external system's response types SHALL live with its infra client. Infra any module could use SHALL live in the platform package.

#### Scenario: Third-party API client

- **WHEN** the Finnhub client is located
- **THEN** it is `packages/investlab-quotes/src/data/server/infra/http/finnhub.client.ts` and holds the Finnhub response types, and no `dto/` file describes Finnhub's shapes

#### Scenario: Database tables

- **WHEN** the instrument table is located
- **THEN** it is `packages/investlab-portfolio/src/data/server/infra/db/instrument.table.ts`

### Requirement: Datasource only for several sources

A repository with one source SHALL use its infra directly. A repository that combines two or more sources SHALL use one datasource per source. A datasource SHALL map to the domain on its own when it has every value it needs.

#### Scenario: Single source

- **WHEN** the Postgres instrument repository is located
- **THEN** it uses the database infra directly and no instrument datasource exists

#### Scenario: Several sources

- **WHEN** the cached quote repository is located
- **THEN** it combines `datasource/quote-finnhub.datasource.ts` and `datasource/quote-redis.datasource.ts`

### Requirement: Mapper file only when reused

A mapping SHALL be a private method of the file that needs it until a second file needs it. Then it SHALL move to a `mapper/` folder, named after the foreign shape it maps (`instrument-pg.mapper.ts`, `instrument-dto.mapper.ts`). Serializers SHALL be mappers.

#### Scenario: No serializers folder

- **WHEN** the files of `apps/investlab-api/src` are listed
- **THEN** no `serializers/` folder and no `*.serializer.ts` file exist

#### Scenario: Mapper used once

- **WHEN** a `*.mapper.ts` file is imported by a single file
- **THEN** the mapping is moved into that file as a private method

### Requirement: File names start with the concept

A file name SHALL start with its business concept, then the source or strategy when there is one, then the kind suffix: `instrument-pg.repository.ts`, `quote-cached.repository.ts`, `instrument-create.use-case.ts`. The source SHALL name the concrete source (`pg`, `redis`, `finnhub`, `api`, `storage`); a repository over several sources SHALL name its strategy.

#### Scenario: Source-first name

- **WHEN** the files of `packages/investlab-portfolio/src` are listed
- **THEN** no file is named `pg-instrument.repository.ts` or `http-instrument.repository.ts`, and `instrument-pg.repository.ts` and `instrument-api.repository.ts` exist

### Requirement: Class named like its file

A file that exports one class SHALL name it like the file, in PascalCase, kind included: `instrument-pg.repository.ts` exports `InstrumentPgRepository`.

#### Scenario: Repository class name

- **WHEN** `data/server/repository/instrument-pg.repository.ts` is read
- **THEN** it exports a class named `InstrumentPgRepository`

### Requirement: Framework and test suffixes go last

A suffix a framework requires, such as `.server.ts` or `.client.ts`, and a test suffix SHALL come after the kind suffix: `portfolio.loader.server.ts`, `di/container.client.ts`, `instrument.model.test.ts`.

#### Scenario: Server-only loader

- **WHEN** a React Router loader that imports a `./client` entry is located
- **THEN** its file is named `<concept>.loader.server.ts`

### Requirement: Repositories stay inside their aggregate

A repository SHALL NOT depend on another aggregate's repository. The repository of an aggregate root SHALL load and save the root's children. A repository MAY wrap another implementation of its own port, received through injection. A write that touches several aggregates SHALL be orchestrated by a use case.

#### Scenario: Repository imports another repository

- **WHEN** a file in `data/server/repository/` imports another file in a `repository/` folder of data
- **THEN** the layer lint fails

#### Scenario: Children loaded with the root

- **WHEN** the qup order repository loads an order
- **THEN** it returns the order with its items, without calling an order item repository

### Requirement: Reads across aggregates are read queries

A read that combines several aggregates SHALL be a read query: its port in `domain/query/`, its result a read model in `domain/read-model/`, and its implementation in `data/<side>/query/`.

#### Scenario: Portfolio item list

- **WHEN** the portfolio item list with instrument data is read
- **THEN** it comes from a read query in `query/` returning a read model, not from a repository

### Requirement: Loose files in a package

Outside the kind folders, a package SHALL hold only its entry files at the `src/` root (`index.ts`, `server.ts`, `client.ts`, `testing.ts`) and one `tokens.ts` at the root of a side folder (for example `application/server/tokens.ts`). This rule SHALL cover TypeScript files only.

#### Scenario: Loose helper

- **WHEN** a file is added at `packages/investlab-quotes/src/data/server/batch.ts`
- **THEN** the layer lint fails

#### Scenario: Side tokens

- **WHEN** the layer lint runs over `packages/investlab-quotes/src/data/server/tokens.ts`
- **THEN** it passes

### Requirement: Package composition per side

A package SHALL wire each side in `src/di/server.module.ts` and `src/di/client.module.ts`. Client code that runs only in the browser SHALL be wired in `src/di/browser.module.ts`. Each token SHALL stay in the `tokens.ts` of the side folder that injects it.

#### Scenario: Server module location

- **WHEN** the portfolio server container module is located
- **THEN** it is `packages/investlab-portfolio/src/di/server.module.ts` and no `module.server.ts` exists

### Requirement: Tests next to their subject

A test SHALL sit next to its subject and take the subject's full file name plus the test kind: `instrument-create.use-case.integration.ts`, `instrument.model.test.ts`, `instrument.route.integration-platform.ts`.

#### Scenario: Use-case integration test

- **WHEN** the integration test of the server instrument create use case is located
- **THEN** it is `application/server/use-case/instrument-create.use-case.integration.ts`

### Requirement: Test support folder

Test support SHALL live in `src/testing/`: builders in `testing/shared/builder/<concept>.builder.ts`, and each side's `given.ts` and Vitest setup files in `testing/<side>/`. The `./testing` entry, built from `src/testing.ts`, SHALL export only builders.

#### Scenario: Builder location

- **WHEN** the instrument builder is located
- **THEN** it is `src/testing/shared/builder/instrument.builder.ts` and `src/testing.ts` re-exports it

#### Scenario: Scenario helpers are not exported

- **WHEN** another project imports `given.ts` helpers through `./testing`
- **THEN** the import fails to resolve

### Requirement: Harness next to its entry point

An app harness SHALL sit next to the entry point it drives, named after it (`route/instrument.route.harness.ts`, `page/portfolio.page.harness.ts`). The base harness SHALL live in `core/harness/`.

#### Scenario: API harness

- **WHEN** the harness for the instruments routes is located
- **THEN** it is `apps/investlab-api/src/portfolio/route/instrument.route.harness.ts` and extends `core/harness/api.harness.ts`

### Requirement: Core package layout

A core package SHALL follow the package layers with no side in its own code: kernel errors in `domain/error/<concept>.error.ts` and the API error envelope in `data/shared/dto/api-error.dto.ts`, behind the single entry `index.ts`.

#### Scenario: Kernel error location

- **WHEN** the `ValidationError` of `@m0n0lab/investlab-core` is located
- **THEN** it is `packages/investlab-core/src/domain/error/validation.error.ts`

### Requirement: Platform package layout

A platform package SHALL nest by side, then medium: `src/<side>/<medium>/` (for example `shared/http/http.client.ts`, `client/storage/local.storage.ts`, `server/config/process-env.config.ts`), plus `src/di/` and its entry files. It SHALL have no layer folders.

#### Scenario: Platform HTTP client

- **WHEN** the generic HTTP client of `@m0n0lab/investlab-platform` is located
- **THEN** it is `packages/investlab-platform/src/shared/http/http.client.ts`

### Requirement: App layout

The `src/` folder of an app SHALL hold one folder per module, `core/` for what no module owns, `di/` for composition, the framework's route tree and the framework's entry files. An app SHALL NOT hold domain, application or data code, nor a `presentation/` folder.

#### Scenario: Module-less code

- **WHEN** the API's bearer authentication middleware is located
- **THEN** it is `apps/investlab-api/src/core/middleware/bearer-auth.middleware.ts`

### Requirement: App modules match module packages

Each module folder of an app SHALL be named after a module package of its product. A page that combines modules SHALL live in the module that owns its route. App modules MAY import each other, a cycle between them SHALL fail CI, and `core/` SHALL NOT import a module.

#### Scenario: Core imports a module

- **WHEN** a file in `apps/investlab/src/core/` imports a file from `apps/investlab/src/portfolio/`
- **THEN** the layer lint fails

#### Scenario: Module cycle

- **WHEN** `portfolio/` imports `quotes/` and `quotes/` imports `portfolio/`
- **THEN** the CI circular dependency check fails

### Requirement: Framework route files are thin shells

A file in a framework's route tree SHALL only bind a URL to a module's page, loader or action and SHALL hold no logic. A Hono app SHALL keep each module's routes in `src/<module>/route/` and mount them in `src/app.ts`.

#### Scenario: React Router route

- **WHEN** `apps/investlab/src/routes/portfolio.tsx` is read
- **THEN** it only re-exports the portfolio page, loader and action from `src/portfolio/`

### Requirement: UI app kinds

A UI app module SHALL use the kinds `page/`, `component/`, `hook/`, `view-model/`, `loader/`, `action/`, `form/`, `mapper/` and `error/`, with matching suffixes: `portfolio.page.tsx`, `instrument-row.component.tsx` (`.component.svelte` in Svelte), `use-instruments.hook.ts`, `portfolio-item.form.ts`.

#### Scenario: Component suffix

- **WHEN** a file is added at `apps/investlab/src/portfolio/component/instrument-row.tsx`
- **THEN** the layer lint fails

### Requirement: API app kinds

An API app module SHALL use the kinds `route/`, `middleware/`, `mapper/` and `error/`, with matching suffixes: `instrument.route.ts`, `bearer-auth.middleware.ts`, `error-http.mapper.ts`, `request-validation.error.ts`. The base harness SHALL use `core/harness/`.

#### Scenario: Route file name

- **WHEN** the API's instrument routes are located
- **THEN** they are `apps/investlab-api/src/portfolio/route/instrument.route.ts`

### Requirement: App composition root per runtime

An app SHALL wire its dependencies in `src/di/`, one container per runtime: `container.ts`, or `container.server.ts` plus `container.client.ts` for a web app whose browser code calls use cases. Each app module's own bindings SHALL live in `src/<module>/di/<module>.module.ts`.

#### Scenario: API container

- **WHEN** the API container is located
- **THEN** it is `apps/investlab-api/src/di/container.ts`

#### Scenario: Browser container

- **WHEN** the web's followed tickers are read in the browser
- **THEN** the use case comes from the container built in `apps/investlab/src/di/container.client.ts`

### Requirement: Path aliases per top-level folder

Each project SHALL declare, as a closed list, one `#<folder>/*` alias for each top-level folder of `src/` that other folders import from: in packages `#domain`, `#application`, `#data`, `#di` and `#testing`; in apps `#core`, `#di` and one per module. The framework route tree SHALL get no alias.

#### Scenario: Package import through an alias

- **WHEN** a use case imports the instrument model
- **THEN** the specifier is `#domain/model/instrument.model.ts`

#### Scenario: Folder outside the list

- **WHEN** a file imports `#routes/portfolio.tsx`
- **THEN** the type check fails because the alias does not exist

### Requirement: Import paths

An import SHALL be relative only when its target sits in the same folder; every other import inside a project SHALL use an alias. No import SHALL contain `../`. An alias SHALL NOT resolve outside its own project.

#### Scenario: Parent-relative import

- **WHEN** a file imports `../model/instrument.model.ts`
- **THEN** the lint fails

#### Scenario: Same-folder import

- **WHEN** a use case imports `./instrument-list.use-case.ts` from the same folder
- **THEN** the lint passes

### Requirement: Layer dependency direction

Domain SHALL import only domain and the core package. Application SHALL import domain and its own side. Data SHALL import domain, the ports of its side's application, `data/shared/` and its own side. `di/` MAY import every layer of its side. `server/` and `client/` code SHALL NOT import each other; `shared/` code SHALL import only `shared/` code.

#### Scenario: Use case imports a repository implementation

- **WHEN** a file in `application/server/use-case/` imports a file from `data/server/`
- **THEN** the layer lint fails

#### Scenario: Data implements a technical port

- **WHEN** a file in `data/server/infra/` imports `application/server/port/event-bus.port.ts`
- **THEN** the layer lint passes

### Requirement: Layout enforced by one lint per product

One lint configuration, built from a single factory per product prefix, SHALL check every project in scope for unknown files, folder and suffix agreement, dependency direction, sides and import paths, and CI SHALL fail on a violation. Adding a product SHALL take only a new call to the factory.

#### Scenario: New product

- **WHEN** green-beard's packages and app are added to the lint
- **THEN** the change to the lint configuration is one factory call with the `green-beard` prefix

#### Scenario: Unknown file

- **WHEN** a TypeScript file under a project in scope matches no element of the layout
- **THEN** the layer lint fails
