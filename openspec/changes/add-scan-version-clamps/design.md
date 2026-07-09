## Context

`scan-npm-updates` (spec `npm-update-scanning`) is the read-only candidate resolver feeding ~15 commands. It already applies policy beyond raw ncu output: catalog resolution, `major` post-filter, prefix preservation, and a catalog-only age filter. Its stated stance is **read-only** (no writes/installs) and **registry-agnostic** re: the command-side `data/pkg-upgrade-overrides.yaml`. Crucially, its own SKILL.md says *"skill-side inputs live elsewhere (or in `references/`)"* — the extension point for scan-owned config.

#247 and #251 are both "the scan proposed an incoherent target." Rather than re-implement clamps in every command (the recurring override-registry wiring cost), the scan becomes the one place that emits coherent candidates.

## Goals / Non-Goals

**Goals:**
- Uniform release-age gate across `root` / `workspace:*` / `catalog:*` records — the real fix for #247.
- Deterministic `@types/node` engine-major clamp, computed from what the scan already reads.
- Surface residual version-family skew as a warning, without enforcing coherence or maintaining a scan-side registry.
- Zero command-side logic changes.

**Non-Goals:**
- `apply-engine-bumps` promoting `@types/node` when Node's major moves (#251 engines half) — follow-up.
- Generalizing the engine clamp beyond `@types/node` (YAGNI; note as future).
- pnpm/bun named-catalog scope changes.
- Any change to how overrides (`data/pkg-upgrade-overrides.yaml`, "how to apply") work.

## Decisions

### D1 — Clamps live in the scan skill; coherence is not enforced

The scan already applies policy, so put the two clamps (uniform age gate, `@types/node` engine-major) there — every command inherits them free. We deliberately do **not** add a third "version-group coherence" clamp: the uniform gate already keeps lockstep families in sync in the normal case (see D4), so enforcement would be redundant machinery with real downsides (over-hold, a hand-maintained registry). The residual-skew case is handled by a warning, not a rewrite.
- **Alternative (rejected):** a post-scan `reconcile-clamps` skill invoked by each command — same fan-out wiring cost as the override registry (15 call sites), easy to forget one.

### D2 — Release-age gate moves skill-side and uniform (#247a)

ncu finds candidates; the skill re-validates **every** candidate's publish age against the resolved `minimumReleaseAge` threshold using the already-cached `npm view versions time` data, and clamps to the newest eligible version. ncu `--cooldown` / pnpm native read stays only as a cheap pre-filter, not the authority.
- **Why:** the split gate (skill-side for catalog, ncu for manifest) is exactly what let root `@vitest/browser` escape in #247. One implementation, PM-agnostic, kills the pnpm-native inconsistency, and makes `skippedByReleaseAge` truthful on manifest records (today it is set only on catalog records).
- **Alternative (rejected):** keep ncu as authority and only fix the pnpm path — narrower but leaves two divergent code paths and depends on opaque ncu native behavior.
- **Cost:** extra `npm view` per updated manifest package. Mitigated by the per-scan in-memory cache the catalog path already uses.

### D3 — `@types/node` engine-major clamp (#251)

Read the target Node major from `devEngines.runtime.node` if present, else the major of the lower bound of `engines.node`. Clamp the `@types/node` candidate so its major never exceeds it. Patch/minor within the same major pass; a major crossing is dropped (not emitted) and surfaced via `clampedTo`. If the two engine sources disagree, use the **lower** major and push a warning. If neither is present, do not clamp and push a warning.
- **Why lower on disagreement:** types must not outrun the lowest runtime the repo claims to support.
- **Alternative (rejected):** flag-only (emit the major bump but warn) — leaves the footgun that produced #251.

### D4 — Version-family skew: detect + warn, no enforcement, no scan registry (#247)

The uniform gate (D2) is the real fix for #247: because a monorepo family publishes every package at the same version and time, one gate applied to all records resolves the whole family alike. The original skew came from the gate being **split** (catalog vs manifest), not from vitest publishing inconsistently. So an explicit must-match coherence rule + a hand-maintained registry is redundant for the common case and carries real cost:
- **Over-hold:** a strict "every member publishes V" rule permanently holds families whose members ride independent version lines (`react` + `@types/react`, `typescript` + `tslib`).
- **Maintenance:** a scan-side family list is a standing artifact that drifts and goes stale — exactly the "overkill" the reviewer flagged.

Instead the scan **detects and warns** using a registry-free heuristic: a bare package `X` plus its `@X/*` siblings in the same scan (catches `vitest` + `@vitest/*`, `jest` + `@jest/*`, `storybook` + `@storybook/*`). It never groups scopes without a bare root (`@types/*`, `@radix-ui/*`), so no false positives. If such a family resolves to divergent versions, push one warning + a documented protocol; leave targets untouched. Rare by construction (the gate already syncs the normal case), so signal not noise.
- **Alternative (rejected):** enforce coherence by holding/rewriting targets from a maintained registry — the over-hold + maintenance cost above, for a case the uniform gate already covers.
- **Partition drops the list too:** `partition-breaking-changes` needs family knowledge for PR bucketing, but it runs as an agent, so it computes hard co-upgrade sets from the authoritative `peerDependencies` read (verified: `@vitest/*` peer-dep `vitest`, `react-dom` peer-deps `react`) + the override registry, and recognizes the one peer-less case (`@types/*` ↔ its runtime) by reasoning. No hardcoded list and no registry file anywhere — the maintenance burden the reviewer objected to is removed on both sides.

### D5 — Output contract: additive optional `clampedTo`

`clampedTo?: { rule: "engine-major"; from: string }` — present only on the `@types/node` record when the engine-major clamp lowered/removed the target (`from` = the version that would have been proposed). Age holds keep using `skippedByReleaseAge`; version-family skew is reported via a `warnings` entry (never by rewriting a record). Additive/optional → consumers ignoring it are unaffected.

## Risks / Trade-offs

- **ncu native pnpm gate behavior is not fully understood** → D2 makes the skill authoritative regardless, so the exact ncu mechanism stops mattering; a spike (task 1) only confirms we are not double-filtering incorrectly.
- **More `npm view` calls** → reuse the per-scan cache; one spawn per distinct package.
- **Skew heuristic false positives** → mitigated by requiring a bare-root umbrella shape (`X` + `@X/*`); independently-versioned scopes without a bare root (`@types/*`, `@radix-ui/*`) are never grouped. Warning-only, so a false positive costs a line of noise, not a wrong target.
- **Skew heuristic false negatives** (a lockstep family with no bare root, e.g. `@angular/*`) → acceptable: the uniform gate keeps such families in sync anyway; the warning is a backstop, not the primary mechanism.
- **`partition-breaking-changes` registry drift** → kept minimal (only what its `peerDependencies` + override reads miss) and reviewed; peer read remains the primary source.

## Migration Plan

Docs/skills only — no runtime deploy. Land both skill edits + spec deltas together; `openspec validate --strict`; archive syncs specs. Rollback = revert the change dir + skill edits. No consumer migration (additive contract).

## Open Questions

- Confirm (spike) whether ncu 21.0.2 applies pnpm `minimumReleaseAge` to `--packageFile <root>/package.json`; record findings but do not let them gate D2. _(Resolved in `research/gate-mechanism-spike.md`: ncu does read it, but D2 makes the skill authoritative regardless.)_
- Whether the skew warning should ever escalate to an error in `apply` flows — deferred; advisory-only for now.
