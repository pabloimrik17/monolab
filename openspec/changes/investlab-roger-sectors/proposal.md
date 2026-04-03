## Why

Roger tracks positions across many sectors but provides no visibility into sector diversification. Without allocation vs target comparison, the trader can't identify over/under-exposure to specific sectors, risking concentration without awareness.

## What Changes

- Sector allocation view: calculates actual $ and % distribution across sectors from active entries (COMPRAR/INVERTIDO/VENDER states)
- Configurable sector targets: user sets desired % per sector (must sum to 100%)
- Comparison table: actual vs target with visual indicators for deviation
- Handles instruments without sector as "Unclassified"

## Capabilities

### New Capabilities

- `roger-sector-allocation`: Sector distribution analysis and target configuration. Calculates actual allocation from active entries (sum of currentPrice x quantity per sector), displays against user-configured target percentages, color-coded deviation indicators (over/under/on-target within +/-2%)

### Modified Capabilities

None

## Impact

- **New route**: `/roger/sectors` or section within `/roger` in `apps/investlab`
- **New domain entity**: SectorTarget configuration (sector -> target %) in `packages/investlab-domain`
- **New data layer**: sector_targets schema, migration, SectorTargetRepository in `packages/investlab-data`
- **Prereq**: `investlab-roger-positions` (entries exist with instruments that have sectors)
