# quote-fetching Specification

## Purpose

Fetch current stock quotes from Finnhub API with batch support and rate limit handling.

## Requirements

### Requirement: Fetch single quote
The system SHALL fetch current quote data for a single ticker symbol from Finnhub API through a Finnhub datasource in the `data/server/` folder of `@m0n0lab/investlab-quotes`, built on the platform HTTP client. Only the quote repository SHALL use the datasource, and only `apps/investlab-api` SHALL run it.

#### Scenario: Fetch valid ticker
- **WHEN** getQuote("AAPL") is called
- **THEN** returns Quote with price, change, changePercent, and updatedAt

#### Scenario: Fetch invalid ticker
- **WHEN** getQuote("INVALID123") is called
- **THEN** fails with error message "No data for symbol: INVALID123"

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

### Requirement: Respect rate limits
The system SHALL enforce concurrency limits to avoid exceeding Finnhub API rate limits (60 req/min). The Finnhub datasource SHALL fetch batches with a fixed concurrency of 10 and SHALL take no concurrency option.

#### Scenario: Default concurrency
- **WHEN** the Finnhub datasource fetches quotes for 20 symbols
- **THEN** it sends at most 10 Finnhub requests at a time

#### Scenario: Custom concurrency
- **WHEN** the Finnhub datasource is created
- **THEN** it accepts no concurrency option and always uses a concurrency of 10

### Requirement: Quote data structure
The system SHALL return quote data with standard fields.

#### Scenario: Quote contains required fields
- **WHEN** quote is fetched successfully
- **THEN** Quote contains: symbol (string), price (number), change (number), changePercent (number), updatedAt (Date)

### Requirement: API key configuration
The system SHALL require API key at datasource creation. The key SHALL come from the server `Config` (`finnhub.apiKey`), filled from the `apps/investlab-api` environment, and SHALL never be part of the web app's environment, `Config` or browser bundle.

#### Scenario: Create client with API key
- **WHEN** the Finnhub datasource is created with "api-key-123"
- **THEN** datasource is created and uses key for requests

#### Scenario: Create client without API key
- **WHEN** the Finnhub datasource is created with ""
- **THEN** throws error indicating API key required

#### Scenario: Key absent from the browser
- **WHEN** the web app is built for the browser
- **THEN** the bundle contains no Finnhub API key and no `VITE_FINNHUB_API_KEY` variable

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
