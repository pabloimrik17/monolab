---
name: partition-breaking-changes
description: Use when a deep-major update command (`/experiments:npm-update-deep-major`, and the cross-project `commander-update-deep-major` via the orchestrator) needs to split an accepted set of major breaking changes into reviewable, PR-sized buckets before isolation. Given the `## Breaking changes & migration` findings + the major bump set + a dependency-graph read, it builds HARD co-upgrade sets (peer/lockstep families), scores risk per set, applies tunable policy knobs, and returns ordered buckets `{ title, packages, riskTier, rationale, suggestedBranch, suggestedMergeOrder }` plus a count-by-policy summary. Pure — no network, no manifest write, no VCS action.
---

# partition-breaking-changes

Turn a flat accepted set of major updates into an ordered list of **PR-sized buckets**, so the user can review and land breaking changes in coherent, low-blast-radius chunks (each mappable to its own worktree via `update-isolation`). The output renders as a `## PR plan` section in the deep-major plan.

This skill is **pure**: it performs no network call, writes no manifest, and creates no branch/worktree/commit. It reads only data already produced upstream (the plan's breaking-change findings, the bump set, and a dependency-graph read the caller passes in) and returns a structure. Branch/worktree creation is `update-isolation`'s job; this skill only proposes a `suggestedBranch` per bucket.

## When to use

- `/experiments:npm-update-deep-major` (single-project) — after `parallel-research-workflow` returns `plan.md`, partition the accepted major set into buckets, surface the `## PR plan`, then (if isolation is chosen) apply each bucket into its own worktree.
- `commander-update-deep-major` (cross-project, via the orchestrator) — surface the `## PR plan` as advice; v1 isolation is one worktree per project (per-(project,bucket) deferred), so the buckets are advisory cross-project.

This skill is implemented entirely with built-in reasoning over its inputs — no tool calls required beyond what the caller already gathered.

## Inputs

| Field              | Type                                                                                          | Required | Notes                                                                                                                                                                                                                                       |
| ------------------ | --------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bumpSet`          | `Array<{ name, from, to, location? }>`                                                        | yes      | The accepted major bump set (from `plan.md`'s `## Major bump set` / `## Cross-project bump set`).                                                                                                                                           |
| `breakingFindings` | `Array<{ name, items: string[], codemods?: string[] }>`                                       | yes      | The per-package `### Breaking changes & migration` findings parsed from each `research.md` / the plan's `## Breaking changes & migration` section. `items` = the breaking-change bullets; `codemods` = any codemod/migration-step mentions. |
| `depGraph`         | `{ [name]: { dependents: string[], peerDependencies?: string[], importSiteCount?: number } }` | yes      | A dependency-graph read the caller gathers (e.g. from `peerDependencies` in manifests + a grep of import sites). Used for blast radius + hard co-upgrade detection.                                                                         |
| `overrideFamilies` | `Array<{ id, matches: string[] }>`                                                            | no       | Seed families from the override registry (e.g. `storybook` → `["storybook", "@storybook/*", ...]`). Used to seed hard co-upgrade sets. Default: the shipped registry families.                                                              |
| `policy`           | `{ isolateHighRisk?, batchLowRisk?, maxPackagesPerBucket?, maxRiskPerBucket? }`               | no       | Tunable knobs (see below). Sensible defaults: `isolateHighRisk: true`, `batchLowRisk: true`, `maxPackagesPerBucket: 8`, `maxRiskPerBucket: HIGH`.                                                                                           |

The skill SHALL NOT mutate any input.

## Step 1 — Hard co-upgrade sets (computed FIRST, before any risk scoring)

A **hard co-upgrade set** is a group of packages that MUST share a bucket because upgrading one without the others breaks the install (peer/lockstep relationships). Compute these before risk heuristics; risk only decides whether an already-cohesive set is isolated or batched — it SHALL NEVER split a co-upgrade set across buckets.

Seed hard co-upgrade sets from, in order:

1. **Override-registry families** (`overrideFamilies`): every `bumpSet` package whose name matches a family's `matches` globs joins that family's set (e.g. `storybook` + `@storybook/react` + `@storybook/addon-essentials` + `eslint-plugin-storybook` → one set).
2. **Known peer/lockstep groups**: `react` + `react-dom` + `react-is` + `@types/react` + `@types/react-dom`; `vue` + `@vue/*`; `@angular/*`; `eslint` + its plugins/config packages; `jest` + `@types/jest` + `ts-jest`; `typescript` + `tslib`. These are framework lockstep sets where a major must move together.
3. **`peerDependencies` read** (`depGraph[name].peerDependencies`): if package A in `bumpSet` declares a peer on package B that is also in `bumpSet`, A and B join the same set.

Merge transitively: if two seed sets share a package, they merge into one. Any `bumpSet` package not pulled into a seeded set is its own singleton set.

## Step 2 — Risk scoring per co-upgrade set

Score each co-upgrade set on four signals, then map to a tier:

- **Blast radius** — `depGraph[name].dependents.length` + `importSiteCount` summed across the set's packages. More dependents / import sites → higher risk.
- **Breaking-change weight** — count (and apparent severity) of `breakingFindings[name].items` across the set. More / more-severe breaking bullets → higher.
- **Centrality** — whether any package is a framework / runtime / build-core package: `react`, `next`, `vue`, `@angular/core`, `vite`, `typescript`, `eslint`, `webpack`, `rollup`, `nx`. A central package elevates the whole set.
- **Codemod/migration-step count** — total `breakingFindings[name].codemods` + migration steps. More required mechanical migration → higher.

Map to `riskTier ∈ { HIGH, MEDIUM, LOW }`:

- **HIGH** — high centrality (a framework/runtime/build-core package) OR large blast radius OR ≥1 required codemod. (The React major + its peer set is the canonical HIGH set.)
- **MEDIUM** — moderate blast radius / a few breaking bullets, no central package, no codemod.
- **LOW** — leaf package, small/zero blast radius, few or no breaking bullets.

## Step 3 — Policy → buckets

Apply the policy knobs to map co-upgrade sets onto buckets:

- `isolateHighRisk` (default `true`) — every HIGH set becomes its **own** bucket (solo, with its peer set). A HIGH set is isolated even when it is "one logical package" (React) — its peer set rides along but it does not share a bucket with unrelated majors.
- `batchLowRisk` (default `true`) — LOW-risk leaf majors are grouped into a single bucket (or a few, bounded by the caps below).
- `maxPackagesPerBucket` (default `8`) — a batched bucket SHALL NOT exceed this package count; overflow spills into an additional bucket.
- `maxRiskPerBucket` (default `HIGH`) — a batched bucket's combined risk SHALL NOT exceed this tier; a set that would push a batch over the cap starts a new bucket.

MEDIUM sets: isolated when they would push a batch over `maxRiskPerBucket`, otherwise batched with other MEDIUM/LOW sets within the caps.

Order buckets by `suggestedMergeOrder`: HIGH/central foundations first (so dependents rebuild against the new majors), then MEDIUM, then the LOW batch(es). Within a tier, order by blast radius descending.

## Step 4 — Output

Return:

```ts
{
    buckets: Array<{
        title: string; // e.g. "React major (+ peer set)", "Low-risk leaf majors"
        packages: string[]; // the bucket's package names (a co-upgrade set is never split)
        riskTier: "HIGH" | "MEDIUM" | "LOW";
        rationale: string; // one line: why isolated / batched (centrality, blast radius, codemods)
        suggestedBranch: string; // e.g. "deps/major-react" — caller passes to update-isolation
        suggestedMergeOrder: number; // 1-based; lower lands first
    }>;
    countByPolicy: Array<{ policy: string; bucketCount: number; largestBucket: number }>;
}
```

### `## PR plan` rendering (caller surfaces this)

The buckets render as a `## PR plan` section:

```markdown
## PR plan

1. **React major (+ peer set)** — HIGH. react, react-dom, @types/react. Central framework + 3 codemods; isolated so dependents rebuild against it first. Branch: `deps/major-react`.
2. **Low-risk leaf majors** — LOW. chalk, nanoid, picocolors. No dependents of consequence; batched. Branch: `deps/major-leaf-batch`.

**Bucket count by policy:**

| policy                   | buckets | largest bucket |
| ------------------------ | ------- | -------------- |
| isolate-high + batch-low | 2       | 3              |
| one-per-package          | 6       | 1              |
```

The **count-by-policy** summary reports the bucket count (and largest bucket) under at least two policies (e.g. `isolate-high + batch-low` vs `one-per-package`) so the user can choose granularity **before** any worktree is created.

## Hard rules

- SHALL be pure: no network call, no manifest write, no `git`/`wt`/`gh` invocation, no branch/worktree/commit creation.
- SHALL compute hard co-upgrade sets BEFORE risk scoring; risk SHALL NEVER split a co-upgrade set across buckets.
- SHALL include every accepted `bumpSet` package in exactly one bucket (no package dropped, none duplicated).
- SHALL emit the count-by-policy summary so the user sees the cost of each granularity before materialization.

## See also

- `parallel-research-workflow` — produces the `## Breaking changes & migration` findings + the bump set this skill consumes (level=major).
- `update-isolation` — consumes a bucket's `suggestedBranch` to create the worktree; this skill never creates one itself.
- `group-packages-for-research` — a sibling "bounded partition" skill, but a distinct concern (it batches for research subagents; this batches for review/PR granularity).
- `scan-npm-updates/data/pkg-upgrade-overrides.yaml` — the override-registry families that seed hard co-upgrade sets.
