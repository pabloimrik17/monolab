# investlab-http-api Specification

## Purpose

Defines `apps/investlab-api`, the Hono HTTP API that is InvestLab's only process talking to Postgres, Redis and Finnhub: its routes, bearer-token protection, request validation and error responses keyed by code.

## Requirements

### Requirement: InvestLab HTTP API owns persistence and external quotes

The system SHALL provide `apps/investlab-api`, a Hono app that is the only InvestLab process connecting to Postgres, Redis and Finnhub. Routes SHALL resolve server use cases from an Inversify container built from the platform and module server container modules, and translate their `ResultAsync` with `result.match`. The web app SHALL reach data only through this API.

#### Scenario: Web lists the portfolio through the API

- **WHEN** the `/portfolio` loader runs
- **THEN** it calls the API's portfolio list endpoint and the web process opens no database connection

#### Scenario: API container from modules

- **WHEN** the API builds its container
- **THEN** it binds its `Config` adapter and loads the platform, catalog, portfolio, quotes and roger server modules, and binds nothing else

### Requirement: Portfolio item endpoints

The API SHALL expose `GET /portfolio-items` (200, items with their instrument data plus the instrument catalog), `POST /portfolio-items` (201, created item), `PUT /portfolio-items/:id` (200, updated item) and `DELETE /portfolio-items/:id` (204, no body). Bodies SHALL use the DTOs in the portfolio module's contracts (`data/contracts/` of `@m0n0lab/investlab-portfolio`); entities never cross HTTP. In a `PUT` body an omitted field SHALL be left unchanged and `notes: null` SHALL clear the notes.

#### Scenario: List portfolio items

- **WHEN** `GET /portfolio-items` is called with a valid token
- **THEN** the API responds 200 with each item paired with its instrument, ordered by `createdAt` ascending, and the instrument catalog

#### Scenario: Create a portfolio item

- **WHEN** `POST /portfolio-items` carries a valid body for an existing instrument
- **THEN** the API responds 201 with the created item

#### Scenario: Create for an unknown instrument

- **WHEN** `POST /portfolio-items` references an instrument that does not exist
- **THEN** the API responds 404 with `code` `INSTRUMENT_NOT_FOUND`

#### Scenario: Update a portfolio item

- **WHEN** `PUT /portfolio-items/:id` sets `targetWeight` 25 on an existing item
- **THEN** the API responds 200 with the item carrying `targetWeight` 25

#### Scenario: Clear notes

- **WHEN** `PUT /portfolio-items/:id` sends `{ "notes": null }` for an item with notes
- **THEN** the API responds 200 with the item without `notes`, and its other fields unchanged

#### Scenario: Delete a portfolio item

- **WHEN** `DELETE /portfolio-items/:id` targets an existing item
- **THEN** the API responds 204 with no body

#### Scenario: Delete an unknown portfolio item

- **WHEN** `DELETE /portfolio-items/:id` targets a non-existent item
- **THEN** the API responds 404 with `code` `PORTFOLIO_ITEM_NOT_FOUND`

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

### Requirement: Health endpoint

The API SHALL expose `GET /health` (200, `{ "status": "ok" }`) as a public liveness probe. It SHALL NOT require a token and SHALL NOT touch Postgres, Redis or Finnhub.

#### Scenario: Liveness without a token

- **WHEN** `GET /health` is called without an `Authorization` header
- **THEN** the API responds 200 with `{ "status": "ok" }`

### Requirement: Bearer token protection

The API SHALL reject any request to a route other than `GET /health` that lacks `Authorization: Bearer <INVESTLAB_API_TOKEN>` with HTTP 401. Only the web server SHALL hold the token.

#### Scenario: Missing token

- **WHEN** a request without an `Authorization` header reaches any route except `GET /health`
- **THEN** the API responds 401 and no use case runs

### Requirement: Error responses keyed by code

The API SHALL answer use case errors with `{ code, message, statusCode }` (the `apiErrorDtoSchema` of `@m0n0lab/investlab-core`, which clients parse), choosing the HTTP status from the error `code`. For 5xx statuses the message SHALL be generic. `MARKET_DATA_UNAVAILABLE` SHALL answer 503.

#### Scenario: Unknown portfolio item

- **WHEN** `PUT /portfolio-items/:id` targets a non-existent item
- **THEN** the API responds 404 with `code` `PORTFOLIO_ITEM_NOT_FOUND`

#### Scenario: Persistence failure

- **WHEN** a use case fails with `PERSISTENCE_ERROR`
- **THEN** the API responds 500 with a generic message

#### Scenario: Market data unavailable

- **WHEN** `GET /quotes` fails with `MARKET_DATA_UNAVAILABLE`
- **THEN** the API responds 503 with `code` `MARKET_DATA_UNAVAILABLE` and a generic message

#### Scenario: Rejected market data key

- **WHEN** `GET /quotes` is called for an uncached symbol and Finnhub rejects the API key
- **THEN** the API responds 500 with `code` `PERSISTENCE_ERROR` and a generic message, not 200 with an empty list

### Requirement: Request validation with shared contracts

The API SHALL validate request bodies and the `:id` path parameter (UUID) with the zod schemas from the module contracts and respond 422 with `code` `VALIDATION_ERROR` and an `issues` array of `{ path, message }` when validation fails. No use case runs on a validation failure. A body sent without a JSON content type SHALL be rejected with a single issue of empty `path`, and a body that is not valid JSON SHALL be rejected the same way, before the schema runs.

#### Scenario: Target weight out of range

- **WHEN** a create request carries `targetWeight` 150
- **THEN** the API responds 422 with `code` `VALIDATION_ERROR` and an issue whose `path` is `targetWeight`

#### Scenario: Malformed body

- **WHEN** a create request body is not valid JSON
- **THEN** the API responds 422 with `code` `VALIDATION_ERROR` and a single issue with empty `path`

#### Scenario: Malformed id

- **WHEN** `PUT /portfolio-items/not-a-uuid` is called
- **THEN** the API responds 422 with `code` `VALIDATION_ERROR` and no use case runs

#### Scenario: Body without a JSON content type

- **WHEN** `POST /portfolio-items` carries a valid JSON body without a JSON `Content-Type` header
- **THEN** the API responds 422 with `code` `VALIDATION_ERROR` and a single issue with empty `path`, not 500, and no use case runs
- **AND** `PUT /instruments/:id` with the same kind of body answers the same 422 and no use case runs

### Requirement: Quotes served through the API

The API SHALL serve quotes from a quote repository that reads the Redis cache first and falls back to Finnhub, writing fetched quotes back to the cache. The Finnhub API key SHALL never reach the browser. When the API answers `MARKET_DATA_UNAVAILABLE`, the web quotes resource route SHALL answer 503 with a message saying quotes are unavailable.

#### Scenario: Browser poll

- **WHEN** the browser ticker poller requests quotes
- **THEN** it calls a web resource route, which calls the API, and the browser bundle contains no Finnhub key

#### Scenario: Market data unavailable behind the web route

- **WHEN** the web quotes resource route calls the API and the API answers 503 with `code` `MARKET_DATA_UNAVAILABLE`
- **THEN** the route responds 503 with `{ "message": "Quotes are unavailable right now. Please try again later." }`

### Requirement: Instrument management endpoints

The API SHALL expose `POST /instruments` (201, created instrument), `PUT /instruments/:id` (200, updated instrument) and `DELETE /instruments/:id` (204, no body), with bodies validated by the catalog module's DTOs. In a `PUT` body an omitted field SHALL be left unchanged and `null` SHALL clear `exchange`, `sector` or `replicates`.

#### Scenario: Create an instrument

- **WHEN** `POST /instruments` carries a valid body with symbol `vwce`
- **THEN** the API responds 201 with the created instrument, whose symbol is `VWCE`

#### Scenario: Create a duplicate symbol

- **WHEN** `POST /instruments` carries symbol `AAPL` and `AAPL` is in the catalog
- **THEN** the API responds 409 with `code` `INSTRUMENT_ALREADY_EXISTS`

#### Scenario: Update an instrument

- **WHEN** `PUT /instruments/:id` sets `name` on an existing instrument
- **THEN** the API responds 200 with the instrument carrying the new name and its other fields unchanged

#### Scenario: Update to a duplicate symbol

- **WHEN** `PUT /instruments/:id` sets `symbol` to `AAPL` and another instrument has `AAPL`
- **THEN** the API responds 409 with `code` `INSTRUMENT_ALREADY_EXISTS`

#### Scenario: Update an unknown instrument

- **WHEN** `PUT /instruments/:id` targets a non-existent instrument
- **THEN** the API responds 404 with `code` `INSTRUMENT_NOT_FOUND`

#### Scenario: Delete an unknown instrument

- **WHEN** `DELETE /instruments/:id` targets a non-existent instrument
- **THEN** the API responds 404 with `code` `INSTRUMENT_NOT_FOUND`

#### Scenario: Delete an unused instrument

- **WHEN** `DELETE /instruments/:id` targets an instrument nothing references
- **THEN** the API responds 204 with no body and the instrument is no longer listed

#### Scenario: Delete an instrument in use

- **WHEN** `DELETE /instruments/:id` targets an instrument referenced by a portfolio item
- **THEN** the API responds 409 with `code` `INSTRUMENT_IN_USE` and the instrument is still listed

#### Scenario: Invalid instrument body

- **WHEN** `POST /instruments` carries an unknown `type`
- **THEN** the API responds 422 with `code` `VALIDATION_ERROR` and an issue whose `path` is `type`

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
