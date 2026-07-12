## Why

The `experiments` npm-update flow (`scan-npm-updates` + `apply-npm-updates`, consumed by every `npm-update-*` / `commander-update-*` command at every level) supports pnpm's **default** catalog (`catalog:` in `pnpm-workspace.yaml`) and both Bun catalogs (default + named), but **pnpm named catalogs** (`catalogs.<name>`, referenced as `catalog:<name>`) are still detected-and-skipped: the scan emits `named catalog "<name>" detected but not yet supported in this iteration` and no update records. So a dependency pinned in a pnpm named catalog is **never offered and never bumped**. This is the last remaining gap of [issue #233](https://github.com/pabloimrik17/monolab/issues/233) (`catalog-pinned deps silently skipped`); the bun and pnpm-default slices closed it in [#228](https://github.com/pabloimrik17/monolab/issues/228) (change `add-bun-catalog-support`) and earlier work.

## What Changes

- **Scan (`npm-update-scanning`):** when the PM is `pnpm`, parse the `catalogs:` map in `pnpm-workspace.yaml` and emit one update record per `catalogs.<name>.<pkg>` entry — mirroring the default `catalog:` path (same `npm view` + `level` + `minimumReleaseAge` candidate resolution):
  - `location: "catalog:<name>"`.
  - `catalogSource: { sourceFile: "pnpm-workspace.yaml", manager: "pnpm", field: { kind: "named", name: "<name>" } }`.
  - The previously reserved named-catalog slot is now **emitted**; the pnpm `named catalog … not yet supported` warning path is **removed**.
- **Ambiguous default (paridad con Bun):** pnpm allows the default catalog as either top-level `catalog:` **or** `catalogs.default`. When both coexist, emit `ambiguous default catalog: both 'catalog' and 'catalogs.default' present; treating as distinct sources` and emit both as distinct records, disambiguated by `catalogSource.field` (bare default `{ kind: "default" }` vs. `{ kind: "named", name: "default" }`) — the same rule Bun already applies.
- **Apply (`npm-update-apply`):** the `catalogEdits` contract already carries `field: { kind: "named"; name }` (no type change). Extend the **pnpm branch of the catalog-edit step** to route by `field.kind`: `{ kind: "named", name }` → locate the `<pkg>` key under `catalogs.<name>:` in `pnpm-workspace.yaml` and replace its value in place (exact version, prefix stripped, formatting/comments/key order preserved), scoping the `Edit` match with surrounding context when the same `name: version` token appears in more than one catalog block. `{ kind: "default" }` / omitted → unchanged top-level `catalog:` behavior (byte-identical).
- **No behavior change** to: pnpm default catalog, Bun catalogs (default + named), the consumer-`catalog:`-reference non-mutation guard, or any non-catalog path.

No new runtime dependency, library, or sidecar. All edits stay within Claude Code built-in tools (`Read`/`Edit`/`Bash`). No tests/lint/build/commits added to the flow. `underWorkspaces` is Bun-only and does not apply to pnpm.

## Capabilities

### New Capabilities
<!-- None — this extends two existing capabilities. -->

### Modified Capabilities
- `npm-update-scanning`: emit `catalog:<name>` update records for pnpm `catalogs.<name>` entries (same filtering as the default catalog); drop the pnpm named-catalog "not yet supported" warning; add the pnpm ambiguous-default warning + distinct-source behavior.
- `npm-update-apply`: extend the pnpm branch of the catalog-source-edit step to bump `catalogs.<name>.<pkg>` in `pnpm-workspace.yaml` in place, routing by `catalogSource.field.kind` and scoping non-unique token matches.

## Impact

- **Skills:** `claude-plugins/experiments/skills/scan-npm-updates/SKILL.md` (Catalog post-processing → pnpm branch, error-path table, example output) and `claude-plugins/experiments/skills/apply-npm-updates/SKILL.md` (Step A2 pnpm routing; input-spec/hard-rules wording already generic).
- **Command/doc cascade (wording only, no logic change):** `npm-update-deep-patch-command` spec (scenario at ~L49 uses the pnpm named-catalog warning as its degradation example) needs a non-warning replacement; sweep other command specs/docs for the stale `not yet supported` pnpm reference.
- **Callers inherit the fix for free:** all levels (`patch`/`minor`/`major`), shallow and deep, single-project and `commander-*`, route through the two shared skills — no per-command logic change.
- **No breaking changes:** pnpm default + Bun paths stay byte-identical.

## Open questions

- **Legacy `experiments-plugin` spec** (`openspec/specs/experiments-plugin/spec.md` ~L195) still restates the "`catalog:<name>` reserved for future iterations; MUST NOT be emitted" rule, which this change contradicts. Confirm during the specs phase whether it gets a parallel delta or is superseded by `npm-update-scanning`/`npm-update-apply` (see memory: out-of-order-sync risk — the bun change left the equivalent question open).
- **Research spike:** unlike `add-bun-catalog-support`, ncu behavior here is already verified — ncu@21.0.2 skips every `catalog:*` specifier and never rewrites `pnpm-workspace.yaml`, and named catalogs are structurally a nested map of the already-verified default. Assume no dedicated spike is needed unless the design phase surfaces a pnpm-specific unknown.
