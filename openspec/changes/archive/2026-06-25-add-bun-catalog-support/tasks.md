## 1. Scan — Bun catalog detection (`scan-npm-updates`)

- [x] 1.1 In `skills/scan-npm-updates/SKILL.md` "Catalog post-processing" section, add a `bun` branch alongside the pnpm branch: when `packageManager === "bun"`, read the root `package.json` catalog maps (may use `bun pm pkg get catalog` / `bun pm pkg get catalogs`) and parse `catalog`, `workspaces.catalog`, `catalogs.<name>`, `workspaces.catalogs.<name>`.
- [x] 1.2 Emit catalog records: bare `catalog` → `location: "catalog:default"`; `catalogs.<name>` → `location: "catalog:<name>"`. Reuse the existing `npm view` + `level` + `minimumReleaseAge` candidate filtering unchanged.
- [x] 1.3 Attach `catalogSource = { sourceFile, manager: "bun", field: {kind:"default"} | {kind:"named", name}, underWorkspaces }` to every Bun catalog record; also attach the pnpm-default `catalogSource` to existing pnpm records.
- [x] 1.4 Remove the "named catalog … not yet supported" warning for the bun path (named catalogs are first-class); keep it for the pnpm path.
- [x] 1.5 Emit the `ambiguous default catalog: both 'catalog' and 'catalogs.default' present; treating as distinct sources` warning when both coexist.
- [x] 1.6 Update the `ScanResult` TS shape + "Example output" in the skill to include the optional `catalogSource` field.

## 2. Apply — Bun catalog edits + guard (`apply-npm-updates`)

- [x] 2.1 In `skills/apply-npm-updates/SKILL.md` input spec, extend `catalogEdits` element to `{ name, targetVersion, catalogSource? }` and document the pnpm-default fallback when `catalogSource` is omitted.
- [x] 2.2 Generalize Step A2 ("pnpm-workspace.yaml catalog edits" → "Catalog source edits"): route by `catalogSource.manager` — pnpm edits `pnpm-workspace.yaml#catalog`; bun edits the resolved node in the root `package.json` (`catalog` / `catalogs.<name>`, under `workspaces` when flagged) via a targeted in-place `Edit` (no `JSON.parse`→`stringify`; NOT `bun pm pkg set` — it corrupts dotted package names, see `research/bun-cli-spike.md`).
- [x] 2.3 Handle the non-unique-token case: scope the `Edit` match to the resolved catalog block.
- [x] 2.4 Add the package-manager-agnostic guard in Step A1: never add a `/^catalog:/` consumer value to `--filter`; never write a pinned version over a `catalog:*` value.
- [x] 2.5 Generalize the Hard rules bullet: "(only `pnpm-workspace.yaml`)" → "(only the catalog source file: `pnpm-workspace.yaml` for pnpm, root `package.json` for Bun)".

## 3. Command / orchestrator wording cascade

- [x] 3.1 Thread `catalogSource` through `catalogEdits` construction in `commander-update-orchestrator` (SKILL + spec) and the per-command apply-spec builders so Bun records carry it. (Contract lives in the `npm-update-apply` delta; implementation done in orchestrator SKILL + the 6 command `.md` builders.)
- [x] 3.2 Generalize the "(only `pnpm-workspace.yaml`)" parenthetical in the hard rules of the command docs/specs: `commander-update-deep-patch`, `commander-update-deep-minor`, `commander-update-minor`, `npm-update-major`, `npm-update-deep-major`, `npm-update-deep-patch`, and matching `.md` files + the README catalog mention. (Done in all command `.md` + README; the spec contract lives in the `npm-update-apply` delta — command specs are cosmetic Impact, not modified capabilities per the proposal.)
- [x] 3.3 Update each command's "treats pnpm `catalog:` entries as first-class" description line to also acknowledge Bun catalogs.

## 4. Verification

- [x] 4.1 Re-ran the `research/ncu-bun-catalog-spike.md` matrix (bun 1.3.10, ncu@21.0.2): consumer `catalog:*` refs untouched (incl. the `eslint-plugin-storybook` repro), root `catalog`/`catalogs` maps = "No dependencies". Guard remains a no-op today.
- [x] 4.2 Bun fixture (`catalog` + `catalogs.default`/`testing` + `catalog:`/`catalog:<name>` consumers): `bun pm pkg get catalog`/`catalogs` reads the maps cleanly; `npm view` resolves the candidate (10.1.11); a targeted `Edit` bumps `catalogs.default.eslint-plugin-storybook` in `package.json` preserving format/key order; consumer refs untouched. Re-confirmed `bun pm pkg set` mangles dotted names (`socket.io` → nested) — `Edit` mandated.
- [x] 4.3 pnpm fixture: the `pnpm-workspace.yaml#catalog` edit (vitest `^4.0.18` → exact `4.0.24`) is minimal — only the target line changes; comments, key order, and other entries preserved (byte-identical apply behavior; the only scan-output delta is the additive `catalogSource` field).

## 5. Spec sync hygiene

- [x] 5.1 Resolved: the legacy `experiments-plugin` umbrella spec (a "beta staging area" overview) is **superseded** by the granular capabilities `npm-update-scanning` / `npm-update-apply` (and the per-command specs), which own the scan/apply/catalog requirements and carry this change's deltas. No parallel delta is authored. Its pre-existing pnpm-only catalog restatements (L172, 194–216, 249, 292–296) are known legacy duplication (already flagged in memory as stale-ref tech debt) and are out of scope for this change's deltas.
