## Why

`scan-npm-updates` emits raw per-package maxima from ncu, so it can propose targets that violate real invariants. Two field failures:

- **#247** — the release-age gate is split across two code paths (skill-side `npm view` for catalog records; ncu native/`--cooldown` for manifest records). The pnpm native read did **not** gate a root-pinned devDep: catalog `vitest` stayed at the gated `4.0.18` while root `@vitest/browser` advanced to `4.1.8` → `"Running mixed versions is not supported"`, a ~13-min hang, `birpc rpc is closed`. Silent, surfaces only at test-run time.
- **#251** — `@types/node` is bumped like any package to its own latest major (`22 → 26`) while `engines.node` is `24.x`, letting Node-26-only APIs typecheck code that runs on Node 24.

Both are the same class of bug: the scan does not clamp candidates to the policies that make the target set coherent.

## What Changes

Make `scan-npm-updates` emit **policy-coherent** targets. Three clamp/coherence rules, all in the scan skill so every consuming command (`npm-update-{patch,minor,major}`, deep variants, `commander-update-*`) inherits them with **no command-side wiring**:

- **Uniform release-age gate (#247a)** — apply the resolved `minimumReleaseAge` threshold skill-side to **every** record (`root`, `workspace:*`, `catalog:*`) via the same cached `npm view versions time` path already used for catalogs. ncu's `--cooldown` / pnpm native read becomes a non-authoritative pre-filter. `skippedByReleaseAge` now meaningful on manifest records, not only catalog records.
- **Engine-major clamp for `@types/node` (#251)** — clamp the `@types/node` candidate major to `≤` the Node major targeted by `devEngines.runtime.node` / `engines.node`. Never cross the Node major at dependency level.
- **Must-match version-group coherence (#247b)** — locked families (e.g. `vitest` ↔ `@vitest/*`) resolve to a single gate-approved version in lockstep; if they can't all reach one eligible version, hold the whole group back rather than split it. Families come from a new scan-owned registry.
- **New `references/version-groups.yaml`** — authoritative, extensible family list. Single source of truth: seeds both scan coherence **and** `partition-breaking-changes` hard co-upgrade sets (which today hardcode a near-identical list that is **missing `vitest`**). Adding a family = one entry.
- Optional additive `clampedTo` field on records so downstream/UI can explain a held-back or clamped target. Non-breaking.

Out of scope (follow-up): `apply-engine-bumps` promoting `@types/node` to the matching major when Node's major moves (the "engines owns promotion" half of #251).

## Capabilities

### New Capabilities

_None._ (The new `references/version-groups.yaml` is an input artifact of the existing scan capability, not a new capability.)

### Modified Capabilities

- `npm-update-scanning`: add the uniform release-age gate, the `@types/node` engine-major clamp, the version-group registry, and version-group coherence; extend the output contract with optional `clampedTo`.
- `breaking-change-pr-grouping`: source hard co-upgrade families from the shared `references/version-groups.yaml` registry (single source of truth) instead of a hardcoded list.

## Impact

- **Skill**: `claude-plugins/experiments/skills/scan-npm-updates/SKILL.md` + new `references/version-groups.yaml`.
- **Skill**: `claude-plugins/experiments/skills/partition-breaking-changes/SKILL.md` (seed families from the shared registry).
- **Consuming commands**: none need logic changes — they receive already-coherent `ScanResult`s.
- **Output contract**: additive optional `clampedTo`; `skippedByReleaseAge` semantics broadened to all record locations. Backward-compatible for consumers that ignore the new field.
- **Behavior**: fewer/held-back bumps in some scans (correct). Extra `npm view` calls for manifest records now gated skill-side (cached per scan).
- **Fixes**: #247, #251 (dependency-clamp half).
