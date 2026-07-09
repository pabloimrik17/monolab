# Spike — gate mechanism (Task 1, non-blocking for D2)

Ran against this repo (pnpm workspace, `minimumReleaseAge: 1440`, `engines.node: 24.18.0`) on 2026-07-08.

## 1.1 — Does ncu 21.0.2 apply pnpm `minimumReleaseAge` to `--packageFile <root>/package.json`?

**Command:**
```
pnpm dlx npm-check-updates@21.0.2 -p pnpm --target patch --jsonUpgraded --packageFile ./package.json
```

**Observed:**
```
Using minimumReleaseAge from pnpm-workspace.yaml: 1 day
{
  "@swc/core": "1.15.43",
  "@vitest/browser": "4.1.10",
  "@vitest/browser-playwright": "4.1.10",
  "typescript-eslint": "8.61.1"
}
```

**Finding:** ncu **does** read pnpm `minimumReleaseAge` natively for a root manifest scan — it printed the banner and gated the result (reported `@vitest/browser: 4.1.10`, published ~2 days ago, and did **not** offer the younger `5.0.0-beta.6`). So the native read is active on the root manifest in this environment; the current SKILL claim ("read natively by ncu") holds for this ncu/pnpm combo.

**But this does not close the #247 divergence class.** The catalog gate is a *separate, skill-side* implementation (`npm view … time` + threshold math), while manifest records rely on ncu's native read. The two paths can still diverge because:
- they are independent implementations of the same policy;
- ncu's native mechanism is opaque and PM/version-specific (the SKILL trusts ncu for pnpm, passes `--cooldown` only for other PMs);
- candidate resolution differs — ncu's `patch`/`latest` target vs the skill's `npm view` band+age math.

The #247 skew (catalog `vitest` held by the gate while root `@vitest/browser` advanced) is exactly what a split gate produces. **D2's fix** — the skill re-validates *every* record's publish age via the same cached `npm view versions time` path — collapses the two paths into one authority, so the exact ncu mechanism stops mattering. ncu stays a cheap non-authoritative pre-filter.

**Not double-filtering:** because ncu only *narrows* the candidate set and the skill re-checks age against real publish times, layering the skill gate on top of ncu's pre-filter is safe (it can only hold a candidate back, never resurrect a filtered one incorrectly).

## 1.2 — Is `npm view <name> versions time --json` sufficient to gate manifest packages?

**Command:**
```
npm view vitest time --json
```

**Observed:** a map of every published version → ISO publish timestamp (476 entries for `vitest`), e.g.:
```
4.1.9  -> 2026-06-15T07:23:00.326Z
4.1.10 -> 2026-07-06T06:44:42.684Z
5.0.0-beta.6 -> 2026-07-06T06:54:08.929Z
```

**Finding:** sufficient and identical to what the catalog path already consumes. For each ncu-reported manifest candidate, look up its publish time and require `now - publishTime >= threshold`; clamp to the newest in-band version that satisfies it. One spawn per distinct package, shared with the catalog cache.

## Bonus — #251 confirmed live

`npm view @types/node dist-tags` → `latest: 26.1.1`; repo `engines.node: 24.18.0` and `@types/node` pinned `24.13.2`. A `major` scan would propose `24.13.2 → 26.1.1`, crossing the Node major. Engine-major clamp (D3) must hold it to the newest eligible `24.x`.
