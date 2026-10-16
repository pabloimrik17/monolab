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
- A core package for the shared kernel, a platform package that owns configuration and shared infrastructure provided through the container, and a database package that owns migrations
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
| `@m0n0lab/investlab-portfolio` | `PortfolioItem`, `Instrument` (catalog as portfolio reference data), their ports, the item + instrument read query, portfolio and instrument use cases, `portfolio_items` and `instruments` tables | core, platform; database (tests only) |
| `@m0n0lab/investlab-quotes` | `Quote`, quote port, Finnhub datasource, Redis cache datasource, `CachedQuoteRepository`, quote-list use cases | core, platform |
| `@m0n0lab/investlab-core` | kernel errors, `KernelError` union, generic `RemotePortError<E>`, API error envelope schema | nothing of ours |
| `@m0n0lab/investlab-platform` | `Config`, `HttpClient`, `InvestlabApiClient`, `Db`, `Redis` | core |
| `@m0n0lab/investlab-database` | `drizzle.config.ts`, `drizzle/` migrations (seed included), `migrate(databaseUrl)` | nothing of ours |

Every package needs two real consumers. Core: both modules and the platform. Platform: both modules and both apps. Database: the API (its `db:*` scripts) and the module integration tests. A module only gets its own package for the same reason: it is used by both apps.

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

### 3. Core and platform packages

**Core.** `@m0n0lab/investlab-core` is the shared kernel, one root entry: `DomainError` base, `ValidationError`, `PersistenceError`, `NetworkError`, `UnauthorizedError`, the `KernelError` union of those four, a generic `RemotePortError<E extends DomainError = never>` (kernel errors | `E`), and the API error envelope schema (`apiErrorDtoSchema`). Core cannot know module errors, so each module names its own union, e.g. `PortfolioRemoteError = RemotePortError<InstrumentNotFoundError | PortfolioItemNotFoundError | PortfolioItemConflictError | …>`. It depends on nothing but `zod` and `neverthrow` and imports no InvestLab package; every module layer and the platform may import it. The name previously belonged to a browser-only package that was dissolved; it is reused here.

**Platform.** `@m0n0lab/investlab-platform` has two entries and no root entry, so domain and application code cannot reach it by accident:

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

**`HttpClient`** (both sides): generic requests only. JSON in and out, a timeout, and transport failures (network error, timeout, present but unparsable body) as `NetworkError`. Any HTTP status is returned to the caller with its body; a response without a body (such as 204) is returned without parsing and is not an error. It knows no endpoint, base URL or token.

**`InvestlabApiClient`** (client side): built on `HttpClient`; adds `config.api.baseUrl` and `Authorization: Bearer config.api.token`, validates success bodies with the caller's zod schema (a bodyless success resolves without validation) and turns error envelopes into errors: the caller passes its module's code → error factory map, kernel codes (`VALIDATION_ERROR`, `PERSISTENCE_ERROR`) are built by the platform, HTTP 401 becomes `UnauthorizedError`, transport failures, unknown codes and bodies that fail their schema become `NetworkError`. Every module's HTTP repositories use it; none builds URLs or headers itself.

**`Db` and `Redis`** (server side): built inside the container from the injected `Config`. `Db` is the drizzle client over a `pg.Pool`, wrapped with `@m0n0lab/drizzle-neverthrow` as today, singleton, with `onDeactivation` ending the pool. `Redis` is an `ioredis` client with `lazyConnect`, singleton, with `onDeactivation` calling `quit()` when connected and `disconnect()` when it never connected (status `"wait"`), so shutdown never opens a connection just to close it. Neither connects until first use.

**`FinnhubClient` is not platform**: it is the quotes module's datasource in `data/server`, built on `HttpClient` and `config.finnhub.apiKey`.

### 4. Layer rules and enforcement

Inside a module package:

| From | May import |
|---|---|
| `domain/` | `domain/`, core |
| `application/server`, `application/client` | `domain/`, core (use-case inputs are domain types, never DTOs) |
| `data/contracts/` | `domain/`, core |
| `data/server/` | `domain/`, `data/contracts/`, core, platform `./server`, infrastructure libraries |
| `data/client/` | `domain/`, `data/contracts/`, core, platform `./client` |
| `module.server.ts` | `domain/`, `application/server`, `data/server`, platform `./server` |
| `module.client.ts` | `domain/`, `application/client`, `data/client`, platform `./client` |
| `index.ts` | `domain/`, `data/contracts/` |
| `server.ts` | `domain/`, `application/server`, `module.server.ts` |
| `client.ts` | `domain/`, `application/client`, `module.client.ts` |
| test files of a side (`*.integration.ts`, `vitest-*-setup.ts`, `given.ts`) | what their folder may import, plus `module.<side>.ts`, platform `./<side>`, `data/contracts/`, database (server side), `msw`, Testcontainers |

Only `data/server`, `data/client` and `module.*.ts` may import the platform entry of their side; `data/contracts/` may not. Core imports nothing of ours; the platform imports only core; the database package imports nothing of ours. No file under `*/server/` imports `*/client/` and vice versa. Across packages: `apps/investlab` never imports `@m0n0lab/investlab-*/server` nor the database package; `apps/investlab-api` never imports `@m0n0lab/investlab-*/client`; business modules never import each other. Domain and application code never imports `pg`, `drizzle-orm`, `ioredis`, `msw` or `varlock`.

**Mechanism.** fallow 3.6 (already in CI as `lint:fallow`, `fallow dead-code --fail-on-issues`) supports `boundaries` in `.fallowrc.json`: zones by path pattern (one per layer folder per module, one for core, one per platform entry, one for database, one per app) and `rules` with `allow`/`allowTypeOnly` lists, reported as `boundary-violation` (error by default). Banned third-party imports per zone go through fallow `rulePacks` (banned imports). Implementation verifies two things before relying on it: that imports through workspace `exports` (`@m0n0lab/investlab-portfolio/server`) resolve to source files in the right zone, and that a deliberate violation fails `pnpm lint:fallow`. If either fails, the fallback is ESLint `no-restricted-imports` with `patterns` per folder in the root `eslint.config.ts` (run through the `lint:eslint` targets), or `eslint-plugin-boundaries` if path patterns are not enough.

**Enforcement as built.** ESLint holds every rule, in the root `eslint.config.ts`, with two mechanisms: `eslint-plugin-boundaries` (`boundaries/dependencies`, `investlabLayerBoundaries`) checks the layer table inside the module and platform packages on the resolved file, and `no-restricted-imports` with `regex` patterns per file group (`investlabLayerRules`) checks package specifiers. Both run by the `lint:eslint` target that every InvestLab project now has (and by `lint:eslint:fix` in the pre-commit hook for the packages and the API). fallow 3.6.0 was tried first and dropped, for three reasons found in implementation:

- `boundary-violation` findings are reported but never fail: `fallow dead-code --fail-on-issues` and `fallow audit` exit 0 on them, even with the rule set to `error`.
- Zones see workspace `exports` imports only while the target package has no `dist/`: once built, `@m0n0lab/investlab-portfolio/server` resolves to `dist/server.js`, which sits in no zone, so cross-package rules pass silently, and the CI lint step builds the packages (`lint:eslint` depends on `^build`).
- A `rulePacks` file that the audit base does not have yet makes `fallow audit` (pre-commit hook, PR gate) exit 2, because the base snapshot is analyzed with the current config.

A first cut matched relative specifiers with regex too and left holes, found in review and confirmed by a deliberate-violation probe (49 layer cases: regex 38 caught, plugin 49): imports carry the `.ts` suffix, so `(^|/)client(/|$)` missed `./client.ts` and `./module.client.ts`; the entries could reach `data/`; `domain/`, `data/contracts/` and `index.ts` could reach the side entries; a relative path into another package passed. The plugin classifies files instead of strings: layer folders are elements (captured per package), the package-root files share the `src` element and are told apart by file category (`entry`, `entry-<side>`, `module-<side>`), side test files are a category inside `application/<side>`, `checkInternals` covers imports between package-root files, the default is `disallow` and `boundaries/no-unknown-files` fails a file outside every layer. Workspace packages resolve to `dist/`, so `@m0n0lab/*` imports are flagged external there and left to the specifier rules.

| Rule | Tool |
|---|---|
| Layer table (relative imports between `domain/`, `application/<side>`, `data/*`, `module.<side>.ts`, entries; platform `server/`, `client/`, `shared/` and entries) | `eslint-plugin-boundaries`, on the resolved file |
| No `server` ↔ `client` (folders, entries, `module.*.ts`) | `eslint-plugin-boundaries` (no policy allows it) |
| No `server` ↔ `client` entries by package name (`@m0n0lab/investlab-*/<side>`, the package's own included); side-neutral code (`domain/`, `data/contracts/`, `index.ts`, platform `shared/`) imports neither | ESLint `no-restricted-imports`, specifier per side |
| Core and database import nothing of ours; platform imports only core; modules never import each other | ESLint `no-restricted-imports`, `@m0n0lab/investlab-*` specifiers per package |
| `apps/investlab` never imports `./server` entries or the database, imports `./client` entries only from `.server.ts` files; `apps/investlab-api` never imports `./client` entries | ESLint `no-restricted-imports`, entry specifiers per app |
| `pg`, `drizzle-orm`, `ioredis`, `msw`, `varlock`, platform and database banned in `domain/`, `application/`, `data/contracts/` and `index.ts`; platform and database banned in the side entries | ESLint `no-restricted-imports` |

For `no-restricted-imports`, flat config replaces a rule's options per file, so each file group carries its whole ban list and the groups do not overlap. Edges allowed beyond the table, all needed by existing code: entries (`index.ts` → `domain/`, `data/contracts/`; `server.ts`/`client.ts` → `application/<side>`, `module.<side>.ts`); platform `src/shared/` (HTTP client, env reader) imported by both platform sides; `apps/investlab-api` may import the database package; web `*.server.test.ts` count as `.server.ts` files; unit tests (`*.test.ts`) follow their folder's rules; application side test files may import `pg` and `ioredis` (database truncation, Redis flush), only `drizzle-orm` and `varlock` stay banned there. Both mechanisms check the direct import only, so an import that reaches a forbidden file through an allowed file (a re-export) is not caught; the entries export no repositories or datasources, which closes that path across packages.

### 5. Container model

- **Static modules.** `platformServerModule`, `platformClientModule`, `portfolioServerModule`, `portfolioClientModule`, `quotesServerModule`, `quotesClientModule` are plain `ContainerModule` constants with no parameters. Configuration enters as a bound service (`PLATFORM.Config`); infrastructure is constructed by the platform module from it. Nothing else is passed in from outside.
- **Explicit bindings.** No Inversify autobinding: each module file lists its bindings and is the record of the wiring. Use cases are `@injectable()` classes with `@inject` on their ports, as today.
- **Typed tokens per module and side.** `./server` exports `PORTFOLIO = { ItemCreate, ItemUpdate, ItemDelete, ItemList, InstrumentCreate, InstrumentUpdate, InstrumentDelete, InstrumentList }`, each a `ServiceIdentifier<…UseCase>` of the server class; `./client` exports the same names typed with the client classes. `QUOTES = { List }` likewise. `container.get(PORTFOLIO.ItemCreate)` is typed without a cast. Repository and datasource tokens stay internal to the module.
- **Lifecycle.** `Db` and `Redis` release their connections on deactivation. The API calls `await container.unbindAllAsync()` on `SIGTERM`/`SIGINT` before exiting; test setups call it in `afterEach`. Never the sync `unbindAll()`: it throws on async deactivation (`pool.end()` and the Redis close return promises).
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

Kernel errors live in core; module errors in each module's `domain/errors.ts` (`InstrumentNotFoundError`, `PortfolioItemNotFoundError`, new `InstrumentInUseError`, new `InstrumentAlreadyExistsError`). Each module names its remote-port union from core's generic (`PortfolioRemoteError = RemotePortError<…>`) and exports its code union (`PortfolioErrorCode`); the API's code → HTTP status map is typed over the union of kernel and module codes, so an unmapped code fails the type check. Codes stay SCREAMING_SNAKE without namespace, and `code` remains the wire discriminant ([ADR 0005](../../../docs/adr/0005-investlab-error-code-is-the-wire-discriminant.md)).

### 8. Drizzle and the seed

- Each module owns its tables in `data/server/schema.ts` (`portfolio_items` and `instruments` in portfolio; quotes has no table).
- `drizzle.config.ts` and `drizzle/` (SQL files, `meta/` snapshots and `_journal.json`) move with `git mv` to `packages/investlab-database`, unchanged, so databases that already applied them do not re-run anything. `schema` lists every module's `data/server/schema.ts` as path strings (`../investlab-portfolio/src/data/server/schema.ts`), not imports, so the database package has no Nx dependency on any module and no cycle forms. `db:generate`/`db:migrate` become the database package's scripts (drizzle-kit through Varlock with the API's `.env.schema`, as today); the API keeps same-named scripts that delegate with `pnpm --filter`.
- The package exports `migrate(databaseUrl)`: it opens a `pg` pool, runs the drizzle-orm migrator over its own `drizzle/` folder (resolved relative to the package, not the caller) and closes the pool. Module integration setups call it for their template database and list `@m0n0lab/investlab-database` as a devDependency, so a new migration makes their `test:integration` targets affected through the Nx dependency.
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
- Create normalizes the symbol (trim + uppercase); a symbol already in the catalog fails with `INSTRUMENT_ALREADY_EXISTS`. Update follows the item rules: an omitted field is unchanged, `null` clears an optional field (`exchange`, `sector`, `replicates`); it normalizes the symbol like create and fails with `INSTRUMENT_ALREADY_EXISTS` when another instrument has it. The unique constraint (`instruments_symbol_unique`) is the race backstop; the repository maps its violation to `INSTRUMENT_ALREADY_EXISTS`, as it maps the FK violation to `INSTRUMENT_IN_USE`.
- Delete is refused while any portfolio item references the instrument: the use case asks the portfolio item repository (`existsForInstrument(instrumentId)`, a named method because a use case needs it) and fails with `INSTRUMENT_IN_USE`. The existing foreign key (`ON DELETE no action`) is the backstop for a race; the repository maps its violation to the same error.
- Deleting an unknown instrument fails with `INSTRUMENT_NOT_FOUND`.
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

**Server setup.** Testcontainers Postgres and Redis start once per run in `globalSetup`, which migrates a template database once with `migrate` from `@m0n0lab/investlab-database` (seed included). Each test (not each file) clones the template (`CREATE DATABASE … TEMPLATE`, under an advisory lock; seed included) and takes its own Redis logical database, flushed; files still run in parallel. This extends the per-file approach of `investlab-application-server/src/testing/` (commit eace306) to per test. `beforeEach` builds the container from `platformServerModule` and the module under test, with a constant `Config` pointing to the test's database and Redis; `afterEach` unbinds it with `await container.unbindAllAsync()` (releasing pool and Redis) and drops the cloned database. An MSW `setupServer` (`onUnhandledRequest: "error"`) for Finnhub starts once per file and closes in `afterAll`. Tests in one file do not see each other's data. Tests resolve use cases with `container.get(<token>)` in `beforeEach`.

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

1. **Core.** Create `investlab-core` with the kernel errors and the error envelope schema; the old packages re-point their imports to it.
2. **Platform.** Create `investlab-platform` (`Config` + adapters, `HttpClient`, `InvestlabApiClient`, `Db`, `Redis`, static modules). Switch both apps' containers to bind `Config` and load the platform module; the old packages read `Db`/`Redis`/base URL from platform tokens instead of their own.
3. **Database.** Create `investlab-database`: `git mv` `drizzle.config.ts` and `drizzle/` from `investlab-data-server`, add `migrate`, move the `db:*` scripts and point the API's scripts and the old server tests' global setup at it. The config lists the schema where it still lives until portfolio moves it.
4. **Quotes.** Create `investlab-quotes` from the quote parts of the old packages (smallest, no table, no dependency on portfolio). Move its tests to the new shape. Switch both apps to the quotes module; delete the quote code from the old packages.
5. **Portfolio.** Create `investlab-portfolio` from the rest. Move the drizzle schema into it and update the path in the database package's config. Rewrite its tests in the new shape. Switch both apps.
6. **Remove the six old packages**, their references (tsconfig, knip, fallow, root scripts) and `pnpm nx sync`.
7. **Instrument CRUD** on the new layout: seed migration (in the database package), use cases, routes, tests.
8. **Boundaries lint** turned on once the old packages are gone, so it never needs exceptions for them.

Big-bang was considered: one large move commit is simpler to write, but it cannot be bisected and breaks every test file at once. Module by module costs a short period of duplicated wiring and is reviewable step by step.

## Risks / Trade-offs

- **Server code leaking into the web bundle.** A wrong import of `./server`, or of `./client` from a non-`.server.ts` route module, could pull `pg` or the API token toward the browser. Mitigation: the entries, the boundary lint on `apps/investlab`, and a check of the client build output for `pg`, `ioredis`, `drizzle-orm` and the token variable name.
- **Lint enforcement depends on tooling not yet proven here.** fallow boundaries are new to this repo, and workspace `exports` resolution to zones is unverified. Mitigation: verify with a deliberate violation; ESLint fallback named in §4.
- **Migrations folder move and the drizzle journal.** Moving `drizzle/` must keep file names, SQL and `_journal.json` byte-identical, or databases that already applied migrations re-run them. Snapshots must match the split schema, or the next `db:generate` emits a spurious migration. Mitigation: `git mv` only, then `db:generate` reports no changes and `db:migrate` against an existing local database applies only the seed.
- **The drizzle config reaches module files by path.** Without an import, Nx does not know the database package depends on the schema files, and a renamed or moved `schema.ts` is not a type error. Accepted: `db:generate` is a manual, uncached command; a schema move is followed by `db:generate` reporting no changes (task in the portfolio section), which fails visibly if a path is wrong.
- **Two places per module for each side** (`application/` and `data/`) instead of one package each. Accepted: folders and lint carry the boundary; packages now match units of change.
- **Shared packages could grow into dumping grounds.** Rule: core, platform and database hold only what more than one consumer needs; core stays free of runtime code; platform knows no business endpoint; anything module-specific (Finnhub) stays in the module.
- **Black-box client tests depend on the faked API matching the real one.** MSW handlers in `given.ts` build bodies from the module's contracts, so a contract change breaks them at type-check time.
