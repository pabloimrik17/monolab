## ADDED Requirements

### Requirement: InvestLab HTTP API owns persistence and external quotes

The system SHALL provide `apps/investlab-api`, a Hono app that is the only InvestLab process connecting to Postgres, Redis and Finnhub. Routes SHALL resolve server use cases from an Inversify container and translate their `ResultAsync` with `result.match`. The web app SHALL reach data only through this API.

#### Scenario: Web lists the portfolio through the API
- **WHEN** the `/portfolio` loader runs
- **THEN** it calls the API's portfolio list endpoint and the web process opens no database connection

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
