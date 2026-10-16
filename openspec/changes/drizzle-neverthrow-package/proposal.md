## Why

`investlab-data-server` repeats `ResultAsync.fromPromise(query, (e) => new PersistenceError(e))` about 15 times, and `qup-data` does the same. Every repository re-implements the bridge between Drizzle's promise-based queries and neverthrow's `ResultAsync`. The same need exists across other repos of the author's fleet, so the bridge is published rather than kept internal.

## What Changes

- New publishable package `packages/drizzle-neverthrow` (`@m0n0lab/drizzle-neverthrow`, dual JSR + npm publish like `http-client`).
- It exposes a **wrapped Drizzle client**: queries built through it return `ResultAsync<T, E>` instead of promises, with the error produced by a caller-supplied factory (each domain keeps its own `PersistenceError`).
- **Kept simple**: the wrapper covers only the Drizzle operations InvestLab needs today (select, insert, update, delete with `returning`, and transactions if used); it is not a 1:1 mirror of Drizzle and grows on demand.
- `investlab-data-server` adopts it (via change `investlab-portfolio-instruments`, task 9.3). `qup-data` adopts it later (tracked in beads).

## Capabilities

### New Capabilities

- `drizzle-neverthrow`: wrapped Drizzle client returning `ResultAsync` with caller-defined error mapping.

### Modified Capabilities

## Impact

- New package with release-please configuration and peer dependencies on `drizzle-orm` and `neverthrow` (never bundled).
- `investlab-data-server` gains a workspace dependency on it.
