# Proposal

## Why

Green Beard has a SvelteKit scaffold and no backend. Before any feature work it needs the Clean Architecture foundation: packages, an API, a database and the wiring between them.

This plan used to copy qup's layer packages (`green-beard-domain`, `green-beard-data`, `green-beard-shared`). [ADR 0007](../../../docs/adr/0007-investlab-package-per-module.md) abandoned that split, and [ADR 0009](../../../docs/adr/0009-clean-architecture-layout.md) gives every Clean Architecture project one layout inside its packages and apps. Green Beard starts on that layout, so it never has to move.

Familia and Planta are the simplest models, so they prove the whole stack end to end: model, use case, Postgres, API, SvelteKit page.

## What Changes

- **Packages per ADR 0007**:
    - `@m0n0lab/green-beard-nursery`: the one business module. It holds every Green Beard concept; this change adds Familia and Planta, later changes add Material, Maceta, Sustrato and PlantaVenta. Entries: `.`, `./server`, `./client` and `./testing`.
    - `@m0n0lab/green-beard-core`: kernel errors and the API error envelope, behind one root entry.
    - `@m0n0lab/green-beard-platform`: `Config` per side, the Postgres handle, the HTTP client and the Green Beard API client, wired by static container modules. Entries: `./server` and `./client`.
    - `@m0n0lab/green-beard-database`: drizzle config, migrations, a `migrate(databaseUrl)` helper and the `db:generate` and `db:migrate` scripts.
- **Layout per `clean-architecture-layout`**: layer → side → kind inside packages, concept-first file names (`familia-create.use-case.ts`, `familia-pg.repository.ts`), and `#<folder>/*` aliases with no `../` imports.
- **New app `apps/green-beard-api`** (Hono): one sub-app per concept in `src/nursery/route/`, error mapping in `src/core/`, and the container in `src/di/`.
- **`apps/green-beard` becomes a BFF** (SvelteKit): pages, loaders and actions in `src/nursery/`, thin files in `src/routes/`, and a server container in `src/di/`. Loaders and actions call client use cases, which reach the API through the platform's API client. The browser never calls the API.
- **Lint**: one `cleanArchitectureLint` call with the `green-beard` prefix.
- **Familia CRUD**: id (uuid), nombre (string). The simplest model; it proves the full slice.
- **Planta CRUD**: id (uuid), nombre (string), familia_id (FK → Familia), foto_url (string, nullable). It adds the foreign key pattern and the first read across two aggregates.

## Capabilities

### New Capabilities

- `green-beard-clean-arch`: how Green Beard is built: module, core, platform and database packages, apps as composition roots, typed errors, the Hono API, the SvelteKit BFF and local Postgres.
- `green-beard-familia-crud`: create, read, update and delete plant families.
- `green-beard-planta-crud`: create, read, update and delete plant varieties, each linked to a Familia, with an optional photo URL.

### Modified Capabilities

None. The layout rules come from `clean-architecture-layout`, which already covers Green Beard.

## Impact

- **New projects**: `packages/green-beard-{nursery,core,platform,database}` and `apps/green-beard-api`.
- **Modified projects**: `apps/green-beard` (BFF wiring, aliases in `kit.alias`).
- **Dependencies**: `hono`, `@hono/node-server`, `inversify`, `neverthrow`, `zod`, `drizzle-orm`, `pg`, `drizzle-kit`; test dependencies `@testcontainers/postgresql` and `msw`. No peer dependencies: every new package is private.
- **Tooling**: `eslint.config.ts` (one factory call with the `green-beard` prefix).
- **Infrastructure**: PostgreSQL for local development through Docker Compose; Testcontainers for integration tests.
- **Workspace**: pnpm finds the projects through the `packages/*` and `apps/*` globs; Nx infers targets from `package.json` scripts, with a minimal `project.json` per project.
- **Order**: this change starts once `clean-architecture-layout` is applied and archived, because it relies on that change's layout spec and lint factory. `green-beard-supplies` and `green-beard-inventory` build on this change.
