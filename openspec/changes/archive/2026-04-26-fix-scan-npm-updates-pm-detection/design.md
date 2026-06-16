## Context

The `scan-npm-updates` skill lives in `claude-plugins/experiments/skills/scan-npm-updates/SKILL.md` but is not versioned in `openspec/specs/`. The 2026-04-24 spike isolated a silent failure: in repos with `deno.json` next to `package.json` (JSR + npm dual-publish), ncu 21.0.2 with `--packageFile <sub>/package.json` auto-detects `packageManager: 'deno'`, which collapses `--dep` to `['imports']` and returns `{}`, ignoring real bumps in `dependencies`/`devDependencies`.

Reproducible evidence at the repo root:

```
ncu --packageFile packages/react-clean/package.json     → packageManager: 'deno', {}
ncu -p pnpm --packageFile packages/react-clean/package.json
                                                         → packageManager: 'pnpm', {"@types/react":"18.3.28","tsdown":"0.15.12"}
ncu --deep (from repo root)                              → packageManager: 'pnpm', bumps on all
```

`--deep` "works" by accident of cwd; `--help` confirms it is a literal alias of `--packageFile '**/package.json'` and does not respect `package.json#workspaces` nor `deno.json#workspace`.

## Goals / Non-Goals

**Goals:**
- Restore correctness in repos where `deno.json` and `package.json` coexist.
- Anchor the skill contract in `openspec/specs/npm-update-scanning/` so future changes can diff cleanly.
- Minimal, reviewable change in isolation from any later optimization.

**Non-Goals:**
- Adopting `--deep` or reducing spawn count (deferred: overscan from not respecting workspace declarations).
- Rewriting catalog post-processing, changing output shape, or touching consumers (`/experiments:npm-update-patch` et al.).
- Adding unit tests for the skill (none exist; out of scope for this seed).

## Decisions

### Decision 1: explicit `-p <resolvedPM>` in every ncu invocation

**Chosen**: propagate the PM resolved in precondition 2 of `SKILL.md` to the ncu CLI on every invocation.

**Rationale**: the spike isolated the bug to ncu's auto-detection step, which is directory-sensitive and prefers Deno when there is a sibling `deno.json`. Passing `-p <pm>` skips auto-detection entirely. Verified live returning the expected bump.

**Alternatives considered**:
- *`ncu --deep`*: rejected for this change. Alias of `--packageFile '**/package.json'` per `--help`; does not respect `package.json#workspaces`/`deno.json#workspace` → overscan. It is also a major change (new parser, new enumeration, all-or-nothing failure). Left as a possible future optimization with its own cost/benefit.
- *Pre-validating detection by running `ncu --loglevel silly` and inspecting Options*: fragile and noisy; `-p` is the direct fix.
- *Removing `deno.json` from the sub-packages*: not an option, they are a requirement of JSR publish.

### Decision 2: Seed the complete spec, not a narrow delta

**Chosen**: emit all of the skill's requirements under `## ADDED Requirements` in `specs/npm-update-scanning/spec.md`.

**Rationale**: the skill had no prior spec; there is nothing to delta against. Seeding the complete contract now keeps the spec truthful and unblocks future changes to diff cleanly against something real. It also mirrors the structure of `SKILL.md`, which eases reconciliation at archival.

**Alternatives considered**:
- *Spec of the fix only (1 requirement for "ncu invocation with -p")*: leaves the capability permanently underdocumented; future changes would have to retro-seed.
- *No spec, just edit `SKILL.md`*: violates OpenSpec's contract-before-code principle and leaves the skill without a specification.

### Decision 3: Per-manifest enumeration intact

**Chosen**: do not modify the enumeration logic in this change.

**Rationale**: enumeration works correctly in repos without a co-located `deno.json`; the miss was PM-detection, not enumeration. Changing it now conflates two concerns and inflates the review surface.

## Risks / Trade-offs

- **[Risk] `-p` could silently override a future, better ncu heuristic**
  → Mitigation: the skill's precondition 2 already resolves the PM from lockfiles, which are the project's authoritative source; ncu's auto-detection is not. If ncu improves its heuristic, the spec can be revisited.

- **[Risk] Large spec seed (~11 requirements) may diverge from `SKILL.md`**
  → Mitigation: at archival the spec and `SKILL.md` are paired by OpenSpec convention. Future skill edits go through specs. `SKILL.md` remains as a prescriptive implementation guide referencing the spec.

- **[Risk] Manual-only verification (no unit tests)**
  → Mitigation: live reproduction captured in the proposal and in `followup-scan-deep-finding.md`. The acceptance check in `tasks.md` requires reproducing the fix and confirming that `ncu --loglevel silly` shows `packageManager: '<pm>'`, not `'deno'`.

- **[Trade-off] Spawn count unchanged (22 in monolab)**
  → Accepted. Correctness first; optimization later with real wall-clock and a strategy for overscan.

## Migration Plan

1. Merge the edit to `SKILL.md` (prepend `-p <pm>` to the ncu command in "Tool invocation" + a brief note on why).
2. No consumer migration — output contract unchanged.
3. Re-run `/experiments:npm-update-patch` in monolab; confirm that `@types/react 18.3.27 → 18.3.28` and `tsdown 0.15.9 → 0.15.12` appear in the scan table for `packages/react-clean` and `packages/react-hooks`.
4. Archive the change once the re-run confirms correctness.

Rollback: revert the `SKILL.md` edit. No state to unwind.

## Open Questions

- Should `SKILL.md` link to `openspec/specs/npm-update-scanning/spec.md` once seeded? Leaning yes, but ancillary — can be added in the archival commit.
- Is a fixture-backed regression worthwhile (minimal repo with `deno.json` + `package.json` + a known bump)? Not in this change; a candidate for the `research/` of a future change if a skill test harness lands.
