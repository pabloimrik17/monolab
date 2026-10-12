## 1. Domain (entities, VOs, ports, errors — shared)

- [x] 1.1 Define `PortfolioItem` entity in `investlab-domain` — id, instrumentId, broker, targetWeight, currentValue, notes, createdAt, updatedAt. `create()` returns `Result<PortfolioItem, ValidationError>`
- [x] 1.2 Define error types: `PortfolioItemNotFoundError`, `InstrumentNotFoundError` (if not already in foundation)
- [x] 1.3 Define `PortfolioItemRepository` interface — save, findById, findAll, findByInstrumentId, update, delete. All return `ResultAsync`
- [x] 1.4 Define tokens in domain tokens.ts for PortfolioItemRepository (use case tokens move to application-server — see §3)
- [x] 1.9 Write unit tests for PortfolioItem entity — create valid, invalid weight, empty broker

## 2. Data — server side (PG repos, schema, mappers)

- [x] 2.1 Define Drizzle schema: `portfolio_items` table with FK to instruments
- [x] 2.2 Generate migration for portfolio_items table with index on instrument_id
- [x] 2.3 Implement `toDomain(row)` and `toRow(entity)` mappers for PortfolioItem
- [x] 2.4 Implement `PgPortfolioItemRepository` (@injectable) implementing PortfolioItemRepository with Drizzle queries wrapped in ResultAsync
- [x] 2.5 Create `portfolioDataModule` (ContainerModule) binding repo implementation
- [x] 2.6 Export public API from data index.ts

## 3. Application (use cases) — server side

- [x] 3.1 Implement `CreatePortfolioItemUseCase` (@injectable) — inject InstrumentRepository and PortfolioItemRepository, validate instrument exists, create item, persist
- [x] 3.2 Implement `UpdatePortfolioItemUseCase` (@injectable) — find item, update mutable fields, persist
- [x] 3.3 Implement `DeletePortfolioItemUseCase` (@injectable) — find item, delete
- [x] 3.4 Implement `ListPortfolioItemsUseCase` (@injectable) — return all items with resolved Instrument data
- [x] 3.5 Write unit tests for use cases with mock repos
- [x] 3.6 Create `portfolioModule` (ContainerModule) binding use cases
- [x] 3.7 Export public API from application-server index.ts

## 4. Package refactor (canonical layering)

- [x] 4.1 Rename `packages/investlab-data` → `packages/investlab-data-server`; update `package.json#name`, tsconfig refs, project.json, knip config
- [x] 4.2 Create `packages/investlab-application-server`; move `use-cases/`, `portfolio.module.ts`, use-case tokens out of `investlab-domain`
- [x] 4.3 Create `packages/investlab-data-contracts` with PortfolioItem DTOs + zod schemas
- [x] 4.4 Defer `packages/investlab-application-client` until the first client consumer appears (dropped: not created, see ADR 0001)
- [x] 4.5 Defer `packages/investlab-data-client` until the first client consumer appears (dropped: not created, see ADR 0001)
- [x] 4.6 Clean `investlab-domain`: remove use case exports from index.ts; delete `portfolio.module.ts`, `domain.module.ts`; keep entities/VOs/ports/errors
- [x] 4.7 Update all workspace imports (apps/investlab `container.server.ts`, any cross-package import)

## 5. UI (apps/investlab)

- [x] 5.1 Flip `react-router.config.ts` to `ssr: true`; lazy-init ticker store in `lib/wealth.ts`; defer localStorage reads to `useEffect` in `_index.tsx`
- [x] 5.2 Create `/portfolio` route with server `loader` invoking `ListPortfolioItemsUseCase` via Inversify container
- [x] 5.3 Implement `action` in `/portfolio` handling create/update/delete intents via respective use cases
- [x] 5.4 Implement `PortfolioTable` component — columns: name, symbol, type badge, asset class badge, broker, target weight, current value, replicates
- [x] 5.5 Implement `PortfolioItemForm` component — instrument selector (from existing catalog), broker input, target weight input, current value input, notes textarea
- [x] 5.6 Implement `PortfolioItemRow` component — single row with edit/delete actions
- [x] 5.7 Implement `usePortfolioViewModel` hook — wraps loader data + fetcher dispatch for CRUD
- [x] 5.8 Wire Inversify container with portfolio modules in `container.server.ts` (already present; ensure imports updated post-refactor)
- [x] 5.9 Add navigation in `root.tsx` linking `/` and `/portfolio`

## 6. Verification

- [x] 6.1 Verify `nx run investlab-domain:build` succeeds
- [x] 6.2 Verify `nx run investlab-data-server:build` succeeds (formerly `investlab-data`)
- [x] 6.3 Verify `nx run investlab-application-server:build` succeeds
- [x] 6.4 Verify `nx run investlab-data-contracts:build` succeeds
- [x] 6.5 Verify `nx run investlab-domain:test` passes — entity tests
- [x] 6.6 Verify `nx run investlab-application-server:test` passes — use case tests
- [x] 6.7 Verify `nx run investlab:build` succeeds (app with new SSR route)
- [x] 6.8 Manual test: create, view, edit, delete portfolio item end-to-end

## 7. Specs reconciliation (before implementing §8–§13)

- [x] 7.1 Write MODIFIED deltas for `quote-polling`, `quote-fetching`, `investlab-quote-cache`, `ticker-management` (quotes server-side via API; browser polls a web resource route; code leaves `investlab-core`)
- [x] 7.2 Complete `investlab-http-api` delta scenarios against the final endpoint list

## 8. Domain and naming

- [x] 8.1 Rename server use cases to entity-action: `portfolio-item-{create,update,delete,list}.use-case.ts`, classes `PortfolioItem{Create,Update,Delete,List}UseCase`, tokens accordingly
- [x] 8.2 Export a named error union per use case (`PortfolioItemUpdateError`, …)
- [x] 8.3 Type `DomainError.code` as a literal union of the existing SCREAMING_SNAKE codes
- [x] 8.4 Remove `PortfolioItemRepository.findByInstrumentId` (no callers) from port and PG impl
- [x] 8.5 Add portfolio read-query port + read-model type in `investlab-domain` (item + instrument); `PortfolioItemListUseCase` uses it instead of two `findAll()` + in-memory join
- [x] 8.6 Move quote port into `investlab-domain` if not already there; verify `nx run investlab-domain:test:unit`

## 9. Data server

- [x] 9.1 Implement the portfolio read query in `investlab-data-server` with a single SQL JOIN; reuse `instrument.mapper.ts` (mappers stay non-exported modules)
- [x] 9.2 Dissolve `investlab-core`: Finnhub client → Finnhub datasource, `QuoteCacheImpl` → Redis datasource, quote repository combining both (cache first, then Finnhub, write-through)
- [x] 9.3 Adopt `@m0n0lab/drizzle-neverthrow` (change `drizzle-neverthrow-package`) in PG repositories and read query, removing copy-pasted `ResultAsync.fromPromise`
- [x] 9.4 Delete `packages/investlab-core`; update knip/tsconfig refs; `pnpm nx sync`

## 10. API app

- [x] 10.1 Scaffold `apps/investlab-api` (Hono) mirroring `apps/qup-api`: `app.ts`, `container.ts`, `routes/`, `errors/error-mapping.ts`
- [x] 10.2 Error mapping keyed by `code` → HTTP status; body `{ code, message, statusCode }` (500s hide message)
- [x] 10.3 Bearer-token middleware (`INVESTLAB_API_TOKEN`)
- [x] 10.4 Routes: portfolio items CRUD + list (read model), instruments list, quotes; request bodies validated with `investlab-data-contracts` zod schemas
- [x] 10.5 Move Postgres/Redis/Finnhub wiring from `apps/investlab/app/lib/container.server.ts` into the API container; move drizzle config/migrations ownership to the API env
- [x] 10.6 Verify `nx run investlab-api:build` and `nx run investlab-api:typecheck`

## 11. Client packages

- [x] 11.1 Create `packages/investlab-data-client`: HTTP repositories + portfolio read query + quote repository against the API using `investlab-data-contracts`; rebuild domain errors from `code`; network failure → client error
- [x] 11.2 Create `packages/investlab-application-client`: client use cases with entity-action names and their error unions (adds the network error)
- [x] 11.3 Exports validated (`attw --pack` if published — packages are private, attw n/a); verify builds via `nx run-many -t build`

## 12. Web app

- [x] 12.1 Replace server wiring in `container.server.ts` with client modules (API base URL + token)
- [ ] 12.2 `/portfolio` loader/action call client use cases
- [ ] 12.3 Add a web resource route for quotes; point the browser poller at it; move ticker store into `apps/investlab`; remove `VITE_FINNHUB_API_KEY`
- [ ] 12.4 Dev: run web + API together (`nx run-many -t dev -p investlab investlab-api`)

## 13. Environment (Varlock + 1Password)

- [x] 13.1 Add `.env.schema` for `apps/investlab-api` (DATABASE_URL, REDIS_URL, FINNHUB_API_KEY, INVESTLAB_API_TOKEN) and `apps/investlab` (API base URL, INVESTLAB_API_TOKEN); local values via `op(op://…)` with 1Password desktop app auth for dev; remove `.env.example`
- [x] 13.2 Load env through Varlock in both apps and in `drizzle.config.ts` (drop `process.loadEnvFile` of `../../apps/investlab/.env`)
- [x] 13.3 CI: no 1Password token; schema supplies test/CI values

## 14. Tests (ADR 0006)

- [ ] 14.1 Testcontainers setup (Postgres + Redis) in a separate integration test target for API-side packages; apply migrations per run
- [ ] 14.2 Rewrite server use-case tests as integration tests with real repositories; Finnhub faked with MSW; delete mocked-repository use-case tests
- [ ] 14.3 Client use-case integration tests: real `data-client` repositories, API faked with MSW
- [ ] 14.4 Wire integration target into CI (GitHub Actions has Docker)
- [ ] 14.5 Manual E2E: create, view, edit, delete portfolio item through web → API; live quotes refresh with no Finnhub key in the browser bundle
