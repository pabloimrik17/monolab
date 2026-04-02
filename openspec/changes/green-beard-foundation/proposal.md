## Why

Green Beard needs its clean architecture foundation before any feature work. Same pattern as qup: domain/data/shared/api packages with Inversify DI, neverthrow typed errors, Drizzle+PostgreSQL. Familia and Planta are the simplest entities — ideal to validate the full stack end-to-end.

## What Changes

- New package `green-beard-domain`: entities, ports (repository interfaces), use cases (@injectable), value objects, error types, DI tokens, ContainerModule. Deps: inversify, neverthrow
- New package `green-beard-data`: Drizzle schema, domain↔persistence mappers, repository implementations (@injectable), ContainerModule. Deps: green-beard-domain, drizzle-orm, pg
- New package `green-beard-shared`: DTOs, request types. Zero runtime deps
- New app `green-beard-api`: Hono REST API with Inversify route factories, error mapping, composition root (container loading all modules). Deps: green-beard-domain, green-beard-data, green-beard-shared, hono, inversify
- SvelteKit app (`apps/green-beard`) wired as BFF — server routes/actions call Hono API via HTTP
- Familia CRUD: id (uuid), nombre (string). Simplest entity, validates full vertical slice
- Planta CRUD: id (uuid), nombre (string), familia_id (FK→Familia), foto_url (string, nullable). Adds FK pattern

## Capabilities

### New Capabilities
- `green-beard-clean-arch`: Clean architecture foundation — domain/data/shared/api packages with DI, typed errors, Drizzle+PostgreSQL
- `green-beard-familia-crud`: Familia entity CRUD — create, read, update, delete plant families
- `green-beard-planta-crud`: Planta (catalog) entity CRUD — create, read, update, delete plant varieties with FK to Familia + optional photo URL

### Modified Capabilities
<!-- None -->

## Impact

- **New projects**: 3 packages (`green-beard-domain`, `green-beard-data`, `green-beard-shared`) + 1 app (`green-beard-api`)
- **Modified projects**: `apps/green-beard` (SvelteKit BFF wiring)
- **Dependencies added**: hono, inversify, neverthrow, drizzle-orm, drizzle-kit, pg
- **Infrastructure**: PostgreSQL database required (local dev via Docker)
- **pnpm workspace**: auto-discovered via `packages/*` and `apps/*` globs
- **Nx**: new projects with minimal `project.json`, targets inferred from scripts
