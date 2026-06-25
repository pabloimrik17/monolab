## MODIFIED Requirements

### Requirement: Catalog post-processing

After running ncu on every manifest, the skill SHALL post-process catalog sources according to the detected package manager, because ncu emits no records for deps declared as `catalog:*` (they carry no version) and does not rewrite catalog sources.

**pnpm** — when the PM is `pnpm` and `pnpm-workspace.yaml#catalog` is present, the skill SHALL emit one update record per `(name, version)` entry in the `catalog:` block, querying `npm view <name> versions time --json` once per package (one spawn per catalog package; cached in-memory per scan) and filtering candidates by:

- The current `level` (same cap semantics as ncu: patch/minor/major-filtered).
- The resolved `minimumReleaseAge` threshold.

Each pnpm record SHALL carry `location: "catalog:default"`, `sourceFile: "pnpm-workspace.yaml"`, and `catalogSource: { sourceFile: "pnpm-workspace.yaml", manager: "pnpm", field: { kind: "default" } }`. pnpm named catalogs (`catalogs.<name>` or a `catalogs:` map) SHALL produce a warning `named catalog "<name>" detected but not yet supported in this iteration` and emit no records.

**bun** — when the PM is `bun`, the skill SHALL parse catalog sources in the root `package.json` and emit records with the same filtering (`level` + `minimumReleaseAge` + `npm view`):

- `catalog` (top-level or under `workspaces`) → record with `location: "catalog:default"` and `catalogSource.field = { kind: "default" }`.
- `catalogs.<name>` (top-level or under `workspaces`) → record with `location: "catalog:<name>"` and `catalogSource.field = { kind: "named", name: "<name>" }`. Bun named catalogs **ARE** supported (Full scope) and produce NO warning.

Every Bun record SHALL carry `sourceFile` = the repo-root-relative path of the root `package.json` and `catalogSource = { sourceFile, manager: "bun", field, underWorkspaces: boolean }`, where `underWorkspaces` reflects whether the block lives under `workspaces`. If the max filtered version was held back by age, `skippedByReleaseAge: true` SHALL be set (both PMs). If a `catalog` (top-level/`workspaces`) and a `catalogs.default` coexist, the skill SHALL emit the warning `ambiguous default catalog: both 'catalog' and 'catalogs.default' present; treating as distinct sources` and treat them as distinct sources via `catalogSource.field`.

#### Scenario: pnpm default catalog bumped

- **WHEN** the PM is `pnpm`, `pnpm-workspace.yaml#catalog.vitest` is `4.0.18`, `npm view vitest` returns `4.0.24` published >= `minimumReleaseAge` ago, and `level` is `patch`
- **THEN** the output contains `{ name: "vitest", currentVersion: "4.0.18", targetVersion: "4.0.24", location: "catalog:default", sourceFile: "pnpm-workspace.yaml", catalogSource: { manager: "pnpm", field: { kind: "default" } } }`

#### Scenario: pnpm named catalog warning

- **WHEN** the PM is `pnpm` and `pnpm-workspace.yaml` contains `catalogs.test`
- **THEN** `warnings` contains `named catalog "test" detected but not yet supported in this iteration` and no records are emitted for those entries

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

- Set `location` to `"root"` for the root manifest (single or workspace), `workspace:<package-name>` for a non-root workspace manifest (using its `name` field), `catalog:default` for the default catalog (pnpm `catalog:` or Bun `catalog`), or `catalog:<name>` for a Bun named catalog.
- Set `sourceFile` to the repo-root-relative path of the manifest/source to edit (e.g. `apps/wealth-react/package.json`, `pnpm-workspace.yaml`, or the root `package.json` for Bun catalogs).
- For catalog records, include `catalogSource` describing the exact source (`sourceFile`, `manager`, `field`, and `underWorkspaces` on Bun) so apply locates the node unambiguously.
- Preserve the version prefix from the current manifest when emitting `targetVersion` (e.g. `"^19.0.0"` + ncu target `19.0.14` → `"^19.0.14"`; `"~5.4.0"` + `5.4.1` → `"~5.4.1"`; exact `"19.2.4"` + `19.2.5` → `"19.2.5"`).

#### Scenario: Workspace location

- **WHEN** ncu reports a bump for `apps/wealth-react/package.json` whose `#name` is `@m0n0lab/wealth-react`
- **THEN** the record has `location: "workspace:@m0n0lab/wealth-react"` and `sourceFile: "apps/wealth-react/package.json"`

#### Scenario: Version prefix preserved

- **WHEN** the current manifest has `"vitest": "^4.0.18"` and the ncu target is `4.0.24`
- **THEN** the emitted `targetVersion` is `"^4.0.24"`

#### Scenario: Bun catalog record carries catalogSource

- **WHEN** a record is emitted for a Bun catalog entry
- **THEN** the record includes `catalogSource` with `sourceFile`, `manager: "bun"`, `field`, and `underWorkspaces`

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

`catalogSource` SHALL be present on every record whose `location` is `catalog:default` or `catalog:<name>`, and absent on `root`/`workspace:*` records. The skill SHALL NOT emit prose, tables, or user-facing formatting. The JSON object is the only output (plus the warnings embedded in it). `warnings` SHALL be de-duplicated (identical repeated strings collapse to a single entry).

#### Scenario: Raw JSON-only output

- **WHEN** the skill execution completes successfully
- **THEN** the only output is the **raw** `ScanResult` JSON (no Markdown fences or additional prose)

#### Scenario: Warnings deduped

- **WHEN** the same warning would be generated twice during the scan
- **THEN** `warnings` contains a single entry for that string
