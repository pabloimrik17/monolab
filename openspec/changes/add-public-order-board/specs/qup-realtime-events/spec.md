## MODIFIED Requirements

### Requirement: SSE endpoint

The system SHALL expose `GET /events/sessions/:code` as an SSE endpoint in `qup-api`. It SHALL listen to the EventBus, filter events by the session's ID (resolved from the code parameter), and stream them as Server-Sent Events. Each SSE message SHALL use the event name as the `event:` field and JSON-serialized payload as the `data:` field.

Because this endpoint requires no host PIN, its messages SHALL carry only sanitized data. `order:created` SHALL NOT carry an order object; it SHALL carry no order detail beyond the fact that an order was created. No message on this stream SHALL contain order notes, item customizations, guest-identifying detail beyond what the public projection already exposes, or complete order DTOs.

#### Scenario: Client receives order created event

- **WHEN** a client is connected to `/events/sessions/ABC123` and an order is created for that session
- **THEN** the client receives an SSE message with `event: order:created` whose data contains no order object

#### Scenario: Client does not receive events from other sessions

- **WHEN** a client is connected to `/events/sessions/ABC123` and an order is created for session XYZ789
- **THEN** the client does NOT receive the event

#### Scenario: Invalid session code

- **WHEN** a client connects with a non-existent session code
- **THEN** the endpoint returns a 404 response

#### Scenario: Client disconnects

- **WHEN** the client closes the EventSource connection
- **THEN** the server unsubscribes the EventBus listeners for that client (no memory leak)

#### Scenario: Stream carries no private data

- **WHEN** every message emitted on the public session stream is inspected during a full order lifecycle
- **THEN** none contains notes, customizations, or a complete order DTO

### Requirement: Client-side SSE consumption

The system SHALL consume SSE events in `qup-web` using the browser's native `EventSource` API. An `EventSourceService` class SHALL be provided (injectable via Inversify in the web container) that wraps EventSource, adds typed event listeners, and exposes a cleanup function for use with ViewModel's `addCleanup`.

Because public streams are sanitized, clients SHALL treat every message as an invalidation signal and obtain data by refetching an authoritative snapshot. Clients SHALL NOT patch displayed state from an event payload.

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

#### Scenario: Events drive refetches, not patches

- **WHEN** a client receives any message on a public stream
- **THEN** it refetches the relevant snapshot rather than applying the message payload to displayed state

## ADDED Requirements

### Requirement: Board signal stream

The system SHALL expose `GET /events/sessions/:code/board` as an SSE stream requiring no host PIN, emitting only two payload-free event names: `board:changed` when any order in that session is created, changes status, or is cancelled, and `session:closed` when the session closes.

The stream SHALL resolve the session by code, SHALL reject a malformed code with 422, an unknown code with 404, and a closed session with 409, and SHALL release its EventBus subscriptions when the client disconnects.

#### Scenario: Order lifecycle emits board signals

- **WHEN** an order is created, then advanced to `PREPARING`, then advanced to `DONE`
- **THEN** a connected board client receives three `board:changed` messages, none of them carrying order data

#### Scenario: Cancellation emits a board signal

- **WHEN** the host cancels an order
- **THEN** a connected board client receives `board:changed`

#### Scenario: Closure signal

- **WHEN** the host closes the session
- **THEN** a connected board client receives `session:closed`

#### Scenario: Subscriptions released

- **WHEN** a board client disconnects
- **THEN** the server unsubscribes its EventBus listeners

### Requirement: Single-instance live-update constraint

Live event delivery SHALL be supported only for a deployment running exactly one API process. The system SHALL keep its in-memory EventBus and SHALL NOT introduce shared pub/sub or a polling fallback. Snapshot reads remain authoritative; only live invalidation depends on this constraint.

#### Scenario: Single process delivery

- **WHEN** the API runs as a single process and an order changes
- **THEN** every connected client for that session receives the corresponding signal

#### Scenario: Multi-replica unsupported

- **WHEN** the API is deployed as more than one replica
- **THEN** live event delivery is documented as unsupported, and correctness of displayed data still depends only on snapshot reads
