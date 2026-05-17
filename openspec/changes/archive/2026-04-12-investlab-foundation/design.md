# InvestLab Foundation Design

## Context

InvestLab currently uses localStorage for ticker/position data. This won't scale for complex investment tracking (instruments, positions, portfolio allocations, sector targets). The app is used for weekly portfolio review, not real-time trading, so Finnhub API responses can be cached aggressively.

QUP already established DDD patterns in this monorepo (domain/data package split, Drizzle, Inversify, neverthrow). InvestLab should follow the same architecture.

## Goals / Non-Goals

**Goals:**
- Establish persistent data layer (PostgreSQL + Drizzle) following QUP patterns
- Define Instrument as shared domain entity across Portfolio and Roger modules
- Cache Finnhub quote responses in Redis with configurable TTL
- Docker Compose for local dev

**Non-Goals:**
- No UI changes, no new routes
- No position/portfolio entities yet (future changes)
- No real-time quote streaming

## Decisions

### 1. PostgreSQL + Drizzle (same as QUP)

Drizzle is a thin query layer. Domain entities stay independent of the ORM. Schema in data package, entities in domain package. Mappers (`toDomain`/`toRow`) bridge the two.

**Why reuse QUP's stack**: Consistency across monorepo. Shared learning. Same Docker infra.

### 2. Package structure with strict dependency direction

```
packages/investlab-domain   -> dep: inversify, neverthrow
packages/investlab-data     -> dep: investlab-domain, drizzle-orm, pg
packages/investlab-core     -> dep: investlab-domain (re-exports for app)
apps/investlab              -> dep: investlab-core, investlab-data
```

**Why**: Package boundaries enforce Clean Architecture at build level. Domain cannot import Drizzle. Same pattern as `qup-domain` / `qup-data`.

### 3. Redis for quote caching with configurable TTL

Default TTL ~1 hour. App is used weekly, so even stale-ish quotes are acceptable. Cache wraps existing Finnhub client transparently — consumers use the same interface.

Batch support: `getQuotes(symbols[])` checks cache per symbol, only fetches uncached from Finnhub. Reduces API calls significantly for portfolio overview.

**Why Redis over in-memory**: Persists across app restarts. Shared across potential future services. Already needed for Docker Compose anyway.

### 4. Instrument model

```typescript
Instrument {
  id: uuid
  symbol: string               // AAPL, GLD, BTC
  name: string                 // Apple Inc, SPDR Gold
  type: InstrumentType         // etf | index_fund | stock | crypto | bond
  assetClass: AssetClass       // equity | fixed_income | commodity | crypto
  exchange?: Exchange          // NYSE, NASDAQ... null for funds/crypto
  sector?: Sector              // Tech, Health... null for ETFs/funds
  replicates?: string          // "S&P 500", "MSCI World", "Gold"
  quotable: boolean            // Can we fetch price via API?
}
```

Type and assetClass as enums (value objects). Exchange and sector as optional — not all instruments have them (ETFs, crypto). `quotable` flag controls whether quote cache attempts to fetch prices.

### 5. Docker Compose: PostgreSQL + Redis for local dev

Single `docker-compose.yml` in `apps/investlab/` with postgres and redis services. Follows QUP pattern.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Drizzle migration complexity as schema evolves | drizzle-kit handles migrations well; keep schema changes incremental |
| Redis adds infrastructure dependency | Docker Compose makes it trivial locally; graceful degradation if Redis unavailable (skip cache, fetch direct) |
| Instrument model may need extension for Roger module | Design enums as extensible; add fields as needed without breaking existing data |
| Two new packages increase build graph | Nx caching makes this cheap; domain package rarely changes |
