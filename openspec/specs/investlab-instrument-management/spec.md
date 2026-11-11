# Instrument Management Specification

## Purpose

Instrument CRUD — create, read, update, delete. Shared catalog referenced by both portfolio and Roger modules. Auto-creates instruments on first reference if they don't exist.

## Requirements

### Requirement: Instrument CRUD

The system SHALL provide create, read, update, and delete operations for Instrument entities.

#### Scenario: Create instrument

- **WHEN** a new instrument is created with symbol, name, type, and assetClass
- **THEN** the instrument is persisted with a generated UUID
- **AND** a `ResultAsync<Instrument, PersistenceError>` is returned

#### Scenario: Find instrument by symbol

- **WHEN** `findBySymbol("AAPL")` is called
- **THEN** the matching instrument is returned if it exists
- **AND** `ResultAsync<Instrument | null, PersistenceError>` is returned

#### Scenario: Find all instruments

- **WHEN** `findAll()` is called
- **THEN** `ResultAsync<Instrument[], PersistenceError>` is returned with all instruments

#### Scenario: Filter instruments by type

- **WHEN** `findByType(InstrumentType.ETF)` is called
- **THEN** `ResultAsync<Instrument[], PersistenceError>` is returned with only instruments of type `etf`

#### Scenario: Filter instruments by asset class

- **WHEN** `findByAssetClass(AssetClass.Equity)` is called
- **THEN** `ResultAsync<Instrument[], PersistenceError>` is returned with only instruments of assetClass `equity`

#### Scenario: Update instrument

- **WHEN** an existing instrument's properties are modified
- **THEN** `ResultAsync<Instrument, PersistenceError>` is returned with the updated instrument

#### Scenario: Delete instrument

- **WHEN** an instrument is deleted by ID
- **THEN** `ResultAsync<void, PersistenceError>` is returned after removal

### Requirement: Instrument model

The Instrument entity SHALL have the following properties: `id` (uuid), `symbol` (string), `name` (string), `type` (InstrumentType enum: etf|index_fund|stock|crypto|bond), `assetClass` (AssetClass enum: equity|fixed_income|commodity|crypto), `exchange?` (Exchange entity), `sector?` (Sector enum), `replicates?` (string), `quotable` (boolean).

#### Scenario: Instrument with optional fields

- **WHEN** an ETF instrument is created without exchange or sector
- **THEN** the instrument is valid with exchange and sector as undefined

#### Scenario: Instrument with all fields

- **WHEN** a stock instrument is created with exchange (NYSE) and sector (Technology)
- **THEN** all fields are populated and accessible

### Requirement: Auto-create on first reference

The system SHALL upsert instruments by symbol — if an instrument with the given symbol does not exist, it is created automatically. Symbols MUST be normalized (trimmed + uppercased) before query/insert to enforce case-insensitive identity (e.g., `aapl` → `AAPL`).

#### Scenario: Upsert new instrument

- **WHEN** `upsertBySymbol` is called with a symbol that doesn't exist
- **THEN** the symbol is normalized (trimmed, uppercased)
- **AND** a new instrument is created and returned

#### Scenario: Upsert existing instrument

- **WHEN** `upsertBySymbol` is called with a symbol that already exists (case-insensitive)
- **THEN** the existing instrument is returned without duplication

#### Scenario: Case-insensitive identity

- **WHEN** `upsertBySymbol("aapl")` is called and instrument with symbol `AAPL` exists
- **THEN** the existing `AAPL` instrument is returned

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

#### Scenario: Delete an unknown instrument

- **WHEN** the server instrument delete use case runs with an id that does not exist
- **THEN** it returns `Err<InstrumentNotFoundError>` with `code` `INSTRUMENT_NOT_FOUND`

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

Creating an instrument, or updating one, with a symbol that another instrument already has (after trimming and uppercasing) SHALL fail with a domain error whose `code` is `INSTRUMENT_ALREADY_EXISTS`. A unique-constraint violation on the symbol (`instruments_symbol_unique`), such as one raised by a concurrent write, SHALL map to the same error.

#### Scenario: Duplicate symbol on create

- **WHEN** the server instrument create use case runs with symbol ` aapl ` and `AAPL` is in the catalog
- **THEN** it returns an error with `code` `INSTRUMENT_ALREADY_EXISTS` and the catalog is unchanged

#### Scenario: Duplicate symbol on update

- **WHEN** the server instrument update use case sets the symbol of `MSFT` to ` aapl ` and `AAPL` is in the catalog
- **THEN** it returns an error with `code` `INSTRUMENT_ALREADY_EXISTS` and `MSFT` is unchanged

### Requirement: Seeded instrument catalog

A database migration SHALL insert the instruments AAPL, MSFT, NVDA, AMZN, GOOGL, META and TSLA (type `stock`, asset class `equity`) and SPY, QQQ and VTI (type `etf`), all quotable, skipping any symbol that already exists. The seed SHALL contain no crypto instrument.

#### Scenario: Fresh database

- **WHEN** migrations run on an empty database and instruments are listed
- **THEN** the ten seeded instruments are returned

#### Scenario: Existing symbol kept

- **WHEN** migrations run on a database that already has `AAPL` with another name
- **THEN** the migration succeeds and the existing `AAPL` row is unchanged
