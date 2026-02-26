## 1. Scaffold packages and apps

- [ ] 1.1 Scaffold `packages/solid-clean` — package.json (peerDep: solid-js), tsconfig (experimentalDecorators: false), tsdown.config, vitest.config, src/index.ts
- [ ] 1.2 Scaffold `packages/qup-domain` — package.json (deps: inversify, neverthrow), tsconfig (experimentalDecorators: true, emitDecoratorMetadata: true), tsdown.config, vitest.config, src/index.ts
- [ ] 1.3 Scaffold `packages/qup-shared` — package.json (dep: neverthrow for types), tsconfig, tsdown.config, src/index.ts
- [ ] 1.4 Scaffold `packages/qup-data` — package.json (deps: qup-domain via workspace:*, drizzle-orm, pg), tsconfig, tsdown.config, vitest.config, src/index.ts
- [ ] 1.5 Scaffold `apps/qup-api` — package.json (deps: qup-domain, qup-data, qup-shared via workspace:*, hono, inversify), tsconfig, src/index.ts
- [ ] 1.6 Scaffold `apps/qup-web` — SolidStart project with Tailwind CSS, Solid UI, file-based routing, tsconfig (experimentalDecorators: true), deps: qup-shared via workspace:*, solid-clean via workspace:*, inversify
- [ ] 1.7 Run `pnpm install` and verify all workspace links resolve
- [ ] 1.8 Verify `nx run-many --target=build` succeeds for all new projects (may need nx project.json or package.json targets)

## 2. solid-clean package

- [ ] 2.1 Implement `BaseViewModel` abstract class — cleanups array, addCleanup(), didMount(owner?), willUnmount()
- [ ] 2.2 Write unit tests for BaseViewModel — cleanup add/execute/reset behavior
- [ ] 2.3 Implement `useViewModel` hook — factory call, getOwner(), onMount→didMount, onCleanup→willUnmount
- [ ] 2.4 Write integration tests for useViewModel with Solid testing environment
- [ ] 2.5 Export BaseViewModel and useViewModel from index.ts
- [ ] 2.6 Verify build: `nx run @m0n0lab/solid-clean:build` and validate exports with `attw --pack`

## 3. qup-domain — value objects and entities

- [ ] 3.1 Implement `DomainError` base class and all error types: SessionNotFoundError, SessionClosedError, SessionAlreadyClosedError, OrderNotFoundError, OrderNotCancellableError, InvalidTransitionError, EmptyOrderError, MenuItemNotFoundError, MenuItemNotAvailableError, ValidationError, InvalidCodeError
- [ ] 3.2 Implement `SessionStatus` value object (OPEN, CLOSED)
- [ ] 3.3 Implement `OrderStatus` value object with state machine (PENDING→PREPARING→DONE, PENDING→CANCELLED)
- [ ] 3.4 Write tests for OrderStatus transitions — valid and invalid
- [ ] 3.5 Implement `Category` value object (COFFEE, TEA, INFUSION, JUICE, OTHER)
- [ ] 3.6 Implement `SessionCode` value object — generate(), from(), validation
- [ ] 3.7 Write tests for SessionCode — generate format, from valid/invalid
- [ ] 3.8 Implement `OrderItem` value object — menuItemId, menuItemName, quantity (>0), customization
- [ ] 3.9 Implement `Session` entity — create(), close(), isOpen(), state transitions returning Result
- [ ] 3.10 Write tests for Session — create valid/invalid, close open/already-closed
- [ ] 3.11 Implement `Order` entity — create(), markPreparing(), markDone(), cancel(), all returning Result
- [ ] 3.12 Write tests for Order — create valid/empty items, all status transitions, cancel from each state
- [ ] 3.13 Implement `MenuItem` entity — create(), toggleAvailability()
- [ ] 3.14 Write tests for MenuItem — create valid/invalid, toggle

## 4. qup-domain — repository interfaces, tokens, and use cases

- [ ] 4.1 Define tokens in `src/tokens.ts` — Symbols for all repositories, use cases, EventBus
- [ ] 4.2 Define `SessionRepository` interface with ResultAsync methods
- [ ] 4.3 Define `OrderRepository` interface with ResultAsync methods
- [ ] 4.4 Define `MenuItemRepository` interface with ResultAsync methods
- [ ] 4.5 Define `EventBus` port interface (emit, on)
- [ ] 4.6 Implement `CreateSessionUseCase` (@injectable) — generate code, create session, persist
- [ ] 4.7 Write tests for CreateSessionUseCase with mock repos
- [ ] 4.8 Implement `CloseSessionUseCase` (@injectable) — find, close, persist, emit event
- [ ] 4.9 Write tests for CloseSessionUseCase
- [ ] 4.10 Implement `GetSessionByCodeUseCase` (@injectable) — validate code, query repo
- [ ] 4.11 Write tests for GetSessionByCodeUseCase
- [ ] 4.12 Implement `CreateOrderUseCase` (@injectable) — validate session open, validate items available, create order, persist, emit event
- [ ] 4.13 Write tests for CreateOrderUseCase — all success/failure paths
- [ ] 4.14 Implement `UpdateOrderStatusUseCase` (@injectable) — find order, transition, persist, emit event
- [ ] 4.15 Write tests for UpdateOrderStatusUseCase
- [ ] 4.16 Implement `CancelOrderUseCase` (@injectable) — find order, cancel, persist, emit event
- [ ] 4.17 Write tests for CancelOrderUseCase
- [ ] 4.18 Implement `GetSessionOrdersUseCase` (@injectable)
- [ ] 4.19 Implement `GetMenuUseCase` (@injectable) — availableOnly flag
- [ ] 4.20 Implement `CreateMenuItemUseCase`, `UpdateMenuItemUseCase`, `DeleteMenuItemUseCase` (@injectable)
- [ ] 4.21 Write tests for menu use cases
- [ ] 4.22 Create `domainModule` (ContainerModule) binding all use cases
- [ ] 4.23 Export all public API from index.ts
- [ ] 4.24 Verify build: `nx run @m0n0lab/qup-domain:build`

## 5. qup-shared — DTOs and API types

- [ ] 5.1 Define `SessionDto`, `OrderDto`, `OrderItemDto`, `MenuItemDto` types
- [ ] 5.2 Define `ApiErrorDto` type (code, message, statusCode)
- [ ] 5.3 Define request types: `CreateOrderRequest`, `CreateSessionRequest`, `CreateMenuItemRequest`, `UpdateMenuItemRequest`, `UpdateOrderStatusRequest`
- [ ] 5.4 Define SSE event payload types: `OrderCreatedEvent`, `OrderStatusEvent`, `OrderCancelledEvent`, `SessionClosedEvent`
- [ ] 5.5 Export all from index.ts
- [ ] 5.6 Verify build: `nx run @m0n0lab/qup-shared:build` and validate exports with `attw --pack`

## 6. qup-data — Drizzle schema and repositories

- [ ] 6.1 Define Drizzle schema: `sessions` table
- [ ] 6.2 Define Drizzle schema: `orders` table with FK to sessions
- [ ] 6.3 Define Drizzle schema: `order_items` table with FKs to orders and menu_items
- [ ] 6.4 Define Drizzle schema: `menu_items` table
- [ ] 6.5 Configure Drizzle Kit for migrations (drizzle.config.ts)
- [ ] 6.6 Generate initial migration
- [ ] 6.7 Implement `toDomain` / `toRow` mappers for Session
- [ ] 6.8 Implement `toDomain` / `toRow` mappers for Order (including OrderItems)
- [ ] 6.9 Implement `toDomain` / `toRow` mappers for MenuItem
- [ ] 6.10 Implement `PgSessionRepository` (@injectable) implementing SessionRepository with Drizzle queries wrapped in ResultAsync
- [ ] 6.11 Implement `PgOrderRepository` (@injectable) implementing OrderRepository
- [ ] 6.12 Implement `PgMenuItemRepository` (@injectable) implementing MenuItemRepository
- [ ] 6.13 Create `dataModule` (ContainerModule) binding all repos and database connection
- [ ] 6.14 Export public API from index.ts
- [ ] 6.15 Verify build: `nx run @m0n0lab/qup-data:build`

## 7. qup-api — Hono application

- [ ] 7.1 Implement `InMemoryEventBus` (@injectable, singleton) using Node EventEmitter
- [ ] 7.2 Write tests for InMemoryEventBus
- [ ] 7.3 Implement `adminOnly` middleware — checks X-Admin-Pin header against API_ADMIN_PIN env var
- [ ] 7.4 Write tests for adminOnly middleware
- [ ] 7.5 Implement `toApiError` and `errorToHttp` mapping functions
- [ ] 7.6 Write tests for error mapping (all domain errors → correct HTTP status)
- [ ] 7.7 Implement DTO serializers: `toOrderDto`, `toSessionDto`, `toMenuItemDto`
- [ ] 7.8 Implement `createSessionRoutes(container)` — POST /sessions, GET /sessions/:code, PATCH /sessions/:id/close
- [ ] 7.9 Implement `createOrderRoutes(container)` — POST /orders, GET /orders, PATCH /orders/:id/status, DELETE /orders/:id
- [ ] 7.10 Implement `createMenuRoutes(container)` — GET /menu, POST /menu, PATCH /menu/:id, DELETE /menu/:id
- [ ] 7.11 Implement `createEventRoutes(container)` — GET /events/sessions/:code (SSE endpoint)
- [ ] 7.12 Implement `createApp(container)` — mount all routes, CORS, error middleware
- [ ] 7.13 Create `apiModule` (ContainerModule) — bind InMemoryEventBus as singleton, DB config
- [ ] 7.14 Implement `createContainer()` composition root — load domainModule, dataModule, apiModule
- [ ] 7.15 Implement entry point (index.ts) — validate API_ADMIN_PIN, create container, start server
- [ ] 7.16 Add Docker Compose file for local PostgreSQL
- [ ] 7.17 Test full API flow: create session → create order → update status → SSE events

## 8. qup-web — SolidStart frontend

- [ ] 8.1 Configure Tailwind CSS and Solid UI (Kobalte) in the SolidStart project
- [ ] 8.2 Create `webModule` (ContainerModule) binding HttpClient, ApiClient, EventSourceService
- [ ] 8.3 Create singleton container in `src/container.ts` loading webModule
- [ ] 8.4 Implement `HttpClient` service (@injectable) — base fetch wrapper
- [ ] 8.5 Implement `ApiClient` service (@injectable, depends on HttpClient) — typed methods using server functions
- [ ] 8.6 Implement `EventSourceService` (@injectable) — wraps EventSource, typed callbacks, cleanup
- [ ] 8.7 Implement server functions for data loading: getSessionByCode, getMenu, getSessionOrders
- [ ] 8.8 Implement server functions for mutations: createOrder, updateOrderStatus, cancelOrder, createSession, closeSession
- [ ] 8.9 Implement server function for admin auth: login (validate PIN, set httpOnly cookie), logout
- [ ] 8.10 Implement guest routes: `/` landing page
- [ ] 8.11 Implement guest routes: `/session/:code` — session menu view with JoinSessionViewModel
- [ ] 8.12 Implement guest routes: `/session/:code/order` — order form with CreateOrderViewModel
- [ ] 8.13 Implement guest routes: `/session/:code/status` — order status with OrderStatusViewModel + SSE
- [ ] 8.14 Implement admin routes: `/admin` — PIN login with AdminLoginViewModel
- [ ] 8.15 Implement admin routes: `/admin/dashboard` — session dashboard with DashboardViewModel
- [ ] 8.16 Implement admin routes: `/admin/session/:id` — order queue with OrderQueueViewModel + SSE
- [ ] 8.17 Implement admin routes: `/admin/menu` — menu CRUD with MenuManagementViewModel
- [ ] 8.18 Add SolidStart middleware for admin route protection (redirect to /admin if no valid cookie)
- [ ] 8.19 Test full flow: create session → guest joins → places order → admin sees and manages

## 9. Integration and verification

- [ ] 9.1 Verify `nx run-many --target=build` succeeds for all qup projects
- [ ] 9.2 Verify `nx run-many --target=test` passes for solid-clean, qup-domain, qup-api
- [ ] 9.3 End-to-end manual test: full guest + admin flow on local network
- [ ] 9.4 Verify `attw --pack` passes for solid-clean and qup-shared (publishable packages)
