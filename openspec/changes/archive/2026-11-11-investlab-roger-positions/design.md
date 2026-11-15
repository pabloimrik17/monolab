# Roger Positions Design

## Context

This change lands after `investlab-instrument-catalog`: `Instrument` lives in `@m0n0lab/investlab-catalog`, whose `./server` entry exports the `instruments` table, and modules depend on each other only along declared edges (ADR 0010). Packages follow ADR 0007 and the `clean-architecture-layout` spec; tests follow ADR 0008. Terms follow the InvestLab glossary (`packages/investlab-portfolio/src/domain/GLOSSARY.md`, Roger section). The April 2026 version of this change predates all of these and is fully replaced.

## Goals / Non-Goals

**Goals:**

- One place where an entry's lifecycle rules live, used by the API to enforce them and by the web to offer only valid actions and the right fields.
- Roger stays removable: a leaf module that only the apps load.

**Non-Goals:**

- Stale-ticker cleanup, the Roger summary and breakdown (`investlab-roger-dashboard`), the stock-picking summary (`investlab-overview`). When the first view across trader modules lands, roger implements the port that view owns (ADR 0010); nothing here prepares for it.
- Calculated prices, current quotes and price indicators (`investlab-roger-metrics-ui`).
- A log of every transition; only the time in the current state is kept.
- Currency: amounts are in the instrument's trading currency, as in Portfolio.
- Any change to Portfolio.

## Decisions

### 1. Package and dependencies

`@m0n0lab/investlab-roger` has the standard layout and entries `.`, `./server`, `./client`, `./testing`. `eslint.config.ts` adds `roger` to `investlabLayout.modules` and `roger: ["catalog"]` to `dependsOn`. Nothing lists roger as a dependency. Roger imports from the catalog only: `Instrument`, its value objects and the errors `InstrumentNotFoundError` and `InstrumentAlreadyExistsError` (`.`), the `instruments` table and the server `CATALOG.InstrumentCreate` token and use-case type (`./server`), and the instrument builder (`./testing`, tests only). `rogerServerModule` requires `catalogServerModule`, so the API container loads the catalog server module before roger's, as it does before portfolio's.

`domain/error/roger-remote.error.ts` holds `RogerErrorCode` and `RogerRemoteError = RemotePortError<InstrumentNotFoundError | InstrumentAlreadyExistsError | EntryNotFoundError | EntryConflictError | InvalidTransitionError | MissingRequiredFieldError | FieldNotInStateError>`, the errors the client ports return, as `catalog-remote.error.ts` and `portfolio-remote.error.ts` do for their modules. The two catalog errors come from create: an unknown `instrumentId` or a `newInstrument` whose symbol exists.

### 2. One aggregate: Entry

`Entry` (`domain/model/entry.model.ts`) holds `id`, `instrumentId`, `state`, `entryPrice`, `quantity?`, `buyCommission?`, `buyDate?`, `exitPrice?`, `sellCommission?`, `sellDate?`, `stateSince`, `createdAt`, `updatedAt`. The transition table and the fields per state are data in `domain/value-object/roger-state.value-object.ts`, exported from `.`: `RogerState`, `RADAR_STATES`, `transitionsFrom(state)` and `fieldsOf(state)`. `Entry.create`, `entry.edit(values)`, `entry.transition(to, values)` and `entry.reEnter(values)` return `Result`s and are the only way to change an entry.

The web imports `transitionsFrom` and `fieldsOf` from `.` to decide which buttons and form fields to show, so the rules exist once. The API re-checks everything through the same model.

The client does not use `EntryRepository`. The API has one route per action, and a create with `newInstrument` has no instrument id yet, so neither `update(entry)` nor `save(entry)` can say what to call. `domain/repository/entry-remote.repository.ts` is a client-only port with one method per route: `create`, `edit`, `transition`, `reEnter` and `delete`. Its methods take the entry reference (`id`, `state`, `updatedAt`), which also gives the client what it needs to rebuild errors from `code`. Client use cases call this port and do not run the model; the API is the authority.

Alternatives rejected: a state-pattern class per state (seven classes for one table lookup), and the instrument as the aggregate root with entries as children (no invariant spans entries; every transition would load and lock all entries of an instrument).

### 3. How a transition fills and clears fields

A transition receives the target state and values for some of its fields. For each field of the target state: a supplied value wins; otherwise the entry's current value is kept; if neither exists, the transition fails with `MISSING_REQUIRED_FIELD` naming the field. Every field the target state does not use is cleared. Cancelling a buy order therefore drops the quantity, and cancelling a sell order drops the exit price. `stateSince` becomes now.

The web form shows exactly `fieldsOf(to)`. Known values are pre-filled and editable. New fields are empty, except that dates default to today and the sell commission defaults to the buy commission. These defaults belong to the form; the domain receives explicit values.

### 4. Create with a new instrument

`POST /roger/entries` takes either `instrumentId` or `newInstrument` (`symbol`, `name`, optional `sector`). The server `EntryCreateUseCase` first validates the entry draft without an instrument. With `newInstrument`, it then calls the catalog's server `InstrumentCreate` use case with type `stock` and asset class `equity`, and saves the entry with the new id. A duplicate symbol fails with `INSTRUMENT_ALREADY_EXISTS` before anything is written. An unknown `instrumentId` fails through the foreign key as `INSTRUMENT_NOT_FOUND`, as in the catalog change.

The two writes are not one transaction: if the entry save fails after the instrument was created, the instrument stays in the catalog. That is harmless reference data, and the user can pick it on retry. The client side needs no catalog code: the web makes one API call.

Alternative rejected: the web calls the catalog create endpoint, then the entry create. The route would orchestrate business steps (ADR 0009).

### 5. Persistence

`roger_entries` (`data/server/infra/db/entry.table.ts`), with these columns:

- `id` uuid PK
- `instrument_id` uuid FK → `instruments.id`, restrict on delete
- `state` varchar(20), with a check constraint over the seven values
- `entry_price` and `exit_price` numeric(14,4)
- `quantity` integer
- `buy_commission` and `sell_commission` numeric(10,2)
- `buy_date` and `sell_date` date
- `state_since`, `created_at` and `updated_at` timestamptz

There is an index on `instrument_id`. Columns a state does not use are null; the model, not the database, ties fields to states.

The database package's glob already picks up `entry.table.ts`. drizzle-kit 0.31 loads table files through a CJS loader. The `instruments` import from the catalog's `./server` already loads, through that entry's `default` condition, and `db:generate` builds the catalog first (catalog design §3). If the state check imports the state list from the domain instead of spelling the seven values, drizzle-kit must still load the table file. The list read query joins `instruments` (catalog's exported table) and returns entries with `symbol`, `name` and `sector`: active entries are every state but `SOLD`, ordered by symbol then `createdAt`; history is `SOLD`, ordered by `sell_date` descending.

### 6. API

All routes live in `apps/investlab-api/src/roger/route/entry.route.ts`. Concurrency is optimistic, with `expectedUpdatedAt` as in Portfolio.

| Route | Answer |
| --- | --- |
| `GET /roger/entries?view=active\|history` | 200, entries with instrument data; `active` by default |
| `POST /roger/entries` | 201, created entry |
| `PUT /roger/entries/:id` | 200; edits fields of the current state; body carries `expectedUpdatedAt` |
| `DELETE /roger/entries/:id` | 204 |
| `POST /roger/entries/:id/transitions` | 200; body `{ to, …values, expectedUpdatedAt }` |
| `POST /roger/entries/:id/re-entries` | 201, the new entry; body `{ entryPrice?, quantity? }` |

New codes and their statuses:

- `ENTRY_NOT_FOUND`: 404
- `ENTRY_CONFLICT`: 409
- `INVALID_TRANSITION`: 409, for a transition not in the table, the same state, or a re-entry from anything but `SOLD`
- `MISSING_REQUIRED_FIELD`: 422
- `FIELD_NOT_IN_STATE`: 422, for an edit that touches a field the current state does not use

`MISSING_REQUIRED_FIELD` and `FIELD_NOT_IN_STATE` name the field in the envelope's `issues[0].path`, so the client can rebuild the error and the web can show it inline.

Request validation (types, ranges, decimals, dates) stays `VALIDATION_ERROR`.

### 7. Web

| Piece | Location |
| --- | --- |
| Route file: loader and action | `src/routes/roger.tsx` |
| Page | `src/roger/page/roger.page.tsx` |
| View model | `src/roger/view-model/roger.view-model.ts` |
| Components: table, row, badge, entry form, transition form | `src/roger/component/` |
| Form schemas | `src/roger/form/entry.form.ts` |

The loader calls the roger client `EntryList` use case (with the requested view) and the catalog client `InstrumentList` use case for the instrument picker. The action dispatches on `intent`: `create`, `update`, `delete`, `transition` and `re-enter`, as `routes/portfolio.tsx` does. The history is the same route with `?view=history`. `root.tsx` gains a "Roger" link.

### 8. Tests (ADR 0008)

- **Unit** (`entry.model.test.ts`, `roger-state.value-object.test.ts`): the full 7×7 transition table as one parametrized table, fields per state, the fill-and-clear rule, re-entry, value rules.
- **Integration**: one per use case and side. Server against Postgres with Testcontainers, client against the API with MSW. Instruments come from the catalog's builder, the seed, or `newInstrument`.
- **API integration-platform** (`entry.route.integration-platform.ts` with `entry.route.harness.ts`): status and body per route, and the new error codes.
- **Web integration-platform** (`roger.page.integration-platform.tsx`) on the UI harness of `agentic-task-3ao3`: grouping, filter, available actions, form fields and defaults, history view.
- **Builders**: `entry.builder.ts`, exported from `./testing`.
- **Gates**: the package starts at coverage 80 and Stryker 90/80/80, the ADR 0008 target. Stryker `timeoutMS` is 60 s, as in the catalog and portfolio: under the default, slow integration tests count as kills. Unlike the catalog, the run does not exclude `*.table.ts`: portfolio's table mutants are killed, and `agentic-task-rnoc` has not yet explained the catalog's timeouts. The web and API keep their floors.

### 9. Delivery

The stack is, from the bottom: the catalog change, `agentic-task-3ao3` (the UI harness), then this change, as two layers:

1. Package, migration and API (tasks 1–4).
2. Web (tasks 5–6). It starts once the `agentic-task-3ao3` layer is done; it does not need to be merged into develop.

## Risks / Trade-offs

- [Orphan instrument if the entry save fails after creating it] → Reference data the user can reuse; no cleanup needed.
- [Nullable columns let the database hold a field a state does not use] → Only the model writes entries, and its tests cover every transition. A per-state check constraint would duplicate the table in SQL.
- [Web part needs the UI harness] → The harness is its own layer below this change (`agentic-task-3ao3`), so the web layer builds on it directly. Because it sits below, the first layer (package and API) merges after it.
- [Downstream changes (`roger-metrics-ui`, `roger-sectors`, `roger-dashboard`) still describe the April model] → Their rewrite is tracked in Linear; they must use these state and field names.

## Migration Plan

The new table comes with its own migration; no existing data changes. Rollback: revert, then drop `roger_entries` with a down migration, or leave the table, which nothing else reads.
