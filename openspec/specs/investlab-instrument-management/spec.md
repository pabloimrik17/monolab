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
