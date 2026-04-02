## Context

Green Beard is a plant sales management dashboard. The SvelteKit 5 app scaffold already exists at `apps/green-beard/`. No backend packages exist yet. The qup project (on `feature/qup-kick-off-v2`) establishes the clean architecture pattern: domain/data/shared/api packages with Inversify DI, neverthrow typed errors, Drizzle+PostgreSQL, and Hono REST API.

This change bootstraps the same architecture for Green Beard and validates it with two simple CRUDs (Familia, Planta).

## Goals / Non-Goals

**Goals:**

- 4 new projects: `green-beard-domain`, `green-beard-data`, `green-beard-shared`, `green-beard-api`
- Full vertical slice: entity → port → use case → Drizzle repo → Hono route → SvelteKit BFF → UI
- Familia CRUD (simplest entity, no FKs)
- Planta CRUD (FK to Familia, optional foto_url)
- Docker Compose for local PostgreSQL

**Non-Goals:**

- SvelteKit UI styling/design system (future)
- Auth/sessions (single-user dashboard, no auth for v1)
- Supply entities (Maceta, Sustrato, Material) — next change
- PlantaVenta, photo uploads — future change
- Deployment/hosting setup

## Decisions

### 1. Package structure — mirrors qup exactly

```
packages/green-beard-domain    → deps: inversify, neverthrow
packages/green-beard-data      → deps: gb-domain, drizzle-orm, pg
packages/green-beard-shared    → deps: none (types only)
apps/green-beard-api           → deps: gb-domain, gb-data, gb-shared, hono, inversify
apps/green-beard               → deps: gb-shared (SvelteKit BFF)
```

**Why**: Proven pattern from qup. Package boundaries enforce Clean Architecture at build time.

### 2. SvelteKit as BFF via +page.server.ts and +server.ts

```
Browser ──form/fetch──▶ SvelteKit (+page.server.ts) ──HTTP──▶ Hono API
```

SvelteKit `load` functions call Hono API for reads. Form actions call Hono API for writes. The SvelteKit server acts as BFF — no direct browser→API calls.

**Why**: Same BFF rationale as qup. Server-side calls keep API internals hidden. SvelteKit load/actions provide SSR data and progressive enhancement. Unlike qup (which needed SSE direct), Green Beard has no real-time requirements.

**Alternative**: Direct browser→API. Rejected — loses SSR benefits, exposes API.

### 3. Hono + Inversify route factories — same as qup

```typescript
function familiaRoutes(container: Container): Hono {
    const app = new Hono();
    app.get("/", async (c) => {
        const uc = container.get<GetFamiliasUseCase>(TOKENS.GetFamiliasUseCase);
        const result = await uc.execute();
        return result.match(
            (items) => c.json(items.map(toFamiliaDto)),
            (error) => c.json(toApiError(error), errorToHttp(error) as any),
        );
    });
    return app;
}
```

**Why**: Identical pattern to qup's menu routes. Consistency across projects.

### 4. Drizzle + PostgreSQL with Docker Compose

Local dev via `docker-compose.yml` at repo root (or `apps/green-beard-api/`). Single `green_beard` database.

Schema files in `green-beard-data/src/schema/`. Migrations via `drizzle-kit generate` + `drizzle-kit migrate`.

**Why**: Same as qup. Drizzle is thin, doesn't impose model on domain.

### 5. Error hierarchy — simplified from qup

```
DomainError (abstract)
├── ValidationError
├── NotFoundError (generic, takes entity name)
├── DuplicateError (for unique constraint violations)
└── PersistenceError (wraps unknown DB errors)
```

**Why**: Green Beard CRUDs are simpler than qup's state machines. A generic `NotFoundError("Familia", id)` is sufficient vs qup's per-entity errors. Can specialize later if needed.

### 6. Domain entities follow qup's pattern

- Private constructor, `static create()` returns `Result<T, ValidationError>`, `static reconstitute()` for DB hydration
- Getters for immutable access, `update()` method for mutations
- `@injectable()` on use cases, `@inject(TOKEN)` for dependencies

### 7. Planta.foto_url as simple string

For the foundation change, `foto_url` is a nullable string (URL). No upload integration — just stores a URL. The R2 upload flow is deferred to the inventory change where PlantaVenta actually needs multi-photo upload.

**Why**: Keeps foundation scope minimal. Planta's single photo URL can be set manually or via a future upload endpoint.

### 8. Package config — tsdown + vitest, same as qup

Each package gets: `tsdown` for build, `vitest` for tests, `tsc --noEmit` for typecheck. Same `package.json` structure as qup packages. Targets inferred by Nx from scripts.

**Alternative**: Use nx generators. Rejected — qup manually scaffolded and it works fine. Generators add complexity for 4 private packages.

## Risks / Trade-offs

- **[No auth on API]** → Acceptable for v1 single-user dashboard. Add PIN or session auth later if needed.
- **[Docker required for local dev]** → PostgreSQL needs Docker. Could use `pg_tmp` or SQLite for lighter dev, but staying consistent with qup.
- **[SvelteKit + Hono = two Node servers in dev]** → Need to run both `green-beard:dev` and `green-beard-api:dev`. Could use Nx `run-many` or a root script. Manageable.
- **[experimentalDecorators for Inversify]** → Same as qup. All green-beard packages need `experimentalDecorators: true` + `emitDecoratorMetadata: true`.
- **[foto_url without upload]** → Foundation only stores URLs. User must provide URL manually until inventory change adds R2 upload.
