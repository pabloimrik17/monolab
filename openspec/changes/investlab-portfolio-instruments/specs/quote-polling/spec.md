## MODIFIED Requirements

### Requirement: Start polling
The system SHALL start periodic quote fetching when start() is called. The poller SHALL live in `apps/investlab` and SHALL fetch quotes from the web app's quotes resource route, never from Finnhub or `apps/investlab-api` directly.

#### Scenario: Start polling with tickers
- **WHEN** poller.start(["AAPL", "MSFT"], onUpdate) is called
- **THEN** immediately fetches quotes and calls onUpdate with results
- **THEN** continues fetching at configured interval

#### Scenario: Start polling with empty list
- **WHEN** poller.start([], onUpdate) is called
- **THEN** does not fetch or call onUpdate

#### Scenario: Poll through the web resource route
- **WHEN** the poller fetches quotes for ["AAPL", "MSFT"]
- **THEN** the browser sends one request to the web quotes resource route for both symbols
- **AND** no request goes to Finnhub or to `apps/investlab-api`

### Requirement: Handle fetch errors
The system SHALL gracefully handle fetch errors without stopping the polling loop. A failed request to the quotes resource route, including a non-success HTTP status, SHALL count as a fetch error.

#### Scenario: Network error during poll
- **WHEN** fetch fails due to network error
- **THEN** onError callback is called with error
- **THEN** polling continues at next interval

#### Scenario: Resource route answers with an error status
- **WHEN** the quotes resource route responds with a non-success HTTP status
- **THEN** onError callback is called with error
- **THEN** polling continues at next interval

#### Scenario: Partial fetch failure
- **WHEN** some tickers fail to fetch
- **THEN** onUpdate called with successful quotes
- **THEN** polling continues
