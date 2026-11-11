## Context

Qup is a home barista order management app. Guests scan a code/QR, browse a menu, and place orders. The host manages orders in real-time. Built as a side project to deeply explore SolidStart, Hono, Inversify, Drizzle, and DDD/Clean Architecture.

The monorepo already has patterns for publishable packages (`react-clean`, `react-hooks`) with tsdown builds, Vitest testing, and `workspace:*` internal deps. Qup follows the same conventions but introduces two new apps and four new packages.

## Goals / Non-Goals

**Goals:**

- Functional v1: guests order, host manages — works on phones over local WiFi
- Deep exploration of SolidStart (SSR, server functions, hybrid rendering, file-based routing)
- DDD + Clean Architecture with strict layer separation enforced by package boundaries
- Typed error handling everywhere via neverthrow — zero try/catch in business logic
- MVVM in frontend via `solid-clean`, port of the existing `react-clean` pattern
- Inversify as universal DI across all layers
- Real-time order updates via SSE

**Non-Goals:**

- User accounts, OAuth, or persistent auth — PIN only for v1
- Menu per session / availability scheduling / stock tracking — future iterations
- Mobile app — web-only for v1
- Production deployment / hosting — local network only
- Multi-host / multi-venue — single host, single session at a time
- Offline support / PWA — requires network

## Decisions

### 1. Package structure — 6 projects with strict dependency direction

```
packages/solid-clean        → peerDep: solid-js only
packages/qup-domain         → dep: inversify, neverthrow
packages/qup-data           → dep: qup-domain, drizzle-orm, pg
packages/qup-shared         → dep: neverthrow (types only)
apps/qup-api                → dep: qup-domain, qup-data, qup-shared, hono, inversify
apps/qup-web                → dep: qup-shared, solid-clean, solid-start, inversify
```

**Why**: Package boundaries enforce Clean Architecture at the build level. Domain cannot accidentally import Drizzle. Web cannot accidentally import domain internals. The compiler catches violations.

**Alternative considered**: Single package with folder-based separation. Rejected — too easy to leak cross-layer imports, no build-time enforcement.

### 2. SolidStart as SSR/hybrid client with server functions as BFF

SolidStart handles rendering (SSR, streaming, client hydration) and acts as a Backend-For-Frontend via `"use server"` functions. All business logic lives in the Hono API.

```
Browser ──server fn──▶ SolidStart Server ──HTTP──▶ Hono API
Browser ──EventSource────────────────────────────▶ Hono API (SSE only)
```

**Why**: Server functions keep the admin PIN server-side (httpOnly cookie, never in browser). Eliminates CORS for most requests. Exploits SolidStart's `createAsync`/`cache` features. SSE goes direct because it needs a persistent connection the BFF shouldn't proxy.

**Alternative considered**: Direct browser→API. Rejected — exposes PIN to browser, requires CORS config, wastes SolidStart's server features.

### 3. Hono + Inversify via route factories

Hono routes receive the Inversify container and resolve use cases per request:

```typescript
function createOrderRoutes(container: Container): Hono {
  const app = new Hono();
  app.post('/', async (c) => {
    const useCase = container.get<CreateOrderUseCase>(TOKENS.CreateOrder);
    const result = await useCase.execute(await c.req.json());
    return result.match(
      (order) => c.json(toDto(order), 201),
      (error) => c.json(toApiError(error), errorToHttp(error))
    );
  });
  return app;
}
```

**Why**: Hono has no built-in DI. Route factories bridge Hono's functional style with Inversify's container. Use cases are resolved per-request, keeping handlers thin. `result.match()` ensures every error path produces a typed HTTP response.

**Alternative considered**: Hono middleware that injects container into context (`c.var.container`). Viable but less explicit — factory pattern makes the container dependency visible.

### 4. Inversify everywhere — with @injectable in domain

`@injectable()` decorators on use cases in qup-domain. Tokens (Symbols) defined in domain. ContainerModule per package for modular composition.

```
qup-domain/src/tokens.ts          → Symbol definitions
qup-domain/src/domain.module.ts   → binds use cases
qup-data/src/data.module.ts       → binds repo implementations
qup-api/src/api.module.ts         → binds API-specific services (EventBus, etc.)
qup-api/src/container.ts          → loads all modules (composition root)
```

**Why**: `@injectable` is metadata only — doesn't change class behavior, doesn't introduce IO. The alternative (manual `toDynamicValue` wiring) creates significant boilerplate and a maintenance footgun when constructor params change.

**Line not crossed**: Domain never imports Drizzle, pg, Hono, fetch, fs, or any IO. Only inversify (metadata) and neverthrow (error types).

### 5. Inversify in SolidStart — singleton container, no Context Provider

```typescript
// qup-web/src/container.ts
const container = new Container();
container.load(webModule);
export { container };

// In a ViewModel
import { container } from '../container';
```

**Why**: Simpler than wrapping the app in a Context Provider. The container is a singleton — there's no scenario where different subtrees need different containers. Direct import is explicit and fails at import-time, not runtime.

### 6. MVVM via solid-clean — BaseViewModel + useViewModel

Port of `@m0n0lab/react-clean` adapted to Solid's execution model:

- `BaseViewModel`: abstract class with `didMount(owner?)`, `willUnmount()`, generic cleanup array (not RxJS Subscription)
- `useViewModel(factory)`: calls factory once (Solid components run once), wires `onMount`/`onCleanup`, passes `getOwner()` to `didMount`

State in ViewModels uses Solid's `createSignal` directly — no RxJS, no bridge layer.

**Why**: Solid's reactivity is primitive. Signals in a class work natively. RxJS would add a redundant reactive layer requiring a bridge (`observable→signal`). The `owner` parameter allows VMs to use `createEffect` inside `runWithOwner` if needed.

**solid-clean has zero knowledge of Inversify** — it's a pure MVVM lifecycle library. Peer dep is only `solid-js`.

### 7. neverthrow transversal — typed errors, zero try/catch

Every async boundary returns `ResultAsync<T, E>`. Error types are domain value objects.

```
Domain errors:    SessionNotFoundError, OrderNotCancellableError, etc.
Data errors:      PersistenceError (wraps unknown cause)
API mapping:      DomainError → HTTP status code + ApiErrorDto
BFF mapping:      HTTP response → Result<T, ApiErrorDto>
ViewModel:        result.match() → update signals or set error signal
```

Single try/catch boundary: `ResultAsync.fromPromise()` in data layer repos, wrapping Drizzle operations.

**Why**: Explicit error types in function signatures make error handling exhaustive and compiler-checked. `result.match()` forces handling both paths. No surprise exceptions propagating through layers.

### 8. Drizzle + PostgreSQL — schema separate from domain

Drizzle schema in `qup-data/src/schema/`. Four tables: `sessions`, `orders`, `order_items`, `menu_items`. Each repo has `toDomain(row)` and `toRow(entity)` mappers.

`toDomain` reconstructs entities via private/internal constructors (not `Entity.create()` which validates) because DB data is already valid.

**Why Drizzle over Prisma**: Drizzle doesn't impose its model on domain entities. Prisma's generated types tend to become the domain model, violating DDD. Drizzle is a thin query layer — domain entities stay independent.

### 9. SSE for real-time — EventBus port in domain

```
Domain:  EventBus interface (port) — emit/on
API:     InMemoryEventBus (adapter) — Node EventEmitter
Route:   GET /events/sessions/:code — SSE stream filtered by session
Client:  EventSource API — auto-reconnect built in
```

Events: `order:created`, `order:status`, `order:cancelled`, `session:closed`. v1 filters by guest name on the client side.

**Why SSE over WebSocket**: Unidirectional (server→client) is sufficient — user actions go via HTTP POST/PATCH. SSE has built-in reconnection, simpler than WS, native browser API, and Hono supports it out of the box.

**Why in-memory over Redis/message queue**: Single server, local network. No need for distributed pub/sub in v1.

### 10. Admin auth — PIN via env var

`API_ADMIN_PIN` env var. Hono middleware checks `X-Admin-Pin` header. SolidStart server functions read the PIN server-side and set an httpOnly cookie.

Admin routes: all mutations on sessions, order status changes, menu CRUD.
Open routes: join session, view menu, create order, view own orders, SSE.

**Why PIN over passwords/OAuth**: Single user (the host), local network, side project. PIN is the simplest auth that works. httpOnly cookie via server function means the PIN is never in browser JS.

## Risks / Trade-offs

- **[In-memory EventBus loses events on restart]** → Acceptable for v1. Orders persist in DB; clients reconnect and refetch. Migrate to Redis pub/sub if needed later.
- **[Single session at a time]** → Design doesn't prevent multiple, but UI/UX assumes one active session. Can be extended without architectural changes.
- **[experimentalDecorators required for Inversify 7.x]** → All qup packages need `experimentalDecorators: true` + `emitDecoratorMetadata: true` in tsconfig. Inversify 8 (March 2026) may change this; contained to qup packages only.
- **[SolidStart ecosystem less mature than Next/Remix]** → Accepted risk — exploration is the point. Solid UI / Kobalte may have gaps. Fallback: build custom components with Tailwind.
- **[Server functions add a network hop]** → SolidStart server → Hono API adds ~1ms on local network. Negligible for this use case.
- **[Signals in class constructors run outside reactive scope]** → `createSignal` works fine outside scope. Only `createEffect` needs an owner, which is passed via `didMount(owner)`.
- **[Guest name is not authenticated]** → Anyone can claim any name. Acceptable for trusted home environment. v2 could add session-scoped guest tokens.
