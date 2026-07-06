## ADDED Requirements

### Requirement: Level input validation

The skill SHALL accept exactly one of `patch`, `minor`, `major`, `engines` as the `level` input. Any other value SHALL abort with a message of the form `Error: invalid level "<value>". Expected patch|minor|major|engines.`

#### Scenario: Valid level accepted

- **WHEN** the caller passes `level=patch`
- **THEN** the skill proceeds beyond this precondition without error

#### Scenario: Invalid level aborts

- **WHEN** the caller passes `level=beta`
- **THEN** the skill aborts with the invalid-level error and does not invoke ncu

### Requirement: Package manager detection

The skill SHALL detect the package manager by consulting lockfiles in this order, returning the first match: `pnpm-lock.yaml` → pnpm; `yarn.lock` → yarn; `bun.lock` or `bun.lockb` → bun; `deno.lock` → deno; `package-lock.json` → npm. If there is no lockfile, the skill SHALL read `package.json#packageManager` and derive the PM from the token before `@`. If no resolution succeeds, the skill SHALL abort listing the accepted lockfiles.

#### Scenario: Lockfile match wins

- **WHEN** the repo root contains `pnpm-lock.yaml`
- **THEN** the detected PM is `pnpm`

#### Scenario: packageManager field fallback

- **WHEN** there is no lockfile but `package.json#packageManager` is `yarn@4.5.0`
- **THEN** the detected PM is `yarn`

#### Scenario: Ambiguous abort

- **WHEN** there is no lockfile and `package.json#packageManager` is absent
- **THEN** the skill aborts with the detection error and does not proceed

### Requirement: Repo type detection

The skill SHALL classify the repo as `workspace` when any of these indicators is present: `pnpm-workspace.yaml`, non-empty `package.json#workspaces` (array or object with `packages`), `deno.json#workspace`. Otherwise, `single`.

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
- **yarn / bun / deno**: read `.npmrc#minimum-release-age` if present, otherwise `0`; the skill SHALL pass `--cooldown` as in npm (omitting it if the value is `0` or unset).

A PM with no row in this table SHALL abort with precondition 3.

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
- `--enginesNode` when `level=engines`.
- `--packageFile <manifest-path>` for each enumerated manifest.

The skill SHALL NOT rely on ncu's package manager auto-detection.

#### Scenario: -p always present

- **WHEN** ncu is invoked for any manifest
- **THEN** the command line includes `-p <resolvedPM>` with the value from the precondition

#### Scenario: PM mis-detection avoided

- **WHEN** a sub-package directory contains `package.json` (with declared deps) and a sibling `deno.json`, and the PM from the precondition resolved to `pnpm`
- **THEN** ncu is invoked with `-p pnpm` and reports updates of `dependencies`/`devDependencies` instead of treating the manifest as a Deno import map

### Requirement: Level to target mapping

The skill SHALL translate `level` to ncu's `--target`:

- `patch` → `--target patch` (cap within the current minor).
- `minor` → `--target minor` (cap within the current major).
- `major` → `--target latest`, then post-filter discarding entries whose target-major is not strictly greater than the current-major.
- `engines` → `--target latest` plus `--enginesNode`.

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

1. Capture the complete stdout.
2. Discard everything before the first line that begins with `{` (trimmed).
3. `JSON.parse` the remainder. On failure, push the raw stdout (truncated to 500 chars) to `warnings` and continue with `{}` for that manifest.
4. Capture stderr to `warnings`, one entry per non-empty line.

#### Scenario: Banner stripped

- **WHEN** stdout is `Using minimumReleaseAge from pnpm-workspace.yaml: 1 day\n{"pkg":"1.0.1"}`
- **THEN** the skill parses `{"pkg":"1.0.1"}` successfully

#### Scenario: Parse failure falls back

- **WHEN** stdout is not valid JSON after stripping the banner
- **THEN** the skill pushes the raw stdout (truncated) to `warnings` and treats that manifest's updates as `[]`

### Requirement: Catalog post-processing

When the PM is `pnpm` and `pnpm-workspace.yaml#catalog` is present, the skill SHALL emit an update record per `(name, version)` entry by querying `npm view <name> versions time --json` once per package (one spawn per catalog package; in-memory cache per scan) and filtering candidates by:

- The current `level` (same semantic cap as ncu: patch/minor/major-filtered).
- The resolved `minimumReleaseAge` threshold.

Each catalog record SHALL have `location: "catalog:default"` and `sourceFile: "pnpm-workspace.yaml"`. If the maximum filtered version was held back by age, `skippedByReleaseAge: true` SHALL be set.

Named catalogs (`catalogs.<name>` or a `catalogs:` map) SHALL produce a warning `named catalog "<name>" detected but not yet supported in this iteration` and emit no records.

#### Scenario: Default catalog bumped

- **WHEN** `pnpm-workspace.yaml#catalog.vitest` is `4.0.18`, `npm view vitest` returns `4.0.24` published >= `minimumReleaseAge` ago, and `level` is `patch`
- **THEN** the output contains `{ name: "vitest", currentVersion: "4.0.18", targetVersion: "4.0.24", location: "catalog:default", sourceFile: "pnpm-workspace.yaml" }`

#### Scenario: Named catalog warning

- **WHEN** `pnpm-workspace.yaml` contains `catalogs.test`
- **THEN** `warnings` contains `named catalog "test" detected but not yet supported in this iteration` and no records are emitted for those entries

### Requirement: Result assembly

Each update record SHALL:

- Set `location` to `"root"` for the root manifest (single or workspace), `workspace:<package-name>` for a non-root workspace manifest (using its `name` field), or `catalog:default` for default-catalog entries.
- Set `sourceFile` to the path, relative to the repo root, of the manifest to edit (e.g. `apps/wealth-react/package.json` or `pnpm-workspace.yaml`).
- Preserve the version prefix of the current manifest when emitting `targetVersion` (e.g. `"^19.0.0"` + ncu target `19.0.14` → `"^19.0.14"`; `"~5.4.0"` + `5.4.1` → `"~5.4.1"`; exact `"19.2.4"` + `19.2.5` → `"19.2.5"`).

#### Scenario: Workspace location

- **WHEN** ncu reports a bump for `apps/wealth-react/package.json` whose `#name` is `@m0n0lab/wealth-react`
- **THEN** the record has `location: "workspace:@m0n0lab/wealth-react"` and `sourceFile: "apps/wealth-react/package.json"`

#### Scenario: Version prefix preserved

- **WHEN** the current manifest has `"vitest": "^4.0.18"` and ncu's target is `4.0.24`
- **THEN** the emitted `targetVersion` is `"^4.0.24"`

### Requirement: Error paths

The skill SHALL abort ONLY for the four numbered preconditions (invalid level, PM not detectable, PM with no `minimumReleaseAge` row, runner missing). Every subsequent runtime failure (ncu non-zero exit, parse failure, catalog `npm view` failure, named catalog found) SHALL degrade to a `warnings` entry and continue; the `updates` of the affected manifests default to `[]`.

#### Scenario: ncu failure is non-fatal

- **WHEN** ncu exits non-zero on one of N workspace manifests
- **THEN** the skill continues with the remaining manifests, pushes a warning, and emits `updates: []` for the failed manifest

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
    skippedByReleaseAge?: boolean;
  }>;
  warnings: string[];
}
```

The skill SHALL NOT emit prose, tables, or user-facing formatting. The JSON object is the only output (plus the warnings embedded in it). `warnings` SHALL be de-duplicated (identical repeated strings collapse to a single entry).

#### Scenario: Raw JSON-only output

- **WHEN** the skill execution completes successfully
- **THEN** the only output is the **raw** JSON of `ScanResult` (no Markdown fences or additional prose)

#### Scenario: Warnings deduped

- **WHEN** two manifests push the same stderr warning verbatim
- **THEN** `warnings` contains that string exactly once
