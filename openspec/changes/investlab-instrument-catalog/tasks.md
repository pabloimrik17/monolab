# Tasks

## 1. Catalog package scaffold

- [x] 1.1 Create `packages/investlab-catalog` mirroring `packages/investlab-portfolio`: `package.json` (entries `.`, `./server`, `./client`, `./testing`; same scripts and deps), `project.json`, tsconfigs, `tsdown.config.ts`, `vitest.config.ts` (unit, `integration:server`, `integration:client` projects; coverage thresholds 80) and Stryker config (90/80/80). Verify `pnpm nx show project @m0n0lab/investlab-catalog` lists the build, lint, test and mutation targets.
- [x] 1.2 Add `catalog` to `investlabLayout.modules` and the `dependsOn` map `{ portfolio: ["catalog"] }` in `eslint.config.ts`; make `moduleBans` allow declared edges through the side-matching entries and reject a cyclic map at load (design §4). Verify `pnpm nx run-many -t lint:eslint -p '@m0n0lab/investlab*'` passes and a scratch import from quotes to portfolio fails.

## 2. Move the catalog

- [x] 2.1 `git mv` the instrument domain files (model + unit test, three value objects, errors, repository port) and builder into the catalog (design §1). Verify `pnpm nx run @m0n0lab/investlab-catalog:test:unit` passes.
- [x] 2.2 `git mv` the instrument DTO, client mapper and API repository, server mapper, Postgres repository and `instrument.table.ts`; update `docs/legacy-tests.txt` for the two legacy files. Make the repository's delete map any foreign-key violation to `InstrumentInUseError` with a message that names no module. Verify `pnpm lint:legacy-tests` passes.
- [x] 2.3 `git mv` the eight instrument use cases with their integration tests; add `di/server.module.ts`, `di/client.module.ts`, `CATALOG` tokens, `CatalogRemoteError`, the entry files (with `./server` exporting the instruments table) and the `testing/{server,client}` setups. Drop the delete use case's `existsForInstrument` pre-check. Verify `pnpm nx run @m0n0lab/investlab-catalog:test:coverage` passes at 80.
- [x] 2.4 Verify `pnpm nx run @m0n0lab/investlab-catalog:build` and `build:check-exports` pass (exports change: attw validation).

## 3. Portfolio without instruments

- [x] 3.1 Point portfolio's read model, query, DTOs and `portfolio-item.table.ts` foreign key at the catalog's `.` and `./server` entries; add the catalog dependency to `package.json`. Verify `pnpm nx run @m0n0lab/investlab-portfolio:build` passes.
- [x] 3.2 Map the item insert's foreign-key violation to `InstrumentNotFoundError`, drop the create use case's instrument lookup and `existsForInstrument` from the item port and both repositories; trim `PortfolioRemoteError`. Verify the item create integration tests (server and client), including the unknown-instrument case, pass.
- [x] 3.3 Move portfolio integration setups that seed instruments to the catalog's builder and server use case or the seed migration. Verify `pnpm nx run @m0n0lab/investlab-portfolio:test:coverage` passes at its floors and `test:mutation` passes.

## 4. Apps

- [x] 4.1 API: `git mv` `src/portfolio/route/instrument.*` and `src/portfolio/mapper/instrument-dto.mapper.ts` to `src/catalog/`, mount the catalog routes in `src/app.ts`, load the catalog server module in the container. Verify `pnpm nx run @m0n0lab/investlab-api:test` passes, including the moved instrument route suite.
- [x] 4.2 Web: load the catalog client module in `src/di/container.server.ts`. Verify `pnpm nx run @m0n0lab/investlab:test` and `pnpm nx run @m0n0lab/investlab:build` pass.

## 5. Integration checks

- [x] 5.1 `pnpm nx run @m0n0lab/investlab-api:db:generate` reports no schema change and writes no migration.
- [x] 5.2 `pnpm nx show projects -p '@m0n0lab/investlab*'` lists the eight projects of the module-packages spec, and the Nx graph shows catalog as a dependency of portfolio and nothing depending on portfolio among modules.
- [x] 5.3 Update `GLOSSARY-MAP.md` to name the catalog module as part of the InvestLab context; `fallow audit --base develop` and the pre-push gate pass on the final HEAD.

## Workflow follow-up

- At archive, rewrite the Purpose of `openspec/specs/investlab-instrument-management/spec.md`: the catalog module owns instruments, and nothing auto-creates them. A delta cannot change a Purpose.
- Archive this change before `investlab-roger-positions`, whose `investlab-module-packages` and `investlab-http-api` deltas are written against this change's text.
