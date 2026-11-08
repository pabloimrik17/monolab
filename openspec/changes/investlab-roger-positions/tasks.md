# Tasks

Prerequisites, from the bottom of the stack: `investlab-instrument-catalog`, then `agentic-task-3ao3` (UI harness), the layer directly below this one. Groups 1–4 form the first layer of this change; groups 5–6 the second, which starts once the `agentic-task-3ao3` layer is done.

## 1. Package scaffold

- [x] 1.1 Create `packages/investlab-roger` like `packages/investlab-catalog`: entries `.`, `./server`, `./client`, `./testing`; dependency on `@m0n0lab/investlab-catalog`; Vitest projects (unit, `integration:server`, `integration:client`) with coverage thresholds 80; Stryker 90/80/80 with `timeoutMS` 60 s and no `*.table.ts` exclusion (design §8). Verify `pnpm nx show project @m0n0lab/investlab-roger` lists build, lint, test and mutation targets.
- [x] 1.2 Add `roger` to `investlabLayout.modules` and `roger: ["catalog"]` to `dependsOn` in `eslint.config.ts`. Verify lint passes, and that a scratch import of `@m0n0lab/investlab-roger` from portfolio fails ("Trader module is a leaf").

## 2. Domain

- [x] 2.1 `domain/value-object/roger-state.value-object.ts`: the seven states, `RADAR_STATES`, `transitionsFrom(state)` and `fieldsOf(state)` (design §2). Verify `roger-state.value-object.test.ts` covers the full 7×7 table in one parametrized table and the fields of each state.
- [x] 2.2 `domain/error/entry.error.ts`: `EntryNotFoundError`, `EntryConflictError`, `InvalidTransitionError`, `MissingRequiredFieldError` (naming the field), `FieldNotInStateError`; and `domain/error/roger-remote.error.ts` with `RogerErrorCode` and `RogerRemoteError`, including the catalog's `InstrumentNotFoundError` and `InstrumentAlreadyExistsError` (design §1). Verify each extends `DomainError` with its code (covered by 2.3).
- [x] 2.3 `domain/model/entry.model.ts`: `create`, `edit`, `transition`, `reEnter`, `reconstitute`, with the fill-and-clear rule, value rules and time in state (design §3; spec `roger-state-machine`). Verify `entry.model.test.ts` covers every requirement of `roger-state-machine`.
- [x] 2.4 `domain/repository/entry.repository.ts` (`save`, `findById`, `update`, `delete`) and `domain/query/entry-list.query.ts` with its read model (entry + symbol, name, sector; view `active` or `history`). Verify `pnpm nx run @m0n0lab/investlab-roger:build` passes.
- [x] 2.5 `testing/shared/builder/entry.builder.ts`, exported from `src/testing.ts`. Verify the unit tests use it.

## 3. Data

- [x] 3.1 `data/server/infra/db/entry.table.ts` (`roger_entries`, design §5) referencing the catalog's `instruments` table; generate the migration with `pnpm nx run @m0n0lab/investlab-api:db:generate`. Verify drizzle-kit loads the table file (design §5), the migration creates the table, FK, state check and index, and a second `db:generate` reports no change.
- [x] 3.2 Postgres repository and list query, mapping the FK violation on insert to `InstrumentNotFoundError` and the stale `updatedAt` to `EntryConflictError`. Covered by the server integration tests in 4.1.
- [x] 3.3 DTOs in `data/shared/dto/` (entry, list, create with `instrumentId` or `newInstrument`, edit, transition, re-entry) and the client API repository and query. Covered by the client integration tests in 4.2.

## 4. Use cases and API

- [x] 4.1 Server use cases: `EntryCreate` (with `newInstrument` through the catalog's `InstrumentCreate`, design §4), `EntryEdit`, `EntryTransition`, `EntryReEnter`, `EntryDelete`, `EntryList`; `di/server.module.ts` and `ROGER` tokens. Verify one `*.use-case.integration.ts` per use case passes against Postgres, including new stock, duplicate symbol, invalid entry with new stock (no instrument created), unknown instrument, conflict, and catalog delete refused while an entry references the instrument.
- [x] 4.2 Client use cases mirroring 4.1 over the API repository; `di/client.module.ts`. Verify one client integration test per use case passes with MSW, including errors rebuilt from `code`.
- [x] 4.3 API: `src/roger/route/entry.route.ts` with the six routes, mounted in `src/app.ts`; container loads the roger server module after the catalog's; `error-http.mapper.ts` maps the new codes (design §6). Verify `entry.route.integration-platform.ts` on `entry.route.harness.ts` covers every scenario of the `investlab-http-api` delta and the complete route list.
- [x] 4.4 Verify `pnpm nx run @m0n0lab/investlab-roger:test:coverage` passes at 80, `test:mutation` passes, `build:check-exports` passes (new exports: attw validation), and `pnpm nx run @m0n0lab/investlab-api:test` passes.

## 5. Web

- [ ] 5.1 Server container loads the roger client module; `src/routes/roger.tsx` with loader (roger `EntryList` by view + catalog `InstrumentList`) and action intents `create`, `update`, `delete`, `transition`, `re-enter`; "Roger" link in `root.tsx`. Verify `pnpm nx run @m0n0lab/investlab:build` passes.
- [ ] 5.2 `src/roger/` page, view model, components (grouped table, row, state badge, entry form, transition form) and form schemas (design §7), using `transitionsFrom` and `fieldsOf` from the roger `.` entry. Verify `roger.page.integration-platform.tsx` on the 3ao3 UI harness covers every scenario of the Roger page and Entry forms requirements.
- [ ] 5.3 Verify `pnpm nx run @m0n0lab/investlab:test:coverage` stays at or above its floors.

## 6. Integration checks

- [ ] 6.1 Run the web against the API and a local Postgres; walk `WATCHING` → `SHORTLISTED` → `BUY_ORDER` → `INVESTED` → `SELL_ORDER` → `SOLD` → re-entry, a market buy, a manual sale and a cancelled buy order; create an entry with a new stock. Verify each step in the browser and record screenshots.
- [ ] 6.2 `pnpm nx show projects -p '@m0n0lab/investlab*'` lists the nine projects of the module-packages delta; `fallow audit --base <PR base>` and the pre-push gate pass on the final HEAD.

## Workflow follow-up

- Archive `investlab-instrument-catalog` first: this change's `investlab-module-packages` and `investlab-http-api` deltas extend its text.
- When rewriting `investlab-roger-metrics-ui`, `investlab-roger-sectors` and `investlab-roger-dashboard`, use these state and field names and drop what this change already owns (badges, transition actions).
