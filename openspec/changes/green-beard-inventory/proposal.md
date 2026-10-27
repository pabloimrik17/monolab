## Why

PlantaVenta is the core entity — a specific plant instance for sale, linking catalog (Planta), pot (Maceta), and substrate (Sustrato). It has the most complex behavior: auto-numbering with gap reuse, photo uploads to Cloudflare R2, and optional cost tracking for purchased plants.

Depends on: `green-beard-foundation`, `green-beard-supplies`

## What Changes

- PlantaVenta CRUD: id (uuid), planta_id (FK→Planta), identificador (integer, auto-assigned per planta_id with gap reuse), fotos (array of URLs stored in R2), alto_planta_cm (decimal), maceta_id (FK→Maceta), sustrato_id (FK→Sustrato), coste_planta (decimal, nullable — present if purchased, null if home-grown)
- Auto-numbering logic: for a given planta_id, assign the smallest positive integer not currently in use. If Monstera has [#1, #3, #4], next gets #2. If [#1, #2, #3], next gets #4
- Cloudflare R2 integration for photo storage (free tier: 10GB, 10M reads/month). S3-compatible SDK. Photos uploaded via API, URLs stored in DB
- Display name derived: "{planta.nombre} #{identificador}" (e.g., "Monstera #2")
- New Drizzle table `plantas_venta` with photos in a JSONB column (no separate photo table), in `data/server/infra/db/planta-venta.table.ts` of `@m0n0lab/green-beard-nursery`
- New in the module package `@m0n0lab/green-beard-nursery`: model, repository port, list read query and read model, errors, server and client use cases, Postgres and API repositories, DTOs
- Photo storage: a technical port in the module (`application/server/port/photo-storage.port.ts`) implemented in the module on top of a generic S3-compatible client in `@m0n0lab/green-beard-platform` (`server/storage/s3.client.ts`)
- New Hono sub-app in `apps/green-beard-api` (`src/nursery/route/planta-venta.route.ts`) mounted by `src/app.ts`
- SvelteKit pages, components, loaders and actions under `apps/green-beard/src/nursery/`, with thin shells in `src/routes/`

## Capabilities

### New Capabilities
- `green-beard-planta-venta-crud`: PlantaVenta entity CRUD — manage individual plants for sale with auto-numbering, photo management, and links to catalog/pot/substrate
- `green-beard-photo-storage`: Cloudflare R2 photo upload/delete — S3-compatible integration for plant photos with free tier

### Modified Capabilities
<!-- None -->

## Impact

- **Packages**: `@m0n0lab/green-beard-nursery` (business code), `@m0n0lab/green-beard-platform` (S3 client, server Config with the R2 variables, S3 SDK dependency), `@m0n0lab/green-beard-core` (kernel errors, unchanged), `@m0n0lab/green-beard-database` (migration)
- **Apps**: `apps/green-beard-api` (route and harness), `apps/green-beard` (pages)
- **New tables**: `plantas_venta`, photos in a JSONB column
- **New routes**: `/plantas-venta` route group with photo upload endpoint
- **Infrastructure**: Cloudflare R2 bucket required (free tier). Env vars: R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL
- **Domain complexity**: auto-numbering with gap reuse query (in the Postgres repository), photo lifecycle (upload on create/update, cleanup on delete)
- **Decided in design.md**: JSONB photos, upload through the API (no presigned URLs), uniqueness by DB constraint plus retry
