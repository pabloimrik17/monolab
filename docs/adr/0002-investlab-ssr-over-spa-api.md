---
status: superseded by ADR-0003
---

# InvestLab SSR over SPA with a separate API

In October 2026, we chose React Router 8 SSR (`ssr: true`) for `apps/investlab`, with route loaders and actions calling `investlab-application-server` use cases directly through the Inversify container in `app/lib/container.server.ts`, without a separate HTTP API. SPA mode forbids actions and restricts loaders; the single-origin app already needs Postgres and Redis on the server, so SSR avoids maintaining an API surface for now.

## Considered options

SPA with a separate HTTP API would reuse `investlab-data-contracts` and the future client packages, but adds an unnecessary boundary for the current consumer.

## Consequences

When a second mobile/SPA consumer appears, add an HTTP API and populate the client packages described in [ADR 0001](./0001-investlab-package-layering.md); existing server use cases stay as they are.
