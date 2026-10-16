# InvestLab error `code` is the discriminant across HTTP

In October 2026, once the web started calling `apps/investlab-api` ([ADR 0003](./0003-investlab-hono-api-behind-ssr.md)), we made each domain error's `code` the identity of the error on both sides of the wire. Error classes cannot cross HTTP: the API sends `{ code, message, statusCode }` and `investlab-data-client` rebuilds the matching domain error from `code`. Codes stay SCREAMING_SNAKE without a namespace (`PORTFOLIO_ITEM_NOT_FOUND`), and `code` is typed as a literal union so both sides switch over it exhaustively.

## Considered options

- Map by class `name`, as `apps/qup-api` does: rejected; it works inside one process but the client receives only JSON.
- Namespaced codes (`PORTFOLIO.ITEM_NOT_FOUND`): rejected; no client mixes errors from several services.
- Numeric codes: rejected; unreadable in logs and tests without a lookup table.

## Consequences

- The API's error-to-HTTP-status map is keyed by `code`, not by class name.
- Every use case exports a named error union next to it (for example `PortfolioItemUpdateError`); client use cases have their own union, which adds network/API-unavailable and rejected-token errors.
- Renaming a code is a breaking wire change.
