## Context

InvestLab portfolio module needs a way to represent what the user holds. The `Instrument` entity (from foundation) defines what an instrument *is*; `PortfolioItem` defines the user's *relationship* to it — where they hold it, how much weight it should have, what it's currently worth.

User's portfolio includes: ETF gold and Nasdaq, direct BTC, index funds via MyInvestor, individual stocks via Roger. Each PortfolioItem has a broker and target weight; Roger is a trading methodology, never a broker.

This change also finalizes the **canonical investlab package layering** so subsequent changes (roger-*, portfolio-allocations, portfolio-returns, overview, …) can drop code in the right place without re-deciding.

## Goals / Non-Goals

**Goals:**

- `PortfolioItem` CRUD with full instrument context displayed
- Table view showing instrument name, type, asset class, broker, target weight, current value, whether it replicates an index
- Leverage existing `Instrument` entity — `PortfolioItem` references it by ID, not duplication
- Establish package layout + boundary rules reusable for every future investlab change

**Non-Goals:**

- Automatic value updates (returns module territory)
- Contribution tracking (allocations module territory)
- Broker as a separate entity — free text for now, formalize later if needed
- Portfolio sharing or multi-user
- Client packages (`application-client`, `data-client`) — not created in this change; created when the first client consumer appears

## Decisions

Package layering and SSR decisions are recorded in [ADR 0001](../../../docs/adr/0001-investlab-package-layering.md) and [ADR 0002](../../../docs/adr/0002-investlab-ssr-over-spa-api.md).

### 1. `PortfolioItem` entity in `investlab-domain`

```
PortfolioItem {
  id: uuid
  instrumentId: uuid        // FK to Instrument
  broker: string            // "MyInvestor", "Binance", "Interactive Brokers"
  targetWeight: number      // 0-100, percentage of portfolio
  currentValue: number      // Manual entry for now (€)
  notes?: string            // Optional free text
  createdAt: Date
  updatedAt: Date
}
```

**Why separate entity, not extending Instrument:** `Instrument` is a shared catalog (used by Roger too). `PortfolioItem` is portfolio-specific context. One instrument can appear in multiple portfolio items (e.g., same ETF at two brokers).

### 2. Canonical package layering

```
Shared (client + server consumption):
  investlab-domain              entities, VOs, repo/service ports, errors
  investlab-data-contracts      DTOs + zod schemas for HTTP wire format

Server:
  investlab-application-server  use cases (orchestration + server-only concerns: email, audit, queues)
  investlab-data-server         port impls (PG repos) + datasources + mappers + drizzle/pool

Client (future):
  investlab-application-client  (future) use cases (optimistic UI, retry, offline queue)
  investlab-data-client         (future) port impls (HTTP repos) + datasources + mappers + api-client

Apps:
  apps/investlab                React Router SSR; ViewModels + composition root live in the app
```

**Boundaries:**

- Repository **interface** (port) → `investlab-domain`. Reusable by server and client impls.
- Repository **implementation** → `data-server` (PG) or `data-client` (HTTP). Never both in the same bind.
- Datasource sits between repo impl and driver (ORM / http client), even with a single source — keeps the shape predictable across packages.
- Entities never cross HTTP. **DTO ↔ entity mapping** happens inside the datasource layer on each side.
- Use cases are **not shared**. Server and client diverge in orchestration. Same name, different package.
- No `sdk` package. Clients either write fetch inline (using `data-contracts` types) or, if reuse appears, upgrade `data-contracts` to export a `createClient(baseUrl)` factory.
- `investlab-core` (existing) stays as external client utilities (Finnhub, quote cache, ticker store). Not part of the canonical layering — it's shared infrastructure used by specific features.

### 3. Use cases in `investlab-application-server`

- `CreatePortfolioItemUseCase`: validates instrument exists, creates item, persists
- `UpdatePortfolioItemUseCase`: finds item, updates mutable fields (broker, weight, value, notes)
- `DeletePortfolioItemUseCase`: removes item by ID
- `ListPortfolioItemsUseCase`: returns all items ordered by `createdAt` ascending, with resolved instrument data

All `@injectable()`, return `ResultAsync`, use repository interfaces from `investlab-domain`. Tokens live in `application-server`'s own `tokens.ts`.

### 4. Drizzle schema — `portfolio_items` table

```sql
portfolio_items (
  id UUID PK DEFAULT gen_random_uuid(),
  instrument_id UUID NOT NULL REFERENCES instruments(id),
  broker VARCHAR(100) NOT NULL,
  target_weight NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (target_weight >= 0 AND target_weight <= 100),
  current_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
)
```

Index on `instrument_id`. No unique constraint on `(instrument_id, broker)` — user might track the same instrument at the same broker as separate line items.

### 5. SSR flip for `apps/investlab`

React Router 8's SPA mode (`ssr: false`) **forbids actions** and restricts loaders to root/prerendered routes. `/portfolio` needs both. With `container.server.ts` already using Drizzle/Postgres, flipping to `ssr: true` aligns the app with existing infrastructure and lets loaders/actions call `application-server` use cases directly via the Inversify container — no separate HTTP API needed.

Existing `_index.tsx` (ticker tracker) accesses `window.localStorage` at module load; this is fixed by lazy-initialising the ticker store and deferring reads to `useEffect`.

### 6. Route-level data flow

`/portfolio` uses React Router's loader + action pattern:

- `loader`: resolves `ListPortfolioItemsUseCase` from container, returns items
- `action`: reads form intent (create/update/delete), resolves the matching use case, invokes it
- Component: consumes `useLoaderData` + `useFetcher` / `Form` for mutations
- `PortfolioViewModel`: hook extracted from the component for readability — wraps loader data + fetcher dispatch; still lives in the app (not a package) because it's React Router-specific

## Risks / Trade-offs

- **Target weights don't need to sum to 100%** — User might be in transition, adding items incrementally. UI can warn but not enforce. Keeps it flexible.
- **Current value is manual entry** — Returns module will add automatic pricing for quotable instruments. For now, manual keeps it simple and works for non-quotable index funds.
- **Broker as free text** — Could lead to inconsistencies ("MyInvestor" vs "myinvestor"). Acceptable for single user. Could add normalization or autocomplete later.
- **Deferred client packages** (`application-client`, `data-client`) — Deliberately not scaffolded in this change; created when the first client consumer appears. The convention is documented without maintaining empty packages (see ADR 0001).
- **SSR flip** — Adds a small server bootstrap cost but unlocks direct use case invocation. Trade-off favored over SPA + separate API while investlab remains single-origin.
- **No datasources shortcut** — Insisting on a datasource layer even with a single source is ceremony when trivial. Accepted as cost of uniformity across a growing monorepo; prevents ad-hoc layering when a second source appears later.
