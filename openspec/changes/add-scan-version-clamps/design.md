## Context

`scan-npm-updates` (spec `npm-update-scanning`) is the read-only candidate resolver feeding ~15 commands. It already applies policy beyond raw ncu output: catalog resolution, `major` post-filter, prefix preservation, and a catalog-only age filter. Its stated stance is **read-only** (no writes/installs) and **registry-agnostic** re: the command-side `data/pkg-upgrade-overrides.yaml`. Crucially, its own SKILL.md says *"skill-side inputs live elsewhere (or in `references/`)"* — the extension point for scan-owned config.

#247 and #251 are both "the scan proposed an incoherent target." Rather than re-implement clamps in every command (the recurring override-registry wiring cost), the scan becomes the one place that emits coherent candidates.

## Goals / Non-Goals

**Goals:**
- Uniform release-age gate across `root` / `workspace:*` / `catalog:*` records.
- Deterministic `@types/node` engine-major clamp, computed from what the scan already reads.
- Must-match version-group coherence with a single source of truth for families.
- Zero command-side logic changes.

**Non-Goals:**
- `apply-engine-bumps` promoting `@types/node` when Node's major moves (#251 engines half) — follow-up.
- Generalizing the engine clamp beyond `@types/node` (YAGNI; note as future).
- pnpm/bun named-catalog scope changes.
- Any change to how overrides (`data/pkg-upgrade-overrides.yaml`, "how to apply") work.

## Decisions

### D1 — All three rules live in the scan skill

The branch is `scan-version-clamps` and the scan already applies policy, so put clamps there. Every command inherits coherence free.
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

### D4 — Version groups: `references/version-groups.yaml`, single source of truth (#247b)

Scan-owned registry (distinct from command-side `data/`), read by the scan for coherence. Coherence rule: for a group with ≥2 members having candidates, resolve the group to the greatest version V such that **every** member publishes V, V passes the age gate, and V is within each member's `level` band; else hold the whole group at current (mark `skippedByReleaseAge` when a newer common version existed but failed the gate).
- **Unification:** seed the registry from the families `partition-breaking-changes` already lists, **add the missing `vitest` ↔ `@vitest/*`**, and repoint `partition-breaking-changes` at the same file. Avoids a third copy of the family list.
- **Alternative (rejected):** hardcoded table in SKILL.md — matches the `minimumReleaseAge` precedent but keeps two drifting copies of the family list.

### D5 — Output contract: additive optional `clampedTo`

`clampedTo?: { rule: "engine-major" | "version-group"; from: string }` — present only when a clamp lowered/removed the target (`from` = the version that would have been proposed). Age holds keep using `skippedByReleaseAge`. Additive/optional → consumers ignoring it are unaffected.

## Risks / Trade-offs

- **ncu native pnpm gate behavior is not fully understood** → D2 makes the skill authoritative regardless, so the exact ncu mechanism stops mattering; a spike (task 1) only confirms we are not double-filtering incorrectly.
- **More `npm view` calls** → reuse the per-scan cache; one spawn per distinct package.
- **Version-group coherence could over-hold** (hold a whole group because one lagging member has no eligible common version) → correct-by-design for locked families; `clampedTo`/`skippedByReleaseAge` make it visible.
- **Registry drift with real peer requirements** → families are declarative and reviewed; `partition-breaking-changes` still augments with its `peerDependencies` read.
- **Touching `breaking-change-pr-grouping`** slightly widens the change → justified: the alternative is a duplicated family list, the very thing the unification decision avoids.

## Migration Plan

Docs/skills only — no runtime deploy. Land skill + registry + spec deltas together; `openspec validate --strict`; archive syncs specs. Rollback = revert the change dir + skill edits. No consumer migration (additive contract).

## Open Questions

- Confirm (spike) whether ncu 21.0.2 applies pnpm `minimumReleaseAge` to `--packageFile <root>/package.json`; record findings but do not let them gate D2.
- Seed set for `version-groups.yaml` beyond `vitest` + the partition list — include `@typescript-eslint/*`? Start minimal, extend by entry.
