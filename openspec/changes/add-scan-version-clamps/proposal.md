## Why

`scan-npm-updates` emits raw per-package maxima from ncu, so it can propose targets that violate real invariants. Two field failures:

- **#247** — the release-age gate is split across two code paths (skill-side `npm view` for catalog records; ncu native/`--cooldown` for manifest records). The pnpm native read did **not** gate a root-pinned devDep: catalog `vitest` stayed at the gated `4.0.18` while root `@vitest/browser` advanced to `4.1.8` → `"Running mixed versions is not supported"`, a ~13-min hang, `birpc rpc is closed`. Silent, surfaces only at test-run time.
- **#251** — `@types/node` is bumped like any package to its own latest major (`22 → 26`) while `engines.node` is `24.x`, letting Node-26-only APIs typecheck code that runs on Node 24.

Both are the same class of bug: the scan does not clamp candidates to the policies that make the target set coherent.

## What Changes

Make `scan-npm-updates` emit **policy-coherent** targets. Two clamps live in the scan skill so every consuming command (`npm-update-{patch,minor,major}`, deep variants, `commander-update-*`) inherits them with **no command-side wiring**, plus a lightweight advisory:

- **Uniform release-age gate (#247)** — apply the resolved `minimumReleaseAge` threshold skill-side to **every** record (`root`, `workspace:*`, `catalog:*`) via the same cached `npm view versions time` path already used for catalogs. ncu's `--cooldown` / pnpm native read becomes a non-authoritative pre-filter. `skippedByReleaseAge` now meaningful on manifest records, not only catalog records. **This is the actual fix for #247**: the skew came from the gate being split across two code paths (catalog skill-side, manifest via ncu), letting a root-pinned `@vitest/browser` escape while the catalog `vitest` was held. One gate over all records keeps a lockstep family in sync with no explicit coherence machinery.
- **Engine-major clamp for `@types/node` (#251)** — clamp the `@types/node` candidate major to `≤` the Node major targeted by `devEngines.runtime.node` / `engines.node`. Never cross the Node major at dependency level.
- **Version-family skew detection (advisory)** — because a monorepo family publishes in lockstep, the uniform gate already resolves its members alike; we do **not** enforce coherence (no holds, no target rewrites, no maintained registry — that path over-holds mixed-version families like `react` + `@types/react`). Instead the scan uses a registry-free heuristic (a bare name `X` plus its `@X/*` siblings) to **warn** on residual skew, with a short protocol for resolving it. Rare by construction, so it is signal not noise.
- Optional additive `clampedTo` field (rule `"engine-major"` only) so downstream/UI can explain a clamped `@types/node` target. Non-breaking.

`partition-breaking-changes` drops its hardcoded family list entirely — no registry (shared or its own). It computes hard co-upgrade sets from the authoritative `peerDependencies` read (verified live: `@vitest/*` peer-dep `vitest`, `react-dom` peer-deps `react`) + the override registry, and — being an agent-run reasoning skill — recognizes the one residual case peers can't express (a `@types/*` package pairing with its runtime) without codifying a list.

Out of scope (follow-up): `apply-engine-bumps` promoting `@types/node` to the matching major when Node's major moves (the "engines owns promotion" half of #251).

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `npm-update-scanning`: add the uniform release-age gate, the `@types/node` engine-major clamp, and registry-free version-family skew detection (warning-only); extend the output contract with optional `clampedTo` (`"engine-major"` only).
- `breaking-change-pr-grouping`: source hard co-upgrade families from the `peerDependencies` read + override registry (plus agent reasoning for peer-less `@types/*` pairings); remove the old inline hardcoded family list and maintain no family registry.

## Impact

- **Skill**: `claude-plugins/experiments/skills/scan-npm-updates/SKILL.md` (uniform gate, `@types/node` clamp, skew-detection warning). No scan-owned registry file.
- **Skill**: `claude-plugins/experiments/skills/partition-breaking-changes/SKILL.md` (remove the inline hardcoded family list; rely on `peerDependencies` + override registry + agent reasoning — no family file).
- **Consuming commands**: none need logic changes — they receive already-coherent `ScanResult`s.
- **Output contract**: additive optional `clampedTo` (`"engine-major"` only); `skippedByReleaseAge` semantics broadened to all record locations; a new `version-family skew` warning string. Backward-compatible for consumers that ignore the new field.
- **Behavior**: `@types/node` no longer crosses the Node major; manifest records now gated skill-side (extra `npm view` calls, cached per scan). Family skew surfaces as a warning rather than being silently rewritten.
- **Fixes**: #247, #251 (dependency-clamp half).
