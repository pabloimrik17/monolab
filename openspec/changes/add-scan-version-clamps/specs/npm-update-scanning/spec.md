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

### Requirement: Version-group registry

The skill SHALL read a scan-owned registry at `references/version-groups.yaml` (relative to the skill) declaring must-match version groups. Each group entry SHALL have an `id` (string) and a non-empty `matches` list of package-name glob patterns using the same `*` semantics as the override registry (a run of characters within a name). This registry is a scan-side **input** and is distinct from the command-side `data/pkg-upgrade-overrides.yaml`; the read-only contract is preserved. The registry SHALL be the single source of truth for locked families and SHALL include at minimum `vitest` ↔ `@vitest/*`. A missing or empty registry SHALL disable group coherence (no abort) and push a warning.

#### Scenario: Registry parsed and vitest family present

- **WHEN** the skill loads `references/version-groups.yaml`
- **THEN** a group whose `matches` cover `vitest` and `@vitest/*` is available for coherence resolution

#### Scenario: Missing registry degrades gracefully

- **WHEN** `references/version-groups.yaml` is absent
- **THEN** group coherence is skipped, a warning is pushed, and per-package resolution proceeds unchanged

### Requirement: Must-match version-group coherence

After per-record candidate resolution (including the uniform release-age gate), the skill SHALL reconcile every version group from the registry so all bumped members share one version. For a group with two or more members that have candidates in the scan, the group `targetVersion` SHALL be the greatest version V such that: (a) every member publishes V, (b) V satisfies the release-age threshold, and (c) V is within each member's `level` band relative to its own current. If such a V exists and is greater than the members' current versions, every member record SHALL be emitted at V. If no eligible common V above current exists, the skill SHALL hold the entire group back (emit no bump for any member) rather than bump a subset; when a newer common version existed but failed the age gate, held members SHALL carry `skippedByReleaseAge: true`. Members held or moved by group reconciliation (rather than their own independent max) SHALL carry `clampedTo: { rule: "version-group", from: <the-independently-resolved-target> }` when the group version differs from what the member would have resolved alone.

#### Scenario: Family resolves in lockstep

- **WHEN** `vitest` and `@vitest/browser` both have candidates and the greatest age-eligible common in-band version is `4.0.24`
- **THEN** both records are emitted with `targetVersion` `4.0.24`

#### Scenario: Group held back rather than split

- **WHEN** `vitest` could reach `4.0.24` but `@vitest/browser` has no age-eligible version above current that `vitest` also publishes
- **THEN** neither member is emitted as a bump (the group is held back), rather than bumping `vitest` alone

#### Scenario: Group move annotated

- **WHEN** a member's independent resolution would have been `4.1.8` but group coherence lowers it to `4.0.24`
- **THEN** that record carries `clampedTo: { rule: "version-group", from: "4.1.8" }`

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
      // present ONLY when a clamp lowered or removed the target that per-package resolution would have proposed
      rule: "engine-major" | "version-group";
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

`catalogSource` SHALL be present on every record whose `location` is `catalog:default` or `catalog:<name>`, and absent on `root`/`workspace:*` records. `skippedByReleaseAge` MAY appear on records of any `location` (the release-age gate is applied uniformly). `clampedTo` SHALL be present only on records whose target was lowered or removed by the `@types/node` engine-major clamp or by version-group coherence, and absent otherwise. The skill SHALL NOT emit prose, tables, or user-facing formatting. The JSON object is the only output (plus the warnings embedded in it). `warnings` SHALL be de-duplicated (identical repeated strings collapse to a single entry).

#### Scenario: Raw JSON-only output

- **WHEN** the skill execution completes successfully
- **THEN** the only output is the **raw** `ScanResult` JSON (no Markdown fences or additional prose)

#### Scenario: Warnings deduped

- **WHEN** two manifests push the same stderr warning verbatim
- **THEN** `warnings` contains that string exactly once

#### Scenario: clampedTo present only when clamped

- **WHEN** a record's emitted `targetVersion` equals what per-package resolution proposed (no engine-major or version-group clamp lowered it)
- **THEN** the record has no `clampedTo` field
