## Why

Need to track what's in the portfolio — which instruments the user owns, at which broker, what type (ETF, index fund, stock, crypto), and target weight. Currently no way to represent "I hold X at broker Y with Z% target allocation." This is the base layer for allocations and returns.

This change also establishes the **canonical investlab package architecture**, reusable by every future investlab change (roger-positions, roger-sectors, roger-dashboard, portfolio-allocations, portfolio-returns, overview, …).

## What Changes

### Feature

- New domain entity `PortfolioItem`: references `Instrument` (from foundation), adds broker, target weight, current value, notes
- New route `/portfolio` in `apps/investlab`: table view of all PortfolioItems with instrument details
- CRUD use cases (entity-action naming): `PortfolioItemCreate`, `PortfolioItemUpdate`, `PortfolioItemDelete`, `PortfolioItemList`
- Drizzle schema + migration for `portfolio_items` table
- Server-side rendering enabled for `apps/investlab` (`ssr: true`); loaders/actions call `investlab-api` over HTTP through client use cases (originally they invoked server use cases in-process; superseded by ADR 0003)
- **New app `apps/investlab-api`** (Hono): sole owner of Postgres, Redis and Finnhub; exposes portfolio, instrument and quote endpoints; protected by a shared bearer token held only by the web server (ADR 0003)
- **Client packages created now**: `investlab-application-client` (client use cases) and `investlab-data-client` (HTTP repositories/queries against `investlab-data-contracts`)
- **Live quotes through the API**: browser → web resource route → API → Redis cache → Finnhub; `VITE_FINNHUB_API_KEY` removed
- **Item + instrument listing is a read query** (SQL JOIN) instead of two `findAll()` calls joined in memory (ADR 0004)
- **`investlab-core` dissolved**: Finnhub/Redis code becomes datasources in `investlab-data-server`; browser ticker store moves into `apps/investlab` (ADR 0004)
- **Error `code` is the wire discriminant**; named error union per use case (ADR 0005)
- **Use-case tests become integration tests**: Testcontainers (Postgres + Redis) server-side, MSW against the API client-side; mocked-repository tests removed (ADR 0006)
- **Env via Varlock + 1Password**: committed `.env.schema` for `apps/investlab` and `apps/investlab-api`; local values resolved from 1Password desktop app; CI needs no secrets

### Architecture (canonical investlab layering)

Investlab packages follow Clean Architecture, split by shared vs server vs client:

```
Shared (consumed from any side):
  investlab-domain              → entities, value objects, repository/service PORTS, errors
  investlab-data-contracts      → DTOs + zod schemas (wire format at HTTP boundary)

Server-only:
  investlab-application-server  → use cases (orchestration: validate + persist + email + audit …)
  investlab-data-server         → port implementations: PG repos + datasources + mappers + drizzle/pool

Client-only (web now; mobile, desktop later):
  investlab-application-client  → client use cases (optimistic UI, retry, offline queue …)
  investlab-data-client         → port implementations: HTTP repos/queries + mappers (datasources only with 2+ sources)

Apps:
  apps/investlab-api            → Hono HTTP API. Server composition root; routes → server use case → result.match.
  apps/investlab                → React Router SSR app, consumer of investlab-api. ViewModels + composition root live here.
  apps/<future-mobile>          → mobile/SPA. ViewModels + composition root live here.
```

**Boundary rules:**

- `domain` is the only **shared ubiquitous language**. Contains pure types + invariants. Never imports anything infra.
- Repository `interface` (port) lives in **`domain`** (shared). Repository `impl` lives in **`data-server`** OR **`data-client`** (never both — each app binds one).
- Entities never cross HTTP. DTOs (`data-contracts`) are the wire format. Mapping DTO↔entity happens in datasources on each side.
- Use cases are **not** shared between server and client. Server and client diverge in orchestration (server sends email, client shows optimistic update). Same conceptual name, different files, different packages.
- **No `sdk` package.** Clients write fetch inline against `data-contracts` types; if reuse appears, `data-contracts` can grow a `createClient(baseUrl)` factory.
- Datasources exist **only when a repository has two or more sources** (ADR 0004); single-source repositories talk to their driver directly. Cross-aggregate reads are read queries, not repository methods.

### Modules created / moved by this change

- Create `packages/investlab-data-contracts` (zod DTOs)
- Create `packages/investlab-application-server` (use cases moved from `investlab-domain`)
- Create `apps/investlab-api` (Hono)
- Create `packages/investlab-application-client` and `packages/investlab-data-client` (first consumer: `apps/investlab`)
- Dissolve `packages/investlab-core`
- Rename `packages/investlab-data` → `packages/investlab-data-server`
- Clean `packages/investlab-domain`: remove use cases, remove `portfolio.module.ts` + `domain.module.ts`; keep entities/VOs/ports/errors

## Capabilities

### New Capabilities

- `investlab-http-api`: Hono API owning persistence and external quote access for InvestLab; bearer-token protected; JSON errors `{ code, message, statusCode }` mapped by `code`.

- `portfolio-holdings`: Manage portfolio items — create, read, update, delete PortfolioItems. Each item references an Instrument, has a broker (free text), target weight (%), current value (manual entry), and optional notes. Table view with instrument type, asset class, replicates info

### Modified Capabilities

- `quote-polling`, `quote-fetching`, `investlab-quote-cache`, `ticker-management`: quotes are fetched server-side by the API (Redis cache + Finnhub datasources) and the browser polls a web resource route instead of Finnhub; code moves out of the dissolved `investlab-core`. Deltas are written before implementation (tasks §7).

## Impact

- **New entity**: `PortfolioItem` in `investlab-domain`
- **New schema**: `portfolio_items` table in `investlab-data-server`
- **New route**: `/portfolio` in `apps/investlab` with SSR loaders/actions calling the API
- **New app**: `apps/investlab-api`; dev now runs two processes (web + API)
- **Env**: web drops `DATABASE_URL`/`REDIS_URL`/`FINNHUB_API_KEY`/`VITE_FINNHUB_API_KEY`, gains API base URL + token; `.env.example` replaced by `.env.schema`
- **New dependency**: `@m0n0lab/drizzle-neverthrow` (change `drizzle-neverthrow-package`) used by `investlab-data-server`
- **New components**: `PortfolioTable`, `PortfolioItemForm`, `PortfolioItemRow`, `PortfolioViewModel`
- **Architecture**: 6 canonical investlab packages (domain, data-contracts, application-server, data-server, application-client, data-client) replace the previous domain/data layout; `investlab-core` is dissolved.
- **SSR flip**: `apps/investlab` switches from SPA to SSR (`ssr: true`). Existing ticker route adjusted to be SSR-safe.
- **Prereq**: `investlab-foundation` complete (Instrument entity, DB, repos)
