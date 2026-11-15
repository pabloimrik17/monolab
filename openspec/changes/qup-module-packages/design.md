# Design

## Context

See proposal.md for the motivation. qup today:

- `qup-domain`:
    - `entities/` (`menu-item`, `order`, `session`) and `value-objects/` (`category`, `order-item`, `order-status`, `session-code`, `session-status`);
    - `ports/`: three repositories plus `event-bus.ts`;
    - 13 use cases in `use-cases/`, named verb-first (`create-order.use-case.ts`);
    - a loose `errors.ts`, plus `tokens.ts` and `domain.module.ts`.
- `qup-data`: `repositories/pg-*.repository.ts`, `mappers/`, `schema/` (one file per table plus `index.ts`), `drizzle/` and `drizzle.config.ts`. `pg-order.repository.ts` already loads order items with their order.
- `qup-shared`: `api-error.ts`, `dtos.ts`, `events.ts`, `requests.ts`.
- `qup-api` (Hono): `routes/*.routes.ts`, `serializers/dto-serializers.ts`, `errors/error-mapping.ts`, `middleware/admin-only.ts`, `services/event-bus.ts` (the in-process event bus behind SSE), `container.ts`, `api.module.ts`.
- `qup-web` (SolidStart):
    - `routes/` (index, admin, `session/[code]`);
    - `server/` (`auth`, `data`, `mutations`: `"use server"` functions);
    - `services/` (`api-client`, `http-client`, `event-source.service`, `sse-url`);
    - `view-models/*.viewmodel.ts`, `components/`;
    - `container.ts`, `tokens.ts`, `web.module.ts`.

`create-order.use-case.ts` injects the session, order and menu item repositories and the event bus. One flow touches all three aggregates.

## Goals / Non-Goals

**Goals:**

- qup laid out per `clean-architecture-layout`, with the packages of ADR 0007.
- No behaviour change: API, SSE, UI and schema stay identical.

**Non-Goals:**

- Replacing qup's legacy tests: `qup-domain` use-case tests with mocked repositories, and the unit tests of `qup-api`. They move with their subjects and stay on ADR 0008's legacy list.
- Changing the domain model or the event names.

## Decisions

### 1. Module split (to confirm before implementation)

**Proposed**: one module, `@m0n0lab/qup-ordering`, holding menu items, sessions and orders.

- Creating an order checks the session and prices its items from the menu, so the flow needs all three aggregates.
- ADR 0007 forbids one business module importing another.
- With one module, `order-create.use-case.ts` reaches all three through its own repository ports, as it does today.

**Alternative**: two modules, `qup-menu` (menu items) and `qup-session` (sessions and their orders).

- `qup-session` would need its own read query for menu prices (`menu-item-price.query.ts`), implemented in `data/server/query/` against the menu table, and a copy of the price type.
- That buys a boundary with no second consumer and duplicates the menu's shape. It becomes worth it if the menu gains its own app or a second product.

The owner confirms the split in task 1.3. If two modules are chosen, the spec's first requirement and groups 5–7 are rewritten before implementation starts.

### 2. Where `qup-shared` goes

- `dtos.ts` and `requests.ts` → `qup-ordering` `data/shared/dto/<concept>.dto.ts` (`menu-item`, `order`, `session`).
- `api-error.ts` → `qup-core` `data/shared/dto/api-error.dto.ts`.
- `events.ts`:
    - the event payloads the use cases emit become domain events in `domain/event/<concept>-<fact>.event.ts` (`order-created.event.ts`, `session-closed.event.ts`);
    - the SSE wire shapes go to `data/shared/dto/`.

### 3. Event bus and SSE

- **Event bus**: the port moves from `ports/event-bus.ts` to `application/server/port/event-bus.port.ts`, because publishing is a mechanism, not business language. `qup-api`'s in-process implementation moves to `qup-ordering` as `data/server/infra/event/in-memory.event-bus.ts`, for two reasons:
    - a port's implementation lives in the data layer of the module that declares the port;
    - the platform cannot import a module.

  The API's SSE route subscribes through the port's token, exported from `./server`.
- **SSE**: `qup-web`'s SSE client (`event-source.service.ts`, `sse-url.ts`) moves to `qup-platform` as `client/sse/event-source.client.ts`, and its HTTP client to `client/http/`.

### 4. Names

- **Use cases** become concept-first: `create-order` → `order-create`, `get-session-by-code` → `session-get-by-code`, `get-menu` → `menu-item-list`, `get-active-sessions` → `session-list-active`.
- **Repositories**: `pg-order.repository.ts` → `data/server/repository/order-pg.repository.ts`.
- **Mappers**: they become private methods unless two files import them (ADR 0009).
- **Tables**: `schema/*.ts` → `data/server/infra/db/<concept>.table.ts`. Order items keep their own table file, `order-item.table.ts`, loaded by the order repository.

### 5. Apps

- **qup-api**: routes → `ordering/route/<concept>.route.ts`, mounted by `app.ts`. `admin-only.ts` → `core/middleware/admin-only.middleware.ts`, and `error-mapping.ts` → `core/mapper/error-http.mapper.ts`. Serializers become private methods or `ordering/mapper/`. `container.ts` and `api.module.ts` → `di/`.
- **qup-web**:
    - Each file in `routes/` re-exports a page from `ordering/page/`.
    - `"use server"` functions become `ordering/loader/<concept>.loader.ts` and `ordering/action/<concept>.action.ts`.
    - View models → `ordering/view-model/<concept>.view-model.ts`, and components → `ordering/component/` or `core/component/`.
    - `container.ts`, `web.module.ts` and `tokens.ts` → `di/`.
    - `vite-tsconfig-paths` resolves the aliases, because SolidStart runs on Vite 6.4.
    - `.fallowrc.json`'s qup-web entries follow the moved files.

### 6. Migration mechanics

As in `clean-architecture-layout`: `git mv`, one commit per project, and Nx targets green before the next. The `qup` factory call starts with an empty `migrated` list and ends with every qup project in it.

## Risks / Trade-offs

- **[Open `qup-board-*` branches touch `qup-web` and `qup-domain`]** → Gate 1.2: merge or drop them first.
- **[`vite-tsconfig-paths` and the vinxi build disagree]** → Task 1.4 checks the aliases in `qup-web` dev, build and tests before the migration.
- **[Moving `drizzle/` re-runs migrations]** → Move the folder unchanged, journal included. A spec scenario requires that nothing is applied again.
- **[`@m0n0lab/qup-domain` is listed in `.fallowrc.json` `publicPackages`]** → Swap it for the new module package so its exports are not reported as unused.

## Open Questions

- **Module split (§1)**: confirmed by the owner in task 1.3, before any code moves.
