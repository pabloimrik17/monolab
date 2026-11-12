## MODIFIED Requirements

### Requirement: API routes

The system SHALL expose the following REST endpoints:

**Sessions:**

- `POST /sessions` — create session (admin)
- `GET /sessions?status=OPEN` — list active sessions (admin)
- `GET /sessions/code/:code` — get session by code (guest)
- `GET /sessions/code/:code/board` — public order board snapshot (guest)
- `GET /sessions/code/:code/orders?guest=Y` — that guest's reduced order view (guest)
- `GET /sessions/:id` — get session by id (admin)
- `GET /sessions/:id/orders` — complete session orders (admin)
- `PATCH /sessions/:id/close` — close session (admin)

**Orders:**

- `POST /orders` — create order (guest)
- `PATCH /orders/:id/status` — update order status (admin)
- `DELETE /orders/:id` — cancel order (admin)

**Menu:**

- `GET /menu` — list menu items (optional `?available=true` filter)
- `POST /menu` — create menu item (admin)
- `PATCH /menu/:id` — update menu item (admin)
- `DELETE /menu/:id` — delete menu item (admin)

**Events:**

- `GET /events/sessions/:code` — sanitized session SSE stream (guest)
- `GET /events/sessions/:code/board` — payload-free board signal stream (guest)

Endpoints marked admin SHALL require the admin PIN. Endpoints marked guest SHALL NOT require it and SHALL return only public projections.

#### Scenario: Full CRUD for menu items

- **WHEN** admin creates, reads, updates, and deletes a menu item
- **THEN** each operation succeeds with the appropriate status code (201, 200, 200, 204)

#### Scenario: Active session listing requires the PIN

- **WHEN** a request to `GET /sessions?status=OPEN` carries no valid `X-Admin-Pin` header
- **THEN** the response is 401 and no session code is disclosed

#### Scenario: Complete session orders require the PIN

- **WHEN** a request to `GET /sessions/:id/orders` carries no valid `X-Admin-Pin` header
- **THEN** the response is 401

#### Scenario: Public reads need no PIN

- **WHEN** a request to `GET /sessions/code/:code/board` or `GET /sessions/code/:code/orders?guest=Y` carries no PIN header
- **THEN** the response is 200 for an open session and contains only public projection fields

## ADDED Requirements

### Requirement: Reduced public per-guest order read

The system SHALL expose `GET /sessions/code/:code/orders?guest=:name`, requiring no host PIN, returning only the orders whose guest name matches exactly, in the same reduced public projection used by the board.

The `guest` query parameter is a filter, not authentication: the system SHALL treat any caller who knows the session code and a guest name as entitled to that guest's reduced view, and SHALL NOT expose notes or customizations through it. When `guest` is absent the endpoint SHALL return 422.

#### Scenario: Guest sees only their own orders

- **WHEN** a client requests `GET /sessions/code/ABC123/orders?guest=Ana` in a session that also holds orders from Bruno
- **THEN** the response contains only Ana's orders

#### Scenario: Filtering happens on the server

- **WHEN** the response to a per-guest read is inspected
- **THEN** it contains no order belonging to another guest, and no notes or customizations for any order

#### Scenario: Missing guest parameter

- **WHEN** a client requests `GET /sessions/code/ABC123/orders` with no `guest` parameter
- **THEN** the response is 422

### Requirement: Public code-scoped error semantics

Every public endpoint keyed by session code SHALL use the existing domain-to-HTTP mapping without normalization: 422 for a malformed code, 404 for a well-formed code matching no session, and 409 for a session that is closed.

#### Scenario: Malformed code

- **WHEN** a public code-scoped endpoint receives a code that is not 6 alphanumeric uppercase characters
- **THEN** the response is 422 with code `VALIDATION_ERROR` or `INVALID_CODE`

#### Scenario: Unknown session

- **WHEN** a public code-scoped endpoint receives a well-formed code matching no session
- **THEN** the response is 404

#### Scenario: Closed session

- **WHEN** a public code-scoped endpoint receives the code of a closed session
- **THEN** the response is 409

### Requirement: Public projection serialization

The system SHALL define public-projection serializers in `qup-api`, separate from the existing complete-DTO serializers, and public endpoints SHALL use only those. A complete `OrderDto` SHALL never be returned from an endpoint that does not require the admin PIN.

Leverages the existing serializer pattern in `qup-api/src/serializers` and the shared DTO types in `@m0n0lab/qup-shared`.

#### Scenario: Public endpoint uses the public serializer

- **WHEN** any endpoint reachable without the admin PIN returns order data
- **THEN** the payload matches the public projection shape and omits notes, customizations, menu item identifiers, and the session identifier

#### Scenario: Admin endpoint keeps complete data

- **WHEN** the host reads `GET /sessions/:id/orders` with a valid PIN
- **THEN** the response contains the complete order DTOs, including notes and customizations
