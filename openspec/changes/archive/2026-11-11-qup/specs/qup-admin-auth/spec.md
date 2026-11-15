## ADDED Requirements

### Requirement: PIN configuration via environment variable

The system SHALL read the admin PIN from `API_ADMIN_PIN` environment variable. The API SHALL fail to start if `API_ADMIN_PIN` is not set or is empty.

#### Scenario: API starts with valid PIN
- **WHEN** the API starts with `API_ADMIN_PIN=1234` in the environment
- **THEN** the server starts normally

#### Scenario: API fails without PIN
- **WHEN** the API starts without `API_ADMIN_PIN` set
- **THEN** the server exits with an error message indicating the missing variable

### Requirement: Admin middleware for Hono

The system SHALL provide an `adminOnly` Hono middleware in `qup-api` that checks for a valid PIN in the `X-Admin-Pin` request header. If the PIN matches `API_ADMIN_PIN`, the request proceeds. If not, the middleware SHALL return 401 with `{ code: "UNAUTHORIZED", message: "Invalid admin PIN" }`.

#### Scenario: Valid PIN header
- **WHEN** a request includes `X-Admin-Pin: 1234` and the env PIN is `1234`
- **THEN** the request proceeds to the handler

#### Scenario: Missing PIN header
- **WHEN** a request to an admin route has no `X-Admin-Pin` header
- **THEN** the response is 401 with code "UNAUTHORIZED"

#### Scenario: Wrong PIN
- **WHEN** a request includes an incorrect PIN
- **THEN** the response is 401 with code "UNAUTHORIZED"

### Requirement: Admin route protection

The middleware SHALL be applied to these routes:
- `PATCH /orders/:id/status` (update order status)
- `DELETE /orders/:id` (cancel order)
- `POST /sessions` (create session)
- `PATCH /sessions/:id/close` (close session)
- `POST /menu` (create menu item)
- `PATCH /menu/:id` (update menu item)
- `DELETE /menu/:id` (delete menu item)

The following routes SHALL remain open (no auth):
- `GET /sessions/:code` (join session)
- `GET /menu` (view menu)
- `POST /orders` (create order — guest action)
- `GET /orders` (view orders — filtered by guest)
- `GET /events/sessions/:code` (SSE stream)

#### Scenario: Guest can create order without PIN
- **WHEN** a guest POSTs to `/orders` without a PIN header
- **THEN** the request is processed normally

#### Scenario: Admin route requires PIN
- **WHEN** a request PATCHes `/orders/123/status` without a PIN header
- **THEN** the response is 401

### Requirement: PIN transmission via SolidStart server functions

The system SHALL handle PIN authentication through SolidStart server functions. The admin enters their PIN once in the frontend; the server function stores it in an httpOnly cookie. Subsequent server function calls read the PIN from the cookie and forward it to the Hono API in the `X-Admin-Pin` header. The PIN SHALL never be stored in browser-accessible JavaScript (no localStorage, no sessionStorage, no non-httpOnly cookies).

#### Scenario: Admin login via server function
- **WHEN** the admin submits a PIN through the login UI
- **THEN** the SolidStart server function validates the PIN against the API and sets an httpOnly cookie

#### Scenario: Subsequent admin requests
- **WHEN** the admin performs an action (e.g., change order status)
- **THEN** the SolidStart server function reads the PIN from the httpOnly cookie and forwards it to Hono

#### Scenario: PIN never in client JS
- **WHEN** the browser's JavaScript context is inspected
- **THEN** the admin PIN is not accessible via `document.cookie`, localStorage, sessionStorage, or any JS variable
