## MODIFIED Requirements

### Requirement: Drizzle migrations

Schema changes SHALL be managed via drizzle-kit migrations owned by `@m0n0lab/investlab-database`. Each module SHALL declare each of its tables in its own `data/server/infra/db/<concept>.table.ts`; the database package's drizzle config SHALL list the modules' table files by glob, without importing them. The API's `db:generate` and `db:migrate` scripts SHALL delegate to the database package.

#### Scenario: Generate migration

- **WHEN** a module's Drizzle schema is modified and `db:generate` runs
- **THEN** a new SQL migration file is created in `packages/investlab-database/drizzle`

#### Scenario: Apply migration

- **WHEN** the API's `db:migrate` runs
- **THEN** the database schema is updated to match the Drizzle schema of every module

#### Scenario: Moved migrations are not re-applied

- **WHEN** `db:migrate` runs against a database that applied the migrations before they moved to `packages/investlab-database`
- **THEN** only migrations added after the move are applied

#### Scenario: Tables split per file generate no migration

- **WHEN** `db:generate` runs right after the tables move from `schema.ts` to one `*.table.ts` file each
- **THEN** drizzle-kit reports no schema change and writes no migration

#### Scenario: New table picked up by the glob

- **WHEN** a module adds `data/server/infra/db/<concept>.table.ts`
- **THEN** `db:generate` includes it without editing the drizzle config
