## 1. Platform package

- [ ] 1.1 Scaffold `packages/investlab-platform` (`@m0n0lab/investlab-platform`): `package.json` with `exports` `.`, `./server`, `./client` (types + import), tsdown with three entries, `project.json` with tag `investlab` (Nx config only in `project.json`), tsconfig references; `pnpm nx sync`
- [ ] 1.2 Kernel entry `.`: move `DomainError`, `ValidationError`, `PersistenceError`, `NetworkError`, `UnauthorizedError` and `apiErrorDtoSchema` here; depends only on `zod` and `neverthrow`
- [ ] 1.3 `Config` port: `ServerConfig` (`database.url`, `redis.url`, `finnhub.apiKey`, `api.port`, `api.token`) and `ClientConfig` (`api.baseUrl`, `api.token`), keys matching the two `.env.schema` files
- [ ] 1.4 Adapters: `ProcessEnvConfig` (`./server`, reads `process.env` after `varlock/auto-load`) and the web adapter (`./client`, reads what the Varlock Vite plugin exposes to the SSR server); unit-test the mapping from env keys to groups
- [ ] 1.5 `HttpClient` on both sides: JSON, timeout, any status returned with its body, transport failure / timeout / unparsable body → `NetworkError`
- [ ] 1.6 `InvestlabApiClient` (`./client`): base URL + bearer from `Config`, success body validated by the caller's schema, error envelope → caller's code map, kernel codes, 401 → `UnauthorizedError`, the rest → `NetworkError`; replaces `investlab-data-client`'s `api-client.ts` and `api-error.mapper.ts`
- [ ] 1.7 `Db` (drizzle over `pg.Pool`, wrapped with `@m0n0lab/drizzle-neverthrow`, singleton, `onDeactivation` ends the pool) and `Redis` (`lazyConnect`, singleton, `onDeactivation` quits)
- [ ] 1.8 `PLATFORM` tokens per side, typed with `ServiceIdentifier<…>`; static `platformServerModule` and `platformClientModule` building everything from `PLATFORM.Config`
- [ ] 1.9 Switch both apps to bind their `Config` adapter and load the platform module; old packages read `Db`, `Redis` and the API client from `PLATFORM` tokens; `nx run-many -t build,typecheck,test -p tag:investlab` green

## 2. Integration test conventions (apply to every module in §3 and §4)

- [ ] 2.1 Server `src/application/server/vitest-integration-setup.ts` per module: reuse the template-clone + Redis logical database approach of `investlab-application-server/src/testing/` (commit eace306); build the container from `platformServerModule` + the module's server module with a constant `Config`; MSW `setupServer` with `onUnhandledRequest: "error"` for Finnhub; `afterAll` unbinds the container, drops the clone, closes MSW
- [ ] 2.2 Client `src/application/client/vitest-integration-setup.ts` per module: MSW `setupServer` with `onUnhandledRequest: "error"` as the InvestLab API; container from `platformClientModule` + the module's client module with a constant `Config`
- [ ] 2.3 Name every setup file `vitest-<testtype>-setup.ts`; list it in `setupFiles` of the side's vitest project (`integration-server`, `integration-client`); `test:integration` runs both projects
- [ ] 2.4 Replace `src/testing/api-harness.ts` and `src/testing/integration-harness.ts` with the per-side setup file plus `given.ts`; no `src/testing/` folder remains in module packages
- [ ] 2.5 Replace the `useCase()` helper with `let useCase` + `beforeEach(() => { useCase = container.get(TOKEN) })` in every test file
- [ ] 2.6 Remove the `stubApi` wrapper; MSW handlers live inside the `given.ts` helpers (`givenPortfolioWith`, `givenInstrument`, `givenQuotesFor`, `givenApiUnavailable`, …), built from the module's contracts
- [ ] 2.7 Integration tests are black box: delete every assertion on requests, routes, headers or bodies and every recorded-request log; assert only use-case results and domain errors
- [ ] 2.8 Write each test as given / when / then; server state seeded and observed only through public use cases (create, list), never repositories or SQL
- [ ] 2.9 Rename `describe`/`it`/helpers to business language: no DTO, route, status code or data-layer class names
- [ ] 2.10 Drop type tests (`*.test-d.ts`) and their `typecheck` vitest setting; keep a `unit` project only where unit tests exist; remove `**/*.test-d.ts` from `.fallowrc.json` `entry` and `duplicates.ignore`
- [ ] 2.11 Add the setup files to `.fallowrc.json` `entry` (the fallow vitest plugin does not follow `setupFiles`/`globalSetup`) instead of per-file `fallow-ignore-file` comments

## 3. Quotes module

- [ ] 3.1 Scaffold `packages/investlab-quotes` (`@m0n0lab/investlab-quotes`) with the anatomy of design §2, entries `.`, `./server`, `./client`, tag `investlab`
- [ ] 3.2 `domain/`: `Quote`, quote port, quotes error codes (if any)
- [ ] 3.3 `data/contracts/`: quote DTOs and the quote-list query schema
- [ ] 3.4 `data/server/`: Finnhub datasource on `HttpClient` + `config.finnhub.apiKey`, Redis cache datasource on `PLATFORM.Redis`, `CachedQuoteRepository`, batching helper
- [ ] 3.5 `data/client/`: HTTP quote repository on `InvestlabApiClient`
- [ ] 3.6 `application/server` and `application/client`: quote-list use cases with their error unions
- [ ] 3.7 `module.server.ts`, `module.client.ts` and `QUOTES` tokens per side
- [ ] 3.8 Integration tests per §2: server (cache hit, cache miss, Finnhub without data, Redis unavailable) and client (quotes returned, API unavailable, token rejected)
- [ ] 3.9 Keep unit tests for pure logic only (batching, mappers, DTO schemas); delete the datasource/repository tests that stub `fetch` or mock Redis once §3.8 covers them
- [ ] 3.10 Switch the API (`/quotes` route) and the web (`api.quotes` resource route) to `QUOTES.List`; delete quote code from the old packages; `nx run @m0n0lab/investlab-quotes:test:integration` green

## 4. Portfolio module

- [ ] 4.1 Scaffold `packages/investlab-portfolio` (`@m0n0lab/investlab-portfolio`) with the anatomy of design §2, entries `.`, `./server`, `./client`, tag `investlab`
- [ ] 4.2 `domain/`: `Instrument`, `PortfolioItem`, value objects, ports, read model, module errors and `PortfolioErrorCode`; move `GLOSSARY.md` here
- [ ] 4.3 `data/contracts/`: instrument, portfolio item and list DTOs
- [ ] 4.4 `data/server/`: `schema.ts` (`instruments`, `portfolio_items`), Postgres repositories, read query and mappers on `PLATFORM.Db`
- [ ] 4.5 `data/client/`: HTTP repositories and read query on `InvestlabApiClient`, passing the portfolio error map
- [ ] 4.6 `application/server` and `application/client`: portfolio item create/update/delete/list and instrument list use cases
- [ ] 4.7 `module.server.ts`, `module.client.ts` and `PORTFOLIO` tokens per side (`ItemCreate`, `ItemUpdate`, `ItemDelete`, `ItemList`, `InstrumentList`)
- [ ] 4.8 Rewrite the portfolio integration tests per §2 on both sides
- [ ] 4.9 Keep unit tests for entities, mappers and DTO schemas; delete repository/query tests that mock the driver or stub `fetch`
- [ ] 4.10 Switch API routes and web loaders/actions to `PORTFOLIO.*`; `nx run @m0n0lab/investlab-portfolio:test:integration` green

## 5. Drizzle ownership

- [ ] 5.1 `git mv packages/investlab-data-server/drizzle apps/investlab-api/drizzle` and `drizzle.config.ts` likewise, without touching SQL, snapshots or `_journal.json`
- [ ] 5.2 `schema` in `drizzle.config.ts` lists every module's `data/server/schema.ts`; `db:generate`/`db:migrate` become `apps/investlab-api` scripts run through Varlock
- [ ] 5.3 `pnpm --filter @m0n0lab/investlab-api db:generate` reports no schema changes
- [ ] 5.4 The integration global setup migrates the template from `apps/investlab-api/drizzle`; declare that folder as an input of the modules' `test:integration` target (shared named input, see the Nx inputs note in design Risks) and verify a new migration invalidates the cache
- [ ] 5.5 `db:migrate` against an existing local database (embedded Postgres on 5433 or Docker) applies nothing before the seed

## 6. Apps as composition roots

- [ ] 6.1 `apps/investlab-api/src/container.ts`: bind `ProcessEnvConfig`, load `platformServerModule`, `portfolioServerModule`, `quotesServerModule`; delete `readApiEnv`
- [ ] 6.2 `apps/investlab-api/src/index.ts`: port and token from `Config`; `await container.unbindAll()` on `SIGTERM`/`SIGINT`
- [ ] 6.3 `apps/investlab/app/lib/container.server.ts`: bind the web `Config` adapter, load `platformClientModule`, `portfolioClientModule`, `quotesClientModule`; delete `readWebEnv`
- [ ] 6.4 Web imports `./client` only from `.server.ts` files; components import only `.`
- [ ] 6.5 Update the apps' own tests (API routes, bearer, error mapping, web routes, container) to the new imports; behaviour unchanged

## 7. Remove the layer packages

- [ ] 7.1 Delete `packages/investlab-{domain,data-contracts,data-server,data-client,application-server,application-client}`
- [ ] 7.2 Remove their references: tsconfig references, app `package.json` dependencies, `.fallowrc.json` (`usedClassMembers`, entries), knip config; `pnpm install` and `pnpm nx sync`
- [ ] 7.3 `nx show projects -p tag:investlab` lists exactly the two apps and the three new packages

## 8. Instrument CRUD

- [ ] 8.1 Seed migration (`drizzle-kit generate --custom`) inserting the ten instruments of design §8 with `ON CONFLICT (symbol) DO NOTHING`
- [ ] 8.2 Domain: `InstrumentInUseError` (`INSTRUMENT_IN_USE`), `InstrumentAlreadyExistsError` (`INSTRUMENT_ALREADY_EXISTS`); `PortfolioItemRepository.existsForInstrument(instrumentId)`
- [ ] 8.3 Server use cases `InstrumentCreate`, `InstrumentUpdate`, `InstrumentDelete` with error unions; symbol normalized; delete refused while referenced; foreign-key violation mapped to `INSTRUMENT_IN_USE`
- [ ] 8.4 Contracts for instrument create/update bodies (omitted = unchanged, `null` clears `exchange`/`sector`/`replicates`)
- [ ] 8.5 Client use cases and HTTP repository methods; portfolio error map gains the two codes
- [ ] 8.6 `PORTFOLIO.InstrumentCreate`, `InstrumentUpdate`, `InstrumentDelete` on both sides
- [ ] 8.7 API routes `POST /instruments`, `PUT /instruments/:id`, `DELETE /instruments/:id`; status map: `INSTRUMENT_IN_USE` and `INSTRUMENT_ALREADY_EXISTS` → 409
- [ ] 8.8 Integration tests per §2: create, duplicate symbol, update, update unknown, delete unused, delete in use, delete after the last item is gone (server); success, in use, API unavailable (client)

## 9. Layer boundaries lint

- [ ] 9.1 Configure fallow `boundaries` in `.fallowrc.json`: zones per module layer folder, per platform entry and per app; rules from design §4
- [ ] 9.2 Ban infrastructure libraries (`pg`, `drizzle-orm`, `ioredis`, `msw`, `varlock`) in `domain/` and `application/` with fallow `rulePacks` banned imports
- [ ] 9.3 Prove it: a deliberate violation (web → `./server`, `application/` → `data/`, `domain/` → `drizzle-orm`) fails `pnpm lint:fallow`; then revert it
- [ ] 9.4 If fallow cannot resolve workspace `exports` to zones or cannot express a rule, implement that rule with ESLint `no-restricted-imports` in `eslint.config.ts` (or `eslint-plugin-boundaries`) and record which tool holds which rule in design §4

## 10. CI and workspace

- [ ] 10.1 CI `test:integration` runs the new projects (`nx affected -t test:integration` picks the module packages)
- [ ] 10.2 Root scripts `investlab:*` keep selecting `tag:investlab`
- [ ] 10.3 `pnpm lint:fallow`, `pnpm lint:knip`, markdownlint and oxfmt green
- [ ] 10.4 Check the web's client build output contains no `pg`, `ioredis`, `drizzle-orm` and no `INVESTLAB_API_TOKEN` value

## 11. Verification

- [ ] 11.1 `nx run-many -t build,typecheck -p tag:investlab`
- [ ] 11.2 `nx run-many -t test:unit,test:integration -p tag:investlab`
- [ ] 11.3 Manual E2E (web + API, `pnpm investlab:dev`): seeded instruments appear in the portfolio form; create, view, edit and delete a portfolio item; create, update and delete an instrument through the API; deleting an instrument in use answers 409 `INSTRUMENT_IN_USE`; live quotes refresh on the ticker page; stopping the API releases Postgres and Redis connections
