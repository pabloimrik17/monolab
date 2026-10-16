# @m0n0lab/drizzle-neverthrow

[![npm version](https://img.shields.io/npm/v/@m0n0lab/drizzle-neverthrow.svg)](https://www.npmjs.com/package/@m0n0lab/drizzle-neverthrow)
[![drizzle-neverthrow coverage](https://codecov.io/gh/pabloimrik17/monolab/badge.svg?flag=drizzle-neverthrow)](https://codecov.io/gh/pabloimrik17/monolab?flag=drizzle-neverthrow)

Wrap a [Drizzle](https://orm.drizzle.team) Postgres client so queries return
[neverthrow](https://github.com/supermacro/neverthrow) `ResultAsync` instead of promises. You
choose the error type, so each domain keeps its own `PersistenceError`.

It replaces this, repeated in every repository:

```typescript
ResultAsync.fromPromise(this.db.select().from(items), (e) => new PersistenceError(e));
```

## Installation

`drizzle-orm` and `neverthrow` are peer dependencies and are never bundled.

```bash
pnpm add @m0n0lab/drizzle-neverthrow drizzle-orm neverthrow
```

```bash
npx jsr add @m0n0lab/drizzle-neverthrow
```

## Usage

```typescript
import { drizzle } from "drizzle-orm/node-postgres";
import { wrap } from "@m0n0lab/drizzle-neverthrow";

const db = wrap(drizzle(pool), { toError: (cause) => new PersistenceError(cause) });

// ResultAsync<Item[], PersistenceError>
const items = db.select((tx) => tx.select().from(itemsTable).where(eq(itemsTable.id, id)));

const created = db.insert((tx) => tx.insert(itemsTable).values(row).returning());
const updated = db.update((tx) =>
    tx.update(itemsTable).set(row).where(eq(itemsTable.id, id)).returning(),
);
const removed = db.delete((tx) => tx.delete(itemsTable).where(eq(itemsTable.id, id)).returning());
```

Each operation takes a callback that receives only the matching part of the Drizzle database
(`select` gets `select`/`selectDistinct`/`selectDistinctOn`, `insert` gets `insert`, and so on) and
returns the Drizzle query builder **without awaiting it**. The result is:

- `Ok(rows)` when the query resolves.
- `Err(toError(cause))` when the query rejects, or when the callback throws while building it.

## Scope: operations are added on demand

The wrapper covers only what a consumer in the monorepo uses today: `select`, `insert`, `update`
and `delete` (use `.returning()` to get rows back). It is **not** a 1:1 mirror of Drizzle.

If you need something missing (for example transactions), add it to the wrapper with an integration
test against a real Postgres, instead of calling Drizzle directly with `ResultAsync.fromPromise`.

Only Postgres databases (`PgDatabase`) are supported.

## Testing

```bash
pnpm nx run @m0n0lab/drizzle-neverthrow:test:unit
pnpm nx run @m0n0lab/drizzle-neverthrow:test:integration # needs a Docker-compatible daemon (Testcontainers)
```

## License

MIT
