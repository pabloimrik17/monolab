## ADDED Requirements

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
