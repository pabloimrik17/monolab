## Purpose

Defines `@m0n0lab/investlab-platform`, the package that owns InvestLab's configuration and shared infrastructure (HTTP, the InvestLab API client, Postgres and Redis) and provides them to every module through static container modules.

## ADDED Requirements

### Requirement: Platform entries

`@m0n0lab/investlab-platform` SHALL export exactly two entries, `./server` and `./client`, and no root entry. It MAY import `@m0n0lab/investlab-core`. It SHALL NOT import any business module or `@m0n0lab/investlab-database`.

#### Scenario: No root entry

- **WHEN** code imports `@m0n0lab/investlab-platform` without a subpath
- **THEN** the import fails to resolve

#### Scenario: Kernel errors come from core

- **WHEN** a domain file needs `ValidationError`
- **THEN** it imports it from `@m0n0lab/investlab-core`, not from the platform

### Requirement: Config is the only reader of the environment

The platform SHALL define a `Config` port per side, typed from the `.env.schema` keys and grouped by concern: server `database.url`, `redis.url`, `finnhub.apiKey`, `api.port`, `api.token`; client `api.baseUrl`, `api.token`. One adapter per runtime SHALL fill it. No code other than these adapters SHALL read the environment.

#### Scenario: API configuration from the validated environment

- **WHEN** the API starts with `DATABASE_URL`, `REDIS_URL`, `FINNHUB_API_KEY`, `PORT` and `INVESTLAB_API_TOKEN` resolved by Varlock
- **THEN** the bound `Config` exposes them as `database.url`, `redis.url`, `finnhub.apiKey`, `api.port` and `api.token`

#### Scenario: Web configuration

- **WHEN** the web server starts with `INVESTLAB_API_URL` and `INVESTLAB_API_TOKEN`
- **THEN** the bound `Config` exposes them as `api.baseUrl` and `api.token`

#### Scenario: Tests supply configuration directly

- **WHEN** a test binds a constant `Config` pointing to Testcontainers or MSW URLs
- **THEN** every module uses those URLs and no environment variable is read

### Requirement: Infrastructure built from Config inside the container

The platform server module SHALL provide a Postgres client and a Redis client, each built once from the bound `Config` and connecting on first use. Unbinding the container SHALL close the Postgres pool and quit the Redis client. Only `Config` SHALL be supplied from outside the container.

#### Scenario: Building the container opens no connection

- **WHEN** the API container is built and nothing is resolved
- **THEN** no Postgres or Redis connection is open

#### Scenario: Shutdown releases connections

- **WHEN** the API receives `SIGTERM` and unbinds its container
- **THEN** the Postgres pool is ended and the Redis client has quit before the process exits

### Requirement: Generic HTTP client

The platform SHALL provide on both sides an HTTP client that sends JSON requests with a timeout and returns any HTTP status with its body. Network failures, timeouts and unparsable bodies SHALL fail with `NetworkError`. It SHALL know no endpoint, base URL or credential.

#### Scenario: Timeout

- **WHEN** a request gets no answer within the timeout
- **THEN** it fails with `NetworkError`

#### Scenario: Error status is not a transport failure

- **WHEN** a request is answered with HTTP 404 and a JSON body
- **THEN** the caller receives status 404 and the parsed body

### Requirement: InvestLab API client

The platform client side SHALL provide an API client built on the HTTP client that prefixes `api.baseUrl`, sends `Authorization: Bearer <api.token>` and turns error responses into errors from their `code`: module codes through a map the caller supplies, kernel codes (from `@m0n0lab/investlab-core`) by the platform, 401 as `UnauthorizedError`, anything unusable as `NetworkError`.

#### Scenario: Module error rebuilt from code

- **WHEN** the API answers 404 with `code` `PORTFOLIO_ITEM_NOT_FOUND` and the caller supplied the portfolio error map
- **THEN** the call fails with the portfolio item not found domain error carrying the API message

#### Scenario: Rejected token

- **WHEN** the API answers 401
- **THEN** the call fails with `UnauthorizedError`

#### Scenario: Body that breaks the contract

- **WHEN** the API answers 200 with a body that fails the caller's schema
- **THEN** the call fails with `NetworkError`

#### Scenario: Unknown error code

- **WHEN** the API answers 500 with a `code` neither the caller's map nor the kernel knows
- **THEN** the call fails with `NetworkError`
