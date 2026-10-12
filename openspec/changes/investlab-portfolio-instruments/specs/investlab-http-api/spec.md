## ADDED Requirements

### Requirement: InvestLab HTTP API owns persistence and external quotes

The system SHALL provide `apps/investlab-api`, a Hono app that is the only InvestLab process connecting to Postgres, Redis and Finnhub. Routes SHALL resolve server use cases from an Inversify container and translate their `ResultAsync` with `result.match`. The web app SHALL reach data only through this API.

#### Scenario: Web lists the portfolio through the API
- **WHEN** the `/portfolio` loader runs
- **THEN** it calls the API's portfolio list endpoint and the web process opens no database connection

### Requirement: Portfolio item endpoints

The API SHALL expose `GET /portfolio-items` (200, items with their instrument data plus the instrument catalog), `POST /portfolio-items` (201, created item), `PUT /portfolio-items/:id` (200, updated item) and `DELETE /portfolio-items/:id` (204, no body). Bodies SHALL use `investlab-data-contracts` DTOs; entities never cross HTTP.

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

#### Scenario: Delete a portfolio item
- **WHEN** `DELETE /portfolio-items/:id` targets an existing item
- **THEN** the API responds 204 with no body

#### Scenario: Delete an unknown portfolio item
- **WHEN** `DELETE /portfolio-items/:id` targets a non-existent item
- **THEN** the API responds 404 with `code` `PORTFOLIO_ITEM_NOT_FOUND`

### Requirement: Instrument and quote endpoints

The API SHALL expose `GET /instruments` (200, the instrument catalog) and `GET /quotes?symbols=<comma-separated symbols>` (200, current quotes for the requested symbols). These, with the portfolio item endpoints, SHALL be the API's complete route list.

#### Scenario: List instruments
- **WHEN** `GET /instruments` is called with a valid token
- **THEN** the API responds 200 with the instrument catalog

#### Scenario: Fetch quotes
- **WHEN** `GET /quotes?symbols=AAPL,MSFT` is called and only AAPL has data
- **THEN** the API responds 200 with the AAPL quote and omits MSFT

#### Scenario: Quotes without symbols
- **WHEN** `GET /quotes` is called without a `symbols` parameter
- **THEN** the API responds 422 with `code` `VALIDATION_ERROR`

### Requirement: Bearer token protection

The API SHALL reject any request lacking `Authorization: Bearer <INVESTLAB_API_TOKEN>` with HTTP 401. Only the web server SHALL hold the token.

#### Scenario: Missing token
- **WHEN** a request without an `Authorization` header reaches any route
- **THEN** the API responds 401 and no use case runs

### Requirement: Error responses keyed by code

The API SHALL answer use case errors with `{ code, message, statusCode }`, choosing the HTTP status from the error `code`. For 5xx statuses the message SHALL be generic.

#### Scenario: Unknown portfolio item
- **WHEN** `PUT /portfolio-items/:id` targets a non-existent item
- **THEN** the API responds 404 with `code` `PORTFOLIO_ITEM_NOT_FOUND`

#### Scenario: Persistence failure
- **WHEN** a use case fails with `PERSISTENCE_ERROR`
- **THEN** the API responds 500 with a generic message

### Requirement: Request validation with shared contracts

The API SHALL validate request bodies with the zod schemas from `investlab-data-contracts` and respond 422 with `code` `VALIDATION_ERROR` when validation fails.

#### Scenario: Target weight out of range
- **WHEN** a create request carries `targetWeight` 150
- **THEN** the API responds 422 with `code` `VALIDATION_ERROR`

### Requirement: Quotes served through the API

The API SHALL serve quotes from a quote repository that reads the Redis cache first and falls back to Finnhub, writing fetched quotes back to the cache. The Finnhub API key SHALL never reach the browser.

#### Scenario: Browser poll
- **WHEN** the browser ticker poller requests quotes
- **THEN** it calls a web resource route, which calls the API, and the browser bundle contains no Finnhub key
