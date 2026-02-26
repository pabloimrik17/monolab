## ADDED Requirements

### Requirement: Order entity as aggregate root

The system SHALL model Order as a DDD aggregate root in `qup-domain` with identity (UUID), sessionId, guestName, items (OrderItem[]), status (OrderStatus value object), notes (optional), timestamps (createdAt, updatedAt). Order SHALL encapsulate state transition rules. All status mutations SHALL return `Result` types.

#### Scenario: Create a valid order
- **WHEN** `Order.create()` is called with a sessionId, guestName, at least one item, and optional notes
- **THEN** it returns `Ok<Order>` with status PENDING and createdAt/updatedAt set

#### Scenario: Create order with no items
- **WHEN** `Order.create()` is called with an empty items array
- **THEN** it returns `Err<EmptyOrderError>`

#### Scenario: Create order with empty guest name
- **WHEN** `Order.create()` is called with an empty guestName
- **THEN** it returns `Err<ValidationError>`

### Requirement: OrderStatus value object with state machine

The system SHALL model OrderStatus as a value object with states: PENDING, PREPARING, DONE, CANCELLED. Only the following transitions SHALL be allowed: PENDING→PREPARING, PREPARING→DONE, PENDING→CANCELLED. Any other transition SHALL return a typed error.

#### Scenario: Valid transition PENDING to PREPARING
- **WHEN** `order.markPreparing()` is called on an order with status PENDING
- **THEN** status changes to PREPARING, updatedAt is refreshed, and `Ok<void>` is returned

#### Scenario: Valid transition PREPARING to DONE
- **WHEN** `order.markDone()` is called on an order with status PREPARING
- **THEN** status changes to DONE, updatedAt is refreshed, and `Ok<void>` is returned

#### Scenario: Invalid transition DONE to PREPARING
- **WHEN** `order.markPreparing()` is called on an order with status DONE
- **THEN** `Err<InvalidTransitionError>` is returned with from/to states

#### Scenario: Invalid transition CANCELLED to any
- **WHEN** any status mutation is called on an order with status CANCELLED
- **THEN** `Err<InvalidTransitionError>` is returned

### Requirement: Cancel an order

The system SHALL allow cancellation only when the order status is PENDING. Cancellation from any other status SHALL return `Err<OrderNotCancellableError>`.

#### Scenario: Cancel a pending order
- **WHEN** `order.cancel()` is called on an order with status PENDING
- **THEN** status changes to CANCELLED, updatedAt is refreshed, and `Ok<void>` is returned

#### Scenario: Cancel a non-pending order
- **WHEN** `order.cancel()` is called on an order with status PREPARING or DONE
- **THEN** `Err<OrderNotCancellableError>` is returned with the order ID and current status

### Requirement: OrderItem value object

The system SHALL model OrderItem as an immutable value object with: menuItemId (UUID), menuItemName (string, denormalized), quantity (positive integer), customization (optional string). Quantity MUST be greater than zero.

#### Scenario: Create valid order item
- **WHEN** an OrderItem is created with menuItemId, menuItemName, quantity 2, customization "oat milk"
- **THEN** a valid OrderItem value object is returned

#### Scenario: Create order item with zero quantity
- **WHEN** an OrderItem is created with quantity 0 or negative
- **THEN** a validation error is returned

### Requirement: Order repository interface

The system SHALL define an `OrderRepository` interface in `qup-domain` with all methods returning `ResultAsync`: `save(order)`, `findById(id)`, `findBySessionId(sessionId)`, `updateStatus(id, status, updatedAt)`.

#### Scenario: Find orders by session
- **WHEN** `findBySessionId()` is called with a valid session ID
- **THEN** it returns `Ok<Order[]>` with all orders for that session, ordered by createdAt ascending

#### Scenario: Database error
- **WHEN** any repository method encounters a database error
- **THEN** it returns `Err<PersistenceError>`

### Requirement: CreateOrder use case

The system SHALL provide a `CreateOrderUseCase` decorated with `@injectable()`. It SHALL: validate the session exists and is open via `SessionRepository`, validate all menu items exist and are available via `MenuItemRepository`, create the Order entity, persist it via `OrderRepository`, emit `order:created` event via EventBus, and return the result. Each failure point SHALL return a specific typed error.

#### Scenario: Successfully create an order
- **WHEN** executed with a valid session code, guest name, and available menu items
- **THEN** the order is persisted, `order:created` event is emitted, and `Ok<Order>` is returned

#### Scenario: Session not found
- **WHEN** executed with an unknown session code
- **THEN** `Err<SessionNotFoundError>` is returned

#### Scenario: Session is closed
- **WHEN** executed against a CLOSED session
- **THEN** `Err<SessionClosedError>` is returned

#### Scenario: Menu item not available
- **WHEN** one of the requested items has `available: false`
- **THEN** `Err<MenuItemNotAvailableError>` is returned

### Requirement: UpdateOrderStatus use case

The system SHALL provide an `UpdateOrderStatusUseCase` decorated with `@injectable()`. It SHALL find the order, call the appropriate status transition method on the entity, persist the update, and emit `order:status` event.

#### Scenario: Mark order as preparing
- **WHEN** executed with an order ID and target status PREPARING
- **THEN** the order transitions to PREPARING, is persisted, `order:status` event is emitted

#### Scenario: Invalid transition
- **WHEN** executed with a transition that violates the state machine
- **THEN** `Err<InvalidTransitionError>` is returned

### Requirement: CancelOrder use case

The system SHALL provide a `CancelOrderUseCase` decorated with `@injectable()`. It SHALL find the order, call `order.cancel()`, persist the update, and emit `order:cancelled` event.

#### Scenario: Cancel a pending order
- **WHEN** executed with a PENDING order's ID
- **THEN** the order is cancelled, persisted, `order:cancelled` event is emitted, and `Ok<void>` is returned

#### Scenario: Cancel a non-pending order
- **WHEN** executed with a non-PENDING order's ID
- **THEN** `Err<OrderNotCancellableError>` is returned

### Requirement: GetSessionOrders use case

The system SHALL provide a `GetSessionOrdersUseCase` that retrieves all orders for a given session ID via the repository.

#### Scenario: Retrieve orders for a session
- **WHEN** executed with a valid session ID
- **THEN** `Ok<Order[]>` is returned

### Requirement: Drizzle orders and order_items tables

The system SHALL define an `orders` table: `id` (UUID PK), `session_id` (UUID FK→sessions.id, NOT NULL), `guest_name` (VARCHAR 50, NOT NULL), `status` (VARCHAR 15, NOT NULL, default 'PENDING'), `notes` (TEXT, nullable), `created_at` (TIMESTAMP, NOT NULL, default now), `updated_at` (TIMESTAMP, NOT NULL, default now). And an `order_items` table: `id` (UUID PK), `order_id` (UUID FK→orders.id, NOT NULL), `menu_item_id` (UUID FK→menu_items.id, NOT NULL), `menu_item_name` (VARCHAR 100, NOT NULL), `quantity` (INTEGER, NOT NULL, >0), `customization` (TEXT, nullable).

#### Scenario: Tables match domain model
- **WHEN** the orders and order_items tables are inspected
- **THEN** they have the specified columns, types, constraints, and foreign keys

### Requirement: Order domain-persistence mapping

The system SHALL provide `toDomain(row, itemRows)` and `toRow(entity)` mappers in `qup-data`. `toDomain` SHALL reconstruct the Order aggregate including its OrderItem value objects. `toRow` SHALL flatten to database rows for both the orders and order_items tables.

#### Scenario: Map with order items
- **WHEN** an order row and its item rows are mapped via `toDomain`
- **THEN** an Order entity is returned with OrderItem value objects correctly hydrated
