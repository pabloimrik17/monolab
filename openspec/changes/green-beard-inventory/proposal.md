## Why

PlantaVenta is the core entity — a specific plant instance for sale, linking catalog (Planta), pot (Maceta), and substrate (Sustrato). It has the most complex behavior: auto-numbering with gap reuse, photo uploads to Cloudflare R2, and optional cost tracking for purchased plants.

Depends on: `green-beard-foundation`, `green-beard-supplies`

## What Changes

- PlantaVenta CRUD: id (uuid), planta_id (FK→Planta), identificador (integer, auto-assigned per planta_id with gap reuse), fotos (array of URLs stored in R2), alto_planta_cm (decimal), maceta_id (FK→Maceta), sustrato_id (FK→Sustrato), coste_planta (decimal, nullable — present if purchased, null if home-grown)
- Auto-numbering logic: for a given planta_id, assign the smallest positive integer not currently in use. If Monstera has [#1, #3, #4], next gets #2. If [#1, #2, #3], next gets #4
- Cloudflare R2 integration for photo storage (free tier: 10GB, 10M reads/month). S3-compatible SDK. Photos uploaded via API, URLs stored in DB
- Display name derived: "{planta.nombre} #{identificador}" (e.g., "Monstera #2")
- New Drizzle schema table: `plantas_venta`, plus `planta_venta_fotos` (or JSONB array)
- New domain entity, port, use cases, DTOs
- New Hono route group: `/plantas-venta`
- SvelteKit pages with photo upload UI

## Capabilities

### New Capabilities
- `green-beard-planta-venta-crud`: PlantaVenta entity CRUD — manage individual plants for sale with auto-numbering, photo management, and links to catalog/pot/substrate
- `green-beard-photo-storage`: Cloudflare R2 photo upload/delete — S3-compatible integration for plant photos with free tier

### Modified Capabilities
<!-- None -->

## Impact

- **New tables**: `plantas_venta` (+ foto storage strategy TBD in design: JSONB array vs separate table)
- **New routes**: `/plantas-venta` route group with photo upload endpoint
- **Infrastructure**: Cloudflare R2 bucket required (free tier). Env vars: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
- **Domain complexity**: auto-numbering with gap reuse query, photo lifecycle (upload on create/update, cleanup on delete)
- **Design decisions deferred to design.md**: foto storage schema (JSONB vs relation), R2 upload flow (direct vs presigned URLs), identifier uniqueness enforcement (DB constraint vs application logic)
