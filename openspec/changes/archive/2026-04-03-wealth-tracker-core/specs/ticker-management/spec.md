## ADDED Requirements

### Requirement: Add ticker to watchlist
The system SHALL allow adding a ticker symbol to the watchlist. The ticker symbol MUST be normalized to uppercase.

#### Scenario: Add valid ticker
- **WHEN** user adds ticker "aapl"
- **THEN** ticker "AAPL" is added to the watchlist

#### Scenario: Add duplicate ticker
- **WHEN** user adds ticker "AAPL" that already exists
- **THEN** watchlist remains unchanged (no duplicate)

### Requirement: Remove ticker from watchlist
The system SHALL allow removing a ticker symbol from the watchlist.

#### Scenario: Remove existing ticker
- **WHEN** user removes ticker "AAPL" that exists
- **THEN** ticker "AAPL" is removed from the watchlist

#### Scenario: Remove non-existent ticker
- **WHEN** user removes ticker "XYZ" that does not exist
- **THEN** watchlist remains unchanged (no error)

### Requirement: List tickers alphabetically
The system SHALL return tickers sorted alphabetically by symbol.

#### Scenario: Get sorted tickers
- **WHEN** watchlist contains ["MSFT", "AAPL", "GOOGL"]
- **THEN** getTickers() returns ["AAPL", "GOOGL", "MSFT"]

#### Scenario: Empty watchlist
- **WHEN** watchlist is empty
- **THEN** getTickers() returns empty array

### Requirement: Persist tickers to storage
The system SHALL persist ticker changes to the provided Storage implementation.

#### Scenario: Persist on add
- **WHEN** user adds ticker "AAPL"
- **THEN** storage.setItem is called with updated ticker list

#### Scenario: Persist on remove
- **WHEN** user removes ticker "AAPL"
- **THEN** storage.setItem is called with updated ticker list

#### Scenario: Load from storage on init
- **WHEN** TickerStore is created with storage containing ["AAPL", "MSFT"]
- **THEN** getTickers() returns ["AAPL", "MSFT"]

### Requirement: Track ticker metadata
The system SHALL track when each ticker was added.

#### Scenario: Store added timestamp
- **WHEN** user adds ticker "AAPL"
- **THEN** ticker object contains addedAt timestamp
