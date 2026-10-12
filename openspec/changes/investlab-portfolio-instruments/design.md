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
- Broker as its own record (lookup table) — likely later, when brokers need their own data
- Deployment target for web + API
- Migrating QUP to the conventions decided here (naming, integration tests, wrapper, Varlock) — tracked in beads

## Decisions

Package layering is recorded in [ADR 0001](../../../docs/adr/0001-investlab-package-layering.md). [ADR 0002](../../../docs/adr/0002-investlab-ssr-over-spa-api.md) (no separate API) is superseded by [ADR 0003](../../../docs/adr/0003-investlab-hono-api-behind-ssr.md) (separate Hono API behind the SSR web). Datasources and read queries: [ADR 0004](../../../docs/adr/0004-investlab-datasources-and-read-queries.md). Error codes: [ADR 0005](../../../docs/adr/0005-investlab-error-code-is-the-wire-discriminant.md). Use-case testing: [ADR 0006](../../../docs/adr/0006-investlab-use-case-integration-tests.md).

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

Client (web now):
  investlab-application-client  client use cases (optimistic UI, retry, offline queue)
  investlab-data-client         port impls (HTTP repos/queries) + mappers + api-client

Apps:
  apps/investlab-api            Hono API; server composition root
  apps/investlab                React Router SSR, API consumer; ViewModels + client composition root
```

**Boundaries:**

- Repository **interface** (port) → `investlab-domain`. Reusable by server and client impls.
- Repository **implementation** → `data-server` (PG) or `data-client` (HTTP). Never both in the same bind.
- Datasource per entity × source only when a repository has 2+ sources (first case: quotes = Redis cache + Finnhub); single-source repos talk to their driver directly (ADR 0004).
- Cross-aggregate reads (item + instrument) are **read-query ports** with read-model types in `investlab-domain`; data-server implements them with SQL JOINs, data-client with one HTTP call.
- Row/DTO ↔ entity mappers live in their own non-exported `mappers/*.mapper.ts`; a private method only when exactly one place maps.
- Entities never cross HTTP. **DTO ↔ entity mapping** happens in the data layer on each side.
- Use cases are **not shared**. Server and client diverge in orchestration. Same name, different package.
- No `sdk` package. Clients either write fetch inline (using `data-contracts` types) or, if reuse appears, upgrade `data-contracts` to export a `createClient(baseUrl)` factory.
- `investlab-core` is **dissolved**: Finnhub client → Finnhub datasource and quote cache → Redis datasource in `data-server`; quote port in `domain`; browser ticker store → `apps/investlab` until the legacy ticker list is retired.

### 3. Use cases in `investlab-application-server`

Naming is **entity-action** (file `portfolio-item-update.use-case.ts`, class `PortfolioItemUpdateUseCase`, error union `PortfolioItemUpdateError`), replacing the verb-entity names first implemented.

- `PortfolioItemCreateUseCase`: validates instrument exists, creates item, persists
- `PortfolioItemUpdateUseCase`: finds item, applies `PortfolioItem.update(changes)` (generic; intent methods such as `revalue()` are added only when a second flow with its own rules appears), persists
- `PortfolioItemDeleteUseCase`: removes item by ID
- `PortfolioItemListUseCase`: returns all items ordered by `createdAt` ascending, with resolved instrument data, via the portfolio read query (single SQL JOIN), plus the instrument catalog for the form selector

All `@injectable()`, return `ResultAsync`, export a named error union, use ports from `investlab-domain`. Tokens live in `application-server`'s own `tokens.ts`. Client use cases in `application-client` mirror these names; for CRUD they are pass-throughs to the HTTP repositories, accepted for consistency.

Repository ports expose named `findByX` methods only when a use case needs them; `findByInstrumentId` (no callers) is removed. No generic `findBy(filters)`.

Domain errors keep SCREAMING_SNAKE `code` values without namespace, typed as a literal union; the API maps errors to HTTP status by `code`, and `data-client` rebuilds domain errors from `code` (ADR 0005).

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

### 5. SSR web in front of a separate Hono API

React Router 8's SPA mode (`ssr: false`) **forbids actions** and restricts loaders to root/prerendered routes. `/portfolio` needs both, so `apps/investlab` stays `ssr: true`. Its loaders/actions call **client use cases** that hit `apps/investlab-api` over HTTP; the browser never calls the API (ADR 0003). The first implementation wired Postgres/Redis/Finnhub into `container.server.ts` and called server use cases in-process; that moves to the API.

`apps/investlab-api` follows the `apps/qup-api` shape: Hono routes → Inversify container → server use case → `result.match` → error mapping (by `code`). Request bodies are validated with the zod schemas in `investlab-data-contracts`. A bearer-token middleware rejects requests without `Authorization: Bearer <INVESTLAB_API_TOKEN>`; only the web server holds the token.

Live quotes: the browser poller calls a web resource route, which calls the API's quote endpoint, which reads the quote repository (Redis cache datasource → Finnhub datasource). `VITE_FINNHUB_API_KEY` is removed.

Existing `_index.tsx` (ticker tracker) accesses `window.localStorage` at module load; this is fixed by lazy-initialising the ticker store and deferring reads to `useEffect`.

### 6. Route-level data flow

`/portfolio` uses React Router's loader + action pattern:

- `loader`: resolves the client `PortfolioItemListUseCase` from the web container, returns items
- `action`: reads form intent (create/update/delete), validates the form with the `data-contracts` zod schema, resolves the matching client use case, invokes it
- Component: consumes `useLoaderData` + `useFetcher` / `Form` for mutations
- `PortfolioViewModel`: hook extracted from the component for readability — wraps loader data + fetcher dispatch; still lives in the app (not a package) because it's React Router-specific

### 7. Environment via Varlock + 1Password

`apps/investlab` and `apps/investlab-api` each commit a `.env.schema` (types, required, sensitive), replacing `.env.example`. Locally, secrets resolve with `op(op://…)` through the 1Password desktop app (`allowAppAuth`, scoped to dev). CI needs no real secrets — integration tests use Testcontainers — so the schema supplies per-environment values and no service-account token is configured yet. `drizzle.config.ts` stops loading `../../apps/investlab/.env` by hand and reads the API's env through Varlock. Monolab-wide rollout and CI with a service-account token are tracked in beads.

### 8. Testing

Use cases are covered by integration tests (ADR 0006): server use cases with real repositories against Postgres + Redis from Testcontainers, Finnhub faked with MSW; client use cases with real `data-client` repositories against the API faked with MSW. Existing mocked-repository use-case tests are rewritten and removed. Unit tests remain for entities, mappers and pure logic. Requires a Docker-compatible daemon (Docker Desktop, OrbStack or colima).

### 9. Persistence wrapper

`investlab-data-server` uses `@m0n0lab/drizzle-neverthrow` (separate change `drizzle-neverthrow-package`): a wrapped Drizzle client whose queries return `ResultAsync`, grown only with the operations InvestLab needs, replacing the copy-pasted `ResultAsync.fromPromise` calls.

## Risks / Trade-offs

- **Target weights don't need to sum to 100%** — User might be in transition, adding items incrementally. UI can warn but not enforce. Keeps it flexible.
- **Current value is manual entry** — Returns module will add automatic pricing for quotable instruments. For now, manual keeps it simple and works for non-quotable index funds.
- **Broker as free text** — Could lead to inconsistencies ("MyInvestor" vs "myinvestor") that break grouping by broker. Kept as is for now; likely becomes its own lookup table when brokers need their own data.
- **Separate API for a single-user tool** — Two processes, an extra network hop and pass-through client use cases for CRUD. Accepted: the backend is the intended architecture and later consumers reuse it.
- **Shared token, no user login** — Enough while only the web server calls the API; user auth arrives with a second consumer.
- **Datasources only with 2+ sources** — Repositories gain a datasource when a second source appears; the refactor is local to that repository.
- **Docker required for tests** — Testcontainers needs a Docker-compatible daemon locally and in CI.
