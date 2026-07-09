## ADDED Requirements

### Requirement: Uniform release-age gate

The skill SHALL apply the resolved `minimumReleaseAge` threshold (per the `minimumReleaseAge lookup` requirement) to **every** emitted record regardless of `location` (`root`, `workspace:*`, `catalog:default`, `catalog:<name>`), using its own `npm view <name> versions time --json` lookup (the per-scan in-memory cache shared with catalog post-processing). This gate — not ncu's `--cooldown` flag or pnpm's native `minimumReleaseAge` read — SHALL be authoritative; ncu's own filtering MAY act only as a non-authoritative pre-filter.

For each record, the emitted `targetVersion` SHALL be the newest version that is within the record's `level` band AND whose publish time satisfies `now - publishTime >= threshold`. When a newer in-band version exists but fails the age threshold, the skill SHALL clamp to the newest eligible version and set `skippedByReleaseAge: true`. `skippedByReleaseAge` SHALL therefore be settable on manifest (`root`/`workspace:*`) records, not only catalog records. When the threshold is `0` or unset, no record is age-gated.

#### Scenario: Root-pinned devDep gated identically to catalog sibling

- **WHEN** the PM is `pnpm`, the catalog `vitest` is held at `4.0.18` by the age gate, and a root `package.json` pins `@vitest/browser` whose only newer in-band candidate `4.1.8` is younger than the threshold
- **THEN** the `@vitest/browser` record is clamped to the newest eligible `4.0.x` and carries `skippedByReleaseAge: true` (it does NOT advance to `4.1.8`)

#### Scenario: Manifest gate is skill-side, not ncu-dependent

- **WHEN** ncu reports a manifest candidate whose publish time is younger than the resolved threshold
- **THEN** the skill discards that candidate and emits the newest eligible version, independent of whether ncu applied `--cooldown` or a native read

#### Scenario: No gate when threshold unset

- **WHEN** the resolved `minimumReleaseAge` is `0` or unset
- **THEN** records are emitted without age clamping and without `skippedByReleaseAge`

### Requirement: Engine-major clamp for @types/node

The skill SHALL clamp the `@types/node` candidate so its major version never exceeds the Node major the repo targets. The target Node major SHALL be read from `devEngines.runtime.node` when present, otherwise from the major of the lower bound of `engines.node`. A patch/minor candidate within that Node major SHALL pass unchanged. A candidate whose major exceeds the target Node major SHALL NOT be emitted as a bump; instead the record SHALL either be omitted (no eligible lower-major target) or emitted at the newest eligible target within the allowed major, carrying `clampedTo: { rule: "engine-major", from: <the-dropped-higher-target> }`.

If `devEngines.runtime.node` and `engines.node` disagree on the major, the skill SHALL use the **lower** major and push a warning naming both loci. If neither source is present, the skill SHALL NOT clamp `@types/node` and SHALL push a warning that no Node engine surface was found.

This clamp applies only to `@types/node` in this iteration.

#### Scenario: Major crossing blocked at dependency level

- **WHEN** `engines.node` is `>=24.12.0`, `@types/node` current is `24.x`, and the level would resolve `@types/node` to `26.x`
- **THEN** the record is not emitted as a `26.x` bump; it is clamped to the newest eligible `24.x` (or omitted) with `clampedTo.rule = "engine-major"` and `clampedTo.from` = the `26.x` target

#### Scenario: Patch within the Node major passes

- **WHEN** `engines.node` targets Node `24`, `@types/node` is `24.13.1`, and `24.13.2` is available and age-eligible
- **THEN** the record is emitted with `targetVersion` `24.13.2` and no `clampedTo`

#### Scenario: Disagreeing engine sources use the lower major

- **WHEN** `devEngines.runtime.node` targets `25.x` and `engines.node` is `>=24`
- **THEN** the `@types/node` clamp uses major `24` and a warning naming both loci is pushed

#### Scenario: No Node engine surface

- **WHEN** neither `devEngines.runtime.node` nor `engines.node` is present
- **THEN** `@types/node` is not clamped and a warning is pushed that no Node engine surface was found

### Requirement: Version-family skew detection

The uniform release-age gate keeps a lockstep family in sync in the normal case (members publish the same version at the same time, so one gate resolves them alike). The skill SHALL NOT enforce version-group coherence — it SHALL NOT hold groups back, rewrite targets, or read a maintained family registry for this purpose. Instead, after resolution, the skill SHALL **detect and warn** on residual skew using a heuristic that needs no registry: it SHALL group emitted records by the umbrella-package shape — a bare package name `X` together with any `@X/*` scoped siblings present in the same scan (e.g. `vitest` + `@vitest/*`). For any such group with two or more bumped members whose emitted `targetVersion` (ignoring the `^`/`~` prefix) differ, the skill SHALL push exactly one warning identifying the divergent members and versions and noting they should be aligned before installing. Targets SHALL be left untouched. The heuristic SHALL NOT group scopes that lack a bare root package (`@types/*`, `@radix-ui/*`, etc.), so independently-versioned scopes never trigger a warning.

#### Scenario: Umbrella family skew warned, not rewritten

- **WHEN** `vitest` resolves to `4.1.10` and root-pinned `@vitest/browser` resolves to `4.0.9` in the same scan
- **THEN** both records keep their independently-resolved `targetVersion` AND a single `version-family skew` warning names `vitest@4.1.10` and `@vitest/browser@4.0.9`

#### Scenario: Lockstep family in sync emits no warning

- **WHEN** `vitest` and `@vitest/browser` share the current version and the uniform gate resolves both to `4.1.10`
- **THEN** no `version-family skew` warning is pushed and both are emitted at `4.1.10`

#### Scenario: Independently-versioned scope never warns

- **WHEN** `@types/node` and `@types/react` resolve to different versions in the same scan
- **THEN** no `version-family skew` warning is pushed (the `@types` scope has no bare root and is not treated as an umbrella family)

## MODIFIED Requirements

### Requirement: Output contract

The skill SHALL emit a single JSON object conforming to `ScanResult`:

```ts
{
  packageManager: "pnpm" | "npm" | "yarn" | "bun" | "deno";
  repoType: "single" | "workspace";
  updates: Array<{
    name: string;
    currentVersion: string;
    targetVersion: string;
    location: "root" | `workspace:${string}` | "catalog:default" | `catalog:${string}`;
    sourceFile: string;
    skippedByReleaseAge?: boolean; // may appear on ANY record (root/workspace/catalog) — the age gate is uniform
    clampedTo?: {
      // present ONLY on the @types/node record when the engine-major clamp lowered or removed its target
      rule: "engine-major";
      from: string; // the higher target that was clamped away
    };
    catalogSource?: {
      sourceFile: string;
      manager: "pnpm" | "bun";
      field: { kind: "default" } | { kind: "named"; name: string };
      underWorkspaces?: boolean; // Bun only — present (required) on every Bun record, absent on pnpm
    };
  }>;
  warnings: string[];
}
```

`catalogSource` SHALL be present on every record whose `location` is `catalog:default` or `catalog:<name>`, and absent on `root`/`workspace:*` records. `skippedByReleaseAge` MAY appear on records of any `location` (the release-age gate is applied uniformly). `clampedTo` SHALL be present only on the `@types/node` record when the engine-major clamp lowered or removed its target, and absent otherwise; version-family skew is reported through `warnings`, never by rewriting a record. The skill SHALL NOT emit prose, tables, or user-facing formatting. The JSON object is the only output (plus the warnings embedded in it). `warnings` SHALL be de-duplicated (identical repeated strings collapse to a single entry).

#### Scenario: Raw JSON-only output

- **WHEN** the skill execution completes successfully
- **THEN** the only output is the **raw** `ScanResult` JSON (no Markdown fences or additional prose)

#### Scenario: Warnings deduped

- **WHEN** two manifests push the same stderr warning verbatim
- **THEN** `warnings` contains that string exactly once

#### Scenario: clampedTo present only when clamped

- **WHEN** a record's emitted `targetVersion` equals what per-package resolution proposed (the engine-major clamp did not lower it)
- **THEN** the record has no `clampedTo` field
