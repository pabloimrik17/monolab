## MODIFIED Requirements

### Requirement: Handle fetch errors
The system SHALL gracefully handle fetch errors without stopping the polling loop. A failed request to the quotes resource route SHALL count as a fetch error: the route cannot be reached, answers a non-success HTTP status, or answers with a body that is not JSON or not a list of quotes.

#### Scenario: Network error during poll
- **WHEN** fetch fails due to network error
- **THEN** onError callback is called with error
- **THEN** polling continues at next interval

#### Scenario: Resource route answers with an error status
- **WHEN** the quotes resource route responds with a non-success HTTP status
- **THEN** onError callback is called with error
- **THEN** polling continues at next interval

#### Scenario: Resource route answers something other than quotes
- **WHEN** the quotes resource route responds 200 with a body that is not JSON, or with a list whose items are not quotes
- **THEN** onError callback is called with error
- **THEN** polling continues at next interval

#### Scenario: Partial fetch failure
- **WHEN** some tickers fail to fetch
- **THEN** onUpdate called with successful quotes
- **THEN** polling continues
