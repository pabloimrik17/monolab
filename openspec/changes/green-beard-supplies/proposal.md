## Why

Supply entities (Material, Maceta, Sustrato) model the inputs used to prepare plants for sale. Each has pricing logic: Material has a per-liter cost, Maceta has cost+margin→pvp, Sustrato computes cost dynamically from its material composition. These are independent from Planta/Familia but prerequisite for PlantaVenta (inventory).

Depends on: `green-beard-foundation` (packages, DB, DI wiring)

## What Changes

- Material CRUD: id (uuid), nombre (string), precio_litro (decimal). Simple entity, no FKs
- Maceta CRUD: id (uuid), nombre (string), material (enum: terracota, plastico, ceramica, fibra_coco, tela), diametro_cm (decimal), alto_cm (decimal), volumen_litros (decimal), coste (decimal), margen (decimal 0-1), pvp (computed: coste × (1 + margen))
- Sustrato CRUD: id (uuid), nombre (string), margen (decimal 0-1). Has N:M relation to Material via junction table `sustrato_materiales` (sustrato_id, material_id, litros). Coste computed dynamically: Σ(material.precio_litro × litros). PVP computed: coste × (1 + margen)
- New Drizzle schema tables: `materiales`, `macetas`, `sustratos`, `sustrato_materiales`
- New domain entities, ports, use cases, DTOs following foundation patterns
- New Hono route groups: `/materiales`, `/macetas`, `/sustratos`
- SvelteKit pages for each CRUD

## Capabilities

### New Capabilities
- `green-beard-material-crud`: Material entity CRUD — manage substrate raw materials with per-liter pricing
- `green-beard-maceta-crud`: Maceta entity CRUD — manage pots with dimensions, material enum, cost+margin pricing
- `green-beard-sustrato-crud`: Sustrato entity CRUD — manage substrates with N:M material composition, dynamic cost calculation, margin pricing

### Modified Capabilities
<!-- None -->

## Impact

- **New tables**: `materiales`, `macetas`, `sustratos`, `sustrato_materiales` (junction)
- **New routes**: 3 route groups in green-beard-api
- **New pages**: 3 CRUD sections in SvelteKit app
- **Domain complexity**: Sustrato introduces computed aggregates (cost from related materials) — first entity with derived pricing
- **Enum**: MacetaMaterial value object (terracota, plastico, ceramica, fibra_coco, tela)
