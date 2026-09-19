## MODIFIED Requirements

### Requirement: Guest flow routes

The system SHALL provide these guest-facing routes:

- `/` — landing page (SSR)
- `/session/:code` — session menu view (SSR + hydration). Displays the menu for the session, guest enters their name, and links to the public order board.
- `/session/:code/order` — order creation (CSR). Guest selects items, customizations, submits.
- `/session/:code/status` — order status (CSR + live updates). Guest sees their own orders and status updates.
- `/session/:code/board` — public order board (CSR + live updates). Anyone with the session code sees every order's status.

Guest routes SHALL obtain order data only through public projections; no guest route SHALL receive complete order DTOs.

#### Scenario: Guest joins session

- **WHEN** a guest navigates to `/session/ABC123`
- **THEN** the session menu is displayed with available items, rendered via SSR

#### Scenario: Guest places order

- **WHEN** a guest selects items and submits from `/session/ABC123/order`
- **THEN** the order is created via server function and guest is redirected to status page

#### Scenario: Guest sees real-time status

- **WHEN** a guest is on `/session/ABC123/status` and the host marks their order as PREPARING
- **THEN** the status updates in real-time without page reload

#### Scenario: Guest reaches the board

- **WHEN** a guest on `/session/ABC123` activates the `View board` link
- **THEN** `/session/ABC123/board` opens without requiring a host PIN

#### Scenario: Guest route receives no private data

- **WHEN** the payload delivered to any guest route is inspected
- **THEN** it contains no notes and no item customizations belonging to other guests

### Requirement: Server functions as BFF

The system SHALL use SolidStart `"use server"` functions for data loading and mutations. Server functions SHALL call the Hono API internally and handle auth (PIN from httpOnly cookie). The browser SHALL never call the Hono API directly except for SSE connections.

A server function whose caller must tell one API outcome from another SHALL return a plain serializable discriminated union naming each outcome. A server function whose caller only needs success or failure MAY throw instead. A return value crosses the SolidStart server-function serialization boundary, so a class-based result type does not survive the trip and SHALL NOT be used for this.

Server functions SHALL be split by trust level. A public server function SHALL call only endpoints that need no admin PIN. A host server function SHALL verify the caller's admin session before attaching the PIN, so that a server function is never an unauthenticated proxy to a host-only endpoint.

#### Scenario: Data loading via server function

- **WHEN** a page needs to load session orders
- **THEN** a server function fetches from the Hono API and returns the data

#### Scenario: Mutation via server function

- **WHEN** the admin changes an order status
- **THEN** a server function sends the PATCH to Hono with the PIN from the cookie

#### Scenario: Server function distinguishes API outcomes

- **WHEN** the Hono API answers a board snapshot request with 404 for an unknown code and 409 for a closed session
- **THEN** the server function returns a discriminated union naming each outcome separately, rather than collapsing both into one failure

#### Scenario: Host server function rejects an unauthenticated caller

- **WHEN** a caller without a valid admin cookie invokes a server function that reads complete session orders or lists active sessions
- **THEN** the call is rejected and no admin PIN is sent to the API

#### Scenario: Public server function needs no admin session

- **WHEN** a caller without an admin cookie invokes the board snapshot server function for an open session
- **THEN** the call succeeds and returns the public projection

### Requirement: Admin flow routes

The system SHALL provide these admin-facing routes:

- `/admin` — admin login (SSR). PIN entry form.
- `/admin/dashboard` — active session dashboard (SSR + hydration). Shows current session and order queue.
- `/admin/session/:id` — session order management (CSR + live updates). Order queue with status controls.
- `/admin/menu` — menu management (SSR + hydration). CRUD for menu items.

Admin views SHALL keep their complete order data and status controls. Because the public streams are sanitized, admin views SHALL refresh by refetching the protected snapshot through an authenticated server function on each invalidation signal, rather than by reading order payloads off the stream.

#### Scenario: Admin enters PIN

- **WHEN** the admin enters a valid PIN on `/admin`
- **THEN** a server function validates it and sets an httpOnly cookie, redirecting to dashboard

#### Scenario: Admin manages order queue

- **WHEN** the admin views `/admin/session/:id`
- **THEN** orders are displayed with complete detail, grouped by status, with buttons to advance status or cancel

#### Scenario: Admin manages menu

- **WHEN** the admin visits `/admin/menu`
- **THEN** all menu items are listed with options to create, edit, delete, and toggle availability

#### Scenario: Admin queue refreshes on signal

- **WHEN** a guest places an order while the admin is on `/admin/session/:id`
- **THEN** the queue refetches the protected snapshot and shows the new order with its notes and customizations

#### Scenario: Admin dashboard still lists sessions

- **WHEN** an authenticated admin opens `/admin/dashboard`
- **THEN** active sessions and their codes are listed, fetched through an authenticated server function

## ADDED Requirements

### Requirement: Board view model

The board route SHALL follow the existing MVVM pattern: an `@injectable()` ViewModel extending `BaseViewModel` from `@m0n0lab/solid-clean`, resolved through the web Inversify container, with the route component as a pure render function.

The ViewModel SHALL own snapshot loading, refetch coalescing, expiry timers that drop cards whose `visibleUntil` has passed, connection state, closure freeze, wake lock acquisition and release, and fullscreen state. It SHALL release its stream subscription, timers, and wake lock on unmount.

#### Scenario: ViewModel owns board state

- **WHEN** the board route renders
- **THEN** it resolves the board ViewModel via the container and renders only from that ViewModel's signals

#### Scenario: Cleanup on unmount

- **WHEN** the viewer navigates away from the board
- **THEN** the signal stream is closed, expiry timers are cleared, and any wake lock is released

#### Scenario: Frozen after closure

- **WHEN** the ViewModel has received `session:closed`
- **THEN** it performs no further refetch and does not reopen the stream
