## Why

Home barista hosting needs a simple order management system. Guests should browse a menu and place drink orders from their phones; the host should see incoming orders in real-time and manage their status. This is also a playground to explore SolidStart, Hono, Inversify, Drizzle, and DDD/Clean Architecture patterns in depth.

## What Changes

- New app `qup-web`: SolidStart frontend with SSR/hybrid rendering, MVVM pattern, Solid UI + Tailwind
- New app `qup-api`: Hono REST API with Inversify DI, SSE real-time events, PIN-based admin auth
- New package `qup-domain`: Pure domain layer — entities (Session, Order, MenuItem), value objects, use case classes, repository interfaces. Only dependency: inversify (metadata). Uses neverthrow `Result`/`ResultAsync` for typed error handling
- New package `qup-data`: Drizzle ORM + PostgreSQL implementations of domain repository interfaces, schema definitions, migrations, domain↔persistence mappers
- New package `qup-shared`: DTOs and API contract types shared between web and api. Zero runtime dependencies
- New package `solid-clean`: Framework-agnostic MVVM library for SolidJS (port of `@m0n0lab/react-clean`). Exports `BaseViewModel` + `useViewModel`. Peer dep: solid-js only
- Server functions (BFF pattern) in SolidStart for data loading and mutations; SSE connects directly to Hono API for real-time updates
- Inversify containers composed via `ContainerModule` per package; singleton container exported directly (no Context Provider)

## Capabilities

### New Capabilities

- `qup-session-management`: Session lifecycle — create, close, join via code/QR. Aggregate root with OPEN→CLOSED status machine
- `qup-order-management`: Order lifecycle — create, update status (PENDING→PREPARING→DONE), cancel (only PENDING). Aggregate root with typed state transitions
- `qup-menu-management`: Global menu CRUD — create, update, delete, toggle availability. MenuItem entity with categories (COFFEE, TEA, INFUSION, JUICE, OTHER)
- `qup-realtime-events`: SSE event system — EventBus port in domain, in-memory impl, browser EventSource. Events: order:created, order:status, order:cancelled, session:closed
- `qup-admin-auth`: PIN-based admin authentication — env var config, middleware guard on admin routes, httpOnly cookie via server functions
- `qup-api`: Hono REST API — route factories with Inversify container, neverthrow Result→HTTP response mapping, CORS, error middleware
- `qup-web`: SolidStart frontend — SSR/hybrid rendering, server functions as BFF, file-based routing, MVVM with ViewModels using Solid signals
- `solid-clean`: MVVM library for SolidJS — BaseViewModel (lifecycle + generic cleanup), useViewModel hook (onMount/onCleanup bridge). Reusable, not coupled to Qup

### Modified Capabilities

None. All capabilities are new.

## Impact

- **New projects**: 2 apps (`apps/qup-web`, `apps/qup-api`) + 4 packages (`packages/qup-domain`, `packages/qup-data`, `packages/qup-shared`, `packages/solid-clean`)
- **Dependencies added**: solid-js, solid-start, @solidjs/router, hono, inversify, drizzle-orm, drizzle-kit, pg, neverthrow, tailwindcss, solid-ui/kobalte
- **Infrastructure**: PostgreSQL database required (local dev via Docker)
- **Workspace config**: pnpm-workspace.yaml already covers `apps/*` and `packages/*` — no changes needed
- **Nx config**: New projects auto-detected. May need target defaults for `dev`, `build`, `db:migrate`
- **Existing code**: Zero impact on existing packages (react-clean, react-hooks, ts-configs, etc.)
