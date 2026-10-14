# InvestLab packages are one per module, three layers inside, entries per side

In October 2026 we replaced InvestLab's six layer packages (`investlab-domain`, `investlab-data-contracts`, `investlab-data-server`, `investlab-data-client`, `investlab-application-server`, `investlab-application-client`) with one package per business module plus three shared packages: core, platform and database. Each layer package had a single consumer, a feature touched up to six packages, and use-case tests had to rebuild the apps' composition in a harness because no package owned it. The pattern is meant to be reused by the other Clean Architecture projects in this monorepo; InvestLab is its first instance.

- A **module package** (`@m0n0lab/investlab-portfolio`, `@m0n0lab/investlab-quotes`) holds its three layers as folders: `domain/` (entities, errors, ports; shared), `application/server` and `application/client` (use cases per side), `data/contracts` (zod wire DTOs; shared), `data/server` (Postgres repositories, read queries, drizzle table schema, datasources) and `data/client` (HTTP repositories). `module.server.ts` and `module.client.ts` are static Inversify `ContainerModule`s that bind the module's use cases under typed, per-module tokens.
- `package.json` `exports` has three entries: `.` (domain + contracts), `./server` and `./client`. The API imports only `.` and `./server`; the web only `.` and `./client`.
- Inside a package, `domain/` and `application/` never import `data/`, the platform or the database package; `data/*` and `module.*.ts` may import the platform. A lint check in CI enforces both rules.
- A **core package** (`@m0n0lab/investlab-core`) is the shared kernel: the base errors (`DomainError`, `ValidationError`, `PersistenceError`, `NetworkError`, `UnauthorizedError`, the `RemotePortError` union) and the API error envelope schema. It imports no InvestLab package; every module layer and the platform may import it. The name once belonged to a browser-only package that was dissolved; it is reused.
- A **platform package** (`@m0n0lab/investlab-platform`) owns the runtime infrastructure every module shares, in two entries, `./server` and `./client`: the `Config` port, filled from the environment by one adapter per runtime, `HttpClient`, the InvestLab API client, and the Postgres and Redis handles, all bound by static modules under `PLATFORM.*` tokens. Apps bind their `Config` adapter and load modules; no other code reads the environment.
- A **database package** (`@m0n0lab/investlab-database`) owns `drizzle.config.ts`, which lists the modules' `data/server/schema.ts` files by path, the `drizzle/` migrations folder (seed included) and a `migrate(databaseUrl)` helper. The API's `db:*` scripts delegate to it; module integration tests migrate their template database with it.
- A package exists only when it has two real consumers. Core: every module and the platform. Platform: every module and both apps. Database: the API and the modules' integration tests.
- Apps are composition roots and transport: routes and loaders call use cases, nothing else.
- Use-case integration tests ([ADR 0006](./0006-investlab-use-case-integration-tests.md)) sit next to the use cases, per side, and build the container from the same modules the apps load.

## Considered options

- Keep the six layer packages: rejected; every package has one consumer, a feature spans all of them, and no package can test the real composition.
- Use cases inside the apps, as `apps/qup-api` does: rejected; the module stops being a unit you can build, test and reuse, and the web and API halves of one feature end up in two apps.
- One package per module and side (`investlab-portfolio-server`, `investlab-portfolio-client`): rejected; the shared domain and contracts need a third package, which brings back the layer split.
- One package per module and layer: rejected; it multiplies packages without adding a boundary that folders plus lint cannot hold.
- Inversify autobinding instead of explicit modules: rejected; the module file is the readable record of the wiring.
- Kernel errors as a third, pure entry of the platform: rejected; domain code would depend on the package that holds Postgres and Redis, and only lint would keep it on the pure entry.
- Drizzle config and migrations in `apps/investlab-api`: rejected; module tests would read migrations from an app folder, an input Nx cannot see through package dependencies.

## Consequences

- [ADR 0001](./0001-investlab-package-layering.md), [ADR 0003](./0003-investlab-hono-api-behind-ssr.md) and [ADR 0004](./0004-investlab-datasources-and-read-queries.md) still hold, with "package" read as "layer folder of a module package": shared domain and contracts, use cases never shared between sides, the API behind the SSR web, datasources only for multi-source repositories, read queries for cross-aggregate reads. [ADR 0005](./0005-investlab-error-code-is-the-wire-discriminant.md) stands unchanged.
- Server code reaching the browser bundle is prevented by the entries (the web never imports `./server`) and by importing `./client` only from `.server.ts` files.
- Each module owns its drizzle table schema; the database package reaches those files by path, not by import, so it adds no Nx dependency and no cycle.
- A layer-boundary lint check replaces package boundaries as the guard; it runs in CI next to the dead-code check.
- Adopting the pattern elsewhere (QUP and later projects) is a separate change per project.
