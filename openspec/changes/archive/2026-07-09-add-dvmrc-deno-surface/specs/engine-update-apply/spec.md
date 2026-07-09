## MODIFIED Requirements

### Requirement: Exact pinning and alignment of runtime surfaces

For each engine, the skill SHALL rewrite every `runtime` locus to the **same exact** resolved version (no ranges), aligning all runtime surfaces — consistent with the family-wide exact-pin policy. Edits SHALL be surgical: only the version token changes. For a `packageManager` value (`name@X`) the skill SHALL preserve the `name@` prefix and replace the version; any corepack integrity suffix (`+sha…`) SHALL be dropped by default (corepack re-resolves), and that drop SHALL be reported. For a whole-file version file (`.nvmrc`, `.node-version`, `.dvmrc`) the skill SHALL replace the entire version token, preserving any leading `v` the file used.

#### Scenario: All runtime Node surfaces aligned and pinned exact

- **WHEN** the Node target is `26.0.0` and the repo pins Node in `.nvmrc`, root `engines.node`, and CI
- **THEN** all three are rewritten to exactly `26.0.0` (no `^`/`~`)

#### Scenario: Deno .dvmrc rewritten and aligned on a Deno bump

- **WHEN** the Deno target is `2.10.0` and the repo pins Deno in a root `.dvmrc` (`2.9.0`), `engines.deno`, and `devEngines.runtime`
- **THEN** all three are rewritten to exactly `2.10.0`, and the `.dvmrc` whole-file token is replaced preserving any leading `v` the file used

#### Scenario: packageManager prefix preserved, hash dropped

- **WHEN** `packageManager` is `pnpm@10.27.0+sha512.abc` and the pnpm target is `11.0.0`
- **THEN** it becomes `pnpm@11.0.0`, and the dropped integrity hash is reported
