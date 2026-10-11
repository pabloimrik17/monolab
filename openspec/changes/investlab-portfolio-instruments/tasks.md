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
- [x] 3.6 Create `portfolioApplicationModule` (ContainerModule) binding use cases
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
