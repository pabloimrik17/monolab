## Why

Supply entities (Material, Maceta, Sustrato) model the inputs used to prepare plants for sale. Each has pricing logic: Material has a per-liter cost, Maceta has cost+margin→pvp, Sustrato computes cost dynamically from its material composition. These are independent from Planta/Familia but prerequisite for PlantaVenta (inventory).

Depends on: `green-beard-foundation` (packages, DB, DI wiring). Code follows the Clean Architecture layout of ADR 0009: business code in the module package `@m0n0lab/green-beard-nursery`, tables migrated from `@m0n0lab/green-beard-database`, routes in `apps/green-beard-api`, pages in `apps/green-beard`.

## What Changes

- Material CRUD: id (uuid), nombre (string), precio_litro (decimal). Simple entity, no FKs
- Maceta CRUD: id (uuid), nombre (string), material (enum: terracota, plastico, ceramica, fibra_coco, tela), diametro_cm (decimal), alto_cm (decimal), volumen_litros (decimal), coste (decimal), margen (decimal 0-1), pvp (computed: coste × (1 + margen))
- Sustrato CRUD: id (uuid), nombre (string), margen (decimal 0-1). Has N:M relation to Material via junction table `sustrato_materiales` (sustrato_id, material_id, litros). Coste computed dynamically: Σ(material.precio_litro × litros). PVP computed: coste × (1 + margen)
- New Drizzle schema tables: `materiales`, `macetas`, `sustratos`, `sustrato_materiales`
- New models, value objects, repository ports, use cases, Postgres and API repositories and DTOs in `@m0n0lab/green-beard-nursery`, one file per concept and kind (`domain/model/material.model.ts`, `application/server/use-case/material-create.use-case.ts`, `data/server/repository/material-pg.repository.ts`, `data/shared/dto/material.dto.ts`, and so on)
- Sustrato list and detail come from a read query (`SustratoListQuery` returning `SustratoListReadModel`) implemented with a SQL join, because the cost needs Material prices from another aggregate
- Tables defined in `data/server/infra/db/<concept>.table.ts` of the nursery package; migration generated in `@m0n0lab/green-beard-database`
- New Hono route sub-apps in `apps/green-beard-api/src/nursery/route/`: `/materiales`, `/macetas`, `/sustratos`
- SvelteKit pages for each CRUD in `apps/green-beard/src/nursery/`, with thin shells in `src/routes/`

## Capabilities

### New Capabilities
- `green-beard-material-crud`: Material entity CRUD — manage substrate raw materials with per-liter pricing
- `green-beard-maceta-crud`: Maceta entity CRUD — manage pots with dimensions, material enum, cost+margin pricing
- `green-beard-sustrato-crud`: Sustrato entity CRUD — manage substrates with N:M material composition, dynamic cost calculation, margin pricing

### Modified Capabilities
<!-- None -->

## Impact

- **New tables**: `materiales`, `macetas`, `sustratos`, `sustrato_materiales` (junction)
- **Packages**: `@m0n0lab/green-beard-nursery` (new files, exports change), `@m0n0lab/green-beard-database` (new migration)
- **New routes**: 3 route sub-apps in `@m0n0lab/green-beard-api`
- **New pages**: 3 CRUD sections in `@m0n0lab/green-beard`
- **Domain complexity**: Sustrato introduces derived pricing (cost from related materials) served by a read query
- **Enum**: MacetaMaterial value object (`maceta-material.value-object.ts`) (terracota, plastico, ceramica, fibra_coco, tela)
