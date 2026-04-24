# Follow-up (out of scope for this change) — scan skill: `--deep` vs. per-manifest divergence

**Date**: 2026-04-21.
**Surfaced during**: manual validation §6.3 (`pick-subset`) on monolab.
**Applies to**: `claude-plugins/experiments/skills/scan-npm-updates/SKILL.md`, sections "Which manifests to scan" and "Tool invocation".

## Observation

The scan skill invokes `npm-check-updates@21.0.2 --packageFile <manifest>` once per enumerated workspace manifest (one spawn per manifest). On the monolab workspace this omits real patch candidates:

- `packages/react-clean/package.json`: `@types/react 18.3.27 → 18.3.28`, `tsdown 0.15.9 → 0.15.12`
- `packages/react-hooks/package.json`: `@types/react 18.3.27 → 18.3.28`, `tsdown 0.15.9 → 0.15.12`

A single `npm-check-updates@21.0.2 --deep --target patch --jsonUpgraded` invocation from the repo root finds all of them and returns the output keyed by manifest path:

```json
{
    "packages/react-clean/package.json": {
        "@types/react": "18.3.28",
        "tsdown": "0.15.12"
    },
    "packages/react-hooks/package.json": {
        "@types/react": "18.3.28",
        "tsdown": "0.15.12"
    }
}
```

## Reproduction (fresh ncu 21.0.2 spawn each time)

```bash
# Per-manifest (what the skill does) → {}
pnpm dlx npm-check-updates@21.0.2 \
  --target patch --jsonUpgraded \
  --packageFile packages/react-clean/package.json
# → {}

# Same thing with an explicit filter → {}
pnpm dlx npm-check-updates@21.0.2 \
  --target patch --jsonUpgraded \
  --filter "tsdown" \
  --packageFile packages/react-clean/package.json
# → {}

# --deep (from repo root) → finds them
pnpm dlx npm-check-updates@21.0.2 \
  --target patch --jsonUpgraded --deep
# → { "packages/react-clean/package.json": { "@types/react": "18.3.28", "tsdown": "0.15.12" }, ... }
```

The banner `Using minimumReleaseAge from pnpm-workspace.yaml: 1 day` appears in both modes, so cooldown resolution is not the differentiator. The divergence is in ncu's candidate selection when given a single file in a pnpm workspace vs. walking the whole workspace.

## Why it matters

- Silently missed bumps = dev never sees the upgrade in the table. Security patches could slip.
- 22 spawns of `pnpm dlx npm-check-updates@21.0.2` (per the §6.3 run) vs. 1 spawn for `--deep`. Measurable wall-clock cost.
- The original rationale in `SKILL.md` — "The `-ws` flag has different output shapes across ncu versions and is avoided" — does not hold up empirically for `--deep` in ncu 21.0.2: the output is a predictable map `{ manifestPath: { pkg: target } }`.

## Not addressed here because

This change (`refine-npm-update-patch-apply`) is scoped to the apply phase. The scan skill's enumeration strategy is a pre-existing concern and modifying it would broaden the change beyond issue monolab#189.

## Proposed follow-up change (sketch, to be openspec-ified separately)

- Swap per-manifest `ncu` spawns for a single `ncu --deep --target <t> --jsonUpgraded [--cooldown <p>]` from the repo root.
- Parse the outer `{ manifestPath: { pkg: target } }` into the existing `updates[]` shape (derive `location` and `sourceFile` from the key).
- Delete the workspace-enumeration subroutine (`pnpm -r exec …` / `packages` glob expansion).
- Keep single-repo (no workspace) path as one invocation without `--deep`.
- Re-run the scan spike fixtures to confirm `--deep` banner shape is parseable alongside `--jsonUpgraded`.

Tracked outside this change; revisit after archiving `refine-npm-update-patch-apply`.

---

## Spike follow-up (2026-04-24) — root cause is different, `--deep` is incidental

Re-investigated before turning the sketch above into an OpenSpec change. The original observation (per-manifest returning `{}`, `--deep` finding bumps) was correct, but the cause was **not** ncu's enumeration strategy.

### What the spike ran

Both commands from the repo root, ncu 21.0.2, `--loglevel silly` to inspect resolved options:

```bash
# per-manifest
pnpm dlx npm-check-updates@21.0.2 --target patch --loglevel silly \
  --packageFile packages/react-clean/package.json
# → Options includes: packageManager: 'deno',  dep: [ 'imports' ]
# → Current versions: {}

# per-manifest with explicit -p pnpm
pnpm dlx npm-check-updates@21.0.2 --target patch --jsonUpgraded -p pnpm \
  --packageFile packages/react-clean/package.json
# → { "@types/react": "18.3.28", "tsdown": "0.15.12" }

# --deep (from repo root)
pnpm dlx npm-check-updates@21.0.2 --target patch --loglevel silly --deep
# → Options includes: packageManager: 'pnpm',  dep: [ 'prod', 'dev', 'optional', 'packageManager' ]
```

### Root cause

ncu 21.0.2 auto-detects `packageManager: 'deno'` when `--packageFile <sub>/package.json` points to a directory that contains a sibling `deno.json`. In monolab this is true for the JSR dual-publish packages:

```
packages/react-clean/deno.json
packages/react-hooks/deno.json
packages/ts-configs/deno.json
packages/ts-types/deno.json
packages/http-client/deno.json
/deno.json
```

With `packageManager: 'deno'`, ncu's default for `--dep` collapses to `['imports']` (Deno's import-map section). Since `package.json` has no `imports`, "Current versions" is `{}` → nothing to upgrade → `{}` returned.

`--deep` "works" only because running from the repo root, ncu finds `pnpm-lock.yaml` first and wins pnpm detection, then applies that PM globally across the glob-matched manifests. It is *not* a property of `--deep` itself. `--help` confirms: `--deep` is literally `alias of (--packageFile '**/package.json')`.

### Fix

Pass `-p <resolvedPackageManager>` explicitly on every ncu invocation. The skill already resolves the PM in precondition 2; it just has to propagate it. One-line change. Does not require `--deep`. Verified live.

### What this invalidates in the sketch above

- "Swap per-manifest spawns for a single `--deep` invocation" — optional optimization, not required for correctness.
- "Delete the workspace-enumeration subroutine" — wrong for npm/yarn/bun because `--deep` is a `**/package.json` glob and does not respect `package.json#workspaces` or `deno.json#workspace`; it would *overscan* into fixtures, examples, tooling.
- "22 spawns vs. 1" — still true as a performance observation, but separable from the correctness bug.

### Supersedes

The correctness fix is tracked in OpenSpec change `fix-scan-npm-updates-pm-detection` (proposal dated 2026-04-24). Any `--deep` / spawn-reduction work is optional and should be proposed after that change lands, framed as an optimization with the overscan caveat above.
