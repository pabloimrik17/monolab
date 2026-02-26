## ADDED Requirements

### Requirement: EventBus port in domain

The system SHALL define an `EventBus` interface in `qup-domain` as a port with methods: `emit<T>(event: string, payload: T): void` and `on<T>(event: string, handler: (payload: T) => void): () => void` (returns unsubscribe function). The EventBus token SHALL be defined in `qup-domain/src/tokens.ts`.

#### Scenario: Emit and receive an event
- **WHEN** a handler is registered for event "order:created" and an event is emitted
- **THEN** the handler receives the payload

#### Scenario: Unsubscribe from events
- **WHEN** the unsubscribe function returned by `on()` is called
- **THEN** the handler no longer receives events

### Requirement: In-memory EventBus implementation

The system SHALL provide an `InMemoryEventBus` class in `qup-api` decorated with `@injectable()`. It SHALL use Node.js native `EventEmitter` internally. It SHALL be bound as a singleton in the API container module.

#### Scenario: Multiple listeners
- **WHEN** multiple handlers are registered for the same event
- **THEN** all handlers receive the payload when the event is emitted

#### Scenario: No listeners
- **WHEN** an event is emitted with no registered handlers
- **THEN** no error occurs

### Requirement: Domain events emitted by use cases

The system SHALL emit the following events from use cases via the EventBus:
- `order:created` — emitted by CreateOrderUseCase after successful persistence, payload: `{ order: Order, sessionId: string }`
- `order:status` — emitted by UpdateOrderStatusUseCase after successful transition, payload: `{ orderId: string, sessionId: string, status: OrderStatus, updatedAt: Date }`
- `order:cancelled` — emitted by CancelOrderUseCase after successful cancellation, payload: `{ orderId: string, sessionId: string }`
- `session:closed` — emitted by CloseSessionUseCase after successful close, payload: `{ sessionId: string }`

#### Scenario: Order creation emits event
- **WHEN** an order is successfully created
- **THEN** the `order:created` event is emitted with the order and sessionId

#### Scenario: Order status change emits event
- **WHEN** an order status is successfully updated
- **THEN** the `order:status` event is emitted with orderId, sessionId, new status, and updatedAt

#### Scenario: Order cancellation emits event
- **WHEN** an order is successfully cancelled
- **THEN** the `order:cancelled` event is emitted with the orderId and sessionId

#### Scenario: Session close emits event
- **WHEN** a session is successfully closed
- **THEN** the `session:closed` event is emitted with the sessionId

### Requirement: SSE endpoint

The system SHALL expose `GET /events/sessions/:code` as an SSE endpoint in `qup-api`. It SHALL listen to the EventBus, filter events by the session's ID (resolved from the code parameter), and stream them as Server-Sent Events. Each SSE message SHALL use the event name as the `event:` field and JSON-serialized payload as the `data:` field.

#### Scenario: Client receives order created event
- **WHEN** a client is connected to `/events/sessions/ABC123` and an order is created for that session
- **THEN** the client receives an SSE message with `event: order:created` and `data: {"order":...}`

#### Scenario: Client does not receive events from other sessions
- **WHEN** a client is connected to `/events/sessions/ABC123` and an order is created for session XYZ789
- **THEN** the client does NOT receive the event

#### Scenario: Invalid session code
- **WHEN** a client connects with a non-existent session code
- **THEN** the endpoint returns a 404 response

#### Scenario: Client disconnects
- **WHEN** the client closes the EventSource connection
- **THEN** the server unsubscribes the EventBus listeners for that client (no memory leak)

### Requirement: Client-side SSE consumption

The system SHALL consume SSE events in `qup-web` using the browser's native `EventSource` API. An `EventSourceService` class SHALL be provided (injectable via Inversify in the web container) that wraps EventSource, adds typed event listeners, and exposes a cleanup function for use with ViewModel's `addCleanup`.

#### Scenario: Subscribe to session events
- **WHEN** the EventSourceService subscribes to a session code
- **THEN** it creates an EventSource connection to `{API_URL}/events/sessions/{code}`

#### Scenario: Receive and parse event
- **WHEN** an SSE event arrives
- **THEN** the service parses the JSON data and invokes the typed callback

#### Scenario: Auto-reconnect
- **WHEN** the SSE connection drops
- **THEN** the browser's native EventSource reconnects automatically

#### Scenario: Cleanup on unmount
- **WHEN** the cleanup function is called (via ViewModel willUnmount)
- **THEN** the EventSource connection is closed
