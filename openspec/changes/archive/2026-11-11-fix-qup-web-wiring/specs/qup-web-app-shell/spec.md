# qup-web-app-shell — Delta Spec

## ADDED Requirements

### Requirement: Admin routes SHALL be protected by registered middleware

`apps/qup-web/app.config.ts` SHALL register `src/middleware.ts` via the SolidStart `middleware` option so the admin auth guard executes on every request. Unauthenticated requests to `/admin/*` (except the login page at `/admin`) SHALL be redirected to `/admin`.

#### Scenario: Middleware present in compiled bundle

- **WHEN** `apps/qup-web` is built (`pnpm nx build @m0n0lab/qup-web`)
- **THEN** the middleware guard code is present in the `.output` server bundle (e.g. its unique strings survive compilation)

#### Scenario: Unauthenticated admin access redirected

- **WHEN** a request without a valid auth cookie hits `/admin/dashboard`, `/admin/menu`, or `/admin/session/:id`
- **THEN** the response redirects to `/admin` (login)

#### Scenario: Authenticated admin access allowed

- **WHEN** a request with a valid auth cookie (per `isAuthenticated` in `src/server/auth.ts`) hits `/admin/dashboard`
- **THEN** the page is served normally

### Requirement: Global stylesheet SHALL be loaded by the app root

`apps/qup-web/src/app.tsx` SHALL import `./global.css` so the Tailwind entry stylesheet (`@import "tailwindcss"`) is processed and shipped with every page.

#### Scenario: CSS emitted in build

- **WHEN** `apps/qup-web` is built
- **THEN** the build output contains a CSS asset with generated Tailwind utilities referenced by the routes (e.g. classes used in `src/routes/admin/index.tsx`)
