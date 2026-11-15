## Context

Green Beard foundation (Change 1) provides the module package `@m0n0lab/green-beard-nursery`, the database package, DI wiring, the two apps and two simple CRUDs (Familia, Planta), all laid out as in ADR 0009. This change adds supply entities that model the physical inputs for preparing plants for sale: raw materials, pots, and substrates.

Key complexity: Sustrato has a N:M relationship with Material via a junction table with quantities (litros), and its cost is computed dynamically from the sum of its materials' costs.

## Goals / Non-Goals

**Goals:**

- Material CRUD — simple entity with per-liter pricing
- Maceta CRUD — dimensions, enum material type, cost+margin→pvp
- Sustrato CRUD — N:M material composition, dynamic cost, margin→pvp
- All following foundation's established patterns and the ADR 0009 layout (models, ports, use cases, routes, BFF)

**Non-Goals:**

- PlantaVenta / inventory (next change)
- Photo uploads
- Stock tracking / purchase orders
- Bulk import/export of supplies

## Decisions

### 1. MacetaMaterial as string enum value object

```typescript
type MacetaMaterial = "terracota" | "plastico" | "ceramica" | "fibra_coco" | "tela";
```

**Why**: Finite, known set. No need for a DB table. Value object in `domain/value-object/maceta-material.value-object.ts`, VARCHAR in Drizzle. Easy to extend later by adding to the union type + migration.

**Alternative**: Separate `materiales_maceta` table. Overkill — these values rarely change and don't need CRUD.

### 2. Sustrato ↔ Material junction table with litros

```
sustratos          sustrato_materiales         materiales
┌──────┐          ┌──────────────────┐         ┌──────────┐
│ id   │◄────────│ sustrato_id (FK) │         │ id       │
│ nombre│         │ material_id (FK) │────────▶│ nombre   │
│ margen│         │ litros (decimal) │         │ precio_L │
└──────┘          └──────────────────┘         └──────────┘
                   PK: (sustrato_id, material_id)
```

**Why**: Classic N:M with quantity. Composite PK prevents duplicate material entries per sustrato. `litros` is the quantity of that material in the mix.

### 3. Sustrato cost computed dynamically, not stored

`coste_sustrato = Σ(material.precio_litro × sustrato_material.litros)`

Computed at read time by a read query that joins sustrato_materiales + materiales. NOT stored in the sustratos table.

**Why**: If a material's price changes, all sustratos using it reflect the new cost immediately. Storing cost would require cache invalidation on material price changes — unnecessary complexity.

**Where it lives**: Material's price belongs to another aggregate, and a repository never calls another aggregate's repository. So the Sustrato aggregate holds only its material lines (materialId, litros), and the cost and PVP shown come from a read query: port `domain/query/sustrato-list.query.ts` returns `domain/read-model/sustrato-list.read-model.ts`, implemented in `data/server/query/sustrato-list-pg.query.ts` with one SQL join. The list and detail routes use it; writes go through the Sustrato repository.

**Trade-off**: Read queries are slightly more complex (need JOIN + SUM). Acceptable for the expected data volume (tens of sustratos, not millions).

### 4. PVP computation: `pvp = coste × (1 + margen)`

Both Maceta and Sustrato store `margen` as a decimal (0-1, e.g., 0.3 for 30%). PVP is computed:
- **Maceta**: `pvp = coste × (1 + margen)` — coste is stored directly
- **Sustrato**: `pvp = coste_dinamico × (1 + margen)` — coste is computed from materials

PVP is NOT stored in DB — always derived. The pure formula lives in the Maceta model; for Sustrato it is applied by the read query's read model. Returned in DTOs.

**Why**: Same reasoning as sustrato cost. Margin changes should immediately reflect in PVP without cache invalidation.

### 5. Sustrato CRUD manages composition atomically

When creating/updating a Sustrato, the materials array is sent as a whole:

```typescript
{
    nombre: "Tropical Mix",
    margen: 0.25,
    materiales: [
        { materialId: "<uuid>", litros: 2.5 },
        { materialId: "<uuid>", litros: 1.0 }
    ]
}
```

On update, the existing `sustrato_materiales` rows are replaced entirely (delete all for sustrato_id, insert new set). The Sustrato repository (`sustrato-pg.repository.ts`) is the only writer of the junction table (`sustrato-material.table.ts`) and loads and saves the material lines as part of the root.

**Why**: Simpler than individual add/remove operations. The materials list is always small. Atomic replacement avoids partial states.

### 6. Decimal handling — Drizzle `numeric` type

Prices, volumes, dimensions stored as `numeric(10,2)` in PostgreSQL. Margins stored as `numeric(5,2)` (0-1 range). In TypeScript, Drizzle returns these as strings. The Postgres repositories parse to `number` when mapping rows to models; the mapping stays private to each repository file.

**Why**: Avoids floating-point precision issues in DB. JavaScript `number` is fine for display/calculation at this scale.

### 7. Where the code goes

| Piece | Location |
|---|---|
| Models, value objects, errors | `@m0n0lab/green-beard-nursery` `domain/model/<concept>.model.ts`, `domain/value-object/<name>.value-object.ts`, `domain/error/<concept>.error.ts` |
| Ports | `domain/repository/<concept>.repository.ts`, `domain/query/sustrato-list.query.ts`, `domain/read-model/sustrato-list.read-model.ts` |
| Use cases | `application/server/use-case/<concept>-<verb>.use-case.ts`; client ones in `application/client/use-case/` |
| Postgres | `data/server/repository/<concept>-pg.repository.ts`, `data/server/query/sustrato-list-pg.query.ts`, `data/server/infra/db/<concept>.table.ts` (junction: `sustrato-material.table.ts`) |
| Client and DTOs | `data/client/repository/<concept>-api.repository.ts`, `data/shared/dto/<concept>.dto.ts` |
| Migration | `@m0n0lab/green-beard-database` (`db:generate`, tables picked up by glob) |
| API | `apps/green-beard-api/src/nursery/route/<concept>.route.ts`, mounted by `src/app.ts`, harness next to each route |
| BFF | `apps/green-beard/src/nursery/{page,component,loader,action,form}/`; `src/routes/` files are thin shells |

### 8. Tests follow ADR 0008

Unit tests only for models and value objects (`<x>.model.test.ts`). Use cases are tested by integration tests next to them (`<x>.use-case.integration.ts`) against Postgres via Testcontainers, or against the API faked with MSW on the client side. The API is tested by integration-platform tests through the route harness. No use-case test mocks a repository.

## Risks / Trade-offs

- **[Dynamic cost = slower reads for Sustrato]** → Acceptable. Data volume is tiny. Can add materialized view or cached column later if needed.
- **[Deleting a Material used by Sustratos]** → FK constraint prevents deletion. The delete use case checks `SustratoRepository.existsMaterialUsage` (use cases may orchestrate several aggregates) and returns a clear error. Alternative: soft delete (not needed for v1).
- **[Deleting a Maceta/Sustrato used by PlantaVenta]** → Future concern (inventory change). FK will be added then. For now, these entities are standalone.
- **[Margen as 0-1 decimal]** → Could confuse users expecting percentage. UI should display as "25%" while storing 0.25. Validation: 0 ≤ margen ≤ 1.
