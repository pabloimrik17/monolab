## Context

Foundation (Change 1) provides clean architecture + Familia/Planta CRUDs. Supplies (Change 2) adds Material, Maceta, Sustrato. This change introduces PlantaVenta — the core entity representing a specific plant instance for sale, linking everything together.

Key complexities: auto-numbering with gap reuse per planta_id, multi-photo upload to Cloudflare R2 (free tier), and FK relationships to Planta, Maceta, and Sustrato.

## Goals / Non-Goals

**Goals:**

- PlantaVenta CRUD with all FK relationships
- Auto-numbering (smallest available integer per planta_id)
- Photo upload/delete to Cloudflare R2 (S3-compatible)
- Display name derivation: "{planta.nombre} #{identificador}"

**Non-Goals:**

- Price calculation for PlantaVenta (deferred — depends on future costing factors for home-grown plants)
- Batch operations (bulk create/delete)
- Image processing (resize, thumbnails) — store originals only for v1
- Public-facing catalog/storefront
- Stock status (available/sold/reserved) — future enhancement

## Decisions

### 1. Auto-numbering with gap reuse — DB query approach

For a given `planta_id`, find the smallest positive integer not in use:

```sql
SELECT COALESCE(
    (SELECT s.i FROM generate_series(1, (SELECT COALESCE(MAX(identificador), 0) + 1 FROM plantas_venta WHERE planta_id = $1)) AS s(i)
     LEFT JOIN plantas_venta pv ON pv.planta_id = $1 AND pv.identificador = s.i
     WHERE pv.id IS NULL
     ORDER BY s.i LIMIT 1),
    1
) AS next_id;
```

This runs as part of `CreatePlantaVentaUseCase` within a transaction to prevent race conditions.

**Why**: Pure SQL, no application-level locking. `generate_series` + LEFT JOIN efficiently finds gaps. Transaction ensures atomicity.

**Alternative**: Application-level sequence tracking table. More complex, same result.

**Uniqueness constraint**: Composite UNIQUE on `(planta_id, identificador)` in DB as safety net.

### 2. Photo storage — Cloudflare R2 via S3-compatible SDK

```
Upload flow:
Browser ──form (multipart)──▶ SvelteKit ──forward──▶ Hono API ──S3 PutObject──▶ R2

Storage path: plantas-venta/{planta_venta_id}/{uuid}.{ext}
```

Using `@aws-sdk/client-s3` for R2 (S3-compatible). Photos uploaded through the API, not direct browser→R2 (simpler, no presigned URLs needed for v1).

**Why presigned URLs rejected for v1**: Adds complexity (generate URL endpoint, client-side upload logic, confirmation callback). Direct upload through API is simpler. Data volume is small (plant photos, not video). Can migrate to presigned URLs later if upload speed becomes an issue.

**Free tier**: 10GB storage, 1M class A (writes), 10M class B (reads). More than sufficient.

### 3. Foto storage schema — JSONB array in plantas_venta

```typescript
// Column: fotos JSONB DEFAULT '[]'
// Each entry: { key: "plantas-venta/abc/def.jpg", url: "https://r2.../..." }
```

**Why JSONB over separate table**: Photos are always loaded with the plant (no independent queries). Array operations (add, remove, reorder) are simpler with JSONB. No JOIN needed.

**Alternative**: `planta_venta_fotos` table with ordering column. Overkill — the expected photo count per plant is <10.

### 4. Photo lifecycle tied to PlantaVenta

- **Create**: Photos uploaded and added to JSONB array
- **Update**: New photos added, removed photos deleted from R2
- **Delete**: All photos deleted from R2, entity deleted

Delete from R2 is best-effort — if R2 delete fails, the entity is still deleted. Orphaned R2 objects can be cleaned up via lifecycle rules.

**Why best-effort**: R2 deletion failing shouldn't block entity deletion. Storage is cheap. A periodic cleanup job can handle orphans later.

### 5. PlantaVenta entity — coste_planta as optional

`costePlanta` is nullable:
- **Purchased plant**: set to the purchase cost (decimal)
- **Home-grown plant**: null (cost calculation from other factors is deferred)

No price/pvp on PlantaVenta for now — that's future work.

### 6. R2 configuration via environment variables

```
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=green-beard
R2_PUBLIC_URL=https://pub-<hash>.r2.dev  (or custom domain)
```

The public URL is used to construct foto URLs in DTOs. Bucket must have public access enabled (or use R2.dev subdomain).

## Risks / Trade-offs

- **[Race condition on auto-numbering]** → Mitigated by transaction + composite UNIQUE constraint. Worst case: DB rejects duplicate and use case retries.
- **[R2 upload through API = larger request size]** → Acceptable for plant photos (~1-5MB). Hono's body limit should be configured (e.g., 10MB).
- **[JSONB fotos = no referential integrity]** → If a photo is deleted from R2 but not from JSONB, URL 404s. Acceptable — UI can handle missing images gracefully.
- **[No image optimization]** → Original images stored as-is. Could add Sharp/CDN resizing later. R2 + browser caching is sufficient for v1.
- **[Deleting Maceta/Sustrato used by PlantaVenta]** → FK constraints will prevent deletion. Delete use cases for Maceta/Sustrato (from supplies change) need to be updated to check PlantaVenta usage, or rely on DB FK constraint errors mapped to DomainError.
