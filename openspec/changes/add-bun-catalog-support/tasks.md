## 1. Scan — Bun catalog detection (`scan-npm-updates`)

- [ ] 1.1 In `skills/scan-npm-updates/SKILL.md` "Catalog post-processing" section, add a `bun` branch alongside the pnpm branch: when `packageManager === "bun"`, read the root `package.json` catalog maps (may use `bun pm pkg get catalog` / `bun pm pkg get catalogs`) and parse `catalog`, `workspaces.catalog`, `catalogs.<name>`, `workspaces.catalogs.<name>`.
- [ ] 1.2 Emit catalog records: bare `catalog` → `location: "catalog:default"`; `catalogs.<name>` → `location: "catalog:<name>"`. Reuse the existing `npm view` + `level` + `minimumReleaseAge` candidate filtering unchanged.
- [ ] 1.3 Attach `catalogSource = { sourceFile, manager: "bun", field: {kind:"default"} | {kind:"named", name}, underWorkspaces }` to every Bun catalog record; also attach the pnpm-default `catalogSource` to existing pnpm records.
- [ ] 1.4 Remove the "named catalog … not yet supported" warning for the bun path (named catalogs are first-class); keep it for the pnpm path.
- [ ] 1.5 Emit the `ambiguous default catalog: both 'catalog' and 'catalogs.default' present; treating as distinct sources` warning when both coexist.
- [ ] 1.6 Update the `ScanResult` TS shape + "Example output" in the skill to include the optional `catalogSource` field.

## 2. Apply — Bun catalog edits + guard (`apply-npm-updates`)

- [ ] 2.1 In `skills/apply-npm-updates/SKILL.md` input spec, extend `catalogEdits` element to `{ name, targetVersion, catalogSource? }` and document the pnpm-default fallback when `catalogSource` is omitted.
- [ ] 2.2 Generalize Step A2 ("pnpm-workspace.yaml catalog edits" → "Catalog source edits"): route by `catalogSource.manager` — pnpm edits `pnpm-workspace.yaml#catalog`; bun edits the resolved node in the root `package.json` (`catalog` / `catalogs.<name>`, under `workspaces` when flagged) via a targeted in-place `Edit` (no `JSON.parse`→`stringify`; NOT `bun pm pkg set` — it corrupts dotted package names, see `research/bun-cli-spike.md`).
- [ ] 2.3 Handle the non-unique-token case: scope the `Edit` match to the resolved catalog block.
- [ ] 2.4 Add the package-manager-agnostic guard in Step A1: never add a `/^catalog:/` consumer value to `--filter`; never write a pinned version over a `catalog:*` value.
- [ ] 2.5 Generalize the Hard rules bullet: "(only `pnpm-workspace.yaml`)" → "(only the catalog source file: `pnpm-workspace.yaml` for pnpm, root `package.json` for Bun)".

## 3. Command / orchestrator wording cascade

- [ ] 3.1 Thread `catalogSource` through `catalogEdits` construction in `commander-update-orchestrator` (SKILL + spec) and the per-command apply-spec builders so Bun records carry it.
- [ ] 3.2 Generalize the "(only `pnpm-workspace.yaml`)" parenthetical in the hard rules of the command docs/specs: `commander-update-deep-patch`, `commander-update-deep-minor`, `commander-update-minor`, `npm-update-major`, `npm-update-deep-major`, `npm-update-deep-patch`, and matching `.md` files + the README catalog mention.
- [ ] 3.3 Update each command's "treats pnpm `catalog:` entries as first-class" description line to also acknowledge Bun catalogs.

## 4. Verification

- [ ] 4.1 Re-run the `research/ncu-bun-catalog-spike.md` matrix to confirm ncu@21.0.2 still skips `catalog:*` after any change (guard remains a no-op today).
- [ ] 4.2 Manual QA: a Bun workspace fixture with `catalog` + `catalogs.<name>` + consumers; run scan → confirm catalog records emitted; run apply → confirm the catalog source bumped in `package.json` and consumer refs untouched.
- [ ] 4.3 Regression: a pnpm workspace fixture → confirm scan output and apply edits are byte-identical to pre-change behavior.

## 5. Spec sync hygiene

- [ ] 5.1 Resolve the open question: confirm whether the legacy `experiments-plugin` spec catalog requirements need a parallel delta or are superseded by `npm-update-scanning` / `npm-update-apply`; reconcile before sync/archive.
