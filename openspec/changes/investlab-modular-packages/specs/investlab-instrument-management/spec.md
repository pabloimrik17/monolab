## ADDED Requirements

### Requirement: Instrument management use cases

The portfolio module SHALL provide instrument create, update, delete and list use cases on the server side and on the client side, with entity-action names and a named error union each. Client use cases SHALL reach the API through HTTP repositories and rebuild domain errors from `code`.

#### Scenario: Create through the web

- **WHEN** the client instrument create use case runs with symbol `VWCE` and the API accepts it
- **THEN** it returns the created instrument

#### Scenario: Update an unknown instrument

- **WHEN** the server instrument update use case runs with an id that does not exist
- **THEN** it returns `Err<InstrumentNotFoundError>`

#### Scenario: Created instrument is listed

- **WHEN** the server instrument create use case creates `VWCE` and the list use case runs
- **THEN** the list contains `VWCE`

### Requirement: Instrument in use cannot be deleted

Deleting an instrument SHALL fail with a domain error whose `code` is `INSTRUMENT_IN_USE` while any portfolio item references it, and the instrument SHALL remain in the catalog.

#### Scenario: Delete a referenced instrument

- **WHEN** a portfolio item references `AAPL` and the server instrument delete use case runs for `AAPL`
- **THEN** it returns an error with `code` `INSTRUMENT_IN_USE` and `AAPL` is still listed

#### Scenario: Delete after the last reference is gone

- **WHEN** the only portfolio item referencing `AAPL` is deleted and the instrument delete use case runs for `AAPL`
- **THEN** it succeeds and `AAPL` is no longer listed

#### Scenario: In-use error crosses HTTP

- **WHEN** the client instrument delete use case runs and the API refuses with `code` `INSTRUMENT_IN_USE`
- **THEN** the client use case returns the instrument in use domain error

### Requirement: Instrument symbols are unique

Creating an instrument, or updating one, with a symbol that another instrument already has (after trimming and uppercasing) SHALL fail with a domain error whose `code` is `INSTRUMENT_ALREADY_EXISTS`.

#### Scenario: Duplicate symbol on create

- **WHEN** the server instrument create use case runs with symbol ` aapl ` and `AAPL` is in the catalog
- **THEN** it returns an error with `code` `INSTRUMENT_ALREADY_EXISTS` and the catalog is unchanged

### Requirement: Seeded instrument catalog

A database migration SHALL insert the instruments AAPL, MSFT, NVDA, AMZN, GOOGL, META and TSLA (type `stock`, asset class `equity`) and SPY, QQQ and VTI (type `etf`), all quotable, skipping any symbol that already exists. The seed SHALL contain no crypto instrument.

#### Scenario: Fresh database

- **WHEN** migrations run on an empty database and instruments are listed
- **THEN** the ten seeded instruments are returned

#### Scenario: Existing symbol kept

- **WHEN** migrations run on a database that already has `AAPL` with another name
- **THEN** the migration succeeds and the existing `AAPL` row is unchanged
