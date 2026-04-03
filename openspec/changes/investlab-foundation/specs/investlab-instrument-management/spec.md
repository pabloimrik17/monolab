# Instrument Management Specification

## ADDED Requirements

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
- **THEN** all instruments are returned as an array

#### Scenario: Filter instruments by type

- **WHEN** `findByType(InstrumentType.ETF)` is called
- **THEN** only instruments with type `etf` are returned

#### Scenario: Filter instruments by asset class

- **WHEN** `findByAssetClass(AssetClass.Equity)` is called
- **THEN** only instruments with assetClass `equity` are returned

#### Scenario: Update instrument

- **WHEN** an existing instrument's properties are modified
- **THEN** changes are persisted and the updated instrument is returned

#### Scenario: Delete instrument

- **WHEN** an instrument is deleted by ID
- **THEN** the instrument is removed from persistence

### Requirement: Instrument model

The Instrument entity SHALL have the following properties: `id` (uuid), `symbol` (string), `name` (string), `type` (InstrumentType enum: etf|index_fund|stock|crypto|bond), `assetClass` (AssetClass enum: equity|fixed_income|commodity|crypto), `exchange?` (Exchange entity), `sector?` (Sector enum), `replicates?` (string), `quotable` (boolean).

#### Scenario: Instrument with optional fields

- **WHEN** an ETF instrument is created without exchange or sector
- **THEN** the instrument is valid with exchange and sector as undefined

#### Scenario: Instrument with all fields

- **WHEN** a stock instrument is created with exchange (NYSE) and sector (Technology)
- **THEN** all fields are populated and accessible

### Requirement: Auto-create on first reference

The system SHALL upsert instruments by symbol — if an instrument with the given symbol does not exist, it is created automatically.

#### Scenario: Upsert new instrument

- **WHEN** `upsertBySymbol` is called with a symbol that doesn't exist
- **THEN** a new instrument is created and returned

#### Scenario: Upsert existing instrument

- **WHEN** `upsertBySymbol` is called with a symbol that already exists
- **THEN** the existing instrument is returned without duplication
