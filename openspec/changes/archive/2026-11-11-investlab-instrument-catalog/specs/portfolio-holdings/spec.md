## MODIFIED Requirements

### Requirement: PortfolioItem repository interface

The system SHALL define a `PortfolioItemRepository` port in the `domain/` folder of `@m0n0lab/investlab-portfolio` with methods returning `ResultAsync`: `save(item)`, `findById(id)`, `findAll()`, `update(item)` and `delete(id)`. `save` SHALL fail with `InstrumentNotFoundError` when the item's instrument does not exist. Further `findByX` methods SHALL be added only when a use case needs them; there SHALL be no generic `findBy(filters)`.

#### Scenario: Find all portfolio items

- **WHEN** `findAll()` is called
- **THEN** it returns `Ok<PortfolioItem[]>` containing all items ordered by createdAt ascending

#### Scenario: Delete a portfolio item

- **WHEN** `delete(id)` is called with a valid ID
- **THEN** the item is removed and `Ok<void>` is returned

#### Scenario: Instrument referenced by an item

- **WHEN** an item references an instrument and that instrument is deleted
- **THEN** the delete returns `Err<InstrumentInUseError>` and the item is unchanged

#### Scenario: Save an item for an unknown instrument

- **WHEN** `save(item)` is called with an `instrumentId` that is not in the catalog
- **THEN** it returns `Err<InstrumentNotFoundError>` and nothing is persisted

### Requirement: PortfolioItemCreate use case

The system SHALL provide a `PortfolioItemCreateUseCase` class (file `portfolio-item-create.use-case.ts`) decorated with `@injectable()`. It SHALL create the PortfolioItem, persist it via PortfolioItemRepository, which refuses an unknown instrument, and return the created item. It SHALL NOT read the catalog's repository.

#### Scenario: Create item with valid instrument

- **WHEN** executed with a valid instrumentId that exists in the catalog
- **THEN** the item is persisted and `Ok<PortfolioItem>` is returned

#### Scenario: Create item with non-existent instrument

- **WHEN** executed with an instrumentId that does not exist
- **THEN** `Err<InstrumentNotFoundError>` is returned
