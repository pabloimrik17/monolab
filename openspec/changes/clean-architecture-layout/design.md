# Design

## Context

See proposal.md for the motivation. State this design starts from, once `investlab-modular-packages` is archived:

- **InvestLab packages** (`portfolio`, `quotes`) are layered as `domain/{entities,ports,read-models,value-objects}`, a loose `domain/errors.ts`, `application/<side>/` with use cases, tests and setup side by side, `data/{contracts,server,client}/` with flat files, and `module.<side>.ts` at the root. `src/testing/index.ts` exports builders that live in `domain/entities/`, and `.fallowrc.json` declares it as an entry by hand because fallow maps `dist/testing.js` to `src/testing.ts`.
- **InvestLab core and platform** are flat (`errors.ts`, `api-error.dto.ts`) or split by side only (`client/`, `server/`, `shared/`).
- **The API** groups by technical role (`routes/`, `errors/`, `middleware/`, `serializers/`, `testing/`).
- **The web** keeps React Router's default `app/` directory and groups by role (`components/`, `lib/`, `ticker/`). `lib/wealth.ts` builds the followed-ticker store and the quote poller by hand for the browser.
- **The layer lint** (`eslint.config.ts`) is an `eslint-plugin-boundaries` table hard-coded to `packages/investlab-{portfolio,quotes,platform}/src`, plus `no-restricted-imports` groups for package specifiers. Apps and other products are not covered.
- **Imports** are relative; no project declares aliases. Packages are consumed through `dist/`: no `package.json` uses the `@m0n0lab/source` condition, so a package's internal imports never reach its consumers.
- **Legacy tests** are tracked by path in `docs/legacy-tests.txt`; `lint:legacy-tests` diffs that list against `git ls-files`.

## Goals / Non-Goals

**Goals:**

- One product-agnostic layout spec (`clean-architecture-layout`) that qup and green-beard adopt without changes.
- InvestLab fully migrated and lint-clean against it.
- A lint that a new product joins with one call.

**Non-Goals:**

- Migrating qup or green-beard. Their plans are updated in sibling changes of the same PR.
- Renaming business concepts, changing package entries, or changing HTTP behaviour.
- Replacing legacy tests beyond the ones whose subject is rewritten here (the followed-ticker store, the quote poller and the route quote source).
- Fixing the seven pending InvestLab changes (`investlab-roger-*`, `investlab-portfolio-returns`, `investlab-portfolio-allocations`, `investlab-overview`). They already name `investlab-domain`, which ADR 0007 removed; they need a separate rewrite.

## Decisions

### 1. Layer, then side, then kind

`data/server/repository/` rather than `server/data/repository/` or a flat `data/` with suffixes only. Domain has no side, so putting the side first would split it. A flat folder per side mixes repositories, datasources, infra and mappers in one list. The kind folder repeats the suffix on purpose: the folder groups files, and the suffix keeps the name unambiguous in editor tabs, search results and stack traces.

*Alternatives*: suffix only (Manguinho's layout), rejected because folders grow too long; folder only, rejected because file names collide (`instrument.ts` in three folders).

### 2. Ports by language, not by layer of use

Repository and read query ports live in domain, because the business names them: Evans's repositories, one per aggregate root. Mechanisms a flow needs, such as an event bus, a clock or a mailer, are technical ports in `application/<side>/port/`. Uncle Bob puts every gateway in the use-case ring. We keep his dependency rule and take DDD's placement for the ports whose vocabulary is the business's.

### 3. Data access: infra, then a datasource only if needed

A repository with one source calls its infra client directly. A datasource per source appears only when a repository combines two or more, as the cached quote repository does. Infra speaks the medium's terms and holds the external response types: Finnhub's shapes live in `finnhub.client.ts`, not in `dto/`, because a DTO is our own HTTP contract.

*Alternative*: always repository → datasource → infra (the Android and Flutter layout), rejected. Most InvestLab repositories have one source, so every datasource would be a pass-through.

### 4. Mapping lives where it is used

A mapping is a private method until a second file needs it. Then it moves to `mapper/<concept>-<foreign shape>.mapper.ts`. The API's `dto-serializers.ts` is split this way: each `to*Dto` either becomes private to its route or moves to the module's `mapper/` when two routes share it.

### 5. Aggregate rules from DDD, read queries from CQRS

A repository never imports another aggregate's repository, which the lint can check: no `repository/` file imports another `repository/` file in data. A decorator receives the wrapped implementation through injection, so it imports only the port. Writes across aggregates are orchestrated by use cases. Reads across aggregates are read queries returning read models. This is Vernon's "use case optimal query" and the "simplified CQRS" of Microsoft's eShopOnContainers, not a concept of our own.

### 6. Tests named after their subject; support in `src/testing/`

`instrument-create.use-case.integration.ts` repeats the subject's full name, so a test and its subject sort together and a search for the subject finds both. Builders move to `testing/shared/builder/`, and the `./testing` entry is built from `src/testing.ts`. That puts the entry where fallow expects it, so the `.fallowrc.json` workaround goes away. `given.ts` and the setup files move to `testing/<side>/`; they are support, not subjects.

### 7. Apps: modules, `core/`, `di/`; route trees as shells

App modules mirror the module packages (`portfolio/`, `quotes/`). There is no `presentation/` folder, because an app holds only that layer. React Router and SvelteKit keep their route tree in `src/routes/`, and each route file only re-exports the module's page, loader and action. The web moves to `appDirectory: "src"`, which also moves React Router's type generation (`.react-router/types/src/...`), so the `rootDirs` setup stays as it is. Hono has no route tree: each module's `route/` files export a Hono sub-app, and `src/app.ts` mounts them.

### 8. Composition per runtime

- **Packages** wire each side in `di/server.module.ts` and `di/client.module.ts`. Code that only runs in the browser goes in `di/browser.module.ts`, exported from `./client`, so the four entries stay.
- **The web** gains `di/container.client.ts`, React Router's browser-only suffix. It loads only the browser modules of the platform (key-value storage over `localStorage`) and quotes (followed tickers), so it never holds `Config` or the API token. `di/container.server.ts` replaces `lib/container.server.ts`.

*Alternative*: build the ticker pieces by hand in the hook, as `wealth.ts` does today. Rejected: it means exporting the repository and having a second wiring site.

### 9. Followed tickers move to quotes; polling stays in the web

- **To the quotes package:**
  - the `Ticker` model and the `TickerRepository` port;
  - `data/client/repository/ticker-storage.repository.ts`, over the platform's `KeyValueStorage`;
  - `ticker-list`, `ticker-add` and `ticker-remove` client use cases.
- **Data compatibility:** the storage key (`wealth-tracker-tickers`) and the stored format (`{ symbol, addedAt }[]`, ISO dates) do not change, so existing watchlists load.
- **What stays in the web:** the browser request to `/api/quotes` is the web talking to its own resource route, which already runs the quote list use case on the SSR server. It stays in `quotes/hook/use-quote-polling.hook.ts` and validates responses with `quoteDtoSchema`.

### 10. Key-value storage in the platform

The platform gets three files:
- `shared/storage/key-value.storage.ts`: the `KeyValueStorage` interface, with text `get`, `set` and `remove`. Typed helpers (`getNumber`/`setNumber`, `getObject`/`setObject`) are written once on top of the text methods, in a base class the implementations extend.
- `client/storage/local.storage.ts`: the implementation over `window.localStorage`.
- `shared/storage/memory.storage.ts`: the in-memory implementation, for tests and server rendering.

A typed read of an unreadable value returns no value. New helpers are added when a consumer needs one.

### 11. No catch-all folders

A file that fits no kind is private to its only user, or moves to the kind it acts as, to infra, or to the platform. A new kind is added to the spec and the lint together. Current cases:

| File | Becomes |
| --- | --- |
| API `errors/error-mapping.ts` | `core/mapper/error-http.mapper.ts` |
| API `routes/reply.ts` | `core/mapper/result-http.mapper.ts` |
| API `errors/parse-request.ts` | `core/middleware/request-validation.middleware.ts`: a Hono middleware replacing the parse helpers, same 422 responses |
| API `errors/request-validation.error.ts` | `core/error/request-validation.error.ts` |
| portfolio `data/server/pg-violation.ts` | platform `server/db/pg-violation.ts` (Postgres knowledge, no business) |
| quotes `data/server/batch.ts` | private to its only user, the Finnhub client |
| platform `shared/read-env.ts` | platform `shared/config/read-env.ts` |
| web `lib/remote-error.ts` | `core/mapper/remote-error.mapper.ts` |
| web `lib/portfolio-item-form.ts` | `portfolio/form/portfolio-item.form.ts` (new `form/` kind) |
| web `lib/portfolio.server.ts`, `lib/quotes.server.ts` | folded into the loaders and actions that call them |
| web `components/portfolio/types.ts`, `ticker/types.ts` | view types into the view model, props types into their component, `Ticker` into the quotes package |

### 12. Path aliases: tsconfig `paths`, `#` prefix, one per top-level folder

The owner chose tsconfig `paths` over `package.json` `imports`. The `#` prefix tells our code apart from `@m0n0lab/*` packages, can never collide with an npm scope, and keeps a later move to `imports` free of import rewrites. Aliases are a closed list per project: a folder outside it cannot be imported by alias.

Each tool needs its own setting:

| Tool | Support |
| --- | --- |
| `tsc` | `paths` |
| Vite 8 (InvestLab web, every Vitest config) | `resolve.tsconfigPaths: true`, still experimental; `vite-tsconfig-paths` as fallback |
| tsdown | reads the tsconfig by default (`tsconfig: true`) |
| tsx (API dev) | reads `paths` |
| SvelteKit | `kit.alias`, which generates `paths` |
| SolidStart (Vite 6.4) | `vite-tsconfig-paths`, in the qup change |
| `eslint-plugin-boundaries` | needs `eslint-import-resolver-typescript` |
| fallow, knip | expected to read `paths`; verified in task 1 |

*Alternatives*:
- One alias per kind (`#repository/*`): rejected, because `repository/`, `query/`, `use-case/` and `port/` exist on more than one side or layer.
- One root alias (`#/*`): rejected by the owner, because the alias should say where code comes from.
- The `@` prefix: rejected, because it looks like a package and could collide with a real scope.

### 13. One lint factory per product

`eslint.config.ts` gets a `cleanArchitectureLint({ product, modules })` factory. It returns the boundaries config and the `no-restricted-imports` groups for one product prefix.

- **What it matches:**
  - package layers by `packages/<product>-*/src/<layer>/<side>/<kind>/`;
  - core and platform by package name;
  - apps by `apps/<product>*/src/<module|core|di|routes>/`.
- **Elements:** each element is a folder plus a file suffix. Tests, harnesses and framework suffixes are file categories, so `no-unknown-files` can reject everything else.
- **Import rules:**
  - The `../` ban joins each `no-restricted-imports` group. Flat config replaces a rule's options per file, so it cannot live in a separate block.
  - Cycles between app modules are left to `lint:fallow` (`fallow dead-code`), which already reports circular dependencies in CI.
- **Rollout:** during the migration the factory takes a list of migrated projects, and the old InvestLab table is deleted when the list is complete.

### 14. Migration mechanics

- Files move with `git mv`, so history follows them.
- Each project is migrated in its own commit, and its Nx targets must pass before the next starts.
- A legacy test that moves updates `docs/legacy-tests.txt` in the same commit. One that is replaced by an integration test is removed from the list.

## Risks / Trade-offs

- **[Vite 8's `resolve.tsconfigPaths` is experimental]** → Task 1 tests it in a package's Vitest run and in the web build. If either fails, use `vite-tsconfig-paths` instead.
- **[tsdown's bundled `.d.ts` keeps `#` specifiers]** → Task 1 builds a package and greps `dist/` for `"#`. If any remain, set `paths` in tsdown's `dts.compilerOptions` or resolve them with its `alias` option before migrating.
- **[`./client` drags server-side client code into the browser bundle]** The browser container imports `./client` for the browser modules. Inversify-decorated classes are hard to tree-shake, so the API client could land in the browser.
  → Task 1 checks the bundle against the existing "browser bundle stays free of server code" scenario.
  → If it fails, stop and ask the owner. The way out is a `./browser` entry, and the owner fixed the entries.
- **[Open branches and pending changes collide with moved paths]** → The PR lists every move. Pending InvestLab changes are already stale (see Non-Goals).
- **[Splitting `schema.ts` changes the drizzle snapshot]** → A spec scenario requires `db:generate` to report no change right after the split.
- **[Users lose their watchlist]** → The storage key and format stay. An integration test reads a value written in the old format.
- **[New kinds pile up]** → A kind exists only once the spec and the lint list it, and the review of that change is where the owner says no.

## Migration Plan

1. **Gates**: `investlab-modular-packages` archived, and the alias toolchain verified.
2. **Tooling**: aliases in every InvestLab tsconfig and Vite config, the lint factory with an empty migrated list, and `eslint-import-resolver-typescript`.
3. **Projects in dependency order**: core, platform (key-value storage included), portfolio, quotes (followed tickers included), API, web (browser container included). Each one joins the factory's migrated list.
4. **Cleanup**: delete the old InvestLab lint table, the fallow workaround and the `module.*.ts` leftovers, and update ADR 0007's status.

Nothing is deployed differently. Rollback is reverting the PR; no data migration runs, and the watchlist format is unchanged.
