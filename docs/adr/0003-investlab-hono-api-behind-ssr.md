---
status: amended by ADR-0007
---

# InvestLab web talks to a separate Hono API

In October 2026 we chose a separate Hono app, `apps/investlab-api`, as the only owner of Postgres, Redis and Finnhub. The React Router SSR app `apps/investlab` calls that API over HTTP from its loaders, actions and resource routes; the browser never calls the API. This supersedes [ADR 0002](./0002-investlab-ssr-over-spa-api.md), which recorded "no separate API" by mistake: the intent was always a clean-architecture backend that the web consumes, and it is built now rather than when a second consumer appears.

## Considered options

- Browser calls the API directly (SPA): rejected; it loses actions, needs CORS and puts the API on the public internet with real user auth.
- Mixed (browser for live quotes, web server for the rest): rejected; two paths to maintain.
- Keep use cases in the SSR process (ADR 0002): rejected; it is not the intended architecture.

## Consequences

- The API follows the `apps/qup-api` shape: routes → container → server use case → `result.match` → error mapping to HTTP; wire types come from `investlab-data-contracts`.
- The API is protected by a shared secret (`Authorization: Bearer`) that only the web server holds; user login waits for a second consumer.
- `investlab-application-client` and `investlab-data-client` from [ADR 0001](./0001-investlab-package-layering.md) are created now, with the web as their first consumer; the app keeps only composition root and ViewModels. Client use cases that are pure pass-throughs for CRUD are accepted for consistency.
- Live quotes go browser → web resource route → API → Redis quote cache → Finnhub; `VITE_FINNHUB_API_KEY` disappears and the key never ships to the browser.
- The web no longer needs `DATABASE_URL`, `REDIS_URL` or `FINNHUB_API_KEY`; it needs the API base URL and token.
