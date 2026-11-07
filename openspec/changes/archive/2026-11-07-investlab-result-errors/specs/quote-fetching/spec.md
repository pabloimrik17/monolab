## MODIFIED Requirements

### Requirement: Fetch quotes in batch
The system SHALL fetch quotes for multiple tickers efficiently using parallel requests with concurrency control. A batch fetch SHALL return the quotes Finnhub answered and, apart, each symbol Finnhub failed to answer: Finnhub could not be reached, answered a non-2xx status other than 401 or 403, or sent a body it cannot read. A symbol Finnhub has no data for SHALL be left out without counting as a failure. Every symbol left out SHALL be logged.

#### Scenario: Batch fetch within concurrency limit
- **WHEN** getQuotes(["AAPL", "MSFT", "GOOGL"]) with concurrency 10
- **THEN** fetches all 3 in parallel, returns Map<symbol, Quote>

#### Scenario: Batch fetch exceeding concurrency limit
- **WHEN** getQuotes([...20 tickers]) with concurrency 10
- **THEN** fetches first 10 in parallel, then next 10, returns all results

#### Scenario: Partial failure in batch
- **WHEN** getQuotes(["AAPL", "INVALID", "MSFT"]) is called
- **THEN** returns Map with AAPL and MSFT quotes, INVALID excluded

#### Scenario: Symbol Finnhub fails to answer
- **WHEN** getQuotes(["AAPL", "MSFT"]) is called and Finnhub answers MSFT with HTTP 500, with HTTP 429 or not at all
- **THEN** returns the AAPL quote and reports MSFT as failed, with no quote for it

## ADDED Requirements

### Requirement: Rejected API key fails the fetch
The system SHALL treat a Finnhub 401 or 403 answer as a rejected API key. A single or batch fetch SHALL then fail with an error whose message says "check FINNHUB_API_KEY". A batch SHALL send no later group of requests. No error the system returns, causes included, and no log line SHALL contain the API key.

#### Scenario: Rejected key stops the batch
- **WHEN** getQuotes is called for 20 symbols and Finnhub answers the first 10 requests with HTTP 401
- **THEN** the fetch fails with an error whose message says "check FINNHUB_API_KEY"
- **AND** the requests for the other 10 symbols are not sent

#### Scenario: Key never revealed
- **WHEN** a fetch fails because Finnhub rejects the key, cannot be reached or answers an error status
- **THEN** neither the error, with its causes, nor any log line contains the API key

### Requirement: Finnhub responses read through a private schema
The Finnhub client SHALL check every quote body Finnhub sends against a schema it does not export, reading only the current price, change and percent change. A body that fails the schema SHALL be a failure for its symbol and SHALL never be cast to a quote.

#### Scenario: Body in a format the client does not read
- **WHEN** getQuotes(["AAPL", "MSFT"]) is called and Finnhub answers MSFT with its prices as strings
- **THEN** returns the AAPL quote and reports MSFT as failed, with no quote for it
