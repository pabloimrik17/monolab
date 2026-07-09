## 1. Spike — confirm the gate mechanism (non-blocking for D2)

- [x] 1.1 Verify whether ncu 21.0.2 applies pnpm `minimumReleaseAge` to `--packageFile <root>/package.json` (reproduce the #247 root vs catalog divergence); record findings in a short note under the change dir
- [x] 1.2 Confirm `npm view <name> versions time --json` gives publish times sufficient to gate manifest packages the same way the catalog path already does

## 2. Version-group registry (single source of truth)

- [x] 2.1 Create `claude-plugins/experiments/skills/scan-npm-updates/references/version-groups.yaml` with header/schema docs (`id`, `matches` glob list) mirroring the override-registry conventions
- [x] 2.2 Seed families from the current `partition-breaking-changes` list AND add the missing `vitest` ↔ `@vitest/*`
- [x] 2.3 Repoint `partition-breaking-changes/SKILL.md` to source hard co-upgrade families from this registry; remove its hardcoded family list (keep the `peerDependencies` + override-registry augmentation)

## 3. Scan skill — uniform release-age gate (#247a)

- [x] 3.1 In `scan-npm-updates/SKILL.md`, add the "Uniform release-age gate" rule: apply the resolved threshold skill-side to every record via the cached `npm view versions time`; make ncu `--cooldown`/native a non-authoritative pre-filter
- [x] 3.2 Extend `skippedByReleaseAge` emission to `root`/`workspace:*` records; document the shared per-scan cache

## 4. Scan skill — @types/node engine-major clamp (#251)

- [x] 4.1 Read target Node major from `devEngines.runtime.node` → lower bound of `engines.node`; document disagreement (use lower + warn) and absent (no clamp + warn) paths
- [x] 4.2 Clamp `@types/node` candidate major; omit or lower the target and set `clampedTo.rule = "engine-major"` with `from`

## 5. Scan skill — version-group coherence (#247b)

- [x] 5.1 Read `references/version-groups.yaml`; degrade gracefully (warn, skip) if missing/empty
- [x] 5.2 Add the post-resolution reconciliation: greatest age-eligible common in-band version, else hold the whole group back; annotate moves with `clampedTo.rule = "version-group"` and `from`

## 6. Output contract

- [x] 6.1 Update the `ScanResult` interface + prose in `scan-npm-updates/SKILL.md` to add optional `clampedTo` and broaden `skippedByReleaseAge` to all locations
- [x] 6.2 Update the skill's example outputs to show a clamped record

## 7. Spec sync & validation

- [x] 7.1 `openspec validate add-scan-version-clamps --strict` passes
- [x] 7.2 Reconcile skill docs against the delta specs (behavior described in SKILL.md matches `npm-update-scanning` + `breaking-change-pr-grouping` deltas)
- [x] 7.3 Sanity-run `scan-npm-updates` on this repo (pnpm workspace) and confirm: no vitest-family skew, `@types/node` not advanced past the Node major, held-back records carry the right annotations
