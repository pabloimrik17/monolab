## MODIFIED Requirements

### Requirement: Persist tickers to storage
The system SHALL persist ticker changes to the provided Storage implementation. The ticker store SHALL live in `apps/investlab` as browser-only code, created lazily on first use in the browser, and SHALL never read browser storage during server rendering.

#### Scenario: Persist on add
- **WHEN** user adds ticker "AAPL"
- **THEN** storage.setItem is called with updated ticker list

#### Scenario: Persist on remove
- **WHEN** user removes ticker "AAPL"
- **THEN** storage.setItem is called with updated ticker list

#### Scenario: Load from storage on init
- **WHEN** TickerStore is created with storage containing ["AAPL", "MSFT"]
- **THEN** getTickers() returns ["AAPL", "MSFT"]

#### Scenario: Server render does not touch storage
- **WHEN** the ticker page is rendered on the server
- **THEN** no ticker store is created and `localStorage` is not accessed
- **AND** the stored tickers are read after the page mounts in the browser
