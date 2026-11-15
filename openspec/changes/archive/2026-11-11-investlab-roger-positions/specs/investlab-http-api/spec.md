## ADDED Requirements

### Requirement: Roger entry endpoints

The API SHALL expose `GET /roger/entries?view=active|history` (200, entries with their instrument's symbol, name and sector; `active` by default), `POST /roger/entries` (201, created entry), `PUT /roger/entries/:id` (200, edited entry), `DELETE /roger/entries/:id` (204, no body), `POST /roger/entries/:id/transitions` (200, transitioned entry) and `POST /roger/entries/:id/re-entries` (201, the new entry), with bodies validated by the roger module's DTOs.

#### Scenario: List active entries

- **WHEN** `GET /roger/entries` is called with a valid token
- **THEN** the API responds 200 with the entries in every state but `SOLD`, each with its instrument's symbol, name and sector

#### Scenario: List the history

- **WHEN** `GET /roger/entries?view=history` is called
- **THEN** the API responds 200 with the `SOLD` entries, most recent sell date first

#### Scenario: Create with a new stock

- **WHEN** `POST /roger/entries` carries state `WATCHING`, entry price 30 and `newInstrument` with symbol `ASTS` and a name
- **THEN** the API responds 201 with the entry, and `GET /instruments` lists `ASTS`

#### Scenario: Transition

- **WHEN** `POST /roger/entries/:id/transitions` carries `to` `BUY_ORDER`, quantity 10 and the entry's `expectedUpdatedAt`
- **THEN** the API responds 200 with the entry in `BUY_ORDER` with quantity 10

#### Scenario: Re-entry

- **WHEN** `POST /roger/entries/:id/re-entries` targets a `SOLD` entry
- **THEN** the API responds 201 with a new `BUY_ORDER` entry for the same instrument

#### Scenario: Delete an entry

- **WHEN** `DELETE /roger/entries/:id` targets an existing entry
- **THEN** the API responds 204 with no body

#### Scenario: Unknown view

- **WHEN** `GET /roger/entries?view=all` is called
- **THEN** the API responds 422 with `code` `VALIDATION_ERROR`

### Requirement: Roger error statuses

The API SHALL answer `ENTRY_NOT_FOUND` with 404, `ENTRY_CONFLICT` and `INVALID_TRANSITION` with 409, and `MISSING_REQUIRED_FIELD` and `FIELD_NOT_IN_STATE` with 422, in the error envelope keyed by code.

#### Scenario: Invalid transition

- **WHEN** `POST /roger/entries/:id/transitions` asks an `INVESTED` entry to go to `BUY_ORDER`
- **THEN** the API responds 409 with `code` `INVALID_TRANSITION`

#### Scenario: Missing field

- **WHEN** `POST /roger/entries/:id/transitions` asks a `WATCHING` entry to go to `BUY_ORDER` without a quantity
- **THEN** the API responds 422 with `code` `MISSING_REQUIRED_FIELD`

#### Scenario: Stale write

- **WHEN** `PUT /roger/entries/:id` carries an `expectedUpdatedAt` older than the entry's
- **THEN** the API responds 409 with `code` `ENTRY_CONFLICT`

#### Scenario: Unknown entry

- **WHEN** `DELETE /roger/entries/:id` targets an id that does not exist
- **THEN** the API responds 404 with `code` `ENTRY_NOT_FOUND`

## MODIFIED Requirements

### Requirement: InvestLab HTTP API owns persistence and external quotes

The system SHALL provide `apps/investlab-api`, a Hono app that is the only InvestLab process connecting to Postgres, Redis and Finnhub. Routes SHALL resolve server use cases from an Inversify container built from the platform and module server container modules, and translate their `ResultAsync` with `result.match`. The web app SHALL reach data only through this API.

#### Scenario: Web lists the portfolio through the API

- **WHEN** the `/portfolio` loader runs
- **THEN** it calls the API's portfolio list endpoint and the web process opens no database connection

#### Scenario: API container from modules

- **WHEN** the API builds its container
- **THEN** it binds its `Config` adapter and loads the platform, catalog, portfolio, quotes and roger server modules, and binds nothing else

### Requirement: Instrument and quote endpoints

The API SHALL expose `GET /instruments` (200, the instrument catalog), the instrument management endpoints, and `GET /quotes?symbols=<comma-separated symbols>` (200, current quotes for the requested symbols). These, with `GET /health`, the portfolio item endpoints and the Roger entry endpoints, SHALL be the API's complete route list.

#### Scenario: List instruments

- **WHEN** `GET /instruments` is called with a valid token
- **THEN** the API responds 200 with the instrument catalog

#### Scenario: Fetch quotes

- **WHEN** `GET /quotes?symbols=AAPL,MSFT` is called and only AAPL has data
- **THEN** the API responds 200 with the AAPL quote and omits MSFT

#### Scenario: Quotes without symbols

- **WHEN** `GET /quotes` is called without a `symbols` parameter
- **THEN** the API responds 422 with `code` `VALIDATION_ERROR`

#### Scenario: Complete route list

- **WHEN** the API's routes are listed
- **THEN** they are `GET /health`, `GET|POST /portfolio-items`, `PUT|DELETE /portfolio-items/:id`, `GET|POST /instruments`, `PUT|DELETE /instruments/:id`, `GET /quotes`, `GET|POST /roger/entries`, `PUT|DELETE /roger/entries/:id`, `POST /roger/entries/:id/transitions` and `POST /roger/entries/:id/re-entries`
