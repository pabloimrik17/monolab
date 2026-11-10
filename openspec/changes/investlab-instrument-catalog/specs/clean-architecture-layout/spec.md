## MODIFIED Requirements

### Requirement: Infra per medium

Code that talks to one concrete medium SHALL live in `data/<side>/infra/<medium>/` (for example `http`, `db`, `redis`, `storage`), named `<name>.<role>.ts`, and SHALL know nothing of the business. An external system's response types SHALL live with its infra client. Infra any module could use SHALL live in the platform package.

#### Scenario: Third-party API client

- **WHEN** the Finnhub client is located
- **THEN** it is `packages/investlab-quotes/src/data/server/infra/http/finnhub.client.ts` and holds the Finnhub response types, and no `dto/` file describes Finnhub's shapes

#### Scenario: Database tables

- **WHEN** the instrument table is located
- **THEN** it is `packages/investlab-catalog/src/data/server/infra/db/instrument.table.ts`

### Requirement: Class named like its file

A file that exports one class SHALL name it like the file, in PascalCase, kind included: `instrument-pg.repository.ts` exports `InstrumentPgRepository`. A domain model SHALL take its concept alone: `instrument.model.ts` exports `Instrument`. An abstract base class MAY share the file of the interface it implements, named `Base<Interface>`.

#### Scenario: Repository class name

- **WHEN** `data/server/repository/instrument-pg.repository.ts` is read
- **THEN** it exports a class named `InstrumentPgRepository`

#### Scenario: Model class name

- **WHEN** `domain/model/instrument.model.ts` is read
- **THEN** it exports a class named `Instrument`

#### Scenario: Harness class name

- **WHEN** `apps/investlab-api/src/catalog/route/instrument.route.harness.ts` is read
- **THEN** it exports a class named `InstrumentRouteHarness`

#### Scenario: Base class next to its interface

- **WHEN** `packages/investlab-platform/src/shared/storage/key-value.storage.ts` is read
- **THEN** it exports the `KeyValueStorage` interface and the abstract class `BaseKeyValueStorage` that implements it

### Requirement: Harness next to its entry point

An app harness SHALL sit next to the entry point it drives, named after it (`route/instrument.route.harness.ts`, `page/portfolio.page.harness.ts`). The base harness SHALL live in `core/harness/`. A `*.harness.ts` file MAY import the app entry it drives (`#app` in an API app); no other file in `core/` or a module SHALL import it.

#### Scenario: API harness

- **WHEN** the harness for the instruments routes is located
- **THEN** it is `apps/investlab-api/src/catalog/route/instrument.route.harness.ts` and extends `core/harness/api.harness.ts`

#### Scenario: Harness imports the app entry

- **WHEN** `apps/investlab-api/src/core/harness/api.harness.ts` imports `createApp` from `#app`
- **THEN** the layer lint passes

#### Scenario: Other file imports the app entry

- **WHEN** a file in `apps/investlab-api/src/core/mapper/` imports `#app`
- **THEN** the layer lint fails

### Requirement: API app kinds

An API app module SHALL use the kinds `route/`, `middleware/`, `mapper/` and `error/`, with matching suffixes: `instrument.route.ts`, `bearer-auth.middleware.ts`, `error-http.mapper.ts`, `request-validation.error.ts`. The base harness SHALL use `core/harness/`. A Hono app SHALL keep each module's routes in `src/<module>/route/` and mount them in `src/app.ts`.

#### Scenario: Route file name

- **WHEN** the API's instrument routes are located
- **THEN** they are `apps/investlab-api/src/catalog/route/instrument.route.ts`
