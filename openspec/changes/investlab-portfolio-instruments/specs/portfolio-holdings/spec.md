## ADDED Requirements

### Requirement: PortfolioItem entity

The system SHALL model PortfolioItem as an entity in `investlab-domain` with: id (UUID), instrumentId (UUID, references Instrument), broker (string), targetWeight (number, 0-100), currentValue (number, >= 0), notes (optional string), createdAt (Date), updatedAt (Date). `PortfolioItem.create()` SHALL validate input and return `Result<PortfolioItem, ValidationError>`.

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

The system SHALL define a `PortfolioItemRepository` interface in `investlab-domain` with methods returning `ResultAsync`: `save(item)`, `findById(id)`, `findAll()`, `update(item)`, `delete(id)`. Further `findByX` methods SHALL be added only when a use case needs them; there SHALL be no generic `findBy(filters)`.

#### Scenario: Find all portfolio items
- **WHEN** `findAll()` is called
- **THEN** it returns `Ok<PortfolioItem[]>` containing all items ordered by createdAt ascending

#### Scenario: Delete a portfolio item
- **WHEN** `delete(id)` is called with a valid ID
- **THEN** the item is removed and `Ok<void>` is returned

### Requirement: PortfolioItemCreate use case

The system SHALL provide a `PortfolioItemCreateUseCase` class (file `portfolio-item-create.use-case.ts`) decorated with `@injectable()`. It SHALL validate the referenced instrument exists via InstrumentRepository, create the PortfolioItem, persist via PortfolioItemRepository, and return the created item.

#### Scenario: Create item with valid instrument
- **WHEN** executed with a valid instrumentId that exists in the catalog
- **THEN** the item is persisted and `Ok<PortfolioItem>` is returned

#### Scenario: Create item with non-existent instrument
- **WHEN** executed with an instrumentId that does not exist
- **THEN** `Err<InstrumentNotFoundError>` is returned

### Requirement: PortfolioItemUpdate use case

The system SHALL provide a `PortfolioItemUpdateUseCase` that updates mutable fields (broker, targetWeight, currentValue, notes) through `PortfolioItem.update(changes)`.

#### Scenario: Update target weight
- **WHEN** executed with a valid item ID and new targetWeight 25
- **THEN** the item is updated and `Ok<PortfolioItem>` is returned with targetWeight=25

#### Scenario: Update non-existent item
- **WHEN** executed with an unknown item ID
- **THEN** `Err<PortfolioItemNotFoundError>` is returned

### Requirement: PortfolioItemDelete use case

The system SHALL provide a `PortfolioItemDeleteUseCase` that removes a portfolio item by ID.

#### Scenario: Delete existing item
- **WHEN** executed with a valid item ID
- **THEN** the item is deleted and `Ok<void>` is returned

#### Scenario: Delete non-existent item
- **WHEN** executed with an unknown item ID
- **THEN** `Err<PortfolioItemNotFoundError>` is returned

### Requirement: PortfolioItemList use case

The system SHALL provide a `PortfolioItemListUseCase` that returns all portfolio items with their resolved Instrument data (name, symbol, type, assetClass, replicates) through a portfolio read-query port declared in `investlab-domain`. The server implementation SHALL resolve items and instruments in a single SQL query.

#### Scenario: List all items with instrument data
- **WHEN** executed
- **THEN** returns `Ok` with array of PortfolioItem + Instrument pairs

#### Scenario: Empty portfolio
- **WHEN** executed and no items exist
- **THEN** returns `Ok` with empty array

### Requirement: Use case error contract

Every portfolio use case SHALL export a named error union (for example `PortfolioItemUpdateError`). Each domain error SHALL carry a SCREAMING_SNAKE `code` from a typed literal union, which identifies the error across HTTP.

#### Scenario: Not-found error crosses HTTP
- **WHEN** the API returns `{ "code": "PORTFOLIO_ITEM_NOT_FOUND", "statusCode": 404 }` to the web
- **THEN** the client use case returns `Err<PortfolioItemNotFoundError>`

### Requirement: Drizzle portfolio_items table

The system SHALL define a `portfolio_items` table: `id` (UUID PK), `instrument_id` (UUID FK to instruments, NOT NULL), `broker` (VARCHAR 100, NOT NULL), `target_weight` (NUMERIC 5,2, NOT NULL, default 0), `current_value` (NUMERIC 12,2, NOT NULL, default 0), `notes` (TEXT, nullable), `created_at` (TIMESTAMPTZ, NOT NULL, default now()), `updated_at` (TIMESTAMPTZ, NOT NULL, default now()).

#### Scenario: Table schema matches domain model
- **WHEN** the portfolio_items table is inspected
- **THEN** it has the specified columns with correct types, constraints, and FK to instruments

### Requirement: PortfolioItem domain-persistence mapping

The system SHALL provide `toDomain(row)` and `toRow(entity)` mapper functions for PortfolioItem in a non-exported module of `investlab-data-server`.

#### Scenario: Round-trip mapping
- **WHEN** a PortfolioItem entity is mapped to a row and back
- **THEN** the resulting entity is equivalent to the original

### Requirement: Portfolio route and table view

The system SHALL render a `/portfolio` route displaying all portfolio items in a table with columns: instrument name, symbol, type (badge), asset class (badge), broker, target weight %, current value (formatted as currency), replicates (if any). The table SHALL support creating new items, editing existing items, and deleting items.

#### Scenario: View portfolio with items
- **WHEN** user navigates to `/portfolio` and items exist
- **THEN** a table displays all items with instrument details, broker, weight, and value

#### Scenario: View empty portfolio
- **WHEN** user navigates to `/portfolio` and no items exist
- **THEN** an empty state message is shown with a prompt to add the first holding

#### Scenario: Create new portfolio item
- **WHEN** user clicks "Add Holding" and fills the form with instrument, broker, target weight
- **THEN** the item is created and appears in the table

#### Scenario: Delete portfolio item
- **WHEN** user clicks delete on an item and confirms
- **THEN** the item is removed from the table
