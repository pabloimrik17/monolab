# ticker-management Specification

## Purpose

CRUD operations for stock ticker watchlist with persistence and alphabetical sorting.

## Requirements

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

The system SHALL persist the followed tickers through the quotes module's ticker repository, which stores them in the platform's key-value storage under the key `investlab-tickers`, as a list of `{ symbol, addedAt }` with `addedAt` in ISO 8601. Lists saved under the web's former key are not migrated. The ticker repository SHALL be bound only in the quotes module's browser container module, exported from its `./browser` entry, which only the web's browser-only container `di/container.client.ts` loads, so server rendering never reads browser storage.

#### Scenario: Persist on add

- **WHEN** user adds ticker "AAPL"
- **THEN** the updated ticker list is written to the key-value storage under `investlab-tickers`

#### Scenario: Persist on remove

- **WHEN** user removes ticker "AAPL"
- **THEN** the updated ticker list is written to the key-value storage under `investlab-tickers`

#### Scenario: Load from storage on init

- **WHEN** the key-value storage holds a list with "AAPL" and "MSFT" under `investlab-tickers`
- **THEN** listing the followed tickers returns "AAPL" and "MSFT"

#### Scenario: Server render does not touch storage

- **WHEN** the ticker page is rendered on the server
- **THEN** no quotes browser container module is loaded and `localStorage` is not accessed
- **AND** the followed tickers are read after the page mounts in the browser, through `di/container.client.ts`

#### Scenario: Stored dates load

- **WHEN** the browser holds a ticker list under `investlab-tickers`
- **THEN** the ticker list use case returns the same tickers with the same `addedAt` dates

#### Scenario: Corrupt stored list

- **WHEN** the value under `investlab-tickers` is not a valid ticker list
- **THEN** the followed ticker list is empty and no error is thrown

### Requirement: Track ticker metadata
The system SHALL track when each ticker was added.

#### Scenario: Store added timestamp
- **WHEN** user adds ticker "AAPL"
- **THEN** ticker object contains addedAt timestamp
