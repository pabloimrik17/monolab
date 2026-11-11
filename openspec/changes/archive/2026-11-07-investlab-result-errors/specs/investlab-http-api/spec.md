## MODIFIED Requirements

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
