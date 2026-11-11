## 1. Scaffold packages and apps

- [x] 1.1 Scaffold `packages/solid-clean` — package.json (peerDep: solid-js), tsconfig (experimentalDecorators: false), tsdown.config, vitest.config, src/index.ts
- [x] 1.2 Scaffold `packages/qup-domain` — package.json (deps: inversify, neverthrow), tsconfig (experimentalDecorators: true, emitDecoratorMetadata: true), tsdown.config, vitest.config, src/index.ts
- [x] 1.3 Scaffold `packages/qup-shared` — package.json (dep: neverthrow for types), tsconfig, tsdown.config, src/index.ts
- [x] 1.4 Scaffold `packages/qup-data` — package.json (deps: qup-domain via workspace:*, drizzle-orm, pg), tsconfig, tsdown.config, vitest.config, src/index.ts
- [x] 1.5 Scaffold `apps/qup-api` — package.json (deps: qup-domain, qup-data, qup-shared via workspace:*, hono, inversify), tsconfig, src/index.ts
- [x] 1.6 Scaffold `apps/qup-web` — SolidStart project with Tailwind CSS, Solid UI, file-based routing, tsconfig (experimentalDecorators: true), deps: qup-shared via workspace:*, solid-clean via workspace:*, inversify
- [x] 1.7 Run `pnpm install` and verify all workspace links resolve
- [x] 1.8 Verify `nx run-many --target=build` succeeds for all new projects (may need nx project.json or package.json targets)

## 2. solid-clean package

- [x] 2.1 Implement `BaseViewModel` abstract class — cleanups array, addCleanup(), didMount(owner?), willUnmount()
- [x] 2.2 Write unit tests for BaseViewModel — cleanup add/execute/reset behavior
- [x] 2.3 Implement `useViewModel` hook — factory call, getOwner(), onMount→didMount, onCleanup→willUnmount
- [x] 2.4 Write integration tests for useViewModel with Solid testing environment
- [x] 2.5 Export BaseViewModel and useViewModel from index.ts
- [x] 2.6 Verify build: `nx run @m0n0lab/solid-clean:build` and validate exports with `attw --pack`

## 3. qup-domain — value objects and entities

- [x] 3.1 Implement `DomainError` base class and all error types: SessionNotFoundError, SessionClosedError, SessionAlreadyClosedError, OrderNotFoundError, OrderNotCancellableError, InvalidTransitionError, EmptyOrderError, MenuItemNotFoundError, MenuItemNotAvailableError, ValidationError, InvalidCodeError
- [x] 3.2 Implement `SessionStatus` value object (OPEN, CLOSED)
- [x] 3.3 Implement `OrderStatus` value object with state machine (PENDING→PREPARING→DONE, PENDING→CANCELLED)
- [x] 3.4 Write tests for OrderStatus transitions — valid and invalid
- [x] 3.5 Implement `Category` value object (COFFEE, TEA, INFUSION, JUICE, OTHER)
- [x] 3.6 Implement `SessionCode` value object — generate(), from(), validation
- [x] 3.7 Write tests for SessionCode — generate format, from valid/invalid
- [x] 3.8 Implement `OrderItem` value object — menuItemId, menuItemName, quantity (>0), customization
- [x] 3.9 Implement `Session` entity — create(), close(), isOpen(), state transitions returning Result
- [x] 3.10 Write tests for Session — create valid/invalid, close open/already-closed
- [x] 3.11 Implement `Order` entity — create(), markPreparing(), markDone(), cancel(), all returning Result
- [x] 3.12 Write tests for Order — create valid/empty items, all status transitions, cancel from each state
- [x] 3.13 Implement `MenuItem` entity — create(), toggleAvailability()
- [x] 3.14 Write tests for MenuItem — create valid/invalid, toggle

## 4. qup-domain — repository interfaces, tokens, and use cases

- [x] 4.1 Define tokens in `src/tokens.ts` — Symbols for all repositories, use cases, EventBus
- [x] 4.2 Define `SessionRepository` interface with ResultAsync methods
- [x] 4.3 Define `OrderRepository` interface with ResultAsync methods
- [x] 4.4 Define `MenuItemRepository` interface with ResultAsync methods
- [x] 4.5 Define `EventBus` port interface (emit, on)
- [x] 4.6 Implement `CreateSessionUseCase` (@injectable) — generate code, create session, persist
- [x] 4.7 Write tests for CreateSessionUseCase with mock repos
- [x] 4.8 Implement `CloseSessionUseCase` (@injectable) — find, close, persist, emit event
- [x] 4.9 Write tests for CloseSessionUseCase
- [x] 4.10 Implement `GetSessionByCodeUseCase` (@injectable) — validate code, query repo
- [x] 4.11 Write tests for GetSessionByCodeUseCase
- [x] 4.12 Implement `CreateOrderUseCase` (@injectable) — validate session open, validate items available, create order, persist, emit event
- [x] 4.13 Write tests for CreateOrderUseCase — all success/failure paths
- [x] 4.14 Implement `UpdateOrderStatusUseCase` (@injectable) — find order, transition, persist, emit event
- [x] 4.15 Write tests for UpdateOrderStatusUseCase
- [x] 4.16 Implement `CancelOrderUseCase` (@injectable) — find order, cancel, persist, emit event
- [x] 4.17 Write tests for CancelOrderUseCase
- [x] 4.18 Implement `GetSessionOrdersUseCase` (@injectable)
- [x] 4.19 Implement `GetMenuUseCase` (@injectable) — availableOnly flag
- [x] 4.20 Implement `CreateMenuItemUseCase`, `UpdateMenuItemUseCase`, `DeleteMenuItemUseCase` (@injectable)
- [x] 4.21 Write tests for menu use cases
- [x] 4.22 Create `domainModule` (ContainerModule) binding all use cases
- [x] 4.23 Export all public API from index.ts
- [x] 4.24 Verify build: `nx run @m0n0lab/qup-domain:build`

## 5. qup-shared — DTOs and API types

- [x] 5.1 Define `SessionDto`, `OrderDto`, `OrderItemDto`, `MenuItemDto` types
- [x] 5.2 Define `ApiErrorDto` type (code, message, statusCode)
- [x] 5.3 Define request types: `CreateOrderRequest`, `CreateSessionRequest`, `CreateMenuItemRequest`, `UpdateMenuItemRequest`, `UpdateOrderStatusRequest`
- [x] 5.4 Define SSE event payload types: `OrderCreatedEvent`, `OrderStatusEvent`, `OrderCancelledEvent`, `SessionClosedEvent`
- [x] 5.5 Export all from index.ts
- [x] 5.6 Verify build: `nx run @m0n0lab/qup-shared:build` and validate exports with `attw --pack`

## 6. qup-data — Drizzle schema and repositories

- [x] 6.1 Define Drizzle schema: `sessions` table
- [x] 6.2 Define Drizzle schema: `orders` table with FK to sessions
- [x] 6.3 Define Drizzle schema: `order_items` table with FKs to orders and menu_items
- [x] 6.4 Define Drizzle schema: `menu_items` table
- [x] 6.5 Configure Drizzle Kit for migrations (drizzle.config.ts)
- [x] 6.6 Generate initial migration
- [x] 6.7 Implement `toDomain` / `toRow` mappers for Session
- [x] 6.8 Implement `toDomain` / `toRow` mappers for Order (including OrderItems)
- [x] 6.9 Implement `toDomain` / `toRow` mappers for MenuItem
- [x] 6.10 Implement `PgSessionRepository` (@injectable) implementing SessionRepository with Drizzle queries wrapped in ResultAsync
- [x] 6.11 Implement `PgOrderRepository` (@injectable) implementing OrderRepository
- [x] 6.12 Implement `PgMenuItemRepository` (@injectable) implementing MenuItemRepository
- [x] 6.13 Create `dataModule` (ContainerModule) binding all repos and database connection
- [x] 6.14 Export public API from index.ts
- [x] 6.15 Verify build: `nx run @m0n0lab/qup-data:build`

## 7. qup-api — Hono application

- [x] 7.1 Implement `InMemoryEventBus` (@injectable, singleton) using Node EventEmitter
- [x] 7.2 Write tests for InMemoryEventBus
- [x] 7.3 Implement `adminOnly` middleware — checks X-Admin-Pin header against API_ADMIN_PIN env var
- [x] 7.4 Write tests for adminOnly middleware
- [x] 7.5 Implement `toApiError` and `errorToHttp` mapping functions
- [x] 7.6 Write tests for error mapping (all domain errors → correct HTTP status)
- [x] 7.7 Implement DTO serializers: `toOrderDto`, `toSessionDto`, `toMenuItemDto`
- [x] 7.8 Implement `createSessionRoutes(container)` — POST /sessions, GET /sessions/:code, PATCH /sessions/:id/close
- [x] 7.9 Implement `createOrderRoutes(container)` — POST /orders, GET /orders, PATCH /orders/:id/status, DELETE /orders/:id
- [x] 7.10 Implement `createMenuRoutes(container)` — GET /menu, POST /menu, PATCH /menu/:id, DELETE /menu/:id
- [x] 7.11 Implement `createEventRoutes(container)` — GET /events/sessions/:code (SSE endpoint)
- [x] 7.12 Implement `createApp(container)` — mount all routes, CORS, error middleware
- [x] 7.13 Create `apiModule` (ContainerModule) — bind InMemoryEventBus as singleton, API-specific services only
- [x] 7.14 Implement `createContainer()` composition root — read DB config from env, pass to dataModule, load domainModule, dataModule, apiModule
- [x] 7.15 Implement entry point (index.ts) — validate API_ADMIN_PIN, create container, start server
- [x] 7.16 Add Docker Compose file for local PostgreSQL
- [x] 7.17 Test full API flow: create session → create order → update status → SSE events

## 8. qup-web — SolidStart frontend

- [x] 8.1 Configure Tailwind CSS and Solid UI (Kobalte) in the SolidStart project
- [x] 8.2 Create `webModule` (ContainerModule) binding HttpClient, ApiClient, EventSourceService
- [x] 8.3 Create singleton container in `src/container.ts` loading webModule
- [x] 8.4 Implement `HttpClient` service (@injectable) — base fetch wrapper
- [x] 8.5 Implement `ApiClient` service (@injectable, depends on HttpClient) — typed methods using server functions
- [x] 8.6 Implement `EventSourceService` (@injectable) — wraps EventSource, typed callbacks, cleanup
- [x] 8.7 Implement server functions for data loading: getSessionByCode, getMenu, getSessionOrders
- [x] 8.8 Implement server functions for mutations: createOrder, updateOrderStatus, cancelOrder, createSession, closeSession
- [x] 8.9 Implement server function for admin auth: login (validate PIN, set httpOnly cookie), logout
- [x] 8.10 Implement guest routes: `/` landing page
- [x] 8.11 Implement guest routes: `/session/:code` — session menu view with JoinSessionViewModel
- [x] 8.12 Implement guest routes: `/session/:code/order` — order form with CreateOrderViewModel
- [x] 8.13 Implement guest routes: `/session/:code/status` — order status with OrderStatusViewModel + SSE
- [x] 8.14 Implement admin routes: `/admin` — PIN login with AdminLoginViewModel
- [x] 8.15 Implement admin routes: `/admin/dashboard` — session dashboard with DashboardViewModel
- [x] 8.16 Implement admin routes: `/admin/session/:id` — order queue with OrderQueueViewModel + SSE
- [x] 8.17 Implement admin routes: `/admin/menu` — menu CRUD with MenuManagementViewModel
- [x] 8.18 Add SolidStart middleware for admin route protection (redirect to /admin if no valid cookie)
- [ ] 8.19 Test full flow: create session → guest joins → places order → admin sees and manages

## 9. Integration and verification

- [x] 9.1 Verify `nx run-many --target=build` succeeds for all qup projects
- [x] 9.2 Verify `nx run-many --target=test` passes for solid-clean, qup-domain, qup-api
- [ ] 9.3 End-to-end manual test: full guest + admin flow on local network
- [x] 9.4 Verify `attw --pack` passes for solid-clean and qup-shared (publishable packages)
