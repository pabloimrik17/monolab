## Why

InvestLab needs persistent storage for complex investment data (instruments, positions, portfolio allocations, sector targets). Current localStorage approach won't scale. Also need caching layer for Finnhub API to avoid excessive calls — app is used for weekly review, not real-time trading.

## What Changes

- New package `packages/investlab-domain`: Pure domain layer — Instrument entity, repository interfaces, value objects (AssetClass, InstrumentType, Exchange, Sector). Inversify metadata, neverthrow for error handling. Following QUP patterns
- New package `packages/investlab-data`: Drizzle ORM + PostgreSQL implementations of domain repos, schema definitions, migrations, domain↔persistence mappers
- Redis (or similar) caching layer for Finnhub quote responses. TTL-based: fresh enough for weekly use, not real-time
- Instrument entity as shared domain concept across portfolio and Roger modules
- Docker Compose for local dev (PostgreSQL + Redis)

### Instrument Model

```
Instrument {
  id: uuid
  symbol: string          // AAPL, GLD, BTC
  name: string            // Apple Inc, SPDR Gold
  type: InstrumentType    // etf | index_fund | stock | crypto | bond
  assetClass: AssetClass  // equity | fixed_income | commodity | crypto
  exchange?: Exchange     // NYSE, NASDAQ... null for funds/crypto
  sector?: Sector         // Tech, Health... null for ETFs/funds
  replicates?: string     // "S&P 500", "MSCI World", "Gold"
  quotable: boolean       // Can we fetch price via API?
}
```

## Capabilities

### New Capabilities

- `investlab-instrument-management`: Instrument CRUD — create, read, update, delete. Shared catalog referenced by both portfolio and Roger modules. Auto-create on first reference if not exists
- `investlab-persistence`: PostgreSQL + Drizzle data layer following QUP's DDD patterns (domain package with interfaces, data package with implementations)
- `investlab-quote-cache`: Redis-backed cache for Finnhub API responses. Configurable TTL. Transparent to consumers — same API, cached behind the scenes

### Modified Capabilities

- Existing Finnhub client (from wealth-tracker-core) migrated to investlab-core, wrapped with cache layer

## Impact

- **New packages**: `packages/investlab-domain`, `packages/investlab-data`
- **Modified packages**: `packages/investlab-core` (migrated from wealth-tracker-core, enhanced with cache)
- **Infrastructure**: PostgreSQL + Redis required (Docker Compose for local dev)
- **Dependencies added**: drizzle-orm, drizzle-kit, pg, ioredis, inversify, neverthrow
- **Prereq**: `rename-investlab` must complete first
