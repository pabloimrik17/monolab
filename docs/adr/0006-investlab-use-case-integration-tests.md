# InvestLab use cases are tested through real adapters, faking only the far edge

In October 2026 we replaced InvestLab's use-case tests with mocked repositories by integration tests that run the real adapters and fake only the outermost dependency, with real behaviour. API use cases run against Postgres and Redis started by Testcontainers, and external HTTP APIs such as Finnhub are faked with MSW; web (client) use cases run the real `investlab-data-client` repositories against `investlab-api` faked with MSW. Unit tests remain only for entities, mappers and other pure logic. Mocked repositories only proved that the use case called the mock; the bugs that matter live in queries, mapping and wire contracts.

## Considered options

- Keep mocked-repository unit tests next to the integration tests: rejected; double maintenance for little extra signal.
- Embedded Postgres without Docker: rejected; Redis has no equivalent, so the quote cache would need a mock, which is what we are moving away from.
- Testcontainers in CI and embedded Postgres locally: rejected; two paths whose bugs differ.

## Consequences

- Running the tests requires a Docker-compatible daemon locally (Docker Desktop, OrbStack or colima) and in CI (GitHub Actions runners already have Docker).
- Integration tests are slower than unit tests; they belong in their own test target so the unit target stays fast.
- QUP keeps its mocked-repository tests until it is migrated separately.
