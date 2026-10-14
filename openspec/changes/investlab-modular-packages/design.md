## Context

`investlab-portfolio-instruments` left InvestLab with six layer packages, two apps and use-case integration tests ([ADR 0006](../../../docs/adr/0006-investlab-use-case-integration-tests.md)):

```
packages/investlab-domain               entities, ports, errors, read models (shared)
packages/investlab-data-contracts       zod DTOs (shared)
packages/investlab-data-server          pg repositories, read query, Finnhub/Redis datasources, drizzle schema + migrations
packages/investlab-data-client          HTTP repositories, api-client, error mapper
packages/investlab-application-server   server use cases + integration tests + src/testing harness
packages/investlab-application-client   client use cases + integration tests + src/testing harness
apps/investlab-api                      Hono; container.ts wires pool, Redis, Finnhub and four modules by hand
apps/investlab                          React Router SSR; container.server.ts binds base URL + token
```

Every server package is consumed only by the API and every client package only by the web. Both containers parse `process.env` themselves and hand constructed infrastructure into the container. The integration tests rebuild that wiring in `src/testing/integration-harness.ts` and `src/testing/api-harness.ts`, assert on recorded HTTP requests and name DTOs in their titles; the review rejected all of it. Server integration files already run in parallel, each on its own clone of a migrated template database and its own Redis logical database (`vitest-integration-setup.ts` and `containers.global-setup.ts` in `investlab-application-server`).

The precedent `apps/qup-api` keeps its use cases inside the app. InvestLab goes the other way: the module, not the app, is the unit that is built, wired and tested.

This layout is the reference for the other Clean Architecture projects in the monorepo; they adopt it later, in their own changes.

## Goals / Non-Goals

**Goals:**

- One package per business module, holding its domain, use cases and adapters for both sides
- Entries that keep server code out of the web and client code out of the API
- A layer rule inside each package, checked by lint in CI
- A platform package that owns configuration and shared infrastructure, provided through the container
- Apps reduced to composition roots and transport
- Use-case tests that run the real composition, fake only what leaves the system and read as business scenarios
- Instrument create, update and delete, with deletion refused while an instrument is in use

**Non-Goals:**

- Instrument management UI (API and use cases only)
- Changing the wire format of existing endpoints
- Reworking the apps' own tests (API route, bearer and error-mapping tests; web route and form tests) beyond import updates
- Crypto instruments in the seed (Finnhub uses another symbol format)
- Adopting the layout in QUP or other projects
- User authentication (still the shared bearer token of [ADR 0003](../../../docs/adr/0003-investlab-hono-api-behind-ssr.md))

## Decisions

The package-per-module layout is recorded in [ADR 0007](../../../docs/adr/0007-investlab-package-per-module.md), which amends ADRs 0001, 0003, 0004 and 0006 where they name packages. ADR 0005 (error `code` is the wire discriminant) stands.

### 1. Modules

| Package | Owns | Depends on |
|---|---|---|
| `@m0n0lab/investlab-portfolio` | `PortfolioItem`, `Instrument` (catalog as portfolio reference data), their ports, the item + instrument read query, portfolio and instrument use cases, `portfolio_items` and `instruments` tables | platform |
| `@m0n0lab/investlab-quotes` | `Quote`, quote port, Finnhub datasource, Redis cache datasource, `CachedQuoteRepository`, quote-list use cases | platform |
| `@m0n0lab/investlab-platform` | `Config`, `HttpClient`, `InvestlabApiClient`, `Db`, `Redis`, kernel errors | none of the modules |

Portfolio references instruments inside its own package. Quotes need only symbols (strings), so the two business modules never import each other. A second instrument consumer (Roger) would move the catalog into its own module; that is not needed now.

### 2. Package anatomy and entries

```
packages/investlab-portfolio/src/
  domain/              entities, errors, ports, read models          (shared)
  application/
    server/            API use cases + their integration tests
    client/            web use cases + their integration tests
  data/
    contracts/         zod DTOs of the wire                          (shared)
    server/            pg repositories, read queries, schema.ts, datasources, mappers
    client/            HTTP repositories, mappers
  module.server.ts     ContainerModule, server side (static, no params)
  module.client.ts     ContainerModule, client side
  index.ts             entry "."        → domain/ + data/contracts/
  server.ts            entry "./server" → module.server.ts, server tokens, use-case + error types
  client.ts            entry "./client" → module.client.ts, client tokens, use-case + error types
```

`package.json` `exports` has `.`, `./server` and `./client` (each with `types` and `import`, built by tsdown with three entries). `./server` and `./client` export the module, its tokens and the use-case and error types; they do not export repositories, datasources or repository tokens, so nothing outside the module can resolve them. Who imports what:

| Importer | `.` | `./server` | `./client` |
|---|---|---|---|
| `apps/investlab-api` | yes | yes | no |
| `apps/investlab` (only from `.server.ts` files for `./client`) | yes | no | yes |
| another module | no (modules are independent) | no | no |

Names and folders are the target picture; small renames may follow in review.

### 3. Platform package

`@m0n0lab/investlab-platform` has three entries:

- `.` (kernel, pure): `DomainError` base, `ValidationError`, `PersistenceError`, `NetworkError`, `UnauthorizedError`, and the API error envelope schema (`apiErrorDtoSchema`). Domain and application code may import it; it depends on nothing but `zod` and `neverthrow`.
- `./server`: `PLATFORM` tokens, `ServerConfig`, `ProcessEnvConfig`, `HttpClient`, `Db`, `Redis`, `platformServerModule`.
- `./client`: `PLATFORM` tokens, `ClientConfig`, the web `Config` adapter, `HttpClient`, `InvestlabApiClient`, `platformClientModule`.

**`Config` port.** Typed from the `.env.schema` keys and grouped by concern:

```ts
interface ServerConfig {
  database: { url: string }   // DATABASE_URL
  redis: { url: string }      // REDIS_URL
  finnhub: { apiKey: string } // FINNHUB_API_KEY
  api: { port: number; token: string } // PORT, INVESTLAB_API_TOKEN
}
interface ClientConfig {
  api: { baseUrl: string; token: string } // INVESTLAB_API_URL, INVESTLAB_API_TOKEN
}
```

One adapter per runtime hides the source: `ProcessEnvConfig` reads `process.env` after `varlock/auto-load` has validated it (API); the web adapter reads what the Varlock Vite plugin exposes to the SSR server. The app binds only its adapter (`bind(PLATFORM.Config).to(ProcessEnvConfig)`); tests bind a constant `Config` with Testcontainers and MSW URLs. No other code reads the environment.

**`HttpClient`** (both sides): generic requests only. JSON in and out, a timeout, and transport failures (network error, timeout, unparsable body) as `NetworkError`. Any HTTP status is returned to the caller with its body; it knows no endpoint, base URL or token.

**`InvestlabApiClient`** (client side): built on `HttpClient`; adds `config.api.baseUrl` and `Authorization: Bearer config.api.token`, validates success bodies with the caller's zod schema and turns error envelopes into errors: the caller passes its module's code → error factory map, kernel codes (`VALIDATION_ERROR`, `PERSISTENCE_ERROR`) are built by the platform, HTTP 401 becomes `UnauthorizedError`, transport failures, unknown codes and bodies that fail their schema become `NetworkError`. Every module's HTTP repositories use it; none builds URLs or headers itself.

**`Db` and `Redis`** (server side): built inside the container from the injected `Config`. `Db` is the drizzle client over a `pg.Pool`, wrapped with `@m0n0lab/drizzle-neverthrow` as today, singleton, with `onDeactivation` ending the pool. `Redis` is an `ioredis` client with `lazyConnect`, singleton, with `onDeactivation` calling `quit()`. Neither connects until first use.

**`FinnhubClient` is not platform**: it is the quotes module's datasource in `data/server`, built on `HttpClient` and `config.finnhub.apiKey`.

### 4. Layer rules and enforcement

Inside a module package:

| From | May import |
|---|---|
| `domain/` | `domain/`, platform `.` |
| `application/server`, `application/client` | `domain/`, platform `.` (use-case inputs are domain types, never DTOs) |
| `data/contracts/` | `domain/`, platform `.` |
| `data/server/` | `domain/`, `data/contracts/`, platform `.` and `./server`, infrastructure libraries |
| `data/client/` | `domain/`, `data/contracts/`, platform `.` and `./client` |
| `module.server.ts` | `application/server`, `data/server`, platform `./server` |
| `module.client.ts` | `application/client`, `data/client`, platform `./client` |

No file under `*/server/` imports `*/client/` and vice versa. Across packages: `apps/investlab` never imports `@m0n0lab/investlab-*/server`; `apps/investlab-api` never imports `@m0n0lab/investlab-*/client`; business modules never import each other. Domain and application code never imports `pg`, `drizzle-orm`, `ioredis`, `msw` or `varlock`.

**Mechanism.** fallow 3.6 (already in CI as `lint:fallow`, `fallow dead-code --fail-on-issues`) supports `boundaries` in `.fallowrc.json`: zones by path pattern (one per layer folder per module, one per platform entry, one per app) and `rules` with `allow`/`allowTypeOnly` lists, reported as `boundary-violation` (error by default). Banned third-party imports per zone go through fallow `rulePacks` (banned imports). Implementation verifies two things before relying on it: that imports through workspace `exports` (`@m0n0lab/investlab-portfolio/server`) resolve to source files in the right zone, and that a deliberate violation fails `pnpm lint:fallow`. If either fails, the fallback is ESLint `no-restricted-imports` with `patterns` per folder in the root `eslint.config.ts` (run through the `lint:eslint` targets), or `eslint-plugin-boundaries` if path patterns are not enough.

### 5. Container model

- **Static modules.** `platformServerModule`, `platformClientModule`, `portfolioServerModule`, `portfolioClientModule`, `quotesServerModule`, `quotesClientModule` are plain `ContainerModule` constants with no parameters. Configuration enters as a bound service (`PLATFORM.Config`); infrastructure is constructed by the platform module from it. Nothing else is passed in from outside.
- **Explicit bindings.** No Inversify autobinding: each module file lists its bindings and is the record of the wiring. Use cases are `@injectable()` classes with `@inject` on their ports, as today.
- **Typed tokens per module and side.** `./server` exports `PORTFOLIO = { ItemCreate, ItemUpdate, ItemDelete, ItemList, InstrumentCreate, InstrumentUpdate, InstrumentDelete, InstrumentList }`, each a `ServiceIdentifier<…UseCase>` of the server class; `./client` exports the same names typed with the client classes. `QUOTES = { List }` likewise. `container.get(PORTFOLIO.ItemCreate)` is typed without a cast. Repository and datasource tokens stay internal to the module.
- **Lifecycle.** `Db` and `Redis` release their connections on deactivation. The API calls `await container.unbindAll()` on `SIGTERM`/`SIGINT` before exiting; test setups call it in `afterAll`.
- **Client use cases stay.** For CRUD they are thin pass-throughs to the HTTP repositories ([ADR 0003](../../../docs/adr/0003-investlab-hono-api-behind-ssr.md)); loaders and actions call use cases and never touch repositories.

### 6. Apps as composition roots

```ts
// apps/investlab-api/src/container.ts
const container = new Container();
container.bind(PLATFORM.Config).to(ProcessEnvConfig).inSingletonScope();
container.load(platformServerModule, portfolioServerModule, quotesServerModule);
```

The web does the same with its `Config` adapter, `platformClientModule`, `portfolioClientModule` and `quotesClientModule` in `app/lib/container.server.ts`. The web keeps `.server.ts` files only for this container and for loader/action glue. Routes keep their transport work (zod parsing of requests, `result.match` to responses, error → status mapping); `readApiEnv`/`readWebEnv` disappear.

### 7. Errors across modules

Kernel errors live in platform `.`; module errors in each module's `domain/errors.ts` (`InstrumentNotFoundError`, `PortfolioItemNotFoundError`, new `InstrumentInUseError`, new `InstrumentAlreadyExistsError`). Each module exports its code union (`PortfolioErrorCode`); the API's code → HTTP status map is typed over the union of kernel and module codes, so an unmapped code fails the type check. Codes stay SCREAMING_SNAKE without namespace, and `code` remains the wire discriminant ([ADR 0005](../../../docs/adr/0005-investlab-error-code-is-the-wire-discriminant.md)).

### 8. Drizzle and the seed

- Each module owns its tables in `data/server/schema.ts` (`portfolio_items` and `instruments` in portfolio; quotes has no table).
- `drizzle.config.ts` and `drizzle/` (SQL files, `meta/` snapshots and `_journal.json`) move with `git mv` to `apps/investlab-api`, unchanged, so databases that already applied them do not re-run anything. `schema` lists every module's `data/server/schema.ts`; `db:generate`/`db:migrate` become the API's own scripts (through Varlock, as today).
- After the move, `db:generate` must report no schema changes; that proves the split schema equals the snapshot.
- A custom migration (`drizzle-kit generate --custom`) seeds the catalog with `INSERT … ON CONFLICT (symbol) DO NOTHING`:

| Symbol | Name | Type | Asset class | Exchange | Sector | Replicates |
|---|---|---|---|---|---|---|
| AAPL | Apple Inc. | stock | equity | NASDAQ | technology | |
| MSFT | Microsoft Corporation | stock | equity | NASDAQ | technology | |
| NVDA | NVIDIA Corporation | stock | equity | NASDAQ | technology | |
| AMZN | Amazon.com, Inc. | stock | equity | NASDAQ | consumer_discretionary | |
| GOOGL | Alphabet Inc. Class A | stock | equity | NASDAQ | communication | |
| META | Meta Platforms, Inc. | stock | equity | NASDAQ | communication | |
| TSLA | Tesla, Inc. | stock | equity | NASDAQ | consumer_discretionary | |
| SPY | SPDR S&P 500 ETF Trust | etf | equity | NYSE Arca | | S&P 500 |
| QQQ | Invesco QQQ Trust | etf | equity | NASDAQ | | Nasdaq-100 |
| VTI | Vanguard Total Stock Market ETF | etf | equity | NYSE Arca | | CRSP US Total Market |

All are `quotable`. Integration tests get the seed for free, because the template database is migrated once per run.

### 9. Instrument CRUD

- Use cases on both sides: `InstrumentCreate`, `InstrumentUpdate`, `InstrumentDelete` next to the existing `InstrumentList`, entity-action naming and a named error union each.
- Create normalizes the symbol (trim + uppercase); a symbol already in the catalog fails with `INSTRUMENT_ALREADY_EXISTS`. Update follows the item rules: an omitted field is unchanged, `null` clears an optional field (`exchange`, `sector`, `replicates`).
- Delete is refused while any portfolio item references the instrument: the use case asks the portfolio item repository (`existsForInstrument(instrumentId)`, a named method because a use case needs it) and fails with `INSTRUMENT_IN_USE`. The existing foreign key (`ON DELETE no action`) is the backstop for a race; the repository maps its violation to the same error.
- API: `POST /instruments` (201), `PUT /instruments/:id` (200), `DELETE /instruments/:id` (204). `INSTRUMENT_IN_USE` and `INSTRUMENT_ALREADY_EXISTS` map to 409, `INSTRUMENT_NOT_FOUND` to 404, validation to 422. Bodies validated with the module's contracts.
- No UI in this change.

### 10. Test architecture

**Placement.** Tests sit next to what they test:

```
src/application/server/portfolio-item-create.use-case.ts
src/application/server/portfolio-item-create.integration.ts
src/application/server/vitest-integration-setup.ts
src/application/server/given.ts
src/application/client/… same shape
src/domain/entities/portfolio-item.test.ts          unit (pure logic only)
src/data/server/mappers/portfolio-item.mapper.test.ts
```

Setup files are named `vitest-<testtype>-setup.ts`. Each package's `vitest.config.ts` declares a project per side, `integration-server` (include `src/application/server/**/*.integration.ts`, `globalSetup` starting the containers, `setupFiles: [vitest-integration-setup.ts]`) and `integration-client` (include `src/application/client/**/*.integration.ts`, its own setup file), plus `unit` only where unit tests exist. The `test:integration` script runs both projects, so the Nx target and CI keep their names.

**Server setup.** Testcontainers Postgres and Redis start once per run in `globalSetup`, which migrates a template database once with the API's migrations (seed included). Each test file clones the template (`CREATE DATABASE … TEMPLATE`, under an advisory lock), takes its own Redis logical database, and files run in parallel; this reuses the approach of `investlab-application-server/src/testing/` (commit eace306). The setup then builds the container from `platformServerModule` and the module under test, with a constant `Config` pointing to the file's database and Redis, and an MSW `setupServer` (`onUnhandledRequest: "error"`) for Finnhub. `afterAll` unbinds the container (releasing pool and Redis), drops the database and closes MSW.

**Client setup.** MSW `setupServer` with `onUnhandledRequest: "error"` standing in for the InvestLab API; container from `platformClientModule` and the module under test, with a constant `Config` pointing to the fake base URL.

**Test file shape.**

```ts
let create: PortfolioItemCreateUseCase;
beforeEach(() => { create = container.get(PORTFOLIO.ItemCreate); });

describe("adding a holding", () => {
  it("records it at the broker with its target weight", async () => {
    const apple = await givenInstrument("AAPL");
    const item = (await create.execute({ instrumentId: apple.id, broker: "MyInvestor", targetWeight: 15 }))._unsafeUnwrap();
    expect(await portfolio()).toContainEqual(expect.objectContaining({ id: item.id, broker: "MyInvestor" }));
  });
});
```

**Black-box rules.**

- Run the real code; fake only what leaves the system: Testcontainers for Postgres and Redis, MSW for Finnhub and for the InvestLab API. Faked responses carry values that make the use case's output predictable.
- Assert only outputs: domain results and domain errors. No assertions on requests, routes, headers or bodies; no recorded-request logs.
- Server side: seed state through public use cases (portfolio items via create; instruments from the seed migration or via create) and observe it through public use cases (list). Client side: the state is the faked API's answers, declared through `given.ts` helpers. Never resolve repositories from the container or run SQL from a test.
- `given.ts` per side exposes scenario helpers in business language (`givenPortfolioWith`, `givenInstrument`, `givenQuotesFor`, `givenApiUnavailable`, …) and hides MSW handlers and SQL. MSW is used directly inside these helpers; there is no `stubApi`-style wrapper.
- `describe`, `it` and helper names speak business only: no DTO, route, status code or class names of the data layer.
- Each test follows given / when / then (arrange, act, assert).
- Unit tests remain only for pure logic: entities, mappers, contract and form schemas, batching. Data-layer tests that mock drivers or stub `fetch` (repositories, datasources, HTTP repositories) are removed once the use-case scenarios cover their behaviour. Type tests (`*.test-d.ts`) are dropped.

### 11. Migration strategy

**Module by module, old packages alive until the end.** Each step leaves both apps building and every test target green:

1. **Platform.** Create `investlab-platform` (kernel, `Config` + adapters, `HttpClient`, `InvestlabApiClient`, `Db`, `Redis`, static modules). Switch both apps' containers to bind `Config` and load the platform module; the old packages read `Db`/`Redis`/base URL from platform tokens instead of their own.
2. **Quotes.** Create `investlab-quotes` from the quote parts of the old packages (smallest, no table, no dependency on portfolio). Move its tests to the new shape. Switch both apps to the quotes module; delete the quote code from the old packages.
3. **Portfolio.** Create `investlab-portfolio` from the rest. Move the drizzle schema into it and `drizzle.config.ts` + `drizzle/` into the API. Rewrite its tests in the new shape. Switch both apps.
4. **Remove the six old packages**, their references (tsconfig, knip, fallow, root scripts) and `pnpm nx sync`.
5. **Instrument CRUD** on the new layout: seed migration, use cases, routes, tests.
6. **Boundaries lint** turned on once the old packages are gone, so it never needs exceptions for them.

Big-bang was considered: one large move commit is simpler to write, but it cannot be bisected and breaks every test file at once. Module by module costs a short period of duplicated wiring and is reviewable step by step.

## Risks / Trade-offs

- **Server code leaking into the web bundle.** A wrong import of `./server`, or of `./client` from a non-`.server.ts` route module, could pull `pg` or the API token toward the browser. Mitigation: the entries, the boundary lint on `apps/investlab`, and a check of the client build output for `pg`, `ioredis`, `drizzle-orm` and the token variable name.
- **Lint enforcement depends on tooling not yet proven here.** fallow boundaries are new to this repo, and workspace `exports` resolution to zones is unverified. Mitigation: verify with a deliberate violation; ESLint fallback named in §4.
- **Migrations folder move and the drizzle journal.** Moving `drizzle/` must keep file names, SQL and `_journal.json` byte-identical, or databases that already applied migrations re-run them. Snapshots must match the split schema, or the next `db:generate` emits a spurious migration. Mitigation: `git mv` only, then `db:generate` reports no changes and `db:migrate` against an existing local database applies only the seed.
- **Module tests depend on the API's migrations.** The portfolio integration setup reads `apps/investlab-api/drizzle`, a folder owned by another project. Mitigation: declare it as an input of the modules' `test:integration` target (shared named input, not `{projectRoot}`) so a new migration invalidates the cache.
- **Two places per module for each side** (`application/` and `data/`) instead of one package each. Accepted: folders and lint carry the boundary; packages now match units of change.
- **Platform could grow into a dumping ground.** Rule: platform holds only what more than one module needs and knows no business endpoint; anything module-specific (Finnhub) stays in the module.
- **Black-box client tests depend on the faked API matching the real one.** MSW handlers in `given.ts` build bodies from the module's contracts, so a contract change breaks them at type-check time.
