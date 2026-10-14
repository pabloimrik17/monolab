## 1. Core package

- [x] 1.1 Scaffold `packages/investlab-core` (`@m0n0lab/investlab-core`, a name reused from a dissolved browser-only package): single root entry (types + import), tsdown, tsconfig references (a `project.json` only if a target needs one; Nx config only in `project.json`); `pnpm nx sync`
- [ ] 1.2 Move `DomainError`, `ValidationError`, `PersistenceError`, `NetworkError`, `UnauthorizedError`, the `KernelError` union (`ValidationError`, `PersistenceError`, `NetworkError`, `UnauthorizedError`), the generic `RemotePortError<E extends DomainError = never>` (= `KernelError | E`; each module names its own union, e.g. `PortfolioRemoteError`) and `apiErrorDtoSchema` here; depends only on `zod` and `neverthrow`, imports no `@m0n0lab/investlab-*` package
- [x] 1.3 Re-point the old packages and both apps to `@m0n0lab/investlab-core` for these symbols; `nx run-many -t build,typecheck,test -p '@m0n0lab/investlab*'` green

## 2. Platform package

- [ ] 2.1 Scaffold `packages/investlab-platform` (`@m0n0lab/investlab-platform`): `package.json` with `exports` `./server` and `./client` only, no root entry (types + import), tsdown with two entries, depends on `@m0n0lab/investlab-core`, tsconfig references (a `project.json` only if a target needs one; Nx config only in `project.json`); `pnpm nx sync`
- [ ] 2.2 `Config` port: `ServerConfig` (`database.url`, `redis.url`, `finnhub.apiKey`, `api.port`, `api.token`) and `ClientConfig` (`api.baseUrl`, `api.token`), keys matching the two `.env.schema` files
- [ ] 2.3 Adapters: `ProcessEnvConfig` (`./server`, reads `process.env` after `varlock/auto-load`) and the web adapter (`./client`, reads what the Varlock Vite plugin exposes to the SSR server); unit-test the mapping from env keys to groups
- [ ] 2.4 `HttpClient` on both sides: JSON, timeout, any status returned with its body, a response without a body (such as 204) returned without parsing; transport failure / timeout / present but unparsable body → `NetworkError`
- [ ] 2.5 `InvestlabApiClient` (`./client`): base URL + bearer from `Config`, success body validated by the caller's schema (a bodyless success resolves without schema validation), error envelope → caller's code map, kernel codes from core, 401 → `UnauthorizedError`, the rest → `NetworkError`; replaces `investlab-data-client`'s `api-client.ts` and `api-error.mapper.ts`
- [ ] 2.6 `Db` (drizzle over `pg.Pool`, wrapped with `@m0n0lab/drizzle-neverthrow`, singleton, `onDeactivation` ends the pool) and `Redis` (`lazyConnect`, singleton, `onDeactivation` calls `quit()` when connected and `disconnect()` when it never connected, status `"wait"`, so shutdown never opens a connection just to close it)
- [ ] 2.7 `PLATFORM` tokens per side, typed with `ServiceIdentifier<…>`; static `platformServerModule` and `platformClientModule` building everything from `PLATFORM.Config`
- [ ] 2.8 Switch both apps to bind their `Config` adapter and load the platform module; old packages read `Db`, `Redis` and the API client from `PLATFORM` tokens; `nx run-many -t build,typecheck,test -p '@m0n0lab/investlab*'` green

## 3. Database package

- [ ] 3.1 Scaffold `packages/investlab-database` (`@m0n0lab/investlab-database`): root entry exporting `migrate(databaseUrl)`, tsconfig references; `pnpm nx sync`
- [ ] 3.2 `git mv packages/investlab-data-server/drizzle packages/investlab-database/drizzle` and `drizzle.config.ts` likewise, without touching SQL, snapshots or `_journal.json`
- [ ] 3.3 `drizzle.config.ts` `schema` lists the schema files by path string (for now the one still in `investlab-data-server`), never by import; the package imports no other InvestLab package
- [ ] 3.4 Move `db:generate`/`db:migrate` (drizzle-kit through Varlock with the API's `.env.schema`) to the database package; the API's same-named scripts delegate to it with `pnpm --filter`
- [ ] 3.5 `migrate(databaseUrl)`: `pg` pool + drizzle-orm migrator over the package's own `drizzle/` folder (resolved from the package, not the caller), pool closed afterwards
- [ ] 3.6 Switch the old server integration global setup to `migrate` from the database package (devDependency); no test reads a migrations folder by relative path
- [ ] 3.7 `pnpm --filter @m0n0lab/investlab-database db:generate` reports no schema changes; `db:migrate` against an existing local database (embedded Postgres on 5433 or Docker) applies nothing

## 4. Integration test conventions (apply to every module in §5 and §6)

- [ ] 4.1 Server `src/application/server/vitest-integration-setup.ts` per module: template migrated once with `migrate` from `@m0n0lab/investlab-database` (devDependency; through the Nx dependency a new migration makes the modules' `test:integration` targets affected); reuse the template-clone + Redis logical database approach of `investlab-application-server/src/testing/` (commit eace306), per test: each test gets its own clone of the template database (seed included) and a flushed Redis logical database; `beforeEach` builds the container from `platformServerModule` + the module's server module with a constant `Config`; `afterEach` unbinds it with `await container.unbindAllAsync()` and drops the clone; files still run in parallel; MSW `setupServer` with `onUnhandledRequest: "error"` for Finnhub starts once per file and closes in `afterAll`
- [ ] 4.2 Client `src/application/client/vitest-integration-setup.ts` per module: MSW `setupServer` with `onUnhandledRequest: "error"` as the InvestLab API; container from `platformClientModule` + the module's client module with a constant `Config`
- [ ] 4.3 Name every setup file `vitest-<testtype>-setup.ts`; list it in `setupFiles` of the side's vitest project (`integration-server`, `integration-client`); `test:integration` runs both projects
- [ ] 4.4 Replace `src/testing/api-harness.ts` and `src/testing/integration-harness.ts` with the per-side setup file plus `given.ts`; no `src/testing/` folder remains in module packages
- [ ] 4.5 Replace the `useCase()` helper with `let useCase` + `beforeEach(() => { useCase = container.get(TOKEN) })` in every test file
- [ ] 4.6 Remove the `stubApi` wrapper; MSW handlers live inside the `given.ts` helpers (`givenPortfolioWith`, `givenInstrument`, `givenQuotesFor`, `givenApiUnavailable`, …), built from the module's contracts
- [ ] 4.7 Integration tests are black box: delete every assertion on requests, routes, headers or bodies and every recorded-request log; assert only use-case results and domain errors
- [ ] 4.8 Write each test as given / when / then; server state seeded and observed only through public use cases (create, list), never repositories or SQL
- [ ] 4.9 Rename `describe`/`it`/helpers to business language: no DTO, route, status code or data-layer class names
- [ ] 4.10 Drop type tests (`*.test-d.ts`) and their `typecheck` vitest setting; keep a `unit` project only where unit tests exist; remove `**/*.test-d.ts` from `.fallowrc.json` `entry` and `duplicates.ignore`
- [ ] 4.11 Add the setup files to `.fallowrc.json` `entry` (the fallow vitest plugin does not follow `setupFiles`/`globalSetup`) instead of per-file `fallow-ignore-file` comments

## 5. Quotes module

- [ ] 5.1 Scaffold `packages/investlab-quotes` (`@m0n0lab/investlab-quotes`) with the anatomy of design §2, entries `.`, `./server`, `./client`, `project.json` with `tags: ["docker"]`
- [ ] 5.2 `domain/`: `Quote`, quote port, quotes error codes (if any)
- [ ] 5.3 `data/contracts/`: quote DTOs and the quote-list query schema
- [ ] 5.4 `data/server/`: Finnhub datasource on `HttpClient` + `config.finnhub.apiKey`, Redis cache datasource on `PLATFORM.Redis`, `CachedQuoteRepository`, batching helper
- [ ] 5.5 `data/client/`: HTTP quote repository on `InvestlabApiClient`
- [ ] 5.6 `application/server` and `application/client`: quote-list use cases with their error unions
- [ ] 5.7 `module.server.ts`, `module.client.ts` and `QUOTES` tokens per side
- [ ] 5.8 Integration tests per §4: server (cache hit, cache miss, Finnhub without data, Redis unavailable) and client (quotes returned, API unavailable, token rejected)
- [ ] 5.9 Keep unit tests for pure logic only (batching, mappers, DTO schemas); delete the datasource/repository tests that stub `fetch` or mock Redis once §5.8 covers them
- [ ] 5.10 Switch the API (`/quotes` route) and the web (`api.quotes` resource route) to `QUOTES.List`; delete quote code from the old packages; `nx run @m0n0lab/investlab-quotes:test:integration` green

## 6. Portfolio module

- [ ] 6.1 Scaffold `packages/investlab-portfolio` (`@m0n0lab/investlab-portfolio`) with the anatomy of design §2, entries `.`, `./server`, `./client`, `project.json` with `tags: ["docker"]`
- [ ] 6.2 `domain/`: `Instrument`, `PortfolioItem`, value objects, ports, read model, module errors and `PortfolioErrorCode`; move `GLOSSARY.md` here
- [ ] 6.3 `data/contracts/`: instrument, portfolio item and list DTOs
- [ ] 6.4 `data/server/`: `schema.ts` (`instruments`, `portfolio_items`), Postgres repositories, read query and mappers on `PLATFORM.Db`; update the path in the database package's `drizzle.config.ts`, then `db:generate` reports no schema changes
- [ ] 6.5 `data/client/`: HTTP repositories and read query on `InvestlabApiClient`, passing the portfolio error map
- [ ] 6.6 `application/server` and `application/client`: portfolio item create/update/delete/list and instrument list use cases
- [ ] 6.7 `module.server.ts`, `module.client.ts` and `PORTFOLIO` tokens per side (`ItemCreate`, `ItemUpdate`, `ItemDelete`, `ItemList`, `InstrumentList`)
- [ ] 6.8 Rewrite the portfolio integration tests per §4 on both sides
- [ ] 6.9 Keep unit tests for entities, mappers and DTO schemas; delete repository/query tests that mock the driver or stub `fetch`
- [ ] 6.10 Switch API routes and web loaders/actions to `PORTFOLIO.*`; `nx run @m0n0lab/investlab-portfolio:test:integration` green

## 7. Apps as composition roots

- [ ] 7.1 `apps/investlab-api/src/container.ts`: bind `ProcessEnvConfig`, load `platformServerModule`, `portfolioServerModule`, `quotesServerModule`; delete `readApiEnv`
- [ ] 7.2 `apps/investlab-api/src/index.ts`: port and token from `Config`; `await container.unbindAllAsync()` on `SIGTERM`/`SIGINT` (inversify 8 `unbindAll()` is sync and throws on async deactivation)
- [ ] 7.3 `apps/investlab/app/lib/container.server.ts`: bind the web `Config` adapter, load `platformClientModule`, `portfolioClientModule`, `quotesClientModule`; delete `readWebEnv`
- [ ] 7.4 Web imports `./client` only from `.server.ts` files; components import only `.`
- [ ] 7.5 Update the apps' own tests (API routes, bearer, error mapping, web routes, container) to the new imports; behaviour unchanged

## 8. Remove the layer packages

- [ ] 8.1 Delete `packages/investlab-{domain,data-contracts,data-server,data-client,application-server,application-client}`
- [ ] 8.2 Remove their references: tsconfig references, app `package.json` dependencies, `.fallowrc.json` (`usedClassMembers`, entries), knip config; `pnpm install` and `pnpm nx sync`
- [ ] 8.3 `nx show projects -p '@m0n0lab/investlab*'` lists exactly the two apps and the five new packages

## 9. Instrument CRUD

- [ ] 9.1 Seed migration in `packages/investlab-database/drizzle` (`drizzle-kit generate --custom`) inserting the ten instruments of design §8 with `ON CONFLICT (symbol) DO NOTHING`
- [ ] 9.2 Domain: `InstrumentInUseError` (`INSTRUMENT_IN_USE`), `InstrumentAlreadyExistsError` (`INSTRUMENT_ALREADY_EXISTS`); `PortfolioItemRepository.existsForInstrument(instrumentId)`
- [ ] 9.3 Server use cases `InstrumentCreate`, `InstrumentUpdate`, `InstrumentDelete` with error unions; symbol normalized (trim + uppercase) on create and update; update fails with `INSTRUMENT_ALREADY_EXISTS` when another instrument has the symbol; delete of an unknown instrument fails with `INSTRUMENT_NOT_FOUND`; delete refused while referenced; the repository maps the foreign-key violation to `INSTRUMENT_IN_USE` and the `instruments_symbol_unique` violation (race backstop) to `INSTRUMENT_ALREADY_EXISTS`
- [ ] 9.4 Contracts for instrument create/update bodies (omitted = unchanged, `null` clears `exchange`/`sector`/`replicates`)
- [ ] 9.5 Client use cases and HTTP repository methods; portfolio error map gains the two codes
- [ ] 9.6 `PORTFOLIO.InstrumentCreate`, `InstrumentUpdate`, `InstrumentDelete` on both sides
- [ ] 9.7 API routes `POST /instruments`, `PUT /instruments/:id`, `DELETE /instruments/:id`; status map: `INSTRUMENT_IN_USE` and `INSTRUMENT_ALREADY_EXISTS` → 409, `INSTRUMENT_NOT_FOUND` → 404
- [ ] 9.8 Integration tests per §4: create, duplicate symbol, update, update unknown, duplicate symbol on update, delete unused, delete unknown, delete in use, delete after the last item is gone (server); success, in use, API unavailable (client)

## 10. Layer boundaries lint

- [ ] 10.1 Configure fallow `boundaries` in `.fallowrc.json`: zones per module layer folder, core, per platform entry, database and per app; rules from design §4
- [ ] 10.2 Ban infrastructure libraries (`pg`, `drizzle-orm`, `ioredis`, `msw`, `varlock`) in `domain/` and `application/` with fallow `rulePacks` banned imports
- [ ] 10.3 Prove it: a deliberate violation (web → `./server`, `application/` → `data/`, `domain/` → `drizzle-orm`, `domain/` → platform) fails `pnpm lint:fallow`; then revert it
- [ ] 10.4 If fallow cannot resolve workspace `exports` to zones or cannot express a rule, implement that rule with ESLint `no-restricted-imports` in `eslint.config.ts` (or `eslint-plugin-boundaries`) and record which tool holds which rule in design §4

## 11. CI and workspace

- [ ] 11.1 CI `test:integration` runs the new projects (`nx affected -t test:integration` picks the module packages, which carry `tag:docker` so the non-distributed step runs them)
- [ ] 11.2 Root scripts `investlab:*` keep naming the two apps
- [ ] 11.3 `pnpm lint:fallow`, `pnpm lint:knip`, markdownlint and oxfmt green
- [ ] 11.4 Check the web's client build output contains no `pg`, `ioredis`, `drizzle-orm` and no `INVESTLAB_API_TOKEN` value

## 12. Verification

- [ ] 12.1 `nx run-many -t build,typecheck -p '@m0n0lab/investlab*'`
- [ ] 12.2 `nx run-many -t test:unit,test:integration -p '@m0n0lab/investlab*'`
- [ ] 12.3 Manual E2E (web + API, `pnpm investlab:dev`): seeded instruments appear in the portfolio form; create, view, edit and delete a portfolio item; create, update and delete an instrument through the API; deleting an instrument in use answers 409 `INSTRUMENT_IN_USE`; live quotes refresh on the ticker page; stopping the API releases Postgres and Redis connections
