## Why

The port of InvestLab (change `investlab-portfolio-instruments`) split the code into six layer packages: `investlab-domain`, `investlab-data-contracts`, `investlab-data-server`, `investlab-data-client`, `investlab-application-server` and `investlab-application-client`. In practice:

- **Each package has one consumer.** The server packages are used only by `apps/investlab-api`, the client packages only by `apps/investlab`. The package boundary buys no reuse, and every feature touches four to six packages.
- **Tests cannot reach the real composition.** No package owns the wiring of its use cases: the apps wire everything by hand, so the use-case integration tests rebuild that wiring in `src/testing/*-harness.ts` files. The review of those tests rejected the harnesses, the `useCase()` helper, the `stubApi` wrapper, assertions on HTTP requests and DTO names in test titles.
- **Configuration is read everywhere.** Each app parses `process.env` into its own shape and hands raw values (pool, Redis client, Finnhub key) into the container.
- **It is meant to be the reference.** The other Clean Architecture projects in this monorepo will adopt the same layout later; the layout needs to be one we would copy.

## What Changes

### Architecture ([ADR 0007](../../../docs/adr/0007-investlab-package-per-module.md))

- **One package per business module**, three layers inside as folders, entries per side:
    - `@m0n0lab/investlab-portfolio`: portfolio items plus the instrument catalog (portfolio reference data)
    - `@m0n0lab/investlab-quotes`: market data (Finnhub datasource, Redis cache, cached quote repository, quote-list use cases)
- **Package anatomy**: `domain/` (shared), `application/{server,client}/`, `data/contracts/` (shared), `data/{server,client}/`, `module.server.ts`, `module.client.ts`. `exports`: `.` (domain + contracts), `./server`, `./client`.
- **Layer rule, enforced by lint**: `domain/` and `application/` never import `data/` nor platform runtime code; the web never imports `./server`, the API never imports `./client`.
- **Platform package** `@m0n0lab/investlab-platform`: `Config` port and its per-runtime adapters, `HttpClient`, `InvestlabApiClient`, Postgres `Db` and `Redis` handles with deactivation, static container modules under `PLATFORM.*` tokens.
- **Static modules and typed tokens**: every module exposes static `ContainerModule`s and per-module use-case tokens typed with `ServiceIdentifier<…>`, so `container.get(PORTFOLIO.ItemCreate)` needs no cast.
- **Thin apps**: each app binds its `Config` adapter, loads platform and business modules, and calls use cases from routes and loaders.
- **Removed packages**: the six `investlab-*` layer packages.

### Persistence

- Each module owns its drizzle table schema at `data/server/schema.ts`.
- `drizzle.config.ts` and the `drizzle/` migrations folder move to `apps/investlab-api`; the config lists every module's schema file.
- A data migration seeds the instrument catalog (AAPL, MSFT, NVDA, AMZN, GOOGL, META, TSLA, SPY, QQQ, VTI), idempotent.

### Feature

- **Instrument CRUD**: create, update and delete use cases on both sides and API routes (list exists). No UI yet.
- **Instrument in use**: deleting an instrument referenced by a portfolio item fails with `INSTRUMENT_IN_USE`, answered with HTTP 409.

### Tests ([ADR 0006](../../../docs/adr/0006-investlab-use-case-integration-tests.md) stays)

- Integration tests live next to the use cases, per side, with a `vitest-integration-setup.ts` and a `given.ts` per side.
- The setup builds the container from the platform modules and the module under test with a constant `Config`; tests resolve the use case with `container.get` in `beforeEach`.
- Black box: only what leaves the system is faked (Testcontainers for Postgres/Redis, MSW for Finnhub and for the InvestLab API); tests assert only use-case outputs; state is seeded and observed through public use cases.
- Type tests (`*.test-d.ts`) and the `src/testing/` harnesses are removed.

## Capabilities

### New Capabilities

- `investlab-module-packages`: one package per business module, layer folders, entries per side, layer rule enforced by lint, static modules with typed tokens, thin apps.
- `investlab-platform`: environment-backed `Config`, generic `HttpClient`, the InvestLab API client and the shared Postgres/Redis handles, all provided through static container modules.
- `investlab-use-case-testing`: where use-case tests live, how they are set up and what they may fake, seed and assert.

### Modified Capabilities

- `investlab-http-api`: instrument create/update/delete endpoints; delete of an instrument in use answers 409 `INSTRUMENT_IN_USE`; the complete route list grows accordingly.
- `investlab-instrument-management`: CRUD is offered as use cases on both sides; delete is refused while the instrument is in use; the catalog is seeded.
- `investlab-persistence`: purity and implementation rules move from packages to layer folders; migrations are owned by `apps/investlab-api` and cover every module's schema.
- `portfolio-holdings`, `investlab-quote-cache`, `quote-fetching`: requirements that named the removed packages now name the module and layer (`investlab-portfolio`, `investlab-quotes`); the Finnhub key comes from `Config`.
- `rename`: the package list becomes `investlab-portfolio`, `investlab-quotes` and `investlab-platform`.

## Impact

- **Packages**: create `packages/investlab-portfolio`, `packages/investlab-quotes`, `packages/investlab-platform`; delete the six layer packages. All keep the Nx tag `investlab`; Nx config only in `project.json`.
- **Apps**: `apps/investlab-api/src/container.ts` and `apps/investlab/app/lib/container.server.ts` shrink to "bind `Config`, load modules"; imports move to the module entries; `apps/investlab-api` gains `drizzle.config.ts`, `drizzle/` and the `db:*` scripts.
- **API**: new routes `POST /instruments`, `PUT /instruments/:id`, `DELETE /instruments/:id`; new error code `INSTRUMENT_IN_USE` (409). Wire format of existing routes is unchanged.
- **Tooling**: boundary rules in `.fallowrc.json` (or ESLint if fallow cannot express them, see design §4); vitest projects per side in the module packages; `.fallowrc.json` entries for the new setup files.
- **Env**: no new variables; `.env.schema` files stay, now read only by the `Config` adapters.
- **Docs**: [ADR 0007](../../../docs/adr/0007-investlab-package-per-module.md); ADRs 0001, 0003, 0004 and 0006 marked as amended by it.
- **Sequence**: implemented on a branch stacked on `feature/investlab-portfolio-instruments-port`, after that one merges. `investlab-portfolio-instruments` is not modified; its deltas are archived first.
