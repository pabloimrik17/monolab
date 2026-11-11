# Tasks

Planned only: nothing here starts until every task in group 1 is done. Paths after a move follow `clean-architecture-layout` and design §2–§5. Moves use `git mv`. Tasks marked **[attw]** must pass `build:check-exports`.

## 1. Gates

- [ ] 1.1 Confirm `clean-architecture-layout` and `qup` are archived: `openspec list` shows neither, and `openspec/specs/clean-architecture-layout/spec.md` exists.
- [ ] 1.2 Confirm the `qup-board-*` branches are merged or deleted: `git branch --list 'qup-board-*'` is empty.
- [ ] 1.3 Ask the owner to confirm the module split (design §1) and record the answer in design §1. If it is two modules, rewrite the spec's first requirement and groups 5–7 before going on.
- [ ] 1.4 Alias check for SolidStart in a throwaway branch: add `vite-tsconfig-paths` to `apps/qup-web`, add `paths`, and switch one import to an alias. Verify that `pnpm nx run @m0n0lab/qup-web:dev` serves the page, and that `:build` and `:test` pass.

## 2. Core package

- [ ] 2.1 Scaffold `packages/qup-core` (`@m0n0lab/qup-core`) with a single root entry, tsdown and tsconfig references, then run `pnpm nx sync`.
- [ ] 2.2 Move qup's kernel errors from `qup-domain/src/errors.ts` into `domain/error/<concept>.error.ts`, and `qup-shared/src/api-error.ts` into `data/shared/dto/api-error.dto.ts`. Add `paths`, and add qup-core to the `qup` factory call. Verify **[attw]**: `pnpm nx run @m0n0lab/qup-core:lint:eslint`, `:typecheck`, `:test`, `:build` and `:build:check-exports` all pass.

## 3. Platform package

- [ ] 3.1 Scaffold `packages/qup-platform` (`@m0n0lab/qup-platform`) with `./server` and `./client` entries only; run `pnpm nx sync`.
- [ ] 3.2 Add the server side: a `Config` port with a process-env adapter, the Postgres handle, and `di/server.module.ts`. Verify with `pnpm nx run @m0n0lab/qup-platform:test`.
- [ ] 3.3 Add the client side: a `Config` port with its adapter, `client/http/http.client.ts`, the API client, and `client/sse/event-source.client.ts`, all from `qup-web/src/services/`. Add `di/client.module.ts`. Verify **[attw]**: `pnpm nx run @m0n0lab/qup-platform:lint:eslint`, `:typecheck`, `:test`, `:build` and `:build:check-exports` all pass.

## 4. Database package

- [ ] 4.1 Scaffold `packages/qup-database` and move `qup-data/drizzle/` and `drizzle.config.ts` unchanged. Point `schema` at the glob `../qup-*/src/data/server/infra/db/*.table.ts`, and add `migrate(databaseUrl)`. Then verify:
    - `db:generate` reports no schema change;
    - `db:migrate` against a database migrated before the move applies nothing.

## 5. Ordering module

- [ ] 5.1 Scaffold `packages/qup-ordering` with the `.`, `./server`, `./client` and `./testing` entries; run `pnpm nx sync`.
- [ ] 5.2 Domain:
    - `entities/<x>.ts` → `model/<x>.model.ts`
    - `value-objects/<x>.ts` → `value-object/<x>.value-object.ts`
    - repository ports → `domain/repository/`
    - the module's errors → `domain/error/<concept>.error.ts`
    - emitted events → `domain/event/<concept>-<fact>.event.ts`
    - builders → `src/testing/shared/builder/`

  Verify with `pnpm nx run @m0n0lab/qup-ordering:test:unit`.
- [ ] 5.3 Application: move the 13 use cases to `application/server/use-case/` under concept-first names (design §4), with their legacy tests renamed alongside; the event bus port goes to `application/server/port/event-bus.port.ts`. Update `docs/legacy-tests.txt` and verify `pnpm run lint:legacy-tests`.
- [ ] 5.4 Data:
    - `pg-<x>.repository.ts` → `data/server/repository/<x>-pg.repository.ts`
    - mappers become private, or move to `mapper/<x>-pg.mapper.ts` when reused
    - `schema/*.ts` → `data/server/infra/db/<concept>.table.ts`
    - `qup-shared` DTOs → `data/shared/dto/`
    - `qup-api/src/services/event-bus.ts` and its legacy test → `data/server/infra/event/in-memory.event-bus.ts`, implementing the event bus port
    - client API repositories, if `qup-web` calls use cases client-side → `data/client/repository/<x>-api.repository.ts`

  Verify with `:test`.
- [ ] 5.5 Composition and entries: `di/server.module.ts` and `di/client.module.ts`, `src/testing.ts` exporting builders, `paths` added, and qup-ordering added to the factory call. Swap `@m0n0lab/qup-domain` for `@m0n0lab/qup-ordering` in `.fallowrc.json` `publicPackages`. Verify **[attw]**: `pnpm nx run @m0n0lab/qup-ordering:lint:eslint`, `:typecheck`, `:test`, `:build` and `:build:check-exports` all pass, plus `pnpm run lint:fallow`.

## 6. API

- [ ] 6.1 Move the API files (design §5), with each legacy test following its subject:
    - routes → `ordering/route/<concept>.route.ts`, as Hono sub-apps mounted by `app.ts`
    - serializers → private methods or `ordering/mapper/`
    - `error-mapping.ts` → `core/mapper/error-http.mapper.ts`
    - `admin-only.ts` → `core/middleware/admin-only.middleware.ts`
    - `container.ts` and `api.module.ts` → `di/`
  Switch the imports to the new packages.
- [ ] 6.2 Add `paths` (`#core/*`, `#di/*`, `#ordering/*`) and add qup-api to the factory call. Verify `pnpm nx run @m0n0lab/qup-api:lint:eslint`, `:typecheck`, `:test` and `:build`, with assertions unchanged.

## 7. Web

- [ ] 7.1 Make each `routes/` file re-export a page from `ordering/page/`.
    - `server/{auth,data,mutations}.ts` → `ordering/loader/` and `ordering/action/` (auth → `core/`)
    - `view-models/<x>.viewmodel.ts` → `ordering/view-model/<x>.view-model.ts`
    - `components/` → `ordering/component/<x>.component.tsx` or `core/component/`
    - `container.ts`, `web.module.ts` and `tokens.ts` → `di/`
    - `services/` deleted (moved in 3.3)
  Update the `.fallowrc.json` qup-web entries.
- [ ] 7.2 Add `vite-tsconfig-paths` and `paths` (`#core/*`, `#di/*`, `#ordering/*`), and add qup-web to the factory call. Verify `pnpm nx run @m0n0lab/qup-web:lint:eslint`, `:typecheck`, `:test` and `:build`, then a manual pass: join a session, place an order, and see its status update over SSE.

## 8. Cleanup

- [ ] 8.1 Delete `packages/qup-domain`, `packages/qup-data` and `packages/qup-shared`, then run `pnpm nx sync`. Verify:
    - `nx show projects` lists none of them;
    - `pnpm nx run-many -t lint:eslint typecheck test build -p '@m0n0lab/qup*'` is green;
    - `pnpm run lint:fallow`, `pnpm run lint:knip` and `pnpm run lint:legacy-tests` pass.

## Workflow follow-up

- Archive `qup-module-packages` after review.
