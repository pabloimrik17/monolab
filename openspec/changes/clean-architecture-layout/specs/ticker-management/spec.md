## MODIFIED Requirements

### Requirement: Persist tickers to storage
The system SHALL persist the followed tickers through the quotes module's ticker repository, which stores them in the platform's key-value storage under the key `wealth-tracker-tickers`, as a list of `{ symbol, addedAt }` with `addedAt` in ISO 8601, so lists saved before this change still load.

#### Scenario: Persist on add
- **WHEN** user adds ticker "AAPL"
- **THEN** the updated ticker list is written to the key-value storage under `wealth-tracker-tickers`

#### Scenario: Persist on remove
- **WHEN** user removes ticker "AAPL"
- **THEN** the updated ticker list is written to the key-value storage under `wealth-tracker-tickers`

#### Scenario: Load from storage on init
- **WHEN** the key-value storage holds a list with "AAPL" and "MSFT" under `wealth-tracker-tickers`
- **THEN** listing the followed tickers returns "AAPL" and "MSFT"

#### Scenario: List saved before the change
- **WHEN** the browser holds a ticker list written by the previous ticker store
- **THEN** the ticker list use case returns the same tickers with the same `addedAt` dates

#### Scenario: Corrupt stored list
- **WHEN** the value under `wealth-tracker-tickers` is not a valid ticker list
- **THEN** the followed ticker list is empty and no error is thrown
