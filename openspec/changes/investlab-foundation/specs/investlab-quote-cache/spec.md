# Quote Cache Specification

## ADDED Requirements

### Requirement: Cache wraps Finnhub client transparently

The quote cache SHALL wrap the existing Finnhub client, providing the same interface to consumers. Consumers do not need to know whether a response is cached.

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

### Requirement: Configurable TTL

The cache TTL SHALL be configurable, with a default of approximately 1 hour.

#### Scenario: Default TTL applied

- **WHEN** a quote is cached without explicit TTL
- **THEN** the entry expires after ~1 hour

#### Scenario: Custom TTL

- **WHEN** the cache is configured with a custom TTL (e.g., 30 minutes)
- **THEN** all cache entries use the custom TTL

### Requirement: Batch quote retrieval

The system SHALL support fetching multiple quotes, checking cache per symbol and only calling Finnhub for uncached symbols.

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
