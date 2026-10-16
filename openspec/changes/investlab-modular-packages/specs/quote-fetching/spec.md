## MODIFIED Requirements

### Requirement: Fetch single quote
The system SHALL fetch current quote data for a single ticker symbol from Finnhub API through a Finnhub datasource in the `data/server/` folder of `@m0n0lab/investlab-quotes`, built on the platform HTTP client. Only the quote repository SHALL use the datasource, and only `apps/investlab-api` SHALL run it.

#### Scenario: Fetch valid ticker
- **WHEN** getQuote("AAPL") is called
- **THEN** returns Quote with price, change, changePercent, and updatedAt

#### Scenario: Fetch invalid ticker
- **WHEN** getQuote("INVALID123") is called
- **THEN** fails with error message "No data for symbol: INVALID123"

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
