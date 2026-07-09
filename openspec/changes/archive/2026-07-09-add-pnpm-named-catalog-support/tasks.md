## 1. Scan — pnpm named catalog detection (`scan-npm-updates`)

- [x] 1.1 In `skills/scan-npm-updates/SKILL.md` "Catalog post-processing" → pnpm branch, replace the "pnpm named catalogs … not yet supported" step with real emission: read the `catalogs:` map from `pnpm-workspace.yaml` and, for each `catalogs.<name>.<pkg>` entry, resolve the candidate via the existing `npm view` + `level` + `minimumReleaseAge` logic (identical to the default `catalog:` path).
- [x] 1.2 Emit named records with `location: "catalog:<name>"` and `catalogSource: { sourceFile: "pnpm-workspace.yaml", manager: "pnpm", field: { kind: "named", name } }`; no `underWorkspaces` key on pnpm records. Keep default `catalog:` records byte-identical.
- [x] 1.3 Remove the pnpm `named catalog "<name>" detected but not yet supported in this iteration` warning (SKILL text, the error-path table row, and the "Example output" warnings array).
- [x] 1.4 Generalize the ambiguous-default rule to pnpm: when both a top-level `catalog:` and a `catalogs.default` block exist, emit `ambiguous default catalog: both 'catalog' and 'catalogs.default' present; treating as distinct sources` and emit both as distinct records (`{ kind: "default" }` vs `{ kind: "named", name: "default" }`).
- [x] 1.5 Update the "Assembling the result" / location wording so `catalog:<name>` covers pnpm named catalogs (not only Bun), and refresh the `scan-npm-updates` example to show a pnpm named-catalog record.

## 2. Apply — pnpm named catalog edits (`apply-npm-updates`)

- [x] 2.1 In `skills/apply-npm-updates/SKILL.md` Step A2 pnpm branch, route by `catalogSource.field.kind`: `{ kind: "default" }` / omitted → the top-level `catalog:` block (unchanged); `{ kind: "named", name }` → the `catalogs.<name>` block. Locate the `name` key and `Edit` its value to the exact (range-stripped) target in place (never a YAML round-trip), preserving formatting/comments/key order.
- [x] 2.2 Handle the non-unique-token case for pnpm: scope the `Edit` match with neighboring context to the block resolved from `catalogSource.field` (e.g. distinguish `catalog.react` from `catalogs.react17.react`).
- [x] 2.3 Confirm the input-spec `catalogEdits` contract and hard-rules wording already cover pnpm named catalogs (they do — `field: { kind: "named" }` + PM-agnostic guard from the bun change); no type change required.

## 3. Command / doc cascade (wording only)

- [x] 3.1 `npm-update-deep-patch-command` spec (~L49): the scenario that models scan degradation via `warnings: ["named catalog \"test\" detected but not yet supported in this iteration"]` references a warning this change removes. Replace it with a still-valid degradation trigger (e.g. an `npm view <pkg>` failure warning) so the scenario stays meaningful.
- [x] 3.2 Sweep command/orchestrator specs, command `.md` files, and README for any remaining "pnpm `catalog:` first-class but named not supported" phrasing and update to "pnpm default + named catalogs first-class".

## 4. Verification

- [x] 4.1 pnpm fixture with a named catalog: `pnpm-workspace.yaml` declaring `catalog:` (default) + `catalogs.react17` (named) + consumers referencing `catalog:` and `catalog:react17`. Confirm scan emits a `catalog:react17` record with the correct `catalogSource`, no `not yet supported` warning, and that the default-catalog record is unchanged.
- [x] 4.2 Apply on the same fixture: a targeted `Edit` bumps `catalogs.react17.react` to the exact target, preserving format/comments/key order; the default `catalog:` block and all `catalog:*` consumer references are untouched.
- [x] 4.3 Ambiguous-default fixture (`catalog:` + `catalogs.default`): scan emits the ambiguous-default warning and two distinct records; apply routes each to the correct block via `catalogSource.field`.
- [x] 4.4 Regression: a default-only pnpm fixture and a Bun fixture produce byte-identical scan output (modulo none) and byte-identical apply edits vs. before this change.

## 5. Spec sync hygiene

- [x] 5.1 **Resolved: superseded — no parallel delta.** The legacy `experiments-plugin` umbrella spec (a "beta staging area" overview) is superseded by the granular `npm-update-scanning` / `npm-update-apply` capabilities, which own the scan/apply/catalog requirements and carry this change's deltas — the same conclusion `add-bun-catalog-support` reached. Its pre-existing pnpm-only / named-reserved restatements (L172 "first-class" and L194–196 "`catalog:<name>` reserved … MUST NOT be emitted … named catalogs surface only via `warnings`") are known legacy duplication (already flagged in memory as stale-ref tech debt) and are out of scope for this change's deltas. No MODIFIED delta authored. (memory: out-of-order sync risk.)
