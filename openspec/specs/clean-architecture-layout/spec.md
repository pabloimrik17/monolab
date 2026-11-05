# clean-architecture-layout Specification

## Purpose
Defines where code lives and how files are named in the monorepo's Clean Architecture projects (InvestLab, qup, green-beard), so every package and app reads the same way and a lint check keeps the layout. Terms follow the Clean Architecture section of `docs/GLOSSARY.md`.

## Requirements

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

`domain/` SHALL have no side folder. `application/` SHALL split into `server/` and `client/` only. `data/` SHALL split into `shared/`, `server/` and `client/`. A side is an end of the product's own HTTP contract: `server/` for the API that implements it, `client/` for any app that consumes it, wherever that app's code runs, and `shared/` for both. The side of a piece SHALL follow the end of the contract it serves and the secrets it holds, not who uses it today nor the runtime it runs in.

#### Scenario: Domain with a side

- **WHEN** a file is added under `domain/server/`
- **THEN** the layer lint fails

#### Scenario: Shared application code

- **WHEN** a file is added under `application/shared/`
- **THEN** the layer lint fails

#### Scenario: Client with a secret key

- **WHEN** an infra client needs a third-party secret key
- **THEN** it lives under `data/server/`, even if only one app uses it

#### Scenario: Browser-only use case

- **WHEN** the followed-ticker use cases, which run only in the browser, are located
- **THEN** they are in `application/client/use-case/`, and no `application/browser/` folder exists

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

### Requirement: Domain kind follows identity

A `*.model.ts` file SHALL export a class: a model has an identity that lasts over time and a state that changes only under the business rules the class owns. A business value without identity, never changed once made, SHALL be a value object in `value-object/`; a shape built for one read across several aggregates SHALL be a read model in `read-model/`.

#### Scenario: Model is a class

- **WHEN** `packages/investlab-quotes/src/domain/model/ticker.model.ts` is read
- **THEN** it exports a class named `Ticker` whose factory normalizes and checks the symbol

#### Scenario: Model built only through its class

- **WHEN** the quotes module makes a ticker
- **THEN** the add use case calls `Ticker.create` and the ticker repository rebuilds stored tickers with `Ticker.reconstitute`, never a plain object

#### Scenario: Value without identity

- **WHEN** the quote, a symbol's price at one moment, is located
- **THEN** it is `domain/value-object/quote.value-object.ts`, not a file in `model/`

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

A file that exports one class SHALL name it like the file, in PascalCase, kind included: `instrument-pg.repository.ts` exports `InstrumentPgRepository`. A domain model SHALL take its concept alone: `instrument.model.ts` exports `Instrument`. An abstract base class MAY share the file of the interface it implements, named `Base<Interface>`.

#### Scenario: Repository class name

- **WHEN** `data/server/repository/instrument-pg.repository.ts` is read
- **THEN** it exports a class named `InstrumentPgRepository`

#### Scenario: Model class name

- **WHEN** `domain/model/instrument.model.ts` is read
- **THEN** it exports a class named `Instrument`

#### Scenario: Harness class name

- **WHEN** `apps/investlab-api/src/portfolio/route/instrument.route.harness.ts` is read
- **THEN** it exports a class named `InstrumentRouteHarness`

#### Scenario: Base class next to its interface

- **WHEN** `packages/investlab-platform/src/shared/storage/key-value.storage.ts` is read
- **THEN** it exports the `KeyValueStorage` interface and the abstract class `BaseKeyValueStorage` that implements it

### Requirement: Framework and test suffixes go last

A suffix a framework requires, such as `.server.ts` or `.client.ts`, and a test suffix SHALL come after the kind suffix: `di/container.server.ts`, `di/container.client.ts`, `instrument.model.test.ts`.

#### Scenario: Server-only container

- **WHEN** the web's server container is located
- **THEN** its file is `apps/investlab/src/di/container.server.ts`, so the build fails if browser code imports it

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

Outside the kind folders, a package SHALL hold only its entry files at the `src/` root (`index.ts`, `server.ts`, `client.ts`, `testing.ts`, and one per device runtime, such as `browser.ts`) and one `tokens.ts` at the root of a side folder (for example `application/server/tokens.ts`). This rule SHALL cover TypeScript files only.

#### Scenario: Loose helper

- **WHEN** a file is added at `packages/investlab-quotes/src/data/server/batch.ts`
- **THEN** the layer lint fails

#### Scenario: Side tokens

- **WHEN** the layer lint runs over `packages/investlab-quotes/src/data/server/tokens.ts`
- **THEN** it passes

### Requirement: Package composition per runtime

A package SHALL wire each runtime its consumers run in with one container module `src/di/<runtime>.module.ts`, exported through the entry `./<runtime>`: `server` for the API, `client` for a consumer holding the API credential, and one per device runtime, such as `browser`. A package with no code for a runtime SHALL have no module or entry for it.

#### Scenario: Server module location

- **WHEN** the portfolio server container module is located
- **THEN** it is `packages/investlab-portfolio/src/di/server.module.ts` and no `module.server.ts` exists

#### Scenario: Browser module entry

- **WHEN** the quotes browser container module is located
- **THEN** it is `packages/investlab-quotes/src/di/browser.module.ts`, exported from `./browser` and not from `./client`

#### Scenario: Package without browser code

- **WHEN** the entries of `@m0n0lab/investlab-portfolio` are listed
- **THEN** none is `./browser`

### Requirement: Token location

A token SHALL stay in the `tokens.ts` of the side folder that injects it. The token of a side-free piece that a device composition binds SHALL live in `shared/tokens.ts`, so the composition need not import the client tokens that name credentialed pieces.

#### Scenario: Side-free token

- **WHEN** the platform storage token is located
- **THEN** it is `PLATFORM_SHARED.KeyValueStorage` in `packages/investlab-platform/src/shared/tokens.ts`, not in `client/tokens.ts`

### Requirement: Device compositions hold no credentialed code

In `data/client/`, a file named for the `api` source is credentialed and one named for a device medium (`storage`) is a device adapter. A device container module and its entry SHALL import from `data/client/` only device adapters, which SHALL NOT import a credentialed file and SHALL take platform pieces only from its side-free root entry `.`. A platform's device module SHALL import only `shared/` and `client/storage/`. A new device medium SHALL join this spec and the lint together.

#### Scenario: Browser module imports an API repository

- **WHEN** `packages/investlab-quotes/src/di/browser.module.ts` imports `data/client/repository/quote-api.repository.ts`
- **THEN** the layer lint fails

#### Scenario: Device adapter reaches the credentialed platform entry

- **WHEN** `packages/investlab-quotes/src/data/client/repository/ticker-storage.repository.ts` imports `@m0n0lab/investlab-platform/client`
- **THEN** the layer lint fails

#### Scenario: Platform browser module reaches the API client

- **WHEN** `packages/investlab-platform/src/di/browser.module.ts` imports `client/http/investlab-api.client.ts`
- **THEN** the layer lint fails

### Requirement: Runtime entries only in compositions

An entry for one device runtime, such as `./browser`, SHALL be imported only by compositions: a package's `di/` and `testing/` files and an app's `src/di/`. Adapters, use cases and views SHALL NOT import one; they take ports and side-free pieces from the package's `.` entry or from their side's entry, so they never know which device runs them.

#### Scenario: Device adapter imports a runtime entry

- **WHEN** `packages/investlab-quotes/src/data/client/repository/ticker-storage.repository.ts` imports `@m0n0lab/investlab-platform/browser`
- **THEN** the layer lint fails

#### Scenario: Composition imports a runtime entry

- **WHEN** `apps/investlab/src/di/container.client.ts` imports `platformBrowserModule` from `@m0n0lab/investlab-platform/browser`
- **THEN** the layer lint passes

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

An app harness SHALL sit next to the entry point it drives, named after it (`route/instrument.route.harness.ts`, `page/portfolio.page.harness.ts`). The base harness SHALL live in `core/harness/`. A `*.harness.ts` file MAY import the app entry it drives (`#app` in an API app); no other file in `core/` or a module SHALL import it.

#### Scenario: API harness

- **WHEN** the harness for the instruments routes is located
- **THEN** it is `apps/investlab-api/src/portfolio/route/instrument.route.harness.ts` and extends `core/harness/api.harness.ts`

#### Scenario: Harness imports the app entry

- **WHEN** `apps/investlab-api/src/core/harness/api.harness.ts` imports `createApp` from `#app`
- **THEN** the layer lint passes

#### Scenario: Other file imports the app entry

- **WHEN** a file in `apps/investlab-api/src/core/mapper/` imports `#app`
- **THEN** the layer lint fails

### Requirement: Core package layout

A core package SHALL follow the package layers with no side in its own code: kernel errors in `domain/error/<concept>.error.ts` and the API error envelope in `data/shared/dto/api-error.dto.ts`, behind the single entry `index.ts`.

#### Scenario: Kernel error location

- **WHEN** the `ValidationError` of `@m0n0lab/investlab-core` is located
- **THEN** it is `packages/investlab-core/src/domain/error/validation.error.ts`

### Requirement: Platform package layout

A platform package SHALL nest by side, then medium: `src/<side>/<medium>/` (for example `shared/http/http.client.ts`, `client/storage/local.storage.ts`, `server/config/process-env.config.ts`), plus `src/di/` and its entry files. It SHALL have no layer folders. Its root entry `index.ts` SHALL export only `shared/` code, including the tokens of side-free pieces in `shared/tokens.ts`, and no other entry SHALL export `shared/` code.

#### Scenario: Platform HTTP client

- **WHEN** the generic HTTP client of `@m0n0lab/investlab-platform` is located
- **THEN** it is `packages/investlab-platform/src/shared/http/http.client.ts`

#### Scenario: Runtime entry re-exports a side-free piece

- **WHEN** `packages/investlab-platform/src/client.ts` exports `MemoryStorage` from `shared/storage/memory.storage.ts`
- **THEN** the layer lint fails

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

### Requirement: Route files are the framework adapters

A file in a framework's route tree SHALL hold its route's loader and action, when it has them, and the route component that renders a module's page (`+page.server.ts` and `+page.svelte` in SvelteKit). Each SHALL be typed with the framework's generated route types and SHALL declare its return type.

#### Scenario: React Router route

- **WHEN** `apps/investlab/src/routes/portfolio.tsx` is read
- **THEN** it holds the portfolio `loader`, `action` and route component, typed with `Route.LoaderArgs`, `Route.ActionArgs` and `Route.ComponentProps` from `./+types/portfolio`, each with a declared return type, and the component renders the portfolio page from `src/portfolio/`

#### Scenario: Loader and page out of step

- **WHEN** the portfolio loader returns data that the portfolio page's props do not accept
- **THEN** the type check fails

### Requirement: Route files hold no business logic

A loader or action SHALL resolve use cases from the app's server container, call them, and turn their results into the page's view data or the action's result; the route component SHALL pass them to the page as props. A route file SHALL hold no other logic.

#### Scenario: Portfolio loader

- **WHEN** the `/portfolio` loader runs
- **THEN** it resolves the client portfolio item list use case from `apps/investlab/src/di/container.server.ts`, calls it, and returns the result converted to the portfolio page's view data

### Requirement: Typed action results

An action SHALL return the result type declared in its module's `form/` file, and the module's components SHALL read it through the framework's typed form state.

#### Scenario: Typed action result

- **WHEN** a portfolio component reads the result of the portfolio action
- **THEN** it calls `useFetcher<PortfolioActionResult>()`, with `PortfolioActionResult` declared in `portfolio/form/portfolio-item.form.ts` and returned by the route's action

### Requirement: UI app kinds

A UI app module SHALL use the kinds `page/`, `component/`, `hook/`, `view-model/`, `form/`, `mapper/` and `error/`, with matching suffixes: `portfolio.page.tsx`, `instrument-row.component.tsx` (`.component.svelte` in Svelte), `use-instruments.hook.ts`, `portfolio-item.form.ts`. Loaders and actions SHALL live in the route files, not in a module.

#### Scenario: Component suffix

- **WHEN** a file is added at `apps/investlab/src/portfolio/component/instrument-row.tsx`
- **THEN** the layer lint fails

#### Scenario: Loader in a module

- **WHEN** a file is added at `apps/investlab/src/portfolio/loader/portfolio.loader.server.ts`
- **THEN** the layer lint fails

### Requirement: API app kinds

An API app module SHALL use the kinds `route/`, `middleware/`, `mapper/` and `error/`, with matching suffixes: `instrument.route.ts`, `bearer-auth.middleware.ts`, `error-http.mapper.ts`, `request-validation.error.ts`. The base harness SHALL use `core/harness/`. A Hono app SHALL keep each module's routes in `src/<module>/route/` and mount them in `src/app.ts`.

#### Scenario: Route file name

- **WHEN** the API's instrument routes are located
- **THEN** they are `apps/investlab-api/src/portfolio/route/instrument.route.ts`

### Requirement: App composition root per runtime

An app SHALL wire its dependencies in `src/di/`, one container per runtime: `container.ts`, or `container.server.ts` plus `container.client.ts` for a web app whose browser code calls use cases. Each container SHALL load only the package entries of its runtime; a browser container loads only device entries (`./browser`). Each app module's own bindings SHALL live in `src/<module>/di/<module>.module.ts`.

#### Scenario: API container

- **WHEN** the API container is located
- **THEN** it is `apps/investlab-api/src/di/container.ts`

#### Scenario: Browser container

- **WHEN** the web's followed tickers are read in the browser
- **THEN** the use case comes from the container built in `apps/investlab/src/di/container.client.ts`, which imports only `./browser` entries

### Requirement: Path aliases per top-level folder

Each project SHALL declare, as a closed list, one `#<folder>/*` alias for each top-level folder of `src/` that other folders import from: in packages `#domain`, `#application`, `#data`, `#di` and `#testing`; in apps `#core`, `#di` and one per module. An API app SHALL also declare `#app` for its entry file `src/app.ts`. The framework route tree SHALL get no alias.

#### Scenario: Package import through an alias

- **WHEN** a use case imports the instrument model
- **THEN** the specifier is `#domain/model/instrument.model.ts`

#### Scenario: API app entry alias

- **WHEN** the API's base harness imports the app it drives
- **THEN** the specifier is `#app`, which resolves to `apps/investlab-api/src/app.ts`

#### Scenario: Folder outside the list

- **WHEN** a file imports `#routes/portfolio.tsx`
- **THEN** the type check fails because the alias does not exist

### Requirement: Import paths

An import SHALL be relative only when its target sits in the same folder; every other import inside a project SHALL use an alias. No import SHALL contain `../`, and none SHALL enter a subfolder (`./sub/x`), except `./+types/` (React Router's generated route types). An alias SHALL NOT resolve outside its own project.

#### Scenario: Parent-relative import

- **WHEN** a file imports `../model/instrument.model.ts`
- **THEN** the lint fails

#### Scenario: Same-folder import

- **WHEN** a use case imports `./instrument-list.use-case.ts` from the same folder
- **THEN** the lint passes

#### Scenario: Subfolder-relative import

- **WHEN** a file imports `./model/instrument.model.ts`
- **THEN** the lint fails

#### Scenario: Generated route types

- **WHEN** a route module imports `./+types/instrument`
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

One lint configuration, built from a single factory per product prefix, SHALL check every project in scope for unknown files, folder and suffix agreement, dependency direction, sides and import paths, and CI SHALL fail on a violation. Adding a product SHALL take only a new call to the factory, which SHALL also ban the imports of the product's database package and of its apps' tool configs outside `src/`.

#### Scenario: New product

- **WHEN** green-beard's packages and app are added to the lint
- **THEN** the change to the lint configuration is one factory call with the `green-beard` prefix

#### Scenario: Database package of a new product

- **WHEN** a file in `packages/green-beard-database/src/` imports another `green-beard` package, after that one factory call
- **THEN** the lint fails

#### Scenario: Unknown file

- **WHEN** a TypeScript file under a project in scope matches no element of the layout
- **THEN** the layer lint fails
