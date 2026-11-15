# Tasks

Planned only: nothing here starts until every task in group 1 is done. Paths follow `clean-architecture-layout` and design §2. Copy file shapes (`package.json`, `tsdown.config.ts`, `vitest.config.ts`, `project.json`) from the matching InvestLab project. Tasks marked **[attw]** change package exports and must pass `build:check-exports`.

## 1. Gates

- [ ] 1.1 Confirm `clean-architecture-layout` is archived: `openspec list` does not show it, `openspec/specs/clean-architecture-layout/spec.md` exists, and `eslint.config.ts` exports the `cleanArchitectureLint` factory.
- [ ] 1.2 Confirm a Docker-compatible daemon runs (`docker info` exits 0), because Testcontainers and Docker Compose need it.

## 2. Core package

- [ ] 2.1 Scaffold `packages/green-beard-core` (`@m0n0lab/green-beard-core`, private, ESM) with a single root entry, `src/index.ts`, then run `pnpm install` and `pnpm nx sync`. Verify `pnpm nx show project @m0n0lab/green-beard-core` lists `build`, `typecheck` and `lint:eslint`.
- [ ] 2.2 Add the kernel errors (design §7) as `src/domain/error/<concept>.error.ts` (`domain`, `validation`, `not-found`, `duplicate`, `persistence`, `network`), and the error envelope zod schema in `src/data/shared/dto/api-error.dto.ts`. Export them from `src/index.ts`. Verify **[attw]**: `pnpm nx run @m0n0lab/green-beard-core:typecheck`, `:build` and `:build:check-exports` pass.
- [ ] 2.3 Add `paths` (`#domain/*`, `#data/*`) to the core tsconfig, and add `cleanArchitectureLint({ product: "green-beard", modules: ["nursery"] })` to `eslint.config.ts`. Verify `pnpm nx run @m0n0lab/green-beard-core:lint:eslint` passes and that the core imports no `@m0n0lab/green-beard-*` package and no infrastructure library.

## 3. Platform package

- [ ] 3.1 Scaffold `packages/green-beard-platform` (`@m0n0lab/green-beard-platform`) with the `./server` and `./client` entries only (`src/server.ts`, `src/client.ts`), depending on core; run `pnpm install` and `pnpm nx sync`.
- [ ] 3.2 Add the server side: `server/config/server.config.ts` (port), `server/config/process-env.config.ts` (adapter), `server/db/pg.client.ts` (Postgres handle), `server/tokens.ts` and `di/server.module.ts`. Cover the adapter and the module through integration tests on the `./server` entry. Verify with `pnpm nx run @m0n0lab/green-beard-platform:test`.
- [ ] 3.3 Add the client side: `client/config/client.config.ts`, `client/config/ssr-env.config.ts` (reads `GREEN_BEARD_API_URL`), `client/http/http.client.ts`, `client/http/green-beard-api.client.ts` (parses the error envelope from core), `client/tokens.ts` and `di/client.module.ts`. Test the API client against an MSW fake. Verify with `pnpm nx run @m0n0lab/green-beard-platform:test`.
- [ ] 3.4 Add `paths` (`#server/*`, `#client/*`, `#di/*`). Verify **[attw]**: `pnpm nx run @m0n0lab/green-beard-platform:lint:eslint`, `:typecheck`, `:test`, `:build` and `:build:check-exports` all pass, and no file outside `server/config/` and `client/config/` reads the environment.

## 4. Database package

- [ ] 4.1 Scaffold `packages/green-beard-database` (`@m0n0lab/green-beard-database`): `drizzle.config.ts` with `schema` set to the glob `../green-beard-*/src/data/server/infra/db/*.table.ts`, an empty `drizzle/` folder, `migrate(databaseUrl)` exported from `src/index.ts`, and the `db:generate` and `db:migrate` scripts. Run `pnpm install` and `pnpm nx sync`. Verify **[attw]**: `pnpm nx run @m0n0lab/green-beard-database:build` and `:build:check-exports` pass.

## 5. Nursery module

- [ ] 5.1 Scaffold `packages/green-beard-nursery` (`@m0n0lab/green-beard-nursery`) with the `.`, `./server`, `./client` and `./testing` entries (`src/index.ts`, `src/server.ts`, `src/client.ts`, `src/testing.ts`), depending on core, platform and database. Enable `experimentalDecorators` and `emitDecoratorMetadata`. Add the Vitest projects `unit`, `integration:server` and `integration:client` with the `test:unit` and `test:integration` scripts (ADR 0008). Run `pnpm install` and `pnpm nx sync`.
- [ ] 5.2 Add test support in `src/testing/`: in `server/`, a global setup that starts Postgres with Testcontainers and runs `migrate()`, plus `given.ts`; in `client/`, the MSW setup and `given.ts`. Verify `pnpm nx run @m0n0lab/green-beard-nursery:typecheck` passes.
- [ ] 5.3 Add `application/server/tokens.ts`, `application/client/tokens.ts`, and empty `di/server.module.ts` and `di/client.module.ts` exported from `./server` and `./client`. Add `paths` (`#domain/*`, `#application/*`, `#data/*`, `#di/*`, `#testing/*`). Verify **[attw]**: `pnpm nx run @m0n0lab/green-beard-nursery:lint:eslint`, `:typecheck`, `:build` and `:build:check-exports` all pass.

## 6. API app

- [ ] 6.1 Scaffold `apps/green-beard-api` (`@m0n0lab/green-beard-api`) with `hono`, `@hono/node-server` and `inversify`, depending on the nursery (`.`, `./server`), platform (`./server`), core and database packages. Add `dev` (tsx watch), `start`, `build` and `test:integration-platform` scripts, and `paths` (`#core/*`, `#di/*`, `#nursery/*`). Run `pnpm install` and `pnpm nx sync`.
- [ ] 6.2 Add `src/di/container.ts` (binds the process-env `Config` adapter, loads the platform and nursery server modules), `src/app.ts` (mounts module sub-apps, registers `onError`), `src/index.ts` (Node server), `src/core/mapper/error-http.mapper.ts` (design §4) and `src/core/middleware/request-validation.middleware.ts` (422 on an invalid body).
- [ ] 6.3 Add the base harness `src/core/harness/api.harness.ts` per ADR 0008: real container, `Config` bound to constants, boundary guards on the Postgres handle, `fake(TOKEN)`, `silenceErrorLog()`, and `await using` with an idempotent `close()`.
- [ ] 6.4 Add `apps/green-beard-api/docker-compose.yml` with PostgreSQL and a `green_beard` database. Verify `docker compose up -d` in `apps/green-beard-api` starts it and `pg_isready -h localhost -p 5432` succeeds.
- [ ] 6.5 Verify `pnpm nx run @m0n0lab/green-beard-api:lint:eslint`, `:typecheck` and `:build` pass, and `pnpm nx run @m0n0lab/green-beard-api:dev` starts and listens.

## 7. SvelteKit app

- [ ] 7.1 Alias check: add `kit.alias` (`#core`, `#di`, `#nursery`) to `apps/green-beard/svelte.config.js` and switch one import to an alias. Verify `pnpm nx run @m0n0lab/green-beard:typecheck`, `:build` and `:test` pass, and `pnpm nx run @m0n0lab/green-beard:dev` serves the page.
- [ ] 7.2 Remove `src/lib/` (no catch-all folders): move `favicon.svg` to `static/` and reference it from `+layout.svelte`. Verify `:build` passes and the dev page shows the favicon.
- [ ] 7.3 Add dependencies on the nursery (`.`, `./client`), platform (`./client`) and core packages, and `src/di/container.server.ts` binding the SSR env `Config` adapter and loading the platform and nursery client modules. Verify `pnpm nx run @m0n0lab/green-beard:lint:eslint`, `:typecheck` and `:build` pass, and that no file imports a `./server` entry.

## 8. Familia slice

- [ ] 8.1 Add `domain/model/familia.model.ts` with `familia.model.test.ts`, and `testing/shared/builder/familia.builder.ts` re-exported from `src/testing.ts`. Verify **[attw]**: `pnpm nx run @m0n0lab/green-beard-nursery:test:unit` and `:build:check-exports` pass.
- [ ] 8.2 Add `data/server/infra/db/familia.table.ts`. Run `pnpm nx run @m0n0lab/green-beard-database:db:generate` to create the first migration, then `:db:migrate` against the Docker Compose database; verify the `familias` table exists with the unique `nombre`.
- [ ] 8.3 Add the `FamiliaRepository` port, `FamiliaPgRepository` (private row mapping), the five server use cases, and their bindings in `di/server.module.ts`, with one `familia-<verb>.use-case.integration.ts` per use case covering the Familia spec scenarios. Verify **[attw]**: `pnpm nx run @m0n0lab/green-beard-nursery:test:integration` and `:build:check-exports` pass.
- [ ] 8.4 Add `data/shared/dto/familia.dto.ts` (exported from `.`), `FamiliaApiRepository`, the five client use cases and their bindings in `di/client.module.ts`, with integration tests against the API faked with MSW. Verify **[attw]**: `pnpm nx run @m0n0lab/green-beard-nursery:test:integration` and `:build:check-exports` pass.
- [ ] 8.5 Add `src/nursery/route/familia.route.ts`, mounted at `/familias`, with `familia.route.harness.ts` and `familia.route.integration-platform.ts` covering the Familia API scenarios. Add `src/app.integration-platform.ts` for error hiding (ADR 0008). Verify `pnpm nx run @m0n0lab/green-beard-api:test:integration-platform` passes.
- [ ] 8.6 Add the Familia UI in `apps/green-beard/src/nursery/`: list and edit pages, components (`<x>.component.svelte`), `familia-list.loader.server.ts`, `familia.action.server.ts` and the form parser in `form/`, with thin files in `src/routes/familias/`. Verify `pnpm nx run @m0n0lab/green-beard:lint:eslint`, `:typecheck` and `:build` pass, then by hand: list, create, edit and delete a familia.

## 9. Planta slice

- [ ] 9.1 Add `domain/model/planta.model.ts` with `planta.model.test.ts`, and `testing/shared/builder/planta.builder.ts` re-exported from `src/testing.ts`. Verify **[attw]**: `pnpm nx run @m0n0lab/green-beard-nursery:test:unit` and `:build:check-exports` pass.
- [ ] 9.2 Add `data/server/infra/db/planta.table.ts` with the foreign key to `familias`. Run `pnpm nx run @m0n0lab/green-beard-database:db:generate` and `:db:migrate`; verify the `plantas` table exists with its foreign key and unique `nombre`.
- [ ] 9.3 Add the `PlantaRepository` port, the `PlantaWithFamiliaQuery` port and read model (design §5), `PlantaPgRepository`, `PlantaWithFamiliaPgQuery` (SQL join), the five server use cases and their bindings, with integration tests covering the Planta spec scenarios. Verify **[attw]**: `pnpm nx run @m0n0lab/green-beard-nursery:test:integration` and `:build:check-exports` pass.
- [ ] 9.4 Add `data/shared/dto/planta.dto.ts`, `PlantaApiRepository`, `PlantaWithFamiliaApiQuery`, the five client use cases and their bindings, with integration tests against MSW. Verify **[attw]**: `pnpm nx run @m0n0lab/green-beard-nursery:test:integration` and `:build:check-exports` pass.
- [ ] 9.5 Add `src/nursery/route/planta.route.ts`, mounted at `/plantas` with the `?familiaId` filter, plus its harness and integration-platform test covering the Planta API scenarios. Verify `pnpm nx run @m0n0lab/green-beard-api:test:integration-platform` passes.
- [ ] 9.6 Add the Planta UI in `apps/green-beard/src/nursery/`: list with a familia filter, create and edit forms with a familia select, and a delete action, with thin files in `src/routes/plantas/`. Verify `pnpm nx run @m0n0lab/green-beard:typecheck` and `:build` pass, then by hand: create, filter, edit and delete a planta.

## 10. Verification

- [ ] 10.1 Run `pnpm nx run-many -t test:coverage -p '@m0n0lab/green-beard*'` and set each project's coverage floors in `vitest.config.ts` per ADR 0008 (measured value rounded down to a multiple of 5).
- [ ] 10.2 Verify `pnpm nx run-many -t lint:eslint typecheck test build -p '@m0n0lab/green-beard*'` is green, and `pnpm run lint:fallow` and `pnpm run lint:knip` pass.
- [ ] 10.3 Manual end to end: `docker compose up -d`, `pnpm nx run @m0n0lab/green-beard-database:db:migrate`, then `pnpm nx run-many -t dev -p @m0n0lab/green-beard-api @m0n0lab/green-beard`. Create a familia, create a planta in it, update both, then delete the planta and the familia. The browser's network panel shows no request to the API's origin.

## Workflow follow-up

- Archive `green-beard-foundation` after review.
