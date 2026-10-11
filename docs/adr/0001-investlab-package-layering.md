# InvestLab package layering

In October 2026, while porting InvestLab, we chose shared domain and HTTP contracts, separate server and future client layers, and app-owned view models and composition roots to keep persistence and orchestration boundaries explicit. Shared `investlab-domain` contains entities, value objects, repository/service ports and errors; shared `investlab-data-contracts` contains DTOs and zod wire schemas; server-only `investlab-application-server` contains use cases and orchestration, while `investlab-data-server` contains Postgres repositories, datasources, mappers and drizzle/pool. `apps/investlab` is the React Router SSR app; `investlab-application-client` and `investlab-data-client` (HTTP repositories) are not created now, but will be created for the first SPA/mobile consumer, and `investlab-core` remains outside this layering as shared external-client infrastructure (Finnhub client, quote cache, ticker store).

## Considered options

Rejected the previous single `investlab-data` implementation package, shared server/client use cases, and an `sdk` package: they blur runtime boundaries or add a premature abstraction.

## Consequences

Repository interfaces live in domain; each app binds a server or client implementation, never both in one bind. A datasource always separates a repository implementation from its driver, even with one source; entities never cross HTTP, and DTO/entity mapping occurs in datasources on each side. Server and client use cases can share a name but never a package; clients write fetch inline against contract types, or contracts grow a `createClient(baseUrl)` factory when reuse warrants it. Empty client packages scaffolded by the original design were dropped from the port.
