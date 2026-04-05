## 1. Domain

- [ ] 1.1 Define `PortfolioItem` entity in `investlab-domain` — id, instrumentId, broker, targetWeight, currentValue, notes, createdAt, updatedAt. `create()` returns `Result<PortfolioItem, ValidationError>`
- [ ] 1.2 Define error types: `PortfolioItemNotFoundError`, `InstrumentNotFoundError` (if not already in foundation)
- [ ] 1.3 Define `PortfolioItemRepository` interface — save, findById, findAll, findByInstrumentId, update, delete. All return `ResultAsync`
- [ ] 1.4 Define tokens in domain tokens.ts for PortfolioItemRepository and use cases
- [ ] 1.5 Implement `CreatePortfolioItemUseCase` (@injectable) — inject InstrumentRepository and PortfolioItemRepository, validate instrument exists, create item, persist
- [ ] 1.6 Implement `UpdatePortfolioItemUseCase` (@injectable) — find item, update mutable fields, persist
- [ ] 1.7 Implement `DeletePortfolioItemUseCase` (@injectable) — find item, delete
- [ ] 1.8 Implement `ListPortfolioItemsUseCase` (@injectable) — return all items with resolved Instrument data
- [ ] 1.9 Write unit tests for PortfolioItem entity — create valid, invalid weight, empty broker
- [ ] 1.10 Write unit tests for use cases with mock repos
- [ ] 1.11 Create `portfolioModule` (ContainerModule) binding use cases
- [ ] 1.12 Export public API from domain index.ts

## 2. Data

- [ ] 2.1 Define Drizzle schema: `portfolio_items` table with FK to instruments
- [ ] 2.2 Generate migration for portfolio_items table with index on instrument_id
- [ ] 2.3 Implement `toDomain(row)` and `toRow(entity)` mappers for PortfolioItem
- [ ] 2.4 Implement `PgPortfolioItemRepository` (@injectable) implementing PortfolioItemRepository with Drizzle queries wrapped in ResultAsync
- [ ] 2.5 Create `portfolioDataModule` (ContainerModule) binding repo implementation
- [ ] 2.6 Export public API from data index.ts

## 3. UI

- [ ] 3.1 Create `/portfolio` route in `apps/investlab`
- [ ] 3.2 Implement `PortfolioTable` component — columns: name, symbol, type badge, asset class badge, broker, target weight, current value, replicates
- [ ] 3.3 Implement `PortfolioItemForm` component — instrument selector (from existing catalog), broker input, target weight input, current value input, notes textarea
- [ ] 3.4 Implement `PortfolioItemRow` component — single row with edit/delete actions
- [ ] 3.5 Implement `PortfolioViewModel` — loads items via ListPortfolioItemsUseCase, handles CRUD operations
- [ ] 3.6 Wire Inversify container with portfolioModule and portfolioDataModule in app composition root
- [ ] 3.7 Add navigation link to /portfolio in app layout

## 4. Verification

- [ ] 4.1 Verify `nx run investlab-domain:build` succeeds
- [ ] 4.2 Verify `nx run investlab-data:build` succeeds
- [ ] 4.3 Verify `nx run investlab-domain:test` passes — entity and use case tests
- [ ] 4.4 Verify `nx run investlab:build` succeeds (app with new route)
- [ ] 4.5 Manual test: create, view, edit, delete portfolio item end-to-end
