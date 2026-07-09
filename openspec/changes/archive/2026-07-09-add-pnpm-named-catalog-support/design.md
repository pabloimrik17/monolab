## Context

`scan-npm-updates` (capability `npm-update-scanning`) and `apply-npm-updates` (capability `npm-update-apply`) are the two shared skills every `npm-update-*` / `commander-update-*` command funnels through. After `add-bun-catalog-support` (#228), the catalog matrix is:

| Catalog                         | Scan | Apply |
| ------------------------------- | ---- | ----- |
| pnpm `catalog:` (default)       | ✅   | ✅    |
| pnpm `catalogs.<name>` (named)  | ❌   | ❌    |
| bun `catalog` (default)         | ✅   | ✅    |
| bun `catalogs.<name>` (named)   | ✅   | ✅    |

The one gap is **pnpm named catalogs**. pnpm declares them in `pnpm-workspace.yaml` under a `catalogs:` map (`catalogs.<name>.<pkg>`, referenced `catalog:<name>`), alongside the default top-level `catalog:` map. Today the scan detects the `catalogs:` map and emits `named catalog "<name>" detected but not yet supported in this iteration`, emitting no records — so pnpm named-catalog deps are invisible and never bumped. This is the last remaining slice of issue #233.

The infrastructure for this already exists from the bun work: the `ScanResult` record and the apply `catalogEdits` element both carry `catalogSource = { sourceFile, manager: "pnpm"|"bun", field: { kind: "default" } | { kind: "named"; name }, underWorkspaces? }`. `manager: "pnpm"` + `field.kind: "named"` is already a representable, typed combination — it is simply never produced (scan) or routed (apply) yet.

## Goals / Non-Goals

**Goals:**

- Scan reads the `catalogs:` map in `pnpm-workspace.yaml` and emits update records for every named catalog (`location: "catalog:<name>"`, `catalogSource.field = { kind: "named", name }`), using the same `npm view` + `level` + `minimumReleaseAge` filtering as the default catalog.
- Apply bumps `catalogs.<name>.<pkg>` in `pnpm-workspace.yaml` in place, routing by `catalogSource.field.kind`, preserving formatting/comments/key order.
- Ambiguous-default parity: a repo declaring both top-level `catalog:` and `catalogs.default` behaves like the Bun equivalent (distinct sources + warning).
- pnpm default-catalog and all Bun behavior stay **byte-identical**.

**Non-Goals:**

- No `ScanResult` / `catalogEdits` **type** change — the shape already admits `manager:"pnpm"` + named `field`. This is a producer/router change only.
- No ncu-based catalog bumping — ncu does not rewrite `pnpm-workspace.yaml`; the in-place `Edit` path stays the single write mechanism.
- No `underWorkspaces` for pnpm (that placement is Bun-only; the field stays absent on pnpm records, as today).
- No catalog support for npm/yarn/deno (no comparable feature).
- No tests/lint/build/commits added to the flow; no engines/toolchain changes.

## Decisions

**D1 — Producer/router change, not a contract change.** The `catalogSource` descriptor added by the bun change is PM-agnostic. This change only makes the scan **emit** `{ manager: "pnpm", field: { kind: "named", name } }` records and the apply **route** on them. The apply input contract, the `ScanResult` TS shape, and the `catalogSource` field are unchanged. *Alt considered:* a pnpm-specific `namedCatalogs` field — rejected as redundant with the existing generic descriptor.

**D2 — Mirror the pnpm default-catalog scan path.** For each `catalogs.<name>` block, reuse the identical candidate resolution the default `catalog:` block already uses (`npm view <name> versions time --json`, cached per scan; filter by `level` band + `minimumReleaseAge`; set `skippedByReleaseAge` when a higher version is held back). Only the source location (`catalogs.<name>` vs `catalog`) and the record's `location` / `field` differ. pnpm's native `minimumReleaseAge` (read by ncu from `pnpm-workspace.yaml`) is irrelevant here because the catalog path resolves candidates via `npm view` + the skill's own age filter, exactly as the default catalog already does.

**D3 — Default catalog is `catalog:` top-level; `catalogs.<name>` is always named.** pnpm's canonical default is the top-level `catalog:` map. A `catalogs.default` block (allowed by pnpm as an alternate default spelling) is treated as a **named** catalog whose name is `default`, exactly as Bun treats it. When both a top-level `catalog:` and `catalogs.default` are present, emit the warning `ambiguous default catalog: both 'catalog' and 'catalogs.default' present; treating as distinct sources` and emit both as distinct records — disambiguated by `catalogSource.field` (bare default `{ kind: "default" }` vs `{ kind: "named", name: "default" }`), which is what apply routes on. This reuses the Bun rule verbatim, generalized to be PM-agnostic in the spec wording.

**D4 — Apply routes the pnpm branch by `field.kind`; write via targeted in-place `Edit`.** Step A2's pnpm branch generalizes: `{ kind: "default" }` (or omitted `catalogSource`) → the top-level `catalog:` block (today's behavior, byte-identical); `{ kind: "named", name }` → the `catalogs.<name>` block. In both cases locate the `<pkg>` key and `Edit` its value to the exact (range-stripped) target, preserving surrounding whitespace/comments/key order — never `JSON`-round-tripping the YAML. When the same `name: version` token appears in more than one catalog block (e.g. `catalog.react` and `catalogs.react17.react`), scope the `Edit` match with neighboring context / the enclosing block's opening line — identical to the Bun non-unique-token rule.

**D5 — Named-catalog warning removed for pnpm; PM-agnostic warning wording.** The scan's `named catalog … not yet supported` warning path is deleted (it was pnpm-only after the bun change; nothing else emits it). The ambiguous-default warning is reworded once to cover both PMs.

## Risks / Trade-offs

- **Same dep name in two catalog blocks** (e.g. `catalog.react` and `catalogs.react17.react`) → D4 scopes the `Edit` to the block resolved from `catalogSource.field`; if the version token is non-unique within that block, include neighboring lines in the match. (Same mitigation the Bun path already documents.)
- **YAML edit reformats / reorders keys** → targeted string `Edit` (not parse→dump) keeps the diff minimal; matches the existing pnpm default-catalog contract.
- **`catalogs.default` ambiguity** → D3 warning + distinct `catalogSource.field` keeps apply unambiguous; rare, not worth a richer `location` encoding.
- **Legacy `experiments-plugin` spec** restates the "`catalog:<name>` reserved / MUST NOT be emitted" rule this change contradicts → resolve in the specs phase (open question). Precedent: the bun change deemed it **superseded** by the granular `npm-update-scanning` / `npm-update-apply` capabilities and authored no parallel delta.
- **ncu behavior** — no spike needed: ncu@21.0.2 skips every `catalog:*` specifier and never rewrites `pnpm-workspace.yaml`, already verified for the pnpm default catalog; named catalogs are structurally a sibling nested map. The PM-agnostic consumer-`catalog:`-reference guard from the bun change already covers pnpm.

## Migration Plan

N/A — skill-behavior change, no deploy/rollback. Purely additive for pnpm named catalogs; pnpm default + all Bun paths are byte-identical (verifiable by diffing scan output / apply edits on a default-only pnpm fixture before and after). No contract field is added or changed.

## Open Questions

- Does the legacy `experiments-plugin` spec need a parallel MODIFIED delta for the reserved-slot statement (~L195), or is it superseded by `npm-update-scanning` / `npm-update-apply` (as the bun change concluded)? Resolve before sync/archive. (memory: out-of-order sync risk.)
- `npm-update-deep-patch-command` spec (~L49) uses the pnpm `named catalog … not yet supported` warning as its scan-degradation example scenario. Replace with a still-valid degradation trigger (e.g. an `npm view` failure warning) rather than a now-removed warning — confirm the substitute during specs/apply.
