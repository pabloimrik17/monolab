## Why

Roger (`investlab-roger-positions`) needs the instrument catalog, and the global portfolio must see Roger's holdings by the same instruments, without copies. The catalog lives inside `@m0n0lab/investlab-portfolio`, and the module rule forbids one business module importing another. The modular-packages design foresaw this: a second instrument consumer moves the catalog into its own module. [ADR 0010](../../../docs/adr/0010-investlab-module-dependencies.md) records the dependency rule that replaces the ban.

## What Changes

- New module package `@m0n0lab/investlab-catalog`: the `Instrument` model, its value objects (instrument type, asset class, sector), errors, repository port, the four instrument use cases per side, DTOs, the `instruments` table, mappers, builders and the integration tests, moved from `@m0n0lab/investlab-portfolio` unchanged in behaviour.
- `@m0n0lab/investlab-portfolio` keeps portfolio items only and imports the catalog for `InstrumentNotFoundError`, the instrument read model and the `instruments` table (foreign key and read-query join).
- **BREAKING** (internal): the module rule "a business module never imports another" becomes "modules import each other only along declared edges, through public entries, without cycles; trader modules are leaves". Today's edges: portfolio → catalog. The boundary lint changes accordingly.
- The instrument "in use" refusal covers any reference, not just portfolio items; its message no longer names the portfolio.
- The API moves the instrument routes from `src/portfolio/` to `src/catalog/` and loads the catalog server module. Routes and wire contract are unchanged.
- The web's server container loads the catalog client module; the portfolio page keeps working unchanged.
- The specs drop the never-implemented "auto-create on first reference" (`upsertBySymbol`) and describe the real instrument repository port.

## Capabilities

### New Capabilities

None. The catalog's behaviour is already `investlab-instrument-management`.

### Modified Capabilities

- `investlab-instrument-management`: the catalog module owns instruments and their use cases; delete is refused while anything references the instrument; the auto-create requirement is removed; the repository requirement matches the real port.
- `investlab-module-packages`: the catalog is a module package; modules depend only along declared edges; the API container loads the catalog; the kernel and lint scenarios name the catalog.
- `investlab-http-api`: instrument endpoints validated by the catalog module's DTOs; the API container loads the catalog.
- `investlab-persistence`: the instrument repository implements the catalog's port; foreign keys from other modules map to the in-use error.
- `clean-architecture-layout`: path examples for the instrument table, routes and harness move to the catalog.
- `portfolio-holdings`: the item repository refuses an unknown instrument through the foreign key and loses `existsForInstrument`; item create no longer reads the instrument repository.

## Impact

- **New package**: `packages/investlab-catalog` (entries `.`, `./server`, `./client`, `./testing`), with Vitest projects, coverage at 80, Stryker, and its own integration test setups.
- **Moved code**: instrument files out of `packages/investlab-portfolio`; `apps/investlab-api/src/portfolio/route/instrument.*` to `src/catalog/route/`.
- **Database**: no migration. The `instruments` table definition moves files only; `db:generate` must report no change.
- **Lint**: `eslint.config.ts` gains `catalog` in the module list and a declared-edge map replacing the "business modules never import each other" ban.
- **Glossary**: `GLOSSARY-MAP.md` names the catalog module; the InvestLab glossary stays where it is (see design, Open Questions).
- **Unblocks**: `investlab-roger-positions`, which adds the edge roger → catalog.
