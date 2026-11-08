# InvestLab modules depend on each other only along declared edges; trader modules are leaves

In November 2026, Roger became the second consumer of the instrument catalog, and the owner wants the global portfolio to see every holding by instrument, Roger's included, without copies. The `investlab-modular-packages` spec had turned an observation ("quotes needs only symbols, so the two modules never import each other") into a rule that a business module never imports another, and ADR 0007 never argued it. Kept as a ban, it forces either a copy of the catalog inside Roger or business orchestration inside the apps, which ADR 0009 forbids. We keep what the ban protected (no cycles, removable modules, no reaching into internals) and drop the ban itself.

This ADR amends [ADR 0007](./0007-investlab-package-per-module.md) (business modules never import each other).

- **The catalog is a module.** `Instrument` moves from `@m0n0lab/investlab-portfolio` to `@m0n0lab/investlab-catalog` (the `investlab-instrument-catalog` change), as the modular-packages design foresaw for a second consumer.
- **Declared edges.** A module package may import another only along an edge declared in the product's lint configuration. Today the edges are portfolio → catalog and roger → catalog. An undeclared import fails the boundary lint; a cycle fails CI.
- **Public entries only, per side.** A dependant imports the dependency's `.` entry from any layer that may import domain, and its `./server` or `./client` entry only from code of the same side. It writes the dependency's data only through the dependency's use cases. It may reference the dependency's tables for foreign keys and read-query joins, and rebuild the joined rows, or the dependency's DTOs it receives, with the dependency's own mappers, so the dependency's `./server` entry exports its table definitions and their row mappers, and its `./client` entry its DTO mappers; repositories and their tokens stay private.
- **Trader modules are leaves.** No module imports a module that follows a trader, such as `@m0n0lab/investlab-roger`. Only the apps load it, so hiding or removing one touches the apps alone.
- **Views across trader modules read a port they own.** A module that adds up what several trader modules hold, such as the global portfolio or the stock-picking summary, declares a port for it. Each trader module implements that port, with an edge towards the port's owner, and the apps bind every implementation they load. The aggregator never imports a trader module, so it sees every trader the app loads and none it does not. Which module owns the port, and its shape, are settled with the first such view.

## Considered options

- Keep the ban and copy each stock's data into Roger: rejected. The global portfolio must sum holdings by instrument, and copies drift.
- Keep the ban and orchestrate in the apps (a route that creates the instrument, then the entry): rejected. A route would hold business logic (ADR 0009).
- Put the catalog in `investlab-core`: rejected. Core is the kernel of errors and the envelope; a catalog with tables and use cases would drag the platform and the database into it.
- Let any module import any other, banning only cycles, as app modules do: rejected. The edge list records which modules know each other, and a trader module stays removable only while nothing imports it.
- The apps join each trader module's data for the global views: rejected. Adding up holdings is business logic, which routes may not hold (ADR 0009).
- The aggregator reads the trader modules' tables in one read query: rejected. It would import every trader module, so none would stay a leaf.
- Events between modules: rejected for now. One API process, no bus, and nothing needs asynchrony yet.

## Consequences

- The lint's per-module ban becomes the declared edge list in `eslint.config.ts`, next to the product's module list.
- The Nx graph gains catalog → portfolio and catalog → roger, so a catalog change affects both modules' tests.
- Portfolio no longer owns instrument errors or endpoints; it imports `InstrumentNotFoundError` from the catalog for the items it validates.
- A future trader module joins with one edge to the catalog and nothing pointing at it.
