## MODIFIED Requirements

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
