---
status: amended by ADR-0007
---

# InvestLab package layering

In October 2026, while porting InvestLab, we chose shared domain and HTTP contracts, separate server and future client layers, and app-owned view models and composition roots to keep persistence and orchestration boundaries explicit. Shared `investlab-domain` contains entities, value objects, repository/service ports and errors; shared `investlab-data-contracts` contains DTOs and zod wire schemas; server-only `investlab-application-server` contains use cases and orchestration, while `investlab-data-server` contains Postgres repositories, datasources, mappers and drizzle/pool. `apps/investlab` is the React Router SSR app; `investlab-application-client` and `investlab-data-client` (HTTP repositories) are not created now, but will be created for the first SPA/mobile consumer, and `investlab-core` remains outside this layering as shared external-client infrastructure (Finnhub client, quote cache, ticker store). Amended later: `investlab-core` is dissolved, its Finnhub and Redis code becoming datasources in `investlab-data-server` and the browser-only ticker store moving into `apps/investlab` ([ADR 0004](./0004-investlab-datasources-and-read-queries.md)).

## Considered options

Rejected the previous single `investlab-data` implementation package, shared server/client use cases, and an `sdk` package: they blur runtime boundaries or add a premature abstraction.

## Consequences

Repository interfaces live in domain; each app binds a server or client implementation, never both in one bind. Datasources exist only for repositories with two or more sources, and cross-aggregate reads are read queries ([ADR 0004](./0004-investlab-datasources-and-read-queries.md)); entities never cross HTTP, and DTO/entity mapping occurs in the data layer on each side. The client packages are created now, with the SSR web as first consumer of the API ([ADR 0003](./0003-investlab-hono-api-behind-ssr.md)). Server and client use cases can share a name but never a package; clients write fetch inline against contract types, or contracts grow a `createClient(baseUrl)` factory when reuse warrants it. Empty client packages scaffolded by the original design were dropped from the port.
