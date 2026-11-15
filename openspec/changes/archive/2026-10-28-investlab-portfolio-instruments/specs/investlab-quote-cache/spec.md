## RENAMED Requirements

- FROM: `### Requirement: Cache wraps Finnhub client transparently`
- TO: `### Requirement: Quote repository combines cache and Finnhub datasources`

## MODIFIED Requirements

### Requirement: Quote repository combines cache and Finnhub datasources

The system SHALL implement the `QuoteRepository` port from `investlab-domain` in `investlab-data-server` as a quote repository that combines a Redis cache datasource and a Finnhub datasource: it reads the cache first, falls back to Finnhub, and writes fetched quotes back to the cache. Consumers do not need to know whether a response is cached. Only `apps/investlab-api` SHALL bind this repository.

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
