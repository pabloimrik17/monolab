# Tasks

Paths before a move are the layout after `investlab-modular-packages`; paths after it follow `specs/clean-architecture-layout/spec.md` and the mapping in design §9–§11. Every move uses `git mv`. Tasks marked **[attw]** change what a package builds into its entries and must pass `build:check-exports`.

## 1. Gates

- [x] 1.1 Confirm `investlab-modular-packages` is archived: `openspec list` no longer shows it, `openspec/specs/investlab-module-packages/spec.md` and `openspec/specs/investlab-use-case-testing/spec.md` exist, and `openspec validate clean-architecture-layout --strict` prints no "Archive would refuse this delta" line. Groups 3–9 do not start before this passes.
- [x] 1.2 Alias toolchain check on `@m0n0lab/investlab-quotes` in a throwaway branch: add `paths` (`#domain/*`, `#application/*`, `#data/*`) and switch one import per kind of file to an alias. Then verify:
    - `pnpm nx run @m0n0lab/investlab-quotes:typecheck` passes;
    - `:test:integration` passes with `resolve.tsconfigPaths: true`;
    - after `:build`, `grep -rn '"#' packages/investlab-quotes/dist` finds nothing;
    - `:lint:eslint`, with `eslint-import-resolver-typescript`, fails on a layer violation written through an alias;
    - `pnpm run lint:knip` and `pnpm run lint:fallow` report no unresolved `#` import.
  Record the result in design §12. Wherever Vite's option fails, use `vite-tsconfig-paths` instead.
- [x] 1.3 Browser bundle check in the same throwaway branch:
    - Add a dummy `di/browser.module.ts` to quotes and import it from a browser-only file in `apps/investlab`.
    - Run `pnpm nx run @m0n0lab/investlab:build`, then grep the client assets for `InvestlabApiClient`, `INVESTLAB_API_TOKEN`, `drizzle`, `ioredis` and `pg`. The check passes when none is found.
    - If any is found, stop and ask the owner (design, Risks).
    - Also add a deliberate import cycle between two folders and confirm `pnpm run lint:fallow` fails on it.
    - Delete the throwaway branch afterwards.
  The first run, with the browser module exported from `./client`, failed; the owner chose design E (design §8, §12). The bundle check passes on the real tree once 8.6 is done.

## 2. Tooling

- [x] 2.1 Add `eslint-import-resolver-typescript` as a root devDependency (exact version, per `.npmrc`) and set `import/resolver.typescript` in the boundaries settings; verify `pnpm nx run-many -t lint:eslint -p '@m0n0lab/investlab*'` is still green.
- [x] 2.2 Add the `cleanArchitectureLint({ product, modules, migrated })` factory to `eslint.config.ts` (design §13). It covers:
    - the elements: folder plus suffix, with tests, harnesses and framework suffixes as file categories, and `no-unknown-files`;
    - the dependency direction and the side rules;
    - repository → repository disallowed;
    - `core/` → module disallowed in apps;
    - the `../` ban merged into every `no-restricted-imports` group.
  Call it for `investlab` with an empty `migrated` list, next to the current table; verify the lint output is unchanged.
- [x] 2.3 Set `resolve.tsconfigPaths: true` (or the fallback from 1.2) in `packages/vitest-config` `sharedConfig` and in `apps/investlab/vite.config.ts`; verify `pnpm nx run-many -t test -p '@m0n0lab/investlab*'` is green.

## 3. Core package

- [x] 3.1 Split `src/errors.ts` into `src/domain/error/<concept>.error.ts`: `domain`, `validation`, `persistence`, `network`, `unauthorized`, `kernel` (union) and `remote-port` (generic). Move `errors.test.ts` and `errors.test-d.ts` next to the subjects they test, and keep `index.ts` exporting the same names. Verify with `pnpm nx run @m0n0lab/investlab-core:test` and `:typecheck`.
- [x] 3.2 Move `api-error.dto.ts` and its legacy test to `src/data/shared/dto/`, and update `docs/legacy-tests.txt`; verify `pnpm run lint:legacy-tests` passes.
- [x] 3.3 Add `paths` (`#domain/*`, `#data/*`), rewrite imports to aliases (relative only within one folder), and add core to the factory's `migrated` list. Verify **[attw]**: `pnpm nx run @m0n0lab/investlab-core:lint:eslint`, `:typecheck`, `:test`, `:build` and `:build:check-exports` all pass.

## 4. Platform package

- [x] 4.1 Move the platform files into `src/<side>/<medium>/`, with each test next to its subject. `tokens.ts` stays at each side root.
    - `shared/http-client.ts` → `shared/http/http.client.ts`
    - `shared/read-env.ts` → `shared/config/read-env.ts`
    - `server/config.ts` → `server/config/server.config.ts`
    - `server/process-env-config.ts` → `server/config/process-env.config.ts`
    - `client/config.ts` → `client/config/client.config.ts`
    - `client/ssr-env-config.ts` → `client/config/ssr-env.config.ts`
    - `server/db.ts` → `server/db/pg.client.ts`
    - `client/investlab-api-client.ts` → `client/http/investlab-api.client.ts`
    - `server/platform-server.module.ts` → `di/server.module.ts`
    - `client/platform-client.module.ts` → `di/client.module.ts`

  Verify `pnpm nx run @m0n0lab/investlab-platform:test` passes.
- [x] 4.2 Add the key-value storage (design §10):
    - `shared/storage/key-value.storage.ts`: the interface, plus the typed helpers on a base class.
    - `shared/storage/memory.storage.ts`
    - `client/storage/local.storage.ts`
  Cover the `investlab-platform` "Key-value storage" scenarios with tests next to the implementations, the `localStorage` one in the browser Vitest project. Verify with `pnpm nx run @m0n0lab/investlab-platform:test`.
- [x] 4.3 Add `di/browser.module.ts`, binding `PLATFORM.KeyValueStorage` to the `localStorage` implementation, and export it and the storage interface from `./client`. Test the "Browser storage resolved without configuration" scenario. (Superseded: they move to `./browser` in 4.5, design §8.)
- [x] 4.4 Add `paths` (`#shared/*`, `#server/*`, `#client/*`, `#di/*`), rewrite imports, and add platform to `migrated`. Verify **[attw]**: `pnpm nx run @m0n0lab/investlab-platform:lint:eslint`, `:typecheck`, `:test`, `:build` and `:build:check-exports` all pass.
- [x] 4.5 Platform `.` and `./browser` entries (design §8, §10) **[attw]**:
    - Move the storage token from `client/tokens.ts` to `PLATFORM_SHARED` in a new `shared/tokens.ts`, so `di/browser.module.ts` imports only `shared/` and `client/storage/`.
    - New `src/index.ts` exporting the side-free pieces from `shared/`: the `KeyValueStorage` interface, `MemoryStorage`, `PLATFORM_SHARED` and the `HttpClient` types (`HttpClient`, `HttpMethod`, `HttpRequest`, `HttpResponse`).
    - New `src/browser.ts` exporting only `platformBrowserModule`. `server.ts` and `client.ts` stop exporting side-free pieces, and `client.ts` stops exporting the browser module.
    - Add `.` and `./browser` to `package.json` `exports`, and `src/index.ts` and `src/browser.ts` to tsdown's `entry`.
    - In the same commit, switch the importers:
        - quotes' `ticker-storage.repository.ts` and `testing/client/vitest-integration-setup.ts` take `KeyValueStorage`, `MemoryStorage` and `PLATFORM_SHARED` from `.` (the other quotes and portfolio testing setups use no side-free piece), and the comment in quotes' `di/browser.module.ts` names `PLATFORM_SHARED.KeyValueStorage`;
        - quotes' `finnhub.client.ts` takes `HttpClient` from `.`;
        - the web's `di/container.client.ts` takes `platformBrowserModule` from `./browser`.
  Then verify:
    - `pnpm nx run @m0n0lab/investlab-platform:lint:eslint`, `:typecheck`, `:test`, `:build` and `:build:check-exports` pass;
    - `pnpm nx run-many -t typecheck -p @m0n0lab/investlab-portfolio,@m0n0lab/investlab-quotes,@m0n0lab/investlab-api,@m0n0lab/investlab` passes;
    - `dist/browser.js` and the chunks it imports contain none of `InvestlabApiClient`, `SsrEnvConfig` and `INVESTLAB_API_TOKEN`.

## 5. Portfolio package

- [x] 5.1 Domain moves. Verify with `pnpm nx run @m0n0lab/investlab-portfolio:test:unit`.
    - `entities/<x>.ts` → `model/<x>.model.ts`, with tests `<x>.model.test.ts`.
    - Builders → `src/testing/shared/builder/<x>.builder.ts`.
    - `value-objects/<x>.ts` → `value-object/<x>.value-object.ts`.
    - `read-models/<x>.ts` → `read-model/<x>.read-model.ts`.
    - `ports/<x>.repository.ts` → `repository/`, and `ports/<x>.query.ts` → `query/`.
    - `errors.ts` → `error/instrument.error.ts`, `error/portfolio-item.error.ts` and `error/portfolio-remote.error.ts`, with tests next to them.
    - `domain/GLOSSARY.md` stays.
- [x] 5.2 Application moves. Verify with `:test:integration`.
    - `application/<side>/<x>.use-case.ts` → `application/<side>/use-case/`.
    - `<x>.integration.ts` → `use-case/<x>.use-case.integration.ts`.
    - `given.ts`, `vitest-integration-setup.ts` and `vitest-integration-global-setup.ts` → `src/testing/<side>/`; update `globalSetup` and `setupFiles` in `vitest.config.ts`.
- [x] 5.3 Data moves and renames, each class renamed like its file:
    - `data/contracts/` → `data/shared/dto/`
    - `pg-<x>.repository.ts` → `data/server/repository/<x>-pg.repository.ts`
    - `pg-<x>.query.ts` → `data/server/query/<x>-pg.query.ts`
    - `http-<x>.repository.ts` → `data/client/repository/<x>-api.repository.ts`
    - `http-<x>.query.ts` → `data/client/query/<x>-api.query.ts`
  Verify with `:typecheck` and `:test:integration`.
- [x] 5.4 Mappers (design §4):
    - A mapper with one importer becomes a private method there. Before deleting its legacy test, confirm the integration tests assert the mapped fields.
    - A mapper with two or more importers becomes `mapper/<x>-pg.mapper.ts` or `mapper/<x>-dto.mapper.ts`.
  Update `docs/legacy-tests.txt`; verify `pnpm run lint:legacy-tests` and `:test:integration` pass.
- [x] 5.5 Split `data/server/schema.ts` into `data/server/infra/db/instrument.table.ts` and `portfolio-item.table.ts`. Move `pg-violation.ts` to the platform as `server/db/pg-violation.ts` and export it from `./server` **[attw]**. Point `packages/investlab-database/drizzle.config.ts` `schema` at the glob `../investlab-*/src/data/server/infra/db/*.table.ts`. Verify `pnpm --filter @m0n0lab/investlab-database db:generate` reports no schema changes.
- [x] 5.6 Move `module.server.ts` → `di/server.module.ts` and `module.client.ts` → `di/client.module.ts`. Replace `src/testing/index.ts` with `src/testing.ts`, exporting builders only. Set tsdown's `testing` entry to `src/testing.ts`, and drop portfolio from the `.fallowrc.json` testing entry. Verify `pnpm run lint:fallow`.
- [x] 5.7 Add `paths` (`#domain/*`, `#application/*`, `#data/*`, `#di/*`, `#testing/*`), rewrite imports, and add portfolio to `migrated`. Verify **[attw]**: `pnpm nx run @m0n0lab/investlab-portfolio:lint:eslint`, `:typecheck`, `:test`, `:build`, `:build:check-exports` and `pnpm run lint:legacy-tests` all pass.

## 6. Quotes package

- [x] 6.1 Split `domain/quote.ts` into `domain/model/quote.model.ts` and `domain/repository/quote.repository.ts`, and move `quote.builder.ts` to `src/testing/shared/builder/`. Verify with `pnpm nx run @m0n0lab/investlab-quotes:typecheck`.
- [x] 6.2 Application moves as in 5.2; verify `:test:integration`.
- [x] 6.3 Data moves; `data/server/tokens.ts` stays. Verify `:test:integration`.
    - `data/contracts/` → `data/shared/dto/`
    - `http-quote.repository.ts` → `data/client/repository/quote-api.repository.ts`
    - `cached-quote.repository.ts` → `data/server/repository/quote-cached.repository.ts`
    - `redis-quote.datasource.ts` → `data/server/datasource/quote-redis.datasource.ts`
    - `finnhub-quote.datasource.ts` → `data/server/datasource/quote-finnhub.datasource.ts`. Its HTTP calls and the Finnhub response types move to `data/server/infra/http/finnhub.client.ts`.
    - `batch.ts` becomes private to the Finnhub client. Delete its legacy test once the server quote-list integration test covers more symbols than one batch; add that case if it's missing.
- [x] 6.4 Followed tickers (design §9):
    - **New files:** `domain/model/ticker.model.ts`, `domain/repository/ticker.repository.ts`, `data/client/repository/ticker-storage.repository.ts` over `KeyValueStorage`, and `application/client/use-case/ticker-{list,add,remove}.use-case.ts`.
    - **Tests:** integration tests over the in-memory storage, covering every `ticker-management` scenario. That includes the list saved before the change and the corrupt value, as well as alphabetical order and the add/remove requirements.
    - **Wiring:** `di/browser.module.ts`, exported from `./client` (superseded: `./browser` in 6.6).
    - Verify with `:test:integration`.
- [x] 6.5 Do the moves in 5.6 for quotes, add `paths` as in 5.7, and add quotes to `migrated`. Verify **[attw]**: `pnpm nx run @m0n0lab/investlab-quotes:lint:eslint`, `:typecheck`, `:test`, `:build`, `:build:check-exports`, `pnpm run lint:legacy-tests` and `pnpm run lint:fallow` all pass.
- [x] 6.6 Quotes `./browser` entry (design §8) **[attw]**:
    - New `src/browser.ts` exporting `quotesBrowserModule`, the `QUOTES` tokens and the ticker use cases; `client.ts` stops exporting the browser module and the ticker use cases, and keeps `QUOTES` for the quote list.
    - Add `./browser` to `package.json` `exports` and to tsdown's `entry`.
    - The adapter marker needs no move: `quote-api.repository.ts` and `ticker-storage.repository.ts` already name their source. Confirm every `data/client/` file does.
    - In the same commit, switch the quotes imports and the `QUOTES` re-export in the web's `di/container.client.ts` to `./browser`.
  Then verify:
    - `pnpm nx run @m0n0lab/investlab-quotes:lint:eslint`, `:typecheck`, `:test`, `:build` and `:build:check-exports` pass, and `pnpm nx run @m0n0lab/investlab:typecheck` passes;
    - `dist/browser.js` and the chunks it imports contain none of `QuoteApiRepository`, `InvestlabApiClient` and `INVESTLAB_API_TOKEN`.

## 7. API

- [x] 7.1 Move the API files; `index.ts`, `app.ts` and `app.integration-platform.ts` stay. Verify with `pnpm nx run @m0n0lab/investlab-api:test:integration-platform`.
    - `container.ts` → `di/container.ts`
    - `routes/instruments.routes.ts` → `portfolio/route/instrument.route.ts`
    - `routes/portfolio-items.routes.ts` → `portfolio/route/portfolio-item.route.ts`
    - `routes/quotes.routes.ts` → `quotes/route/quote.route.ts`
    - `routes/health.routes.ts` → `core/route/health.route.ts`
    - each harness and integration-platform test → next to its route, as `<concept>.route.harness.ts` and `<concept>.route.integration-platform.ts`
    - `testing/base-api-harness.ts` → `core/harness/api.harness.ts`
    - `middleware/bearer-auth.ts` → `core/middleware/bearer-auth.middleware.ts`
    - `errors/error-mapping.ts` → `core/mapper/error-http.mapper.ts`
    - `routes/reply.ts` → `core/mapper/result-http.mapper.ts`
    - `errors/request-validation.error.ts` → `core/error/request-validation.error.ts`
- [x] 7.2 Replace `errors/parse-request.ts` with `core/middleware/request-validation.middleware.ts`; verify that the integration-platform tests asserting 422 responses pass unchanged.
- [x] 7.3 Split `serializers/dto-serializers.ts`: each `to*Dto` becomes private to the route that uses it, or moves to `<module>/mapper/<concept>-dto.mapper.ts` when two routes share it. Verify no `serializers/` folder remains.
- [x] 7.4 Make each module's route file export a Hono sub-app, mounted by `app.ts`. Add `paths` (`#core/*`, `#di/*`, `#portfolio/*`, `#quotes/*`, and `#app` → `src/app.ts`), rewrite imports, and add the API to `migrated`. In the factory, let `*.harness.ts` files import the app entry they drive (design §12). Then verify:
    - `pnpm nx run @m0n0lab/investlab-api:lint:eslint`, `:typecheck`, `:test:integration-platform` and `:build` pass;
    - a non-harness file in `core/` or a module that imports `#app` fails `:lint:eslint`;
    - `grep -rn '"#' apps/investlab-api/dist` finds nothing;
    - `pnpm --filter @m0n0lab/investlab-api dev` starts.

## 8. Web

- [x] 8.1 Set `appDirectory: "src"` in `react-router.config.ts`, move `app/` to `src/` (`root.tsx`, `entry.server.tsx`, `routes.ts` and `app.css` at its root), and regenerate the route types; verify `pnpm nx run @m0n0lab/investlab:typecheck`.
- [x] 8.2 Portfolio module. Verify that the portfolio legacy tests still pass at their new paths, and update `docs/legacy-tests.txt`.
    - `components/portfolio/portfolio-page.tsx` → `portfolio/page/portfolio.page.tsx`
    - the other components → `portfolio/component/<x>.component.tsx`
    - `use-portfolio-view-model.ts` → `portfolio/view-model/portfolio.view-model.ts`, absorbing the view types from `types.ts`
    - `lib/portfolio-item-form.ts` → `portfolio/form/portfolio-item.form.ts`
    - the loader and action → `portfolio/loader/portfolio.loader.server.ts` and `portfolio/action/portfolio.action.server.ts`, absorbing `lib/portfolio.server.ts`
    - `routes/portfolio.tsx` becomes a shell that only re-exports (superseded: the loader and action move into the route file in 8.5, design §7)
- [x] 8.3 Quotes module and core. Verify with `:typecheck`.
    - The index page → `quotes/page/ticker.page.tsx`, and the ticker components → `quotes/component/<x>.component.tsx`.
    - The `/api/quotes` loader → `quotes/loader/quote-list.loader.server.ts`, absorbing `lib/quotes.server.ts`.
    - `routes/_index.tsx` and `routes/api.quotes.ts` become shells (superseded: the loader moves into the route file in 8.5, design §7).
    - `lib/remote-error.ts` → `core/mapper/remote-error.mapper.ts`, and components no module owns → `core/component/`.
- [x] 8.4 Composition:
    - `lib/container.server.ts` and its legacy test → `di/container.server.ts`.
    - New `di/container.client.ts`, loading only the platform and quotes browser modules.
    - `quotes/hook/use-followed-tickers.hook.ts`, resolving the ticker use cases from it.
    - `quotes/hook/use-quote-polling.hook.ts`, holding the poller and the route request, validated with `quoteDtoSchema`. The poller and route-source legacy tests merge into `use-quote-polling.hook.legacy.test.ts`.
    - Delete `lib/wealth.ts`, the `ticker/` folder and `ticker-store.legacy.test.ts` (replaced by the 6.4 tests), and update `docs/legacy-tests.txt`.
    - Lower the web's coverage floors in `vitest.config.ts` to 45/40/40/45 (lines, branches, functions, statements), a one-off exception recorded in design §12.
    - Verify with `:test`, `:test:coverage` and `pnpm run lint:legacy-tests`.
- [x] 8.5 Route adapters (design §7) and aliases:
    - Move each module loader and action (`portfolio/loader/`, `portfolio/action/`, `quotes/loader/`) into its route file (`routes/portfolio.tsx`, `routes/api.quotes.ts`), typed with `Route.LoaderArgs`, `Route.ActionArgs` and `Route.ComponentProps` from `./+types/<route>`, each with an explicit return type. Each page route declares its route component, which passes the loader data to the module's page as props.
    - Move their legacy tests next to the route file (the portfolio loader and action tests merge into `routes/portfolio.legacy.test.ts`), and update `docs/legacy-tests.txt`.
    - Add `PortfolioActionResult` to `portfolio/form/portfolio-item.form.ts`, return it from the action, and read it with `useFetcher<PortfolioActionResult>()` in the portfolio components.
    - In the factory, drop `loader` and `action` from the UI app kinds, and allow a `./client` entry in the web only from `src/routes/` and `src/di/` (narrowed in 8.6).
    - Add `paths` (`#core/*`, `#di/*`, `#portfolio/*`, `#quotes/*`), rewrite imports, and add the web to `migrated`.

  Then verify:
    - `pnpm nx run @m0n0lab/investlab:lint:eslint`, `:typecheck`, `:test` and `:build` pass;
    - the client assets contain none of the strings from 1.3 (passes once 8.6 is done);
    - by hand: with `wealth-tracker-tickers` set in the old format before loading the page, the same tickers show and quotes refresh.
- [x] 8.6 Browser container on `./browser` entries (design §8), before 8.5's client assets check:
    - `di/container.client.ts` imports only `./browser` entries (switched in 4.5 and 6.6); confirm no `./client` import or re-export remains in it.
    - In the factory, allow a `./client` entry in the web only from `src/routes/` and `src/di/container.server.ts`, and a `./browser` entry only from `src/di/container.client.ts`. Type-only imports get no exception: types the view needs come from `.` or are re-exported by `src/di/`.
  Then verify:
    - `pnpm nx run @m0n0lab/investlab:lint:eslint`, `:typecheck`, `:test` and `:build` pass;
    - a deliberate `./client` import in `di/container.client.ts`, and a `./browser` import in a route file, each fail `:lint:eslint`;
    - the client assets contain none of the strings from 1.3, which closes 1.3 and 8.5's assets check.

## 9. Cleanup and integration

- [x] 9.1 Delete the old InvestLab boundaries table and the `no-restricted-imports` groups the factory replaced, and give the factory the full InvestLab project set. Add the device rules (spec "Device compositions hold no credentialed code" and "Runtime entries only in compositions", design §8):
    - packages: `di/browser.module.ts` and `browser.ts` import from `data/client/` only files named for a device medium (`storage`); those files never import an `api` file and take platform pieces only from `.`; `client.ts` never imports `di/browser.module.ts`;
    - every package and app: a `./browser` entry is imported only from a package's `di/` and `testing/` files and an app's `src/di/`;
    - platform: `di/browser.module.ts` and `browser.ts` import only `shared/` and `client/storage/`; `index.ts` exports only `shared/` code, and no other entry exports it.
  Verify:
    - `pnpm nx run-many -t lint:eslint` is green;
    - a deliberate violation of each rule fails: an unknown file, a folder/suffix mismatch, `../`, repository → repository, `core/` → module, server → client, a browser module importing an `api` repository, a `storage` adapter importing the platform `./client`, a `storage` adapter importing the platform `./browser`, the platform browser module importing `client/http/`, and the platform `client.ts` exporting `MemoryStorage`.
- [x] 9.2 Remove what is left of the `.fallowrc.json` testing entry; verify `pnpm run lint:fallow` and `pnpm run lint:knip` pass.
- [x] 9.3 Propose to the owner one `AGENTS.md` line pointing to ADR 0009, and add it only if approved. Verify with `git diff AGENTS.md`. The owner declined it (design §12).
- [x] 9.4 Final check: `pnpm nx run-many -t lint:eslint typecheck test build build:check-exports -p '@m0n0lab/investlab*'`, `pnpm run lint:legacy-tests`, `pnpm run lint:fallow` and `pnpm run lint:knip` all green. Then a manual pass on the web: portfolio create/update/delete, add and remove a ticker, quotes refreshing.

## 10. Verify follow-ups (owner, 2026-10-31)

- [x] 10.1 Ticker storage treats a list with an invalid `addedAt` as corrupt (empty list, no throw), with the case added to the ticker list integration test.
- [x] 10.2 Renames: the three API route harnesses (`InstrumentRouteHarness`, `PortfolioItemRouteHarness`, `QuoteRouteHarness`), and `portfolio-item-api.query.ts` → `portfolio-item-list-api.query.ts` (`PortfolioItemListApiQuery`). The server portfolio item list use case uses the domain read model instead of its copy.
- [x] 10.3 Stale comments: the web's coverage floors, and the `tokens.ts` files that still name `module.<side>.ts`.
- [x] 10.4 Lint: only test files and harnesses import a `./testing` entry in apps. Probe each new scenario in "Apps import only their side".
- [x] 10.5 Spec and design: model and base-class names, the platform's "four code entries", app test imports (design §12). ADR 0008: harness paths and its example's class name.
- [x] 10.6 Final check as in 9.4, without the manual pass.
- [ ] 10.7 Lint factory: the database package's import ban and the apps' outside-`src/` bans come from `cleanArchitectureLint` (design §13), and its option `migrated` becomes `projects`. Prove `--print-config` is unchanged for InvestLab and probe each moved rule.

## Workflow follow-up

- Archive `clean-architecture-layout` after review, then confirm `openspec/specs/clean-architecture-layout/spec.md` exists and the modified specs carry the new requirements.
