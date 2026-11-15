## Purpose

Defines how qup code is packaged: business modules, core, platform and database packages, and apps reduced to composition roots, following ADR 0007 and the `clean-architecture-layout` spec.

## ADDED Requirements

### Requirement: Business module packages

qup business code SHALL live in module packages laid out per `clean-architecture-layout`. Unless the owner confirms another split before implementation, one package, `@m0n0lab/qup-ordering`, SHALL hold menu items, sessions and orders. A business module SHALL NOT import another business module.

#### Scenario: Order creation stays inside one module

- **WHEN** the create order use case is located
- **THEN** it is in `packages/qup-ordering/src/application/server/use-case/order-create.use-case.ts` and reads sessions, orders and menu items through ports of its own module

### Requirement: Core package

`@m0n0lab/qup-core` SHALL hold, in a single root entry, qup's kernel errors and the API error envelope schema. It SHALL import no other qup package and no infrastructure library.

#### Scenario: Core depends on nothing of ours

- **WHEN** the imports of `@m0n0lab/qup-core` are listed
- **THEN** none points to another `@m0n0lab/qup-*` package, nor to `pg` or `drizzle-orm`

### Requirement: Platform package

`@m0n0lab/qup-platform` SHALL export `./server` and `./client` only. The server side SHALL provide `Config` and the Postgres handle, and the client side `Config`, the HTTP client and the SSE client, all bound by static container modules. No code outside its `Config` adapters SHALL read the environment.

#### Scenario: Event bus stays in the module

- **WHEN** a use case publishes a domain event
- **THEN** it calls the event bus port in `packages/qup-ordering/src/application/server/port/`, implemented in `packages/qup-ordering/src/data/server/infra/event/`, and the platform holds no event bus

### Requirement: Database package

`@m0n0lab/qup-database` SHALL own the drizzle config, the migrations folder with its history and a `migrate(databaseUrl)` helper. Its drizzle config SHALL list the modules' `*.table.ts` files by glob.

#### Scenario: Migrations moved without re-running

- **WHEN** `db:migrate` runs against a database migrated before the move
- **THEN** no migration is applied again

#### Scenario: Schema unchanged by the move

- **WHEN** `db:generate` runs right after the move
- **THEN** drizzle-kit reports no schema change

### Requirement: Layer packages removed

The packages `@m0n0lab/qup-domain`, `@m0n0lab/qup-data` and `@m0n0lab/qup-shared` SHALL NOT exist.

#### Scenario: Old packages are gone

- **WHEN** workspace projects are listed
- **THEN** none of the three layer packages appears

### Requirement: Apps are composition roots

`apps/qup-api` and `apps/qup-web` SHALL hold presentation only, per `clean-architecture-layout`. Each SHALL build its container in `src/di/` by binding its `Config` adapter and loading the platform and module container modules of its side. Routes, loaders, actions and view models SHALL call use cases and SHALL NOT resolve repositories or read the environment.

#### Scenario: Web server function

- **WHEN** the session order list loads in `apps/qup-web`
- **THEN** a loader in `src/<module>/loader/` calls a use case, and no `src/server/` or `src/services/` folder exists

### Requirement: Behaviour preserved

The move SHALL NOT change the qup HTTP API, its SSE events, its UI flows or its database schema. The existing integration-platform and legacy tests SHALL pass at their new paths without changes to their assertions.

#### Scenario: API contract

- **WHEN** the qup-api integration-platform tests run after the move
- **THEN** they pass with the same assertions as before

### Requirement: qup under the layout lint

Every qup project SHALL be checked by the `clean-architecture-layout` lint through one factory call with the `qup` prefix, and CI SHALL fail on a violation.

#### Scenario: qup lint

- **WHEN** `pnpm nx run-many -t lint:eslint -p '@m0n0lab/qup*'` runs
- **THEN** every qup project is checked against the layout and passes
