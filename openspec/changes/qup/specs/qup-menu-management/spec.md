## ADDED Requirements

### Requirement: MenuItem entity

The system SHALL model MenuItem as an entity in `qup-domain` with: id (UUID), name (string), category (Category value object), description (optional string), available (boolean, default true), sortOrder (number, default 0). `MenuItem.create()` SHALL validate input and return `Result<MenuItem, ValidationError>`.

#### Scenario: Create a valid menu item
- **WHEN** `MenuItem.create()` is called with name "Flat White", category COFFEE
- **THEN** it returns `Ok<MenuItem>` with available=true and sortOrder=0

#### Scenario: Create menu item with empty name
- **WHEN** `MenuItem.create()` is called with an empty name
- **THEN** it returns `Err<ValidationError>`

### Requirement: Category value object

The system SHALL define a Category value object with values: COFFEE, TEA, INFUSION, JUICE, OTHER. These SHALL be exhaustive for v1.

#### Scenario: Valid categories
- **WHEN** a Category is instantiated with "COFFEE", "TEA", "INFUSION", "JUICE", or "OTHER"
- **THEN** a valid Category value object is returned

#### Scenario: Invalid category
- **WHEN** an unknown category string is provided
- **THEN** a validation error is returned

### Requirement: Toggle menu item availability

The system SHALL allow toggling a MenuItem's `available` property. This is a simple boolean flip with no preconditions.

#### Scenario: Toggle available to unavailable
- **WHEN** `menuItem.toggleAvailability()` is called on an available item
- **THEN** the item's `available` property becomes false

#### Scenario: Toggle unavailable to available
- **WHEN** `menuItem.toggleAvailability()` is called on an unavailable item
- **THEN** the item's `available` property becomes true

### Requirement: MenuItem repository interface

The system SHALL define a `MenuItemRepository` interface in `qup-domain` with methods returning `ResultAsync`: `save(menuItem)`, `findById(id)`, `findAll()`, `findAllAvailable()`, `update(menuItem)`, `delete(id)`.

#### Scenario: Find all available items
- **WHEN** `findAllAvailable()` is called
- **THEN** it returns `Ok<MenuItem[]>` containing only items with `available: true`, ordered by sortOrder ascending

#### Scenario: Delete a menu item
- **WHEN** `delete(id)` is called with a valid ID
- **THEN** the item is removed and `Ok<void>` is returned

### Requirement: Menu CRUD use cases

The system SHALL provide `CreateMenuItemUseCase`, `UpdateMenuItemUseCase`, and `DeleteMenuItemUseCase` classes decorated with `@injectable()`. Each SHALL validate input, perform the operation via the repository, and return typed results.

#### Scenario: Create a new menu item
- **WHEN** `CreateMenuItemUseCase` is executed with valid input
- **THEN** the item is persisted and `Ok<MenuItem>` is returned

#### Scenario: Update menu item name
- **WHEN** `UpdateMenuItemUseCase` is executed with a valid ID and new name
- **THEN** the item is updated and `Ok<MenuItem>` is returned

#### Scenario: Update non-existent menu item
- **WHEN** `UpdateMenuItemUseCase` is executed with an unknown ID
- **THEN** `Err<MenuItemNotFoundError>` is returned

#### Scenario: Delete a menu item
- **WHEN** `DeleteMenuItemUseCase` is executed with a valid ID
- **THEN** the item is deleted and `Ok<void>` is returned

### Requirement: GetMenu use case

The system SHALL provide a `GetMenuUseCase` that retrieves menu items. It SHALL accept an optional `availableOnly` flag (default false). When true, it returns only available items.

#### Scenario: Get full menu
- **WHEN** executed with `availableOnly: false`
- **THEN** all menu items are returned ordered by sortOrder

#### Scenario: Get available menu only
- **WHEN** executed with `availableOnly: true`
- **THEN** only available menu items are returned ordered by sortOrder

### Requirement: Drizzle menu_items table

The system SHALL define a `menu_items` table: `id` (UUID PK), `name` (VARCHAR 100, NOT NULL), `category` (VARCHAR 20, NOT NULL), `description` (TEXT, nullable), `available` (BOOLEAN, NOT NULL, default true), `sort_order` (INTEGER, NOT NULL, default 0).

#### Scenario: Table schema matches domain model
- **WHEN** the menu_items table is inspected
- **THEN** it has the specified columns with correct types and constraints

### Requirement: MenuItem domain-persistence mapping

The system SHALL provide `toDomain(row)` and `toRow(entity)` mapper functions for MenuItem in `qup-data`.

#### Scenario: Round-trip mapping
- **WHEN** a MenuItem entity is mapped to a row and back
- **THEN** the resulting entity is equivalent to the original
