## MODIFIED Requirements

### Requirement: Instrument model

The Instrument model SHALL live in the `domain/` folder of `@m0n0lab/investlab-catalog` with the properties `id` (uuid), `symbol` (string, trimmed and uppercased), `name` (string), `type` (instrument type: etf, index_fund, stock, crypto or bond), `assetClass` (asset class: equity, fixed_income, commodity or crypto), `exchange?` (string), `sector?` (sector), `replicates?` (string) and `quotable` (boolean, true unless set).

#### Scenario: Instrument with optional fields

- **WHEN** an ETF instrument is created without exchange or sector
- **THEN** the instrument is valid with exchange and sector undefined

#### Scenario: Instrument with all fields

- **WHEN** a stock instrument is created with exchange `NYSE` and sector Technology
- **THEN** all fields are populated and accessible

### Requirement: Instrument management use cases

The catalog module SHALL provide instrument create, update, delete and list use cases on the server side and on the client side, with entity-action names and a named error union each. Client use cases SHALL reach the API through HTTP repositories and rebuild domain errors from `code`.

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

Deleting an instrument SHALL fail with a domain error whose `code` is `INSTRUMENT_IN_USE` while any record of any module references it, and the instrument SHALL remain in the catalog. The error message SHALL NOT name the referencing module.

#### Scenario: Delete a referenced instrument

- **WHEN** a portfolio item references `AAPL` and the server instrument delete use case runs for `AAPL`
- **THEN** it returns an error with `code` `INSTRUMENT_IN_USE` and `AAPL` is still listed

#### Scenario: Delete after the last reference is gone

- **WHEN** the only portfolio item referencing `AAPL` is deleted and the instrument delete use case runs for `AAPL`
- **THEN** it succeeds and `AAPL` is no longer listed

#### Scenario: In-use error crosses HTTP

- **WHEN** the client instrument delete use case runs and the API refuses with `code` `INSTRUMENT_IN_USE`
- **THEN** the client use case returns the instrument in use domain error

## ADDED Requirements

### Requirement: Instrument repository port

The catalog module SHALL define an `InstrumentRepository` port in the `domain/` folder of `@m0n0lab/investlab-catalog` with methods returning `ResultAsync`: `save(instrument)`, `findById(id)`, `findAll()`, `update(instrument)` and `delete(id)`. Further `findByX` methods SHALL be added only when a use case needs them.

#### Scenario: Create instrument

- **WHEN** a new instrument with symbol, name, type and asset class is saved
- **THEN** it is persisted with a generated UUID and returned

#### Scenario: Find instrument by id

- **WHEN** `findById(id)` is called for an instrument that does not exist
- **THEN** it returns `Ok(null)`

#### Scenario: Find all instruments

- **WHEN** `findAll()` is called
- **THEN** it returns every instrument in the catalog

#### Scenario: Update instrument

- **WHEN** an existing instrument's properties are modified and it is updated
- **THEN** the updated instrument is returned

#### Scenario: Delete instrument

- **WHEN** an unreferenced instrument is deleted by id
- **THEN** `Ok(void)` is returned and the instrument is no longer listed

## REMOVED Requirements

### Requirement: Instrument CRUD

**Reason**: It described repository methods that never existed (`findBySymbol`, `findByType`, `findByAssetClass`). `Instrument repository port` describes the real port, now in the catalog module.

**Migration**: None; no code used the described methods.


### Requirement: Auto-create on first reference

**Reason**: Never implemented: no repository or use case offers `upsertBySymbol`. Instruments are created explicitly through the create use case, which already normalizes the symbol and refuses duplicates (`Instrument symbols are unique`).

**Migration**: None. A module that creates an instrument on the user's behalf, such as Roger, calls the catalog's create use case.
