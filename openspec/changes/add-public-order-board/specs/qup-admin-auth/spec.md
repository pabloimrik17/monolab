## MODIFIED Requirements

### Requirement: Admin route protection

The middleware SHALL be applied to these routes:

- `PATCH /orders/:id/status` (update order status)
- `DELETE /orders/:id` (cancel order)
- `POST /sessions` (create session)
- `PATCH /sessions/:id/close` (close session)
- `GET /sessions?status=OPEN` (list active sessions and their codes)
- `GET /sessions/:id` (get session by id)
- `GET /sessions/:id/orders` (complete session orders)
- `POST /menu` (create menu item)
- `PATCH /menu/:id` (update menu item)
- `DELETE /menu/:id` (delete menu item)

The following routes SHALL remain open (no auth) and SHALL return only public projections:

- `GET /sessions/code/:code` (join session)
- `GET /sessions/code/:code/board` (public order board snapshot)
- `GET /sessions/code/:code/orders?guest=Y` (that guest's reduced order view)
- `GET /menu` (view menu)
- `POST /orders` (create order — guest action)
- `GET /events/sessions/:code` (sanitized SSE stream)
- `GET /events/sessions/:code/board` (payload-free board signal stream)

#### Scenario: Guest can create order without PIN

- **WHEN** a guest POSTs to `/orders` without a PIN header
- **THEN** the request is processed normally

#### Scenario: Admin route requires PIN

- **WHEN** a request PATCHes `/orders/123/status` without a PIN header
- **THEN** the response is 401

#### Scenario: Session listing requires PIN

- **WHEN** a request GETs `/sessions?status=OPEN` without a PIN header
- **THEN** the response is 401 and no session code is disclosed

#### Scenario: Complete order read requires PIN

- **WHEN** a request GETs `/sessions/:id/orders` without a PIN header
- **THEN** the response is 401

#### Scenario: Public board read needs no PIN

- **WHEN** a request GETs `/sessions/code/ABC123/board` without a PIN header for an open session
- **THEN** the response is 200

### Requirement: PIN transmission via SolidStart server functions

The system SHALL handle PIN authentication through SolidStart server functions. The admin enters their PIN once in the frontend; the server function stores it in an httpOnly cookie. Subsequent server function calls read the PIN from the cookie and forward it to the Hono API in the `X-Admin-Pin` header. The PIN SHALL never be stored in browser-accessible JavaScript (no localStorage, no sessionStorage, no non-httpOnly cookies).

Any server function that forwards the admin PIN SHALL first verify that the caller holds a valid admin session, and SHALL reject the call otherwise. Server functions are reachable by any client that can reach the web application, so this check is what prevents a PIN-forwarding server function from acting as an open proxy to a host-only endpoint.

#### Scenario: Admin login via server function

- **WHEN** the admin submits a PIN through the login UI
- **THEN** the SolidStart server function validates the PIN against the API and sets an httpOnly cookie

#### Scenario: Subsequent admin requests

- **WHEN** the admin performs an action (e.g., change order status)
- **THEN** the SolidStart server function reads the PIN from the httpOnly cookie and forwards it to Hono

#### Scenario: PIN never in client JS

- **WHEN** the browser's JavaScript context is inspected
- **THEN** the admin PIN is not accessible via `document.cookie`, localStorage, sessionStorage, or any JS variable

#### Scenario: Unauthenticated caller cannot borrow the PIN

- **WHEN** a client with no valid admin cookie invokes a PIN-forwarding server function directly
- **THEN** the server function rejects the call and sends no request carrying the PIN to the API
