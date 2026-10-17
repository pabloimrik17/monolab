## Context

Repositories wrap every Drizzle call in `ResultAsync.fromPromise` with the same error factory. The author chose a wrapped client over a helper function, and publishing now over keeping it internal.

## Goals / Non-Goals

**Goals:**

- One place that turns Drizzle queries into `ResultAsync`.
- Caller-defined error type, so packages keep their domain `PersistenceError`.
- Published from day one (npm only), versioned by release-please.

**Non-Goals:**

- Mirroring the whole Drizzle API: operations are added when a consumer needs them.
- Owning schema, migrations or connection pooling.

## Decisions

- **Wrapped client, not a helper function.** `wrap(db, { toError })` returns an object whose supported query entry points produce `ResultAsync`. A helper (`fromQuery(query, toError)`) was simpler to type but left the wrapping at every call site.
- **Small surface, typed explicitly.** Each supported operation is a hand-written method delegating to Drizzle and typed from Drizzle's own builder return types; no generic `Proxy` over every builder, which would break with Drizzle updates.
- **Peer dependencies** on `drizzle-orm` and `neverthrow`; never bundled. Exports validated with `attw --pack`.
- **First consumer** is `investlab-data-server`; `qup-data` follows separately so the API settles with one consumer first.

## Risks / Trade-offs

- **Public API early** — Publishing before a second consumer fixes names sooner; mitigated by staying on 0.x until QUP adopts it.
- **Drizzle type churn** — Delegating methods typed from Drizzle builders can break on Drizzle majors; mitigated by the small surface.
