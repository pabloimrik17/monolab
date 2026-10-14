## ADDED Requirements

### Requirement: Instrument management endpoints

The API SHALL expose `POST /instruments` (201, created instrument), `PUT /instruments/:id` (200, updated instrument) and `DELETE /instruments/:id` (204, no body), with bodies validated by the portfolio module's contracts. In a `PUT` body an omitted field SHALL be left unchanged and `null` SHALL clear `exchange`, `sector` or `replicates`.

#### Scenario: Create an instrument

- **WHEN** `POST /instruments` carries a valid body with symbol `vwce`
- **THEN** the API responds 201 with the created instrument, whose symbol is `VWCE`

#### Scenario: Create a duplicate symbol

- **WHEN** `POST /instruments` carries symbol `AAPL` and `AAPL` is in the catalog
- **THEN** the API responds 409 with `code` `INSTRUMENT_ALREADY_EXISTS`

#### Scenario: Update an instrument

- **WHEN** `PUT /instruments/:id` sets `name` on an existing instrument
- **THEN** the API responds 200 with the instrument carrying the new name and its other fields unchanged

#### Scenario: Update an unknown instrument

- **WHEN** `PUT /instruments/:id` targets a non-existent instrument
- **THEN** the API responds 404 with `code` `INSTRUMENT_NOT_FOUND`

#### Scenario: Delete an unused instrument

- **WHEN** `DELETE /instruments/:id` targets an instrument no portfolio item references
- **THEN** the API responds 204 with no body and the instrument is no longer listed

#### Scenario: Delete an instrument in use

- **WHEN** `DELETE /instruments/:id` targets an instrument referenced by a portfolio item
- **THEN** the API responds 409 with `code` `INSTRUMENT_IN_USE` and the instrument is still listed

#### Scenario: Invalid instrument body

- **WHEN** `POST /instruments` carries an unknown `type`
- **THEN** the API responds 422 with `code` `VALIDATION_ERROR` and an issue whose `path` is `type`

## MODIFIED Requirements

### Requirement: Instrument and quote endpoints

The API SHALL expose `GET /instruments` (200, the instrument catalog), the instrument management endpoints, and `GET /quotes?symbols=<comma-separated symbols>` (200, current quotes for the requested symbols). These, with `GET /health` and the portfolio item endpoints, SHALL be the API's complete route list.

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
- **THEN** they are `GET /health`, `GET|POST /portfolio-items`, `PUT|DELETE /portfolio-items/:id`, `GET|POST /instruments`, `PUT|DELETE /instruments/:id` and `GET /quotes`

### Requirement: InvestLab HTTP API owns persistence and external quotes

The system SHALL provide `apps/investlab-api`, a Hono app that is the only InvestLab process connecting to Postgres, Redis and Finnhub. Routes SHALL resolve server use cases from an Inversify container built from the platform and module server container modules, and translate their `ResultAsync` with `result.match`. The web app SHALL reach data only through this API.

#### Scenario: Web lists the portfolio through the API
- **WHEN** the `/portfolio` loader runs
- **THEN** it calls the API's portfolio list endpoint and the web process opens no database connection

#### Scenario: API container from modules
- **WHEN** the API builds its container
- **THEN** it binds its `Config` adapter and loads the platform, portfolio and quotes server modules, and binds nothing else
