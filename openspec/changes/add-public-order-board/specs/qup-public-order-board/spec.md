## Purpose

Gives guests a read-only, shared view of a session's orders — reachable with the session code alone — so anyone can see what is pending, being prepared, and recently served without asking the host or gaining access to private order detail.

## ADDED Requirements

### Requirement: Public board projection

The system SHALL define a public order board projection exposing only: session name, session code, and for each order its identifier, guest name, status, an ordered list of at most 3 product lines (name and quantity), the count of product lines not listed, and an absolute visibility deadline (`visibleUntil`, or null when the order does not expire).

The projection SHALL NOT expose order notes, item customizations, menu item identifiers, the session identifier, or any timestamp other than `visibleUntil`. The order identifier is a stable rendering key and SHALL NOT be displayed. Possession of that identifier SHALL NOT authorize any read or mutation.

Leverages the existing `@m0n0lab/qup-shared` DTO package and the `Order` aggregate's single status (ADR 0001); no entity, database, or item-level status change is introduced.

#### Scenario: Projection omits private fields

- **WHEN** a board snapshot is produced for a session whose orders carry notes and per-item customizations
- **THEN** the response body contains no notes, no customizations, no menu item identifiers, and no session identifier

#### Scenario: Order with more than three product lines

- **WHEN** an order contains 5 distinct product lines
- **THEN** the projection lists exactly 3 of them, in the order's own item order, and reports a hidden count of 2

#### Scenario: Order with three or fewer product lines

- **WHEN** an order contains 2 product lines
- **THEN** the projection lists both and reports a hidden count of 0

#### Scenario: Order identifier grants no access

- **WHEN** a client uses an order identifier taken from a board snapshot against a host-only endpoint without host credentials
- **THEN** the request is rejected with 401

### Requirement: Board snapshot endpoint

The system SHALL expose `GET /sessions/code/:code/board`, keyed by session code and requiring no host PIN, returning the public board projection for an open session.

The endpoint SHALL return 422 when the code is malformed, 404 when no session has that code, and 409 when the session is closed.

#### Scenario: Open session snapshot

- **WHEN** a client requests the board for an open session code with no PIN header
- **THEN** the response is 200 and contains the session name, the session code, and the current order summaries

#### Scenario: Malformed code

- **WHEN** a client requests the board with a code that is not 6 alphanumeric uppercase characters
- **THEN** the response is 422

#### Scenario: Unknown code

- **WHEN** a client requests the board with a well-formed code that matches no session
- **THEN** the response is 404

#### Scenario: Closed session

- **WHEN** a client requests the board for a session that has been closed
- **THEN** the response is 409

### Requirement: Server-authoritative retention window

The server SHALL decide which finished orders appear on the board. An order in `DONE` SHALL remain visible for 5 minutes after its last status change; an order in `CANCELLED` SHALL remain visible for 2 minutes after its last status change. Orders in `PENDING` or `PREPARING` SHALL have no visibility deadline.

The snapshot SHALL omit orders whose deadline has already passed and SHALL report `visibleUntil` as an absolute timestamp for every order that has one. Retention SHALL NOT delete or alter stored orders; it only governs board visibility.

#### Scenario: Recently served order is visible

- **WHEN** an order reached `DONE` 2 minutes ago
- **THEN** the snapshot includes it with a `visibleUntil` 5 minutes after its status change

#### Scenario: Expired served order is omitted

- **WHEN** an order reached `DONE` 6 minutes ago
- **THEN** the snapshot omits it

#### Scenario: Expired cancelled order is omitted

- **WHEN** an order was cancelled 3 minutes ago
- **THEN** the snapshot omits it

#### Scenario: Active orders never expire

- **WHEN** an order is `PENDING` or `PREPARING`
- **THEN** the snapshot includes it with a null `visibleUntil` regardless of age

#### Scenario: Expiry does not delete data

- **WHEN** an order has dropped off the board because its deadline passed
- **THEN** the host's complete session order read still returns that order

#### Scenario: Client removes an expired card

- **WHEN** the board is open and an order's `visibleUntil` passes with no intervening server signal
- **THEN** the board removes that card without a page reload

### Requirement: Board live-update signals

The system SHALL expose `GET /events/sessions/:code/board` as a payload-free signal stream, requiring no host PIN, emitting `board:changed` whenever any order in that session is created, changes status, or is cancelled, and `session:closed` when the session closes.

Signal messages SHALL carry no order data. Clients SHALL treat a signal only as an instruction to refetch the snapshot.

#### Scenario: Order creation signals the board

- **WHEN** a guest places an order in a session with a connected board
- **THEN** the board receives a `board:changed` signal carrying no order payload

#### Scenario: Status change signals the board

- **WHEN** the host advances an order to `PREPARING`
- **THEN** the board receives a `board:changed` signal and the refetched snapshot shows the new status

#### Scenario: Signals are session-scoped

- **WHEN** an order changes in a different session
- **THEN** a board connected to this session receives no signal

#### Scenario: Stream rejects a closed session

- **WHEN** a client opens the board stream for a closed session
- **THEN** the response is 409

### Requirement: Refetch coalescing

The board SHALL keep at most one snapshot request in flight. Signals arriving while a request is in flight SHALL collapse into at most one trailing refetch. Responses that arrive out of order SHALL be discarded in favour of the newest completed request.

#### Scenario: Burst of signals

- **WHEN** 10 `board:changed` signals arrive while one snapshot request is in flight
- **THEN** exactly one additional snapshot request is issued after that request settles

#### Scenario: Stale response ignored

- **WHEN** an earlier snapshot request resolves after a later one has already been applied
- **THEN** the earlier response is discarded and the displayed board is unchanged

### Requirement: Board route and access

The system SHALL serve the board at `/session/:code/board`, openable with only the session code and no host PIN, and SHALL link to it from `/session/:code`.

#### Scenario: Guest opens the board

- **WHEN** a guest with no admin cookie navigates to `/session/ABC123/board` for an open session
- **THEN** the board renders

#### Scenario: Link from the session page

- **WHEN** a guest is on `/session/ABC123`
- **THEN** a `View board` link to `/session/ABC123/board` is present

### Requirement: Board layout

The board SHALL present three sections — `Pending`, `Preparing`, and `Recently served` — as columns on wide screens and as the same sections stacked vertically on narrow screens. All three sections SHALL always be rendered, including when empty, so the layout does not shift.

`Pending` and `Preparing` SHALL sort oldest first. `Recently served` SHALL sort newest first. Each order SHALL occupy its own card; multiple orders from the same guest SHALL NOT be merged. Overflow SHALL be handled by normal vertical scrolling.

#### Scenario: Wide screen

- **WHEN** the board is displayed on a wide screen
- **THEN** the three sections appear side by side as columns

#### Scenario: Narrow screen

- **WHEN** the board is displayed on a narrow screen
- **THEN** the same three sections appear stacked vertically

#### Scenario: Empty section retained

- **WHEN** no order is currently `PREPARING`
- **THEN** the `Preparing` section is still rendered, empty

#### Scenario: Sort order

- **WHEN** `Pending` holds three orders and `Recently served` holds three orders
- **THEN** `Pending` lists the oldest first and `Recently served` lists the most recently served first

#### Scenario: Two orders from one guest

- **WHEN** the same guest name has two open orders
- **THEN** two separate cards are shown

### Requirement: Cancelled order strip

Cancelled orders SHALL appear in a visually distinct red strip below the three main sections for as long as they remain visible, and SHALL NOT appear in any of the three main sections.

#### Scenario: Cancelled order placement

- **WHEN** an order is cancelled
- **THEN** it appears in the red strip below the main sections and in none of the three columns

#### Scenario: Strip empties

- **WHEN** no cancelled order is within its visibility window
- **THEN** the strip shows no cards

### Requirement: Board header

The board header SHALL show the session name and session code. On wide screens it SHALL additionally show a QR code that resolves to `/session/:code`. The QR code SHALL be hidden on narrow screens.

#### Scenario: Header contents

- **WHEN** the board loads for an open session
- **THEN** the header shows the session name and the session code

#### Scenario: QR on wide screens

- **WHEN** the board is displayed on a wide screen
- **THEN** a QR code encoding the session join URL is shown

#### Scenario: QR hidden on narrow screens

- **WHEN** the board is displayed on a narrow screen
- **THEN** no QR code is shown

### Requirement: Shared-display behavior

The board SHALL request a screen wake lock when the browser supports it and SHALL continue to function normally, without any visible error, when it does not.

The board SHALL offer a discreet `Enter fullscreen` control and SHALL hide that control while fullscreen is active.

The board SHALL use brief transitions when a card moves between sections and SHALL briefly highlight a newly arrived order. When the viewer's system requests reduced motion, these transitions and highlights SHALL be suppressed. The board SHALL emit no sound.

#### Scenario: Wake lock supported

- **WHEN** the board opens in a browser that supports the screen wake lock API
- **THEN** a wake lock is requested

#### Scenario: Wake lock unsupported

- **WHEN** the board opens in a browser without wake lock support
- **THEN** the board renders normally and shows no error

#### Scenario: Fullscreen control

- **WHEN** the viewer activates `Enter fullscreen`
- **THEN** the board enters fullscreen and the control is hidden

#### Scenario: Reduced motion

- **WHEN** the viewer's system requests reduced motion
- **THEN** card transitions and new-order highlighting are suppressed

#### Scenario: No sound

- **WHEN** an order reaches `DONE`
- **THEN** no sound is played

### Requirement: Board states

The board SHALL distinguish these states:

- Malformed code: `Session not found`
- Unknown session: `Session not found`
- Closed session on load: `Session ended`, with no orders shown
- Open session with no visible orders: `No orders yet`, with all three sections still rendered
- Connection lost: the last known board is retained and `Reconnecting…` is shown
- Session closed while the board is open: the current cards freeze, updates and reconnection stop, and `Session ended` is shown

#### Scenario: Malformed code

- **WHEN** the board is opened with a malformed session code
- **THEN** `Session not found` is shown

#### Scenario: Unknown session

- **WHEN** the board is opened with a well-formed code matching no session
- **THEN** `Session not found` is shown

#### Scenario: Reload after closure

- **WHEN** the board is reloaded after the session was closed
- **THEN** only `Session ended` is shown and no orders are rendered

#### Scenario: Open and empty

- **WHEN** the board is opened for an open session with no visible orders
- **THEN** `No orders yet` is shown and all three sections are still rendered

#### Scenario: Connection lost

- **WHEN** the signal stream drops while the board is open
- **THEN** the last known orders remain on screen and `Reconnecting…` is shown

#### Scenario: Closure while open

- **WHEN** the host closes the session while the board is open
- **THEN** the displayed cards freeze, `Session ended` is shown, and the board stops refetching and stops attempting to reconnect

### Requirement: Board visual direction

The board SHALL use the application's existing light visual style with larger text and stronger contrast than the guest screens, so it remains readable from across a room. Board text SHALL be in English, matching the rest of the application.

#### Scenario: Readable at distance

- **WHEN** the board renders
- **THEN** order text uses a larger type scale than the guest status screen while keeping the existing light palette

#### Scenario: English copy

- **WHEN** any board state or label is shown
- **THEN** its text is in English
