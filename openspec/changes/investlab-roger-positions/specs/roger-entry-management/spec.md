# Roger Entry Management Specification

## Purpose

Defines how the user manages Roger entries: creating them for a catalog instrument or a new stock, editing, deleting and listing them, the history of sold entries, and the `/roger` page with its forms.

## ADDED Requirements

### Requirement: Create an entry

The system SHALL create an entry for an existing catalog instrument in any Roger state, given every field that state carries. The entry SHALL record the time of creation as its time in state. An unknown instrument SHALL fail with `code` `INSTRUMENT_NOT_FOUND` and create nothing.

#### Scenario: Watching entry

- **WHEN** an entry is created for `AAPL` in `WATCHING` with entry price 150
- **THEN** it is persisted with state `WATCHING`, entry price 150 and no other trade fields

#### Scenario: Loading an existing trade

- **WHEN** an entry is created in `INVESTED` with entry price 150, quantity 10, buy commission 2 and buy date 2026-10-01
- **THEN** it is persisted with those values

#### Scenario: Missing field on create

- **WHEN** an entry is created in `BUY_ORDER` without a quantity
- **THEN** it fails with `code` `MISSING_REQUIRED_FIELD` and nothing is persisted

#### Scenario: Unknown instrument

- **WHEN** an entry is created for an instrument id the catalog does not have
- **THEN** it fails with `code` `INSTRUMENT_NOT_FOUND` and nothing is persisted

#### Scenario: Several entries per instrument

- **WHEN** `AAPL` already has a `WATCHING` entry at 150 and another entry is created for `AAPL` at 140
- **THEN** both entries exist

### Requirement: Create an entry with a new stock

Creating an entry SHALL accept, instead of an instrument, a new stock given by symbol, name and optional sector. The system SHALL add it to the catalog as type `stock` and asset class `equity`, then create the entry for it. A symbol already in the catalog SHALL fail with `code` `INSTRUMENT_ALREADY_EXISTS`, and neither the instrument nor the entry SHALL be created. An invalid entry SHALL fail before the instrument is created.

#### Scenario: New stock

- **WHEN** an entry is created in `WATCHING` at 30 with new stock symbol `asts` and name `AST SpaceMobile`
- **THEN** the catalog lists `ASTS` as a stock in equity, and the entry references it

#### Scenario: Symbol already in the catalog

- **WHEN** an entry is created with new stock symbol `AAPL` and `AAPL` is in the catalog
- **THEN** it fails with `code` `INSTRUMENT_ALREADY_EXISTS`, and no instrument or entry is created

#### Scenario: Invalid entry with a new stock

- **WHEN** an entry is created with new stock symbol `ASTS` and entry price 0
- **THEN** it fails with `code` `VALIDATION_ERROR` and `ASTS` is not in the catalog

### Requirement: Edit an entry

The system SHALL let the fields of an entry's current state be edited without changing its state. Editing a field the current state does not carry SHALL fail with `code` `FIELD_NOT_IN_STATE`. An edit SHALL carry the `updatedAt` the user last saw and fail with `code` `ENTRY_CONFLICT` if the entry changed since.

#### Scenario: Edit the entry price on the radar

- **WHEN** the entry price of a `WATCHING` entry is changed to 145
- **THEN** the entry has entry price 145, the same state and the same time in state

#### Scenario: Edit a field of another state

- **WHEN** a quantity is set on a `WATCHING` entry by an edit
- **THEN** it fails with `code` `FIELD_NOT_IN_STATE` and the entry is unchanged

#### Scenario: Stale edit

- **WHEN** an edit carries an `updatedAt` older than the entry's
- **THEN** it fails with `code` `ENTRY_CONFLICT` and the entry is unchanged

### Requirement: Transition an entry

The system SHALL apply a transition (`roger-state-machine`) to a stored entry and persist the result. A transition SHALL carry the `updatedAt` the user last saw and fail with `code` `ENTRY_CONFLICT` if the entry changed since.

#### Scenario: Persisted transition

- **WHEN** a `WATCHING` entry is transitioned to `BUY_ORDER` with quantity 10
- **THEN** reading the entry again returns state `BUY_ORDER` and quantity 10

#### Scenario: Unknown entry

- **WHEN** a transition targets an entry id that does not exist
- **THEN** it fails with `code` `ENTRY_NOT_FOUND`

### Requirement: Delete an entry

The system SHALL delete an entry in any state, history included. Deleting an entry SHALL NOT delete its instrument. An unknown entry SHALL fail with `code` `ENTRY_NOT_FOUND`.

#### Scenario: Delete a sold entry

- **WHEN** a `SOLD` entry is deleted
- **THEN** it no longer appears in the history and its instrument is still in the catalog

#### Scenario: Instrument with an entry cannot be deleted

- **WHEN** an entry references `AAPL` and the catalog deletes `AAPL`
- **THEN** the delete fails with `code` `INSTRUMENT_IN_USE`

### Requirement: Active entries and history

The system SHALL list active entries (every state but `SOLD`) with their instrument's symbol, name and sector, ordered by symbol and then by creation. It SHALL list the history (`SOLD` entries) apart, most recent sell date first.

#### Scenario: Active list excludes sold entries

- **WHEN** `AAPL` has a `WATCHING` entry and a `SOLD` entry, and the active entries are listed
- **THEN** only the `WATCHING` entry is returned, with `AAPL`'s symbol, name and sector

#### Scenario: History order

- **WHEN** two entries were sold on 2026-10-01 and 2026-11-01, and the history is listed
- **THEN** the one sold on 2026-11-01 comes first

### Requirement: Roger page

The web SHALL offer a `/roger` page, linked from the top navigation, that shows active entries grouped by instrument. Each entry SHALL show its state as a badge and offer only the transitions its state allows. Entries SHALL be sortable by column within their group and filterable by state; a group with no matching entry SHALL be hidden. A history view SHALL list sold entries. Deleting SHALL ask for confirmation.

#### Scenario: Grouped table

- **WHEN** `AAPL` has three active entries and `/roger` is opened
- **THEN** the three appear under one `AAPL` group, each with its own state, prices and fields

#### Scenario: Only valid actions

- **WHEN** an `INVESTED` entry is shown
- **THEN** it offers `SELL_ORDER` and `SOLD` and no other transition

#### Scenario: Filter by state

- **WHEN** the page is filtered by `BUY_ORDER`
- **THEN** only `BUY_ORDER` entries are shown and instruments without one are hidden

#### Scenario: Sold entry offers re-entry

- **WHEN** the history view shows a `SOLD` entry
- **THEN** it offers re-entry and no transition

### Requirement: Entry forms

Each create, transition and re-entry form SHALL ask exactly the fields of its target state. Values the entry already has SHALL be pre-filled and editable. New fields SHALL be empty, except that dates SHALL default to today and the sell commission SHALL default to the buy commission. A field the server refuses SHALL show its error inline.

#### Scenario: Transition form to a buy order

- **WHEN** the transition to `BUY_ORDER` is opened for a `SHORTLISTED` entry at 150
- **THEN** the form shows entry price pre-filled with 150, editable, and an empty quantity, and no other field

#### Scenario: Transition form to sold

- **WHEN** the transition to `SOLD` is opened for a `SELL_ORDER` entry with buy commission 2 and exit price 180
- **THEN** the form shows exit price 180, sell commission 2 and today's sell date, all editable

#### Scenario: Create form follows the chosen state

- **WHEN** `INVESTED` is chosen as the initial state on the create form
- **THEN** the form asks entry price, quantity, buy commission and buy date

#### Scenario: Instrument picker or new stock

- **WHEN** the user types a symbol the catalog does not have on the create form
- **THEN** the form offers to add it as a new stock with a name and an optional sector
