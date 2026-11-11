## ADDED Requirements

### Requirement: SolidStart application with hybrid rendering

The system SHALL create a SolidStart application in `apps/qup-web` with file-based routing, Tailwind CSS, and Solid UI components. The application SHALL use SSR for initial page loads and client-side hydration for interactivity.

#### Scenario: Application starts in dev mode
- **WHEN** the dev server is started
- **THEN** the SolidStart application serves on the configured port with hot reload

### Requirement: MVVM pattern with ViewModels

All page-level state and logic SHALL be managed by ViewModel classes (extending `BaseViewModel` from `solid-clean`). Page components SHALL be pure render functions that consume signals from ViewModels. ViewModels SHALL be decorated with `@injectable()` and resolved from the Inversify container.

#### Scenario: Page uses ViewModel
- **WHEN** a page component renders
- **THEN** it creates a ViewModel via `useViewModel(() => container.get(TOKEN))` and renders based on the VM's signals

#### Scenario: ViewModel manages state
- **WHEN** data needs to be loaded or state needs to change
- **THEN** the ViewModel handles it internally and exposes results via Solid signals

### Requirement: Inversify singleton container

The system SHALL create a singleton Inversify container in `qup-web/src/container.ts` that loads a `webModule` binding all frontend services. The container SHALL be exported directly — no Context Provider wrapper.

#### Scenario: Import container in ViewModel
- **WHEN** a ViewModel or page needs to resolve a dependency
- **THEN** it imports the container directly from the container module

### Requirement: Server functions as BFF

The system SHALL use SolidStart `"use server"` functions for data loading and mutations. Server functions SHALL call the Hono API internally, handle auth (PIN from httpOnly cookie), and return typed results using neverthrow `Result`. The browser SHALL never call the Hono API directly except for SSE connections.

#### Scenario: Data loading via server function
- **WHEN** a page needs to load session orders
- **THEN** a server function fetches from the Hono API and returns the data

#### Scenario: Mutation via server function
- **WHEN** the admin changes an order status
- **THEN** a server function sends the PATCH to Hono with the PIN from the cookie

#### Scenario: Server function returns typed Result
- **WHEN** the Hono API returns an error response
- **THEN** the server function returns `Err<ApiErrorDto>` (not throws)

### Requirement: Guest flow routes

The system SHALL provide these guest-facing routes:
- `/` — landing page (SSR)
- `/session/:code` — session menu view (SSR + hydration). Displays the menu for the session, guest enters their name.
- `/session/:code/order` — order creation (CSR). Guest selects items, customizations, submits.
- `/session/:code/status` — order status (CSR + SSE). Guest sees their orders and real-time status updates.

#### Scenario: Guest joins session
- **WHEN** a guest navigates to `/session/ABC123`
- **THEN** the session menu is displayed with available items, rendered via SSR

#### Scenario: Guest places order
- **WHEN** a guest selects items and submits from `/session/ABC123/order`
- **THEN** the order is created via server function and guest is redirected to status page

#### Scenario: Guest sees real-time status
- **WHEN** a guest is on `/session/ABC123/status` and the host marks their order as PREPARING
- **THEN** the status updates in real-time via SSE without page reload

### Requirement: Admin flow routes

The system SHALL provide these admin-facing routes:
- `/admin` — admin login (SSR). PIN entry form.
- `/admin/dashboard` — active session dashboard (SSR + hydration). Shows current session and order queue.
- `/admin/session/:id` — session order management (CSR + SSE). Real-time order queue with status controls.
- `/admin/menu` — menu management (SSR + hydration). CRUD for menu items.

#### Scenario: Admin enters PIN
- **WHEN** the admin enters a valid PIN on `/admin`
- **THEN** a server function validates it and sets an httpOnly cookie, redirecting to dashboard

#### Scenario: Admin manages order queue
- **WHEN** the admin views `/admin/session/:id`
- **THEN** orders are displayed in real-time, grouped by status, with buttons to advance status or cancel

#### Scenario: Admin manages menu
- **WHEN** the admin visits `/admin/menu`
- **THEN** all menu items are listed with options to create, edit, delete, and toggle availability

### Requirement: Frontend services via Inversify

The system SHALL provide injectable frontend services in the web container:
- `HttpClient` — wraps fetch with base URL and error handling
- `ApiClient` — typed methods for each API endpoint, uses server functions internally
- `EventSourceService` — wraps browser EventSource for SSE, provides typed callbacks and cleanup

#### Scenario: ApiClient resolves from container
- **WHEN** `container.get(TOKENS.ApiClient)` is called
- **THEN** an ApiClient instance is returned with HttpClient injected

### Requirement: Solid UI + Tailwind integration

The system SHALL use Solid UI (shadcn-solid / Kobalte) for accessible UI primitives and Tailwind CSS for styling. Components SHALL be mobile-friendly (guests use phones).

#### Scenario: Mobile-responsive menu
- **WHEN** a guest views the menu on a phone-sized screen
- **THEN** the layout is responsive and usable with touch interactions
