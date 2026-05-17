## ADDED Requirements

### Requirement: Hono application setup

The system SHALL create a Hono application in `apps/qup-api` that serves on a configurable port (default 3001). The app SHALL be structured via a `createApp(container: Container): Hono` factory function that mounts all route groups and middleware.

#### Scenario: API starts and serves
- **WHEN** the API entry point is executed
- **THEN** a Hono server starts on the configured port and responds to requests

### Requirement: Route factories with Inversify container

Each route group SHALL be created via a factory function that receives the Inversify container: `createOrderRoutes(container)`, `createSessionRoutes(container)`, `createMenuRoutes(container)`, `createEventRoutes(container)`. Handlers SHALL resolve use cases from the container per-request.

#### Scenario: Route handler resolves use case
- **WHEN** a POST request hits `/orders`
- **THEN** the handler resolves `CreateOrderUseCase` from the container and delegates execution

### Requirement: Composition root

The system SHALL provide a `createContainer()` function in `qup-api/src/container.ts` that creates an Inversify Container and loads modules: `domainModule` (from `qup-domain`), `dataModule` (from `qup-data`), `apiModule` (API-specific services like InMemoryEventBus).

#### Scenario: Container resolves all dependencies
- **WHEN** `createContainer()` is called and a use case is resolved
- **THEN** all transitive dependencies (repositories, event bus) are correctly injected

### Requirement: neverthrow Result to HTTP response mapping

The system SHALL provide a `toApiError(error: DomainError): ApiErrorDto` function and an `errorToHttp(error: DomainError): number` function that maps domain errors to HTTP status codes. Every route handler SHALL use `result.match()` to produce the response — never throw.

Mapping:
- `SessionNotFoundError` → 404
- `OrderNotFoundError` → 404
- `MenuItemNotFoundError` → 404
- `SessionClosedError` → 409
- `OrderNotCancellableError` → 409
- `InvalidTransitionError` → 409
- `EmptyOrderError` → 422
- `MenuItemNotAvailableError` → 422
- `ValidationError` → 422
- `InvalidCodeError` → 422
- `PersistenceError` → 500

#### Scenario: Domain error maps to correct HTTP status
- **WHEN** a use case returns `Err<SessionNotFoundError>`
- **THEN** the API responds with 404 and a JSON body containing `{ code: "SESSION_NOT_FOUND", message: "..." }`

#### Scenario: Successful result maps to success response
- **WHEN** a use case returns `Ok<Order>`
- **THEN** the API responds with the appropriate 2xx status and the DTO-serialized body

### Requirement: CORS middleware

The system SHALL configure CORS to allow requests from the SolidStart frontend origin. The response SHALL include `Access-Control-Allow-Origin` with the frontend origin. Native `EventSource` (SSE) does not send custom headers and does not trigger preflight — no `Access-Control-Allow-Headers` is needed for SSE endpoints.

#### Scenario: Cross-origin request from SolidStart
- **WHEN** the SolidStart frontend makes a request to the API from a different port
- **THEN** the response includes appropriate CORS headers

### Requirement: API routes

The system SHALL expose the following REST endpoints:

**Sessions:**
- `POST /sessions` — create session (admin)
- `GET /sessions/:code` — get session by code (guest)
- `PATCH /sessions/:id/close` — close session (admin)

**Orders:**
- `POST /orders` — create order (guest)
- `GET /orders?sessionId=X&guest=Y` — list orders with optional filters
- `PATCH /orders/:id/status` — update order status (admin)
- `DELETE /orders/:id` — cancel order (admin)

**Menu:**
- `GET /menu` — list menu items (optional `?available=true` filter)
- `POST /menu` — create menu item (admin)
- `PATCH /menu/:id` — update menu item (admin)
- `DELETE /menu/:id` — delete menu item (admin)

**Events:**
- `GET /events/sessions/:code` — SSE stream

#### Scenario: Full CRUD for menu items
- **WHEN** admin creates, reads, updates, and deletes a menu item
- **THEN** each operation succeeds with the appropriate status code (201, 200, 200, 204)

### Requirement: ContainerModule for API-specific bindings

The system SHALL provide an `apiModule` as an Inversify `ContainerModule` that binds API-layer services: `InMemoryEventBus` → `TOKENS.EventBus` (singleton) and other API-specific services. Database connection config SHALL be owned by `dataModule` (`qup-data`). The composition root (`container.ts`) SHALL read connection config from environment variables and pass it to `dataModule`.

#### Scenario: EventBus is singleton
- **WHEN** the EventBus is resolved multiple times from the container
- **THEN** the same instance is returned each time

### Requirement: DTO serialization

The system SHALL define DTO-serialization functions (`toOrderDto`, `toSessionDto`, `toMenuItemDto`) in `qup-api` that convert domain entities to the shared DTO types from `qup-shared`. API responses SHALL always use DTOs, never expose domain entities directly.

#### Scenario: Order entity serialized to DTO
- **WHEN** an Order entity is serialized via `toOrderDto`
- **THEN** the result matches the `OrderDto` type from `qup-shared` with camelCase properties and ISO date strings
