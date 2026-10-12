## 1. Package scaffold

- [ ] 1.1 Generate `packages/drizzle-neverthrow` following `packages/http-client` (tsdown, vitest shared config, tsconfig presets, project.json, JSR + npm publish, release-please entry)
- [ ] 1.2 Declare `drizzle-orm` and `neverthrow` as peer dependencies; validate exports with `attw --pack` (affects exports)

## 2. Wrapper

- [ ] 2.1 Implement `wrap(db, { toError })` with the operations `investlab-data-server` uses (select, insert/update/delete with `returning`; transactions only if used)
- [ ] 2.2 Integration tests per operation against Postgres from Testcontainers
- [ ] 2.3 README with usage and the "add operations on demand" rule

## 3. Adoption and verification

- [ ] 3.1 `investlab-data-server` replaces `ResultAsync.fromPromise` calls (task 9.3 of `investlab-portfolio-instruments`)
- [ ] 3.2 Verify `nx run drizzle-neverthrow:build`, `nx run drizzle-neverthrow:test`, `nx run drizzle-neverthrow:typecheck`
- [ ] 3.3 `qup-data` adoption tracked in beads, not in this change
