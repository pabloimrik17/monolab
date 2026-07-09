## 1. Spike — confirm the gate mechanism (non-blocking for D2)

- [x] 1.1 Verify whether ncu 21.0.2 applies pnpm `minimumReleaseAge` to `--packageFile <root>/package.json` (reproduce the #247 root vs catalog divergence); record findings in a short note under the change dir
- [x] 1.2 Confirm `npm view <name> versions time --json` gives publish times sufficient to gate manifest packages the same way the catalog path already does

## 2. Partition — drop the hardcoded family list (no registry)

- [x] 2.1 Verify `peerDependencies` recovers the key families (confirmed live: `@vitest/*` peer-dep `vitest`; `react-dom` peer-deps `react`)
- [x] 2.2 Rewrite `partition-breaking-changes/SKILL.md` Step 1: sources are the `peerDependencies` read (authoritative) + override registry; agent reasoning fills the peer-less `@types/*`-to-runtime gap. Remove the old inline hardcoded family list.
- [x] 2.3 Maintain NO family file — neither a shared scan registry nor a partition-owned one

## 3. Scan skill — uniform release-age gate (#247, primary fix)

- [x] 3.1 In `scan-npm-updates/SKILL.md`, add the "Uniform release-age gate" rule: apply the resolved threshold skill-side to every record via the cached `npm view versions time`; make ncu `--cooldown`/native a non-authoritative pre-filter
- [x] 3.2 Extend `skippedByReleaseAge` emission to `root`/`workspace:*` records; document the shared per-scan cache

## 4. Scan skill — @types/node engine-major clamp (#251)

- [x] 4.1 Read target Node major from `devEngines.runtime.node` → lower bound of `engines.node`; document disagreement (use lower + warn) and absent (no clamp + warn) paths
- [x] 4.2 Clamp `@types/node` candidate major; omit or lower the target and set `clampedTo.rule = "engine-major"` with `from`

## 5. Scan skill — version-family skew detection (advisory)

- [x] 5.1 Add the registry-free heuristic: group emitted records by the umbrella shape (bare `X` + its `@X/*` siblings); never group bare-rootless scopes (`@types/*`, `@radix-ui/*`)
- [x] 5.2 When such a family resolves to divergent versions, push one `version-family skew` warning + a documented resolution protocol; leave targets untouched (no hold, no clamp)

## 6. Output contract

- [x] 6.1 Update the `ScanResult` interface + prose in `scan-npm-updates/SKILL.md`: optional `clampedTo` with `rule: "engine-major"` only; broaden `skippedByReleaseAge` to all locations; note skew is a warning, not a record field
- [x] 6.2 Update the skill's example outputs to show the `@types/node` clamp + a skew warning

## 7. Spec sync & validation

- [x] 7.1 `openspec validate add-scan-version-clamps --strict` passes
- [x] 7.2 Reconcile skill docs against the delta specs (behavior described in SKILL.md matches `npm-update-scanning` + `breaking-change-pr-grouping` deltas)
- [x] 7.3 Sanity-run `scan-npm-updates` on this repo (pnpm workspace) and confirm: aligned vitest family resolves alike (no skew warning), `@types/node` not advanced past the Node major with `clampedTo.rule = "engine-major"`
