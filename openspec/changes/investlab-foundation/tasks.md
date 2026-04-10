# Implementation Tasks

## 1. Infrastructure Setup

- [x] 1.1 Create `docker-compose.yml` in `apps/investlab/` with PostgreSQL and Redis services
- [x] 1.2 Add `.env.example` with database URL, Redis URL, Finnhub API key
- [x] 1.3 Configure Drizzle (`drizzle.config.ts`) in `packages/investlab-data`
- [x] 1.4 Verify `docker compose up` starts both services successfully

## 2. Domain Package (investlab-domain)

- [x] 2.1 Scaffold `packages/investlab-domain` with package.json, tsconfig, tsdown.config
- [x] 2.2 Create value objects: `InstrumentType`, `AssetClass`, `Sector` enums
- [x] 2.3 Create `Instrument` entity with all fields (id, symbol, name, type, assetClass, exchange?, sector?, replicates?, quotable)
- [x] 2.4 Create `InstrumentRepository` interface with CRUD + `findBySymbol`, `findByType`, `findByAssetClass`, `upsertBySymbol`
- [x] 2.5 Create `PersistenceError` domain error type
- [x] 2.6 Define Inversify tokens in `tokens.ts`
- [x] 2.7 Create `domain.module.ts` ContainerModule
- [x] 2.8 Verify: `pnpm nx run investlab-domain:build`

## 3. Data Package (investlab-data)

- [x] 3.1 Scaffold `packages/investlab-data` with package.json, tsconfig, tsdown.config
- [x] 3.2 Create Drizzle schema for `instruments` table
- [x] 3.3 Generate initial migration with `drizzle-kit generate`
- [x] 3.4 Create `InstrumentMapper` with `toDomain(row)` and `toRow(entity)` methods
- [x] 3.5 Implement `PgInstrumentRepository` — all methods return `ResultAsync`
- [x] 3.6 Create `data.module.ts` ContainerModule binding repo implementation to interface
- [x] 3.7 Apply migration: `drizzle-kit migrate`
- [x] 3.8 Verify: `pnpm nx run investlab-data:build`

## 4. Quote Cache

- [x] 4.1 Add `ioredis` dependency to `packages/investlab-core`
- [x] 4.2 Create `QuoteCache` interface in `investlab-domain` (domain port)
- [x] 4.3 Implement Redis-backed `QuoteCacheImpl` with configurable TTL (default ~1 hour)
- [x] 4.4 Implement `getQuote(symbol)` with cache-miss-fetch-store pattern
- [x] 4.5 Implement `getQuotes(symbols[])` with per-symbol cache check, batch fetch for uncached
- [x] 4.6 Use key format `investlab:quote:{SYMBOL}`
- [x] 4.7 Bind in ContainerModule

## 5. Integration

- [ ] 5.1 Wire Inversify container in app — load domain, data, and cache modules
- [ ] 5.2 Replace localStorage ticker store with `InstrumentRepository` from DB
- [ ] 5.3 Replace direct Finnhub calls with cached quote client
- [ ] 5.4 Update app env config to read database URL, Redis URL

## 6. Verification

- [ ] 6.1 Run `pnpm nx run investlab-domain:build`
- [ ] 6.2 Run `pnpm nx run investlab-data:build`
- [ ] 6.3 Run `pnpm nx run investlab:build`
- [ ] 6.4 Verify instrument CRUD against running PostgreSQL
- [ ] 6.5 Verify quote cache against running Redis
- [ ] 6.6 Grep for remaining localStorage references related to tickers/instruments
