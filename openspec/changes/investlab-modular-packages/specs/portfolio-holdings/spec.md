## MODIFIED Requirements

### Requirement: PortfolioItem entity

The system SHALL model PortfolioItem as an entity in the `domain/` folder of `@m0n0lab/investlab-portfolio` with: id (UUID), instrumentId (UUID, references Instrument), broker (string), targetWeight (number, 0-100), currentValue (number, >= 0), notes (optional string), createdAt (Date), updatedAt (Date). `PortfolioItem.create()` SHALL validate input and return `Result<PortfolioItem, ValidationError>`.

#### Scenario: Create a valid portfolio item
- **WHEN** `PortfolioItem.create()` is called with a valid instrumentId, broker "MyInvestor", targetWeight 15
- **THEN** it returns `Ok<PortfolioItem>` with currentValue=0 and notes=undefined

#### Scenario: Create with invalid target weight
- **WHEN** `PortfolioItem.create()` is called with targetWeight -5
- **THEN** it returns `Err<ValidationError>`

#### Scenario: Create with empty broker
- **WHEN** `PortfolioItem.create()` is called with an empty broker string
- **THEN** it returns `Err<ValidationError>`

#### Scenario: Create with negative current value
- **WHEN** `PortfolioItem.create()` is called with currentValue -100
- **THEN** it returns `Err<ValidationError>`

#### Scenario: Create with target weight exceeding 100
- **WHEN** `PortfolioItem.create()` is called with targetWeight 150
- **THEN** it returns `Err<ValidationError>`

### Requirement: PortfolioItem repository interface

The system SHALL define a `PortfolioItemRepository` port in the `domain/` folder of `@m0n0lab/investlab-portfolio` with methods returning `ResultAsync`: `save(item)`, `findById(id)`, `findAll()`, `update(item)`, `delete(id)`, `existsForInstrument(instrumentId)`. Further `findByX` methods SHALL be added only when a use case needs them; there SHALL be no generic `findBy(filters)`.

#### Scenario: Find all portfolio items
- **WHEN** `findAll()` is called
- **THEN** it returns `Ok<PortfolioItem[]>` containing all items ordered by createdAt ascending

#### Scenario: Delete a portfolio item
- **WHEN** `delete(id)` is called with a valid ID
- **THEN** the item is removed and `Ok<void>` is returned

#### Scenario: Instrument referenced by an item
- **WHEN** `existsForInstrument(instrumentId)` is called and an item references that instrument
- **THEN** it returns `Ok<true>`

### Requirement: PortfolioItemList use case

The system SHALL provide a `PortfolioItemListUseCase` that returns all portfolio items with their resolved Instrument data (name, symbol, type, assetClass, replicates) through a portfolio read-query port declared in the `domain/` folder of `@m0n0lab/investlab-portfolio`. The server implementation SHALL resolve items and instruments in a single SQL query.

#### Scenario: List all items with instrument data
- **WHEN** executed
- **THEN** returns `Ok` with array of PortfolioItem + Instrument pairs

#### Scenario: Empty portfolio
- **WHEN** executed and no items exist
- **THEN** returns `Ok` with empty array

### Requirement: PortfolioItem domain-persistence mapping

The system SHALL provide `toDomain(row)` and `toRow(entity)` mapper functions for PortfolioItem in a non-exported module of the `data/server/` folder of `@m0n0lab/investlab-portfolio`.

#### Scenario: Round-trip mapping
- **WHEN** a PortfolioItem entity is mapped to a row and back
- **THEN** the resulting entity is equivalent to the original
