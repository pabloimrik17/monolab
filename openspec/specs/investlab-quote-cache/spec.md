# Quote Cache Specification

## Purpose

Redis-backed cache for Finnhub quote API responses. Configurable TTL, transparent to consumers — same client API, cached behind the scenes — so the app avoids excessive API calls while staying fresh enough for weekly review use.

## Requirements

### Requirement: Quote repository combines cache and Finnhub datasources

The system SHALL implement the `QuoteRepository` port of `@m0n0lab/investlab-quotes` in that module's `data/server/` folder as a quote repository that combines a Redis cache datasource and a Finnhub datasource: it reads the cache first, falls back to Finnhub, and writes fetched quotes back to the cache. Consumers do not need to know whether a response is cached. Only the quotes server container module SHALL bind this repository, using the Redis client provided by the platform, and only `apps/investlab-api` SHALL load that module.

#### Scenario: Cache miss fetches from Finnhub

- **WHEN** `getQuote("AAPL")` is called and no cache entry exists
- **THEN** the Finnhub API is called
- **AND** the response is stored in Redis with the configured TTL
- **AND** the response is returned to the caller

#### Scenario: Cache hit returns cached value

- **WHEN** `getQuote("AAPL")` is called and a valid cache entry exists
- **THEN** the cached value is returned
- **AND** no Finnhub API call is made

#### Scenario: Redis read failure (graceful degradation)

- **WHEN** `getQuote("AAPL")` is called and Redis is unavailable or returns an error
- **THEN** the error is treated as a cache miss
- **AND** the Finnhub API is called directly
- **AND** the Redis error is logged but does not fail the request

#### Scenario: Redis write failure after Finnhub fetch

- **WHEN** a Finnhub response is obtained but Redis write fails
- **THEN** the Finnhub response is still returned to the caller
- **AND** the Redis write error is logged
- **AND** caching is best-effort — Redis unavailability MUST NOT cause hard failures

#### Scenario: Cache entry expired

- **WHEN** `getQuote("AAPL")` is called and the cache entry has expired
- **THEN** the Finnhub API is called
- **AND** the cache is refreshed with the new response

#### Scenario: Web process holds no quote infrastructure

- **WHEN** `apps/investlab` starts
- **THEN** it opens no Redis connection and creates no Finnhub datasource

### Requirement: Configurable TTL

The cache TTL SHALL be configurable, with a default of approximately 1 hour.

#### Scenario: Default TTL applied

- **WHEN** a quote is cached without explicit TTL
- **THEN** the entry expires after ~1 hour

#### Scenario: Custom TTL

- **WHEN** the cache is configured with a custom TTL (e.g., 30 minutes)
- **THEN** all cache entries use the custom TTL

### Requirement: Batch quote retrieval

The system SHALL support fetching multiple quotes through the quote repository, checking the cache datasource per symbol and only calling the Finnhub datasource for uncached symbols.

#### Scenario: All symbols cached

- **WHEN** `getQuotes(["AAPL", "GOOGL"])` is called and both are cached
- **THEN** both cached values are returned
- **AND** no Finnhub API calls are made

#### Scenario: Partial cache hit

- **WHEN** `getQuotes(["AAPL", "GOOGL"])` is called and only AAPL is cached
- **THEN** AAPL is returned from cache
- **AND** GOOGL is fetched from Finnhub, cached, and returned

#### Scenario: No cache hits

- **WHEN** `getQuotes(["AAPL", "GOOGL"])` is called and neither is cached
- **THEN** both are fetched from Finnhub, cached, and returned

### Requirement: Cache key structure

Cache keys SHALL use the instrument symbol as the key identifier. Symbols MUST be normalized (trimmed + uppercased) before key generation to prevent cache fragmentation (e.g., `aapl` → key `investlab:quote:AAPL`).

#### Scenario: Cache key format

- **WHEN** a quote for symbol "AAPL" is cached
- **THEN** the Redis key is `investlab:quote:AAPL`

#### Scenario: Symbol normalization in cache key

- **WHEN** `getQuote("aapl")` is called
- **THEN** the cache key used is `investlab:quote:AAPL` (normalized)

### Requirement: Cache entries validated on read

The cache datasource SHALL check every entry it reads against a schema it does not export, matching what it writes. An entry that is not JSON or has another shape SHALL be a cache miss, never cast to a quote.

#### Scenario: Entry in a format the cache no longer reads

- **WHEN** `getQuotes(["AAPL"])` is called and the cache entry for AAPL holds `{ "symbol": "AAPL", "price": "190.5" }`, as one left by an older release
- **THEN** the entry is treated as a cache miss
- **AND** AAPL is fetched from Finnhub, cached, and returned

### Requirement: Quote list fails when market data cannot answer

`getQuotes` SHALL fail with `MARKET_DATA_UNAVAILABLE` when Finnhub failed for at least one requested symbol (unreachable, a non-2xx status other than 401 or 403, 429 included, or an unreadable body) and no quote, cached or fetched, is left to answer. When some quote is left, it SHALL return those quotes and leave the failed symbols out. Symbols Finnhub has no data for SHALL give an empty result, not an error.

#### Scenario: Market data unreachable and nothing cached

- **WHEN** `getQuotes(["AAPL", "MSFT"])` is called, neither is cached, and Finnhub cannot be reached, answers HTTP 500 or answers HTTP 429
- **THEN** the call fails with `MARKET_DATA_UNAVAILABLE`
- **AND** the error, with its causes, contains no Finnhub API key

#### Scenario: Cache answers while market data is unreachable

- **WHEN** `getQuotes(["AAPL", "MSFT"])` is called, only AAPL is cached, and Finnhub cannot be reached
- **THEN** the cached AAPL quote is returned and the call does not fail

#### Scenario: Unreadable market data for one symbol

- **WHEN** `getQuotes(["AAPL", "MSFT"])` is called, neither is cached, and Finnhub answers MSFT with a body it cannot read
- **THEN** the AAPL quote is returned and MSFT is left out

#### Scenario: Only symbols without market data

- **WHEN** `getQuotes(["NOPE"])` is called and Finnhub has no data for NOPE
- **THEN** an empty result is returned and the call does not fail

### Requirement: Rejected market data key fails the quote list

When `getQuotes` has to ask Finnhub and Finnhub rejects the API key, the call SHALL fail with `PERSISTENCE_ERROR`, even if other requested symbols are cached. The error's causes SHALL say "check FINNHUB_API_KEY". Neither the error nor any log line SHALL contain the key.

#### Scenario: Revoked key

- **WHEN** `getQuotes(["AAPL"])` is called, AAPL is not cached, and Finnhub answers HTTP 401
- **THEN** the call fails with `PERSISTENCE_ERROR` whose causes say "check FINNHUB_API_KEY"
- **AND** neither the error nor any log line contains the Finnhub API key
