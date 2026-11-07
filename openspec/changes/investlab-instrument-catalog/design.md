# Instrument Catalog Design

## Context

`@m0n0lab/investlab-portfolio` holds two aggregates: `PortfolioItem` and `Instrument`. Two portfolio use cases read the instrument repository directly: item create checks that the instrument exists, and instrument delete asks the item repository `existsForInstrument` before deleting, with the foreign key as a race backstop. The item list read query joins `portfolio_items` with `instruments` in one SQL query (ADR 0004). The lint factory in `eslint.config.ts` (`moduleBans`) bans every import between the product's modules. [ADR 0010](../../../docs/adr/0010-investlab-module-dependencies.md) replaces that ban with declared edges.

## Goals / Non-Goals

**Goals:**

- Move the catalog out of portfolio with no change in behaviour: same routes, wire contract, errors and tables.
- Leave portfolio and future modules depending on the catalog through public entries only.

**Non-Goals:**

- Remodel instruments. Separating exposure (what an instrument replicates), product and holding, and whether "Instrument" is the right name, belong to the Portfolio redesign tracked in Linear.
- Add any instrument UI to the web.
- Touch Roger; `investlab-roger-positions` adds its own edge.

## Decisions

### 1. What moves

| From `investlab-portfolio` | To `investlab-catalog` |
| --- | --- |
| `domain/model/instrument.model.ts` (+ unit test) | same path |
| `domain/value-object/{instrument-type,asset-class,sector}.value-object.ts` | same paths |
| `domain/error/instrument.error.ts` | same path |
| `domain/repository/instrument.repository.ts` | same path |
| `application/{server,client}/use-case/instrument-*.use-case.ts` (+ integration tests) | same paths |
| `data/shared/dto/instrument.dto.ts`, `data/client/{mapper,repository}/instrument-*`, `data/server/{infra/db,mapper,repository}/instrument*` (+ legacy tests) | same paths |
| `testing/shared/builder/instrument.builder.ts` | same path |

The catalog gets its own `di/`, tokens (`CATALOG.InstrumentCreate|Update|Delete|List` per side, `CATALOG_PORTS.InstrumentRepository` private), entries (`.`, `./server`, `./client`, `./testing`), `testing/{server,client}` setups and Vitest config. Moves use `git mv` so history follows. `docs/legacy-tests.txt` follows the two legacy files.

Portfolio keeps `PortfolioItem`, its read model (which now imports `Instrument` from the catalog's `.` entry), its query, DTOs and use cases. `PortfolioRemoteError` becomes `RemotePortError<InstrumentNotFoundError | PortfolioItemNotFoundError | PortfolioItemConflictError>`; the catalog defines `CatalogRemoteError = RemotePortError<InstrumentNotFoundError | InstrumentInUseError | InstrumentAlreadyExistsError>`.

### 2. Referential integrity through foreign keys

No module reads another module's repository (ADR 0010). The two cross-aggregate checks become foreign-key mappings:

- **Item create with an unknown instrument:** the portfolio item repository maps the foreign-key violation on `portfolio_items.instrument_id` to `InstrumentNotFoundError`. The use case drops its instrument lookup. An item's instrument never changes after creation.
- **Instrument delete while referenced:** the catalog's instrument repository maps any foreign-key violation on delete to `InstrumentInUseError`, whichever table references the row. The use case drops its `existsForInstrument` pre-check, and the item repository port drops `existsForInstrument`.

Alternative rejected: the catalog asks each dependant through a port ("is this instrument used?"). The dependency would point back from catalog to its dependants, and every new module would add a port. The database already knows every reference.

Behaviour difference: an item create with both an invalid body and an unknown instrument now answers the validation error first. Bodies are validated at the API before any use case runs, so no request sees the difference.

### 3. The catalog's `./server` entry exports its table

Dependants need the `instruments` table object for their foreign key (`references(() => instruments.id)`) and for read-query joins. The catalog's `./server` entry exports the table definition and nothing else of its data layer; repositories and tokens stay private. Writes to instruments go only through catalog use cases. The database package's glob over `data/server/infra/db/*.table.ts` already includes the catalog's file, so no migration is generated.

### 4. Declared edges in the lint

`investlabLayout` gains `catalog` in `modules` and a `dependsOn` map: `{ portfolio: ["catalog"] }`. `moduleBans` bans every module not listed for the importing module. A listed dependency is allowed through the same entries the side rules already allow for that folder: `.` from side-free code, `./server` from server code, `./client` from client code, `./testing` from tests and harnesses. The factory rejects a `dependsOn` map that has a cycle when the config loads, so a cycle fails every lint run. Other products' factory calls pass no `dependsOn` and keep the full ban.

### 5. Apps

- **API.** `src/portfolio/route/instrument.route.ts`, its harness, integration-platform test and `src/portfolio/mapper/instrument-dto.mapper.ts` move to `src/catalog/`. `src/app.ts` mounts the catalog routes. The container loads the catalog server module before portfolio's. The portfolio route imports the instrument DTO mapper from `#catalog/mapper/…`; app modules may import each other.
- **Web.** The server container loads the catalog client module. No page uses it yet.

### 6. Tests and gates

The moved tests run unchanged, in the catalog package. Portfolio integration tests that need an instrument create it with the catalog's builder and its server use case, or use the seed. The catalog starts at coverage 80 and Stryker thresholds 90/80/80. Portfolio keeps its floors; if the move drops a measured value below a floor, the move is wrong (the remaining code is item code with its own tests), not the floor.

## Risks / Trade-offs

- [Mapping the FK violation on create loses the "which instrument" detail if a body could ever reference two instruments] → An item references exactly one; the error carries the id from the body.
- [Exporting a table invites dependants to write to it] → The lint allows the import only in `data/server/`, and review checks that dependants only reference or join it. A write would bypass catalog validation; no use case needs one.
- [Moving files breaks open PRs that touch instrument code] → None open today. Land this change before Roger.
- [Lint factory change affects every product] → `dependsOn` is optional; qup and green-beard calls are unchanged, and the lint suite runs on all of them in CI.

## Migration Plan

One PR, the base layer of the Roger stack. No data migration: `db:generate` must report no change after the move. Rollback is a revert.

## Open Questions

- The InvestLab glossary lives in `packages/investlab-portfolio/src/domain/GLOSSARY.md` and now covers catalog, portfolio and Roger. It can stay there or move to a neutral place later; neither choice changes the specs.
