---
status: amended by ADR-0007, ADR-0009
---

# InvestLab datasources only for multi-source repositories; cross-aggregate reads are queries

In October 2026 we narrowed [ADR 0001](./0001-investlab-package-layering.md): a repository talks to its driver (Drizzle on the server, `fetch` in `investlab-data-client`) directly while it has one source, and a datasource per entity × source is introduced only when a second source appears (cache, another API, storage); the repository then decides order and combination. Reads that combine several aggregates, such as a PortfolioItem with its Instrument, are read queries with their own port and read-model type, not repository methods. This keeps repositories one-per-aggregate and avoids a pass-through file per entity and side.

## Considered options

- Datasource always, even with one source (ADR 0001 as written): rejected; every current repository would forward 1:1, and the uniformity it bought was never implemented.
- A repository coordinating datasources of two aggregates for the item + instrument view: rejected; the PortfolioItem repository would return something that is not its aggregate and depend on another aggregate's source.
- The use case loading both aggregates and joining in memory (the original implementation): rejected; it loads the whole Instrument catalog and leaves the join outside the database.

## Consequences

- Quotes are the first multi-source repository: a quote repository combines a Redis cache datasource and a Finnhub datasource behind the API. `investlab-core` is dissolved: the quote port stays in `investlab-domain`, Finnhub and Redis code become those datasources in `investlab-data-server`, and the browser-only ticker store moves into `apps/investlab` until the legacy ticker list is retired.
- Read-query ports and their read-model types live in `investlab-domain` next to repository ports; `investlab-data-server` implements them with SQL joins, `investlab-data-client` with one HTTP call.
- Row ↔ entity mappers stay in their own non-exported `mappers/*.mapper.ts` modules, because repositories and read queries share them and they are unit-tested without a database; a private method is used only when exactly one place maps.
