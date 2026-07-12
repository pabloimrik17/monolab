# npm-update-scanning Specification

## Purpose
TBD - created by archiving change fix-scan-npm-updates-pm-detection. Update Purpose after archive.
## Requirements
### Requirement: Level input validation

The skill SHALL accept exactly one of `patch`, `minor`, `major` as the `level` input. `engines` is **no longer** a valid level for this skill: the toolchain bump (runtime / package manager) is resolved by `detect-toolchain-surfaces` (capability `engine-surface-scanning`), not by dependency scanning. Any other value — including `engines` — SHALL abort with a message of the form `Error: invalid level "<value>". Expected patch|minor|major.`

#### Scenario: Valid level accepted

- **WHEN** the caller passes `level=patch`
- **THEN** the skill proceeds past this precondition without error

#### Scenario: Invalid level aborts

- **WHEN** the caller passes `level=beta`
- **THEN** the skill aborts with the invalid-level error (`Expected patch|minor|major.`) and does not invoke ncu

#### Scenario: Engines is no longer a dependency-scan level

- **WHEN** the caller passes `level=engines`
- **THEN** the skill aborts with `Error: invalid level "engines". Expected patch|minor|major.` and does not invoke ncu (the toolchain bump is handled by `detect-toolchain-surfaces`)

### Requirement: Package manager detection

The skill SHALL detect the package manager by checking lockfiles in this order, returning the first match: `pnpm-lock.yaml` → pnpm; `yarn.lock` → yarn; `bun.lock` or `bun.lockb` → bun; `deno.lock` → deno; `package-lock.json` → npm. If there is no lockfile, the skill SHALL read `package.json#packageManager` and derive the PM from the token before `@`. If no resolution succeeds, the skill SHALL abort, enumerating the accepted lockfiles.

#### Scenario: Lockfile match wins

- **WHEN** the repo root contains `pnpm-lock.yaml`
- **THEN** the detected PM is `pnpm`

#### Scenario: packageManager field fallback

- **WHEN** no lockfile exists but `package.json#packageManager` is `yarn@4.5.0`
- **THEN** the detected PM is `yarn`

#### Scenario: Ambiguous abort

- **WHEN** there is no lockfile and `package.json#packageManager` is absent
- **THEN** the skill aborts with the detection error and does not proceed

### Requirement: Repo type detection

The skill SHALL classify the repo as `workspace` when any of these indicators is present: `pnpm-workspace.yaml`, a non-empty `package.json#workspaces` (array, or object with `packages`), `deno.json#workspace`. Otherwise, `single`.

#### Scenario: pnpm workspace detected

- **WHEN** the repo root contains `pnpm-workspace.yaml`
- **THEN** `repoType` is `workspace`

#### Scenario: Single repo when no markers

- **WHEN** there are no workspace indicators
- **THEN** `repoType` is `single`

### Requirement: Runner resolution

The skill SHALL resolve the PM's dlx-equivalent runner (`pnpm dlx`, `npx -y`, `yarn dlx`, `bunx`, `deno run --allow-read --allow-net npm:`) and verify that the underlying binary (`pnpm`, `npx`, `yarn`, `bunx`, `deno`) is on `PATH` before the first ncu invocation. If it is missing, the skill SHALL abort.

#### Scenario: Runner available

- **WHEN** the detected PM is pnpm and `pnpm` is on PATH
- **THEN** the skill proceeds to invoke ncu

#### Scenario: Runner missing

- **WHEN** the detected PM is bun and `bunx` is not on PATH
- **THEN** the skill aborts with a runner-missing error and does not invoke ncu

### Requirement: minimumReleaseAge lookup

The skill SHALL resolve a `minimumReleaseAge` value per PM using this authoritative table:

- **pnpm**: read `pnpm-workspace.yaml#minimumReleaseAge` → `.npmrc#minimum-release-age` → `package.json#pnpm.minimumReleaseAge`. ncu reads the value natively; the skill SHALL NOT pass `--cooldown`.
- **npm**: read `.npmrc#minimum-release-age` (npm 11+) or `npm config get minimum-release-age`; the skill SHALL pass `--cooldown <value>m` to ncu.
- **yarn / bun / deno**: read `.npmrc#minimum-release-age` if present, otherwise `0`; the skill SHALL pass `--cooldown` as for npm (omit it when the value is `0` or unset).

A PM without a row in this table SHALL abort with precondition 3.

#### Scenario: pnpm cooldown native

- **WHEN** the PM is pnpm and `pnpm-workspace.yaml#minimumReleaseAge: 1440`
- **THEN** the skill omits `--cooldown` (ncu reads it natively)

#### Scenario: npm cooldown explicit

- **WHEN** the PM is npm and `.npmrc#minimum-release-age=1440`
- **THEN** the skill passes `--cooldown 1440m` to ncu

### Requirement: ncu invocation

The skill SHALL invoke `npm-check-updates@21.0.2` (pinned) through the resolved runner with the following flags:

- `-p <resolvedPackageManager>` — MANDATORY. Uses the PM resolved in precondition 2 instead of relying on ncu's auto-detection. This is necessary because ncu 21.0.2 with `--packageFile <sub>/package.json` auto-detects `packageManager: 'deno'` when there is a sibling `deno.json`, which collapses `--dep` to `['imports']` and ignores `dependencies`/`devDependencies`.
- `--target <mapped-target>` (see "level → target mapping").
- `--jsonUpgraded`.
- `--cooldown <value>` only when applicable per the `minimumReleaseAge` lookup.
- `--packageFile <manifest-path>` for each enumerated manifest.

The skill SHALL NOT rely on ncu's package-manager auto-detection. The skill SHALL NOT pass `--enginesNode` (the runtime/toolchain bump is the responsibility of `apply-engine-bumps`, not this dependency scan).

#### Scenario: -p always present

- **WHEN** ncu is invoked for any manifest
- **THEN** the command line includes `-p <resolvedPM>` with the precondition's value

#### Scenario: PM mis-detection avoided

- **WHEN** a sub-package directory contains `package.json` (with declared deps) and a sibling `deno.json`, and the precondition PM resolved to `pnpm`
- **THEN** ncu is invoked with `-p pnpm` and reports `dependencies`/`devDependencies` updates instead of treating the manifest as a Deno import map

### Requirement: Level to target mapping

The skill SHALL translate `level` to ncu's `--target`:

- `patch` → `--target patch` (cap within the current minor).
- `minor` → `--target minor` (cap within the current major).
- `major` → `--target latest`, then post-filter discarding entries whose target-major is not strictly greater than the current-major.

The skill SHALL NOT map `engines` to any `--target` (it is not a valid level — see "Level input validation").

#### Scenario: Patch cap

- **WHEN** `level` is `patch`
- **THEN** ncu is invoked with `--target patch`

#### Scenario: Major post-filter

- **WHEN** `level` is `major` and ncu returns a target whose major equals the current-major
- **THEN** the skill discards that entry from the output

### Requirement: Manifest enumeration

In a `single` repo, the skill SHALL scan `./package.json` exactly once. In a `workspace` repo, the skill SHALL scan the root `package.json` plus each sub-manifest resolved via the PM-native declaration (`pnpm-workspace.yaml#packages`, `package.json#workspaces`, `deno.json#workspace`). Each manifest SHALL be scanned with one ncu invocation.

#### Scenario: Single repo one invocation

- **WHEN** `repoType` is `single`
- **THEN** ncu is invoked exactly once with `--packageFile ./package.json`

#### Scenario: Workspace invocation per manifest

- **WHEN** `repoType` is `workspace` and the workspace declares 4 sub-packages
- **THEN** ncu is invoked 5 times (4 sub-manifests + root)

### Requirement: Parsing ncu stdout

The skill SHALL tolerate a non-JSON banner line preceding the payload (e.g. `Using minimumReleaseAge from pnpm-workspace.yaml: 1 day`). The parser SHALL:

1. Capture the full stdout.
2. Discard everything before the first line that begins with `{` (trimmed).
3. `JSON.parse` the remainder. On failure, push the raw stdout (truncated to 500 chars) into `warnings` and continue with `{}` for that manifest.
4. Capture stderr into `warnings`, one entry per non-empty line.

#### Scenario: Banner stripped

- **WHEN** stdout is `Using minimumReleaseAge from pnpm-workspace.yaml: 1 day\n{"pkg":"1.0.1"}`
- **THEN** the skill parses `{"pkg":"1.0.1"}` successfully

#### Scenario: Parse failure falls back

- **WHEN** stdout is not valid JSON after stripping the banner
- **THEN** the skill pushes the raw stdout (truncated) into `warnings` and treats that manifest's updates as `[]`

### Requirement: Catalog post-processing

After running ncu on every manifest, the skill SHALL post-process catalog sources according to the detected package manager, because ncu emits no records for deps declared as `catalog:*` (they carry no version) and does not rewrite catalog sources.

**pnpm** — when the PM is `pnpm`, the skill SHALL emit one update record per `(name, version)` entry in every catalog block of `pnpm-workspace.yaml`, querying `npm view <name> versions time --json` once per package (one spawn per catalog package; cached in-memory per scan) and filtering candidates by:

- The current `level` (same cap semantics as ncu: patch/minor/major-filtered).
- The resolved `minimumReleaseAge` threshold.

Catalog blocks and record shapes:

- The top-level `catalog:` block → records with `location: "catalog:default"` and `catalogSource.field = { kind: "default" }`.
- Each block under the `catalogs:` map (`catalogs.<name>`) → records with `location: "catalog:<name>"` and `catalogSource.field = { kind: "named", name: "<name>" }`. pnpm named catalogs **ARE** supported (Full scope) and produce NO warning.

Every pnpm record SHALL carry `sourceFile: "pnpm-workspace.yaml"` and `catalogSource = { sourceFile: "pnpm-workspace.yaml", manager: "pnpm", field }`. pnpm has no `underWorkspaces` concept, so `underWorkspaces` SHALL be absent on pnpm records.

**bun** — when the PM is `bun`, the skill SHALL parse catalog sources in the root `package.json` and emit records with the same filtering (`level` + `minimumReleaseAge` + `npm view`):

- `catalog` (top-level or under `workspaces`) → record with `location: "catalog:default"` and `catalogSource.field = { kind: "default" }`.
- `catalogs.<name>` (top-level or under `workspaces`) → record with `location: "catalog:<name>"` and `catalogSource.field = { kind: "named", name: "<name>" }`. Bun named catalogs **ARE** supported (Full scope) and produce NO warning.

Every Bun record SHALL carry `sourceFile` = the repo-root-relative path of the root `package.json` and `catalogSource = { sourceFile, manager: "bun", field, underWorkspaces: boolean }`, where `underWorkspaces` reflects whether the block lives under `workspaces`.

If the max filtered version was held back by age, `skippedByReleaseAge: true` SHALL be set (both PMs). If a bare default catalog (pnpm top-level `catalog:` / Bun `catalog`) and a `catalogs.default` coexist, the skill SHALL emit the warning `ambiguous default catalog: both 'catalog' and 'catalogs.default' present; treating as distinct sources` and treat them as distinct sources via `catalogSource.field` (the bare default is `{ kind: "default" }`; the `catalogs.default` block is `{ kind: "named", name: "default" }`).

#### Scenario: pnpm default catalog bumped

- **WHEN** the PM is `pnpm`, `pnpm-workspace.yaml#catalog.vitest` is `4.0.18`, `npm view vitest` returns `4.0.24` published >= `minimumReleaseAge` ago, and `level` is `patch`
- **THEN** the output contains `{ name: "vitest", currentVersion: "4.0.18", targetVersion: "4.0.24", location: "catalog:default", sourceFile: "pnpm-workspace.yaml", catalogSource: { sourceFile: "pnpm-workspace.yaml", manager: "pnpm", field: { kind: "default" } } }`

#### Scenario: pnpm named catalog bumped (no warning)

- **WHEN** the PM is `pnpm` and `pnpm-workspace.yaml#catalogs.react17.react` is `18.2.0` with an available, eligible `18.3.1` and `level` is `minor`
- **THEN** the output contains `{ name: "react", targetVersion: "18.3.1", location: "catalog:react17", sourceFile: "pnpm-workspace.yaml", catalogSource: { sourceFile: "pnpm-workspace.yaml", manager: "pnpm", field: { kind: "named", name: "react17" } } }`
- **AND** NO `named catalog ... not yet supported` warning is emitted
- **AND** the record has no `underWorkspaces` key

#### Scenario: pnpm ambiguous default warning

- **WHEN** the PM is `pnpm` and `pnpm-workspace.yaml` declares both a top-level `catalog:` block and a `catalogs.default` block
- **THEN** `warnings` contains `ambiguous default catalog: both 'catalog' and 'catalogs.default' present; treating as distinct sources`
- **AND** both sources are reported as distinct records differentiated by `catalogSource.field` (`{ kind: "default" }` vs `{ kind: "named", name: "default" }`)

#### Scenario: Bun default catalog bumped

- **WHEN** the PM is `bun`, `package.json#catalog.vitest` is `4.0.18`, `npm view vitest` returns an eligible `4.0.24`, and `level` is `patch`
- **THEN** the output contains `{ name: "vitest", currentVersion: "4.0.18", targetVersion: "4.0.24", location: "catalog:default", sourceFile: "package.json", catalogSource: { sourceFile: "package.json", manager: "bun", field: { kind: "default" }, underWorkspaces: false } }`

#### Scenario: Bun named catalog bumped (no warning)

- **WHEN** the PM is `bun` and `package.json#catalogs.testing.jest` is `30.0.0` with an available, eligible `30.0.1`
- **THEN** the output contains `{ name: "jest", targetVersion: "30.0.1", location: "catalog:testing", sourceFile: "package.json", catalogSource: { sourceFile: "package.json", manager: "bun", field: { kind: "named", name: "testing" }, underWorkspaces: false } }`
- **AND** NO `named catalog ... not yet supported` warning is emitted

#### Scenario: Bun catalog under workspaces

- **WHEN** the PM is `bun` and the source lives under `workspaces.catalogs.ui`
- **THEN** the corresponding record has `catalogSource.underWorkspaces = true` and `catalogSource.field = { kind: "named", name: "ui" }`

#### Scenario: Bun ambiguous default warning

- **WHEN** the PM is `bun` and the root `package.json` declares both `catalog` (top-level) and `catalogs.default`
- **THEN** `warnings` contains `ambiguous default catalog: both 'catalog' and 'catalogs.default' present; treating as distinct sources`
- **AND** both sources are reported as distinct records differentiated by `catalogSource.field`

### Requirement: Result assembly

Each update record SHALL:

- Set `location` to `"root"` for the root manifest (single or workspace), `workspace:<package-name>` for a non-root workspace manifest (using its `name` field), `catalog:default` for the default catalog (pnpm top-level `catalog:` or Bun `catalog`), or `catalog:<name>` for a pnpm or Bun named catalog.
- Set `sourceFile` to the repo-root-relative path of the manifest/source to edit (e.g. `apps/wealth-react/package.json`, `pnpm-workspace.yaml`, or the root `package.json` for Bun catalogs).
- For catalog records, include `catalogSource` describing the exact source (`sourceFile`, `manager`, `field`, and `underWorkspaces` on Bun) so apply locates the node unambiguously.
- Preserve the version prefix from the current manifest when emitting `targetVersion` (e.g. `"^19.0.0"` + ncu target `19.0.14` → `"^19.0.14"`; `"~5.4.0"` + `5.4.1` → `"~5.4.1"`; exact `"19.2.4"` + `19.2.5` → `"19.2.5"`).

#### Scenario: Workspace location

- **WHEN** ncu reports a bump for `apps/wealth-react/package.json` whose `#name` is `@m0n0lab/wealth-react`
- **THEN** the record has `location: "workspace:@m0n0lab/wealth-react"` and `sourceFile: "apps/wealth-react/package.json"`

#### Scenario: Version prefix preserved

- **WHEN** the current manifest has `"vitest": "^4.0.18"` and the ncu target is `4.0.24`
- **THEN** the emitted `targetVersion` is `"^4.0.24"`

#### Scenario: pnpm named catalog record carries catalogSource

- **WHEN** a record is emitted for a pnpm `catalogs.<name>` entry
- **THEN** the record includes `catalogSource` with `sourceFile: "pnpm-workspace.yaml"`, `manager: "pnpm"`, `field: { kind: "named", name }`, and no `underWorkspaces` key

#### Scenario: Bun catalog record carries catalogSource

- **WHEN** a record is emitted for a Bun catalog entry
- **THEN** the record includes `catalogSource` with `sourceFile`, `manager: "bun"`, `field`, and `underWorkspaces`

### Requirement: Error paths

The skill SHALL abort ONLY for the four numbered preconditions (invalid level, undetectable PM, PM without a `minimumReleaseAge` row, missing runner). Every subsequent runtime failure (ncu non-zero exit, parse failure, `npm view` failure during catalog processing, named catalog found) SHALL degrade to a `warnings` entry and continue; the `updates` for affected manifests default to `[]`.

#### Scenario: ncu failure is non-fatal

- **WHEN** ncu exits non-zero on one of N workspace manifests
- **THEN** the skill continues with the remaining manifests, pushes a warning, and emits `updates: []` for the failed manifest

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

The skill SHALL clamp the `@types/node` candidate so its major version never exceeds the Node major the repo targets. The target Node major SHALL be read from `devEngines.runtime.node` when present, otherwise from the major of the lower bound of `engines.node`. A patch/minor candidate within that Node major SHALL pass unchanged. A candidate whose major exceeds the target Node major SHALL NOT be emitted as a bump. When an age-eligible target exists within the allowed major and above current, the record SHALL be emitted at that newest eligible target and carry `clampedTo: { rule: "engine-major", from: <the-dropped-higher-target> }`. When no such target exists, the record SHALL be omitted entirely (no bump) and a warning naming `@types/node` and the blocked major SHALL be pushed; an omitted record carries no `clampedTo`.

If `devEngines.runtime.node` and `engines.node` disagree on the major, the skill SHALL use the **lower** major and push a warning naming both loci. If neither source is present, the skill SHALL NOT clamp `@types/node` and SHALL push a warning that no Node engine surface was found.

This clamp applies only to `@types/node` in this iteration.

#### Scenario: Major crossing lowered to an eligible in-band target

- **WHEN** `engines.node` is `>=24.12.0`, `@types/node` current is `24.13.1`, the level would resolve `@types/node` to `26.x`, and a newer age-eligible `24.x` exists above current
- **THEN** the record is not emitted as a `26.x` bump; it is emitted at the newest eligible `24.x` with `clampedTo.rule = "engine-major"` and `clampedTo.from` = the `26.x` target

#### Scenario: Major crossing blocked with no eligible lower-major target

- **WHEN** `engines.node` is `>=24.12.0`, `@types/node` current is already the newest `24.x`, and the only higher candidate is `26.x`
- **THEN** no `@types/node` record is emitted (no bump) and a warning names `@types/node` and the blocked `26.x`; no record carries `clampedTo`

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
      // present ONLY on an emitted @types/node record whose target the engine-major clamp lowered (an omitted record carries no fields)
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

`catalogSource` SHALL be present on every record whose `location` is `catalog:default` or `catalog:<name>`, and absent on `root`/`workspace:*` records. `skippedByReleaseAge` MAY appear on records of any `location` (the release-age gate is applied uniformly). `clampedTo` SHALL be present only on an emitted `@types/node` record whose target the engine-major clamp lowered, and absent otherwise; when no eligible lower-major target exists the record is omitted entirely (a warning is pushed) and carries no `clampedTo`. Version-family skew is reported through `warnings`, never by rewriting a record. The skill SHALL NOT emit prose, tables, or user-facing formatting. The JSON object is the only output (plus the warnings embedded in it). `warnings` SHALL be de-duplicated (identical repeated strings collapse to a single entry).

#### Scenario: Raw JSON-only output

- **WHEN** the skill execution completes successfully
- **THEN** the only output is the **raw** `ScanResult` JSON (no Markdown fences or additional prose)

#### Scenario: Warnings deduped

- **WHEN** two manifests push the same stderr warning verbatim
- **THEN** `warnings` contains that string exactly once

#### Scenario: clampedTo present only when clamped

- **WHEN** a record's emitted `targetVersion` equals what per-package resolution proposed (the engine-major clamp did not lower it)
- **THEN** the record has no `clampedTo` field
