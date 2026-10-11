## Why

Need to track what's in the portfolio — which instruments the user owns, at which broker, what type (ETF, index fund, stock, crypto), and target weight. Currently no way to represent "I hold X at broker Y with Z% target allocation." This is the base layer for allocations and returns.

This change also establishes the **canonical investlab package architecture**, reusable by every future investlab change (roger-positions, roger-sectors, roger-dashboard, portfolio-allocations, portfolio-returns, overview, …).

## What Changes

### Feature

- New domain entity `PortfolioItem`: references `Instrument` (from foundation), adds broker, target weight, current value, notes
- New route `/portfolio` in `apps/investlab`: table view of all PortfolioItems with instrument details
- CRUD use cases: `CreatePortfolioItem`, `UpdatePortfolioItem`, `DeletePortfolioItem`, `ListPortfolioItems`
- Drizzle schema + migration for `portfolio_items` table
- Server-side rendering enabled for `apps/investlab` (`ssr: true`) so React Router loaders/actions can invoke use cases directly via the Inversify container

### Architecture (canonical investlab layering)

Investlab packages follow Clean Architecture, split by shared vs server vs client:

```
Shared (consumed from any side):
  investlab-domain              → entities, value objects, repository/service PORTS, errors
  investlab-data-contracts      → DTOs + zod schemas (wire format at HTTP boundary)

Server-only:
  investlab-application-server  → use cases (orchestration: validate + persist + email + audit …)
  investlab-data-server         → port implementations: PG repos + datasources + mappers + drizzle/pool

Client-only (future; web, mobile, desktop):
  investlab-application-client  → client use cases (optimistic UI, retry, offline queue …)
  investlab-data-client         → port implementations: HTTP repos + datasources + mappers + api-client

Apps:
  apps/investlab                → React Router SSR app. ViewModels + composition root live here.
  apps/<future-mobile>          → mobile/SPA. ViewModels + composition root live here.
```

**Boundary rules:**

- `domain` is the only **shared ubiquitous language**. Contains pure types + invariants. Never imports anything infra.
- Repository `interface` (port) lives in **`domain`** (shared). Repository `impl` lives in **`data-server`** OR **`data-client`** (never both — each app binds one).
- Entities never cross HTTP. DTOs (`data-contracts`) are the wire format. Mapping DTO↔entity happens in datasources on each side.
- Use cases are **not** shared between server and client. Server and client diverge in orchestration (server sends email, client shows optimistic update). Same conceptual name, different files, different packages.
- **No `sdk` package.** Clients write fetch inline against `data-contracts` types; if reuse appears, `data-contracts` can grow a `createClient(baseUrl)` factory.
- Datasources exist **even when there is a single source**, to keep `repo impl → datasource → driver` layering consistent across the monorepo.

### Modules created / moved by this change

- Create `packages/investlab-data-contracts` (zod DTOs)
- Create `packages/investlab-application-server` (use cases moved from `investlab-domain`)
- `packages/investlab-application-client`: not created in this change; created when the first client consumer appears
- `packages/investlab-data-client`: not created in this change; created when the first client consumer appears
- Rename `packages/investlab-data` → `packages/investlab-data-server`
- Clean `packages/investlab-domain`: remove use cases, remove `portfolio.module.ts` + `domain.module.ts`; keep entities/VOs/ports/errors

## Capabilities

### New Capabilities

- `portfolio-holdings`: Manage portfolio items — create, read, update, delete PortfolioItems. Each item references an Instrument, has a broker (free text), target weight (%), current value (manual entry), and optional notes. Table view with instrument type, asset class, replicates info

### Modified Capabilities

- None functionally. Package rename/move is structural refactor — no behavior change

## Impact

- **New entity**: `PortfolioItem` in `investlab-domain`
- **New schema**: `portfolio_items` table in `investlab-data-server`
- **New route**: `/portfolio` in `apps/investlab` with SSR loaders/actions
- **New components**: `PortfolioTable`, `PortfolioItemForm`, `PortfolioItemRow`, `PortfolioViewModel`
- **Architecture**: 4 canonical investlab packages replace the previous domain/data layout; `investlab-core` remains unchanged outside this layering. Client packages are not created in this change; created when the first client consumer appears.
- **SSR flip**: `apps/investlab` switches from SPA to SSR (`ssr: true`). Existing ticker route adjusted to be SSR-safe.
- **Prereq**: `investlab-foundation` complete (Instrument entity, DB, repos)
