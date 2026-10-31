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
- Renaming business concepts or changing HTTP behaviour. Package entries change only to add one per device runtime (§8).
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

### 7. Apps: modules, `core/`, `di/`; route files as framework adapters

App modules mirror the module packages (`portfolio/`, `quotes/`). There is no `presentation/` folder, because an app holds only that layer. The web moves to `appDirectory: "src"`, which also moves React Router's type generation (`.react-router/types/src/...`), so the `rootDirs` setup stays as it is. Hono has no route tree: each module's `route/` files export a Hono sub-app, and `src/app.ts` mounts them.

React Router and SvelteKit keep their route tree in `src/routes/`, and each route file is the framework adapter of its URL:
- **What it holds:** the `loader`, the `action` and the route component, typed with the generated route types (`Route.LoaderArgs`, `Route.ActionArgs`, `Route.ComponentProps` from `./+types/<route>`), each with an explicit return type. SvelteKit's `+page.server.ts` already works this way.
- **What it does:** it resolves use cases from `di/container.server.ts`, calls them, and passes props to the module's page. The conversion of a use-case result to the page's view data stays inside the loader. No business logic.
- **Typed action results:** the form contract `PortfolioActionResult` (`{ ok: true } | { error: string; fieldErrors?: PortfolioFieldErrors }`) lives in `portfolio/form/portfolio-item.form.ts`. The route action returns it, and components read it with `useFetcher<PortfolioActionResult>()`.

Why (owner, 2026-10-30): loaders and actions carry the framework's signature and semantics; a loader throws a `Response` for the error boundary. The view already depends on the framework (`useFetcher`), so moving action logic out of it buys little. And with the loader in the route file, the generated types check the loader against the page again, which was lost when the page typed `loaderData` by hand.

*Alternative*: `loader/` and `action/` kinds in each module, with route files that only re-export them. This was the first plan, applied in tasks 8.2–8.3 and undone in 8.5.

### 8. Composition per runtime

Sides and runtimes are two axes. A side is the end of the product's HTTP contract a piece serves: `server` implements it (the API), `client` consumes it (any app, wherever its code runs), `shared` serves both. A runtime is where an app's code executes: the API's server, the web's server or the browser. Application is split only by which system runs the flow, never by device, and a data adapter is bound to a medium, not to a consumer app. The runtime appears only in composition.

- **One container module and one entry per runtime:**
  - `di/server.module.ts` → `./server`: the API.
  - `di/client.module.ts` → `./client`: a consumer that holds the API credential, the web's server today, a worker or CLI later.
  - `di/browser.module.ts` → `./browser`: the browser.
  - A package with no code for a runtime has no module or entry for it: portfolio keeps `.`, `./server`, `./client` and `./testing`.
- **Credentialed and device adapters:** the source in a `data/client/` file name already tells them apart (`<concept>-<source>.<kind>.ts`). An `api` file reaches the product's API with the consumer's credential, a `storage` file uses the device's storage. A device module imports only device adapters, and they reach the platform only through `./browser`, so a device entry cannot contain credentialed code. The platform applies the same rule through its medium folders: `di/browser.module.ts` imports only `shared/` and `client/storage/`.
- **The web** gains `di/container.client.ts`, React Router's browser-only suffix. It loads only the `./browser` entries of the platform (key-value storage over `localStorage`) and quotes (followed tickers), so it never holds `Config` or the API token. `di/container.server.ts` replaces `lib/container.server.ts`.
- **Framework suffixes in `di/`:** `di/` is the app's composition root, the same framework edge as `routes/`, so both containers keep React Router's suffixes. `.server` makes the build fail if browser code reaches the server container, and `.client` keeps the browser container out of server rendering.
- **Who imports which entry in the web:** `./client` only from `src/routes/` and `src/di/container.server.ts`, `./browser` only from `src/di/container.client.ts`. Hooks get the use cases from `di/container.client.ts`. The types the view needs come from the package's `.` entry, as `Ticker` does, or are re-exported by `di/`. Type-only imports get no exception (§12).
- **A new device** adds one module and one entry. A React Native app would add `di/native.module.ts` → `./native`, reuse `application/client/`, and bind `KeyValueStorage` to the platform's storage for that device. The spec states the rule, one entry per runtime, and names no `./native`. A device holds no API credential; how a future device authenticates (through the web, or with user auth in the API) is an auth decision outside this change.

*Alternatives*:
- Build the ticker pieces by hand in the hook, as `wealth.ts` does today. Rejected: it means exporting the repository and having a second wiring site.
- Other ways to split runtimes (A, D) and adapter markers: §12, "Decided during apply".

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

The `./browser` entry exports the interface, the in-memory implementation and the browser module that binds the `localStorage` one. The storage token moves to `shared/tokens.ts`: the client `PLATFORM` tokens name the API client and `Config`, and the browser entry carries neither. Side-free pieces are re-exported by each runtime entry that needs them, as `HttpClient` already is, so the platform still has no root entry.

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
| web `lib/portfolio.server.ts`, `lib/quotes.server.ts` | folded into the route files' loaders and actions (§7) |
| web `components/portfolio/types.ts`, `ticker/types.ts` | view types into the view model, props types into their component, `Ticker` into the quotes package |

### 12. Path aliases: tsconfig `paths`, `#` prefix, one per top-level folder

The owner chose tsconfig `paths` over `package.json` `imports`. The `#` prefix tells our code apart from `@m0n0lab/*` packages, can never collide with an npm scope, and keeps a later move to `imports` free of import rewrites. Aliases are a closed list per project: a folder outside it cannot be imported by alias. The one file alias is `#app` → `src/app.ts` in an API app (owner, 2026-10-30): the base harness drives the app it imports, and without `../` it has no other way to reach the entry. Only `*.harness.ts` files may import it.

Each tool needs its own setting:

| Tool | Support |
| --- | --- |
| `tsc` | `paths` |
| Vite 8 (InvestLab web, every Vitest config) | `resolve.tsconfigPaths: true`, still experimental; verified, but only for files the tsconfig includes (see below) |
| tsdown | verified with its defaults (JS and bundled `.d.ts`) |
| tsx (API dev) | reads `paths` |
| SvelteKit | `kit.alias`, which generates `paths` |
| SolidStart (Vite 6.4) | `vite-tsconfig-paths`, in the qup change |
| `eslint-plugin-boundaries` | `eslint-import-resolver-typescript`, set in a block next to `createConfig` |
| fallow, knip | read `paths`; verified in task 1 |

**Verified in task 1** (2026-10-28; Vite 8.1.5, Vitest 5.0.5, tsdown 0.22.9, TypeScript 6.0.3):
- **Vitest:** `resolve.tsconfigPaths: true` in `sharedConfig` reaches every project. It applies only to files the tsconfig includes (`vite-tsconfig-paths` too), so each project gets a `tsconfig.test.json` (all of `src/`, own `outDir` and `tsBuildInfoFile`), referenced from `tsconfig.json`. Owner decision: tests get aliases and are typechecked.
- **tsdown:** the `dist` check is `grep -rn --exclude='*.map' '"#' dist`; only `sourcesContent` in the maps keeps `#`.
- **ESLint:** without the resolver an alias import escapes the layer table. `createConfig` rejects settings outside `boundaries/*`, so `import/resolver: { typescript: { project: "packages/investlab-*/tsconfig.json" } }` sits in its own block. It needs `unrs-resolver: false` in `allowBuilds` and a fallow `ignoreDependencies` entry.
- **fallow, knip:** an unresolved `#` import fails fallow; knip lists it but stays under `--max-issues`, so fallow is the gate.
- **attw:** `build:check-exports` on the InvestLab packages uses `--profile esm-only` (owner decision): private ESM-only packages resolve only through `bundler` and `node16` ESM, and subpath-only exports fail `node10`. Published libraries keep `strict`.
- **Browser bundle (1.3):** failed. `./client` from a `*.client.ts` file put `HttpQuoteRepository`, `InvestlabApiClient` and the platform client module in the route chunk (token and env name stay out). Cause: top-level decorator and `ContainerModule` side effects, no `sideEffects` flag. Probes: `"sideEffects": false` alone does nothing; with tsdown `unbundle: true` it passes. Not applied: the owner chose design E instead (below, and §8).

*Alternatives*:
- One alias per kind (`#repository/*`): rejected, because `repository/`, `query/`, `use-case/` and `port/` exist on more than one side or layer.
- One root alias (`#/*`): rejected by the owner, because the alias should say where code comes from.
- The `@` prefix: rejected, because it looks like a package and could collide with a real scope.

**Decided during apply** (owner, 2026-10-30/31):
- **Web coverage floors (8.4):** lowered to 45/40/40/45 (lines, branches, functions, statements), the measured value rounded down. This is a one-off exception to ADR 0008's "floors are never lowered". The covered `ticker-store.ts` moved to quotes, where the 6.4 tests cover it. No test was lost, and what stays in the web was already untested in the page. `agentic-task-3ao3` (UI harness) will raise them.
- **`AGENTS.md` (9.3):** the owner declined the line pointing to ADR 0009; none was added.
- **Runtimes by composition entry (design E, 1.3):** the product runs in three runtimes, but packages had two sides. The `client` side mixed web-server code that needs the API credential (`InvestlabApiClient`, the API repositories) with browser code that must never see it (`localStorage`, followed tickers), and one `./client` entry carried both. tsdown bundles each entry into one file and inversify decorators defeat tree-shaking, so the browser bundle got the API client. The web rule "`./client` only from `.server` files" only compensated for that mixing. Chosen: sides stay the ends of the HTTP contract, and the runtime appears only in composition, one module and one entry per runtime (§8). Side and Runtime are now defined apart in the glossary. Rejected:
  - A, `"sideEffects": false` plus tsdown `unbundle: true`: a bundler patch over the mixing, which stays in the code.
  - D, sides renamed per runtime (`api`, `web`, `browser`): it puts the device in application and data folders, so a React Native app replicating the web would duplicate the followed-ticker use cases.
- **Adapter marker:** the source already in a `data/client/` file name (`-api` credentialed, `-storage` device), fixed by "File names start with the concept". No file moves, and the lint checks it by path. A new device medium joins the spec and the lint together, like a kind.
- **Type-only imports from `./client` in the view:** no exception (option 2). Types the view needs come from `.` or are re-exported by `di/`. Fallback if that proves too strict (option 1): `allowTypeImports: true` on the web's `./client` ban, plus one scenario allowing `import type` from `./client` in a component.
- **Follow-up, out of scope:** run `typecheck`, `test` and `build` with `APP_ENV=ci`, so local checks never reach 1Password.

### 13. One lint factory per product

`eslint.config.ts` gets a `cleanArchitectureLint({ product, modules })` factory. It returns the boundaries config and the `no-restricted-imports` groups for one product prefix.

- **What it matches:**
  - package layers by `packages/<product>-*/src/<layer>/<side>/<kind>/`;
  - core and platform by package name;
  - apps by `apps/<product>*/src/<module|core|di|routes>/`.
- **Elements:** each element is a folder plus a file suffix. Tests, harnesses and framework suffixes are file categories, so `no-unknown-files` can reject everything else.
- **Import rules:**
  - The `../` ban and the subfolder ban (`./sub/x`, except `./+types/`) join each `no-restricted-imports` group. Flat config replaces a rule's options per file, so it cannot live in a separate block.
  - Cycles between app modules are left to `lint:fallow` (`fallow dead-code`), which already reports circular dependencies in CI.
  - Device rules (§8) match by path: the source in a `data/client/` file name in packages, the medium folder in the platform, and the container file in the web.
- **Rollout:** during the migration the factory takes a list of migrated projects, and the old InvestLab table is deleted when the list is complete.

### 14. Migration mechanics

- Files move with `git mv`, so history follows them.
- Each project is migrated in its own commit, and its Nx targets must pass before the next starts.
- A legacy test that moves updates `docs/legacy-tests.txt` in the same commit. One that is replaced by an integration test is removed from the list.

## Risks / Trade-offs

- **[Vite 8's `resolve.tsconfigPaths` is experimental]** → Task 1 tests it in a package's Vitest run and in the web build. If either fails, use `vite-tsconfig-paths` instead.
- **[tsdown's bundled `.d.ts` keeps `#` specifiers]** → Task 1 builds a package and greps `dist/` for `"#`. If any remain, set `paths` in tsdown's `dts.compilerOptions` or resolve them with its `alias` option before migrating.
- **[`./client` drags server-side client code into the browser bundle]** Inversify-decorated classes are hard to tree-shake, so a browser container importing `./client` gets the API client.
  → Task 1.3 checked the bundle against the "browser bundle stays free of server code" scenario. It failed (see §12).
  → The owner chose design E (§8): the browser container imports only `./browser` entries, which hold no credentialed code by construction. Tasks 4.5, 6.6 and 8.6 apply it, and 1.3 passes once 8.6 is done.
- **[Open branches and pending changes collide with moved paths]** → The PR lists every move. Pending InvestLab changes are already stale (see Non-Goals).
- **[Splitting `schema.ts` changes the drizzle snapshot]** → A spec scenario requires `db:generate` to report no change right after the split.
- **[Users lose their watchlist]** → The storage key and format stay. An integration test reads a value written in the old format.
- **[New kinds pile up]** → A kind exists only once the spec and the lint list it, and the review of that change is where the owner says no.

## Migration Plan

1. **Gates**: `investlab-modular-packages` archived, and the alias toolchain verified.
2. **Tooling**: aliases in every InvestLab tsconfig and Vite config, the lint factory with an empty migrated list, and `eslint-import-resolver-typescript`.
3. **Projects in dependency order**: core, platform (key-value storage and `./browser` included), portfolio, quotes (followed tickers and `./browser` included), API, web (browser container included). Each one joins the factory's migrated list.
4. **Cleanup**: delete the old InvestLab lint table, the fallow workaround and the `module.*.ts` leftovers, and update ADR 0007's status.

Nothing is deployed differently. Rollback is reverting the PR; no data migration runs, and the watchlist format is unchanged.
