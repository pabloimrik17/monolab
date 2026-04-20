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
