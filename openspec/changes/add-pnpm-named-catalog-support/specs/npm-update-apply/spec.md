## MODIFIED Requirements

### Requirement: Catalog source edits

For each `catalogEdits` element, the skill SHALL bump the entry **in its catalog source** (resolved from `catalogSource`, defaulting to `pnpm-workspace.yaml` when absent) by replacing its value with the **exact** version — `targetVersion` with any leading range operator (`^`/`~`/`=`) stripped — preserving surrounding whitespace, comments, and the order of other keys. This is an in-place `Edit`, never an `npm-check-updates` invocation (ncu does not rewrite catalog sources for pnpm or bun). The skill SHALL NOT touch any consumer `package.json` entry that is a `catalog:` reference.

- **pnpm** (`catalogSource.manager === "pnpm"` or omitted): in `pnpm-workspace.yaml`, locate the catalog block from `catalogSource.field` — `{ kind: "default" }` (or omitted `catalogSource`) → the top-level `catalog:` block; `{ kind: "named", name }` → the `catalogs.<name>` block under the `catalogs:` map — then locate the `name` key within that block and replace its value. When the `name: <version>` token is not unique within the file (the same dep appears in more than one catalog block, e.g. `catalog.react` and `catalogs.react17.react`), the `Edit` match SHALL include enough surrounding context (neighboring keys or the enclosing block's opening line) to scope the replacement to the block resolved from `catalogSource.field`.
- **bun** (`catalogSource.manager === "bun"`): in the root `package.json` identified by `catalogSource.sourceFile`, locate the catalog block from `catalogSource.field` — `{ kind: "default" }` → the `catalog` map; `{ kind: "named", name }` → `catalogs.<name>` — nested under `workspaces` when `underWorkspaces` is `true`. Replace the matched `"name": "<version>"` token with the exact target via a targeted `Edit` (NOT a `JSON.parse`→`JSON.stringify`, which would reformat the file). If the version token is non-unique within the file, the `Edit` match SHALL include enough surrounding context to scope it to the resolved block.

If a catalog key (or its resolved block) is unexpectedly missing, the skill SHALL stop and return `{ step: "catalog", name, exitCode: null, appliedSoFar }`.

#### Scenario: pnpm default catalog value pinned exact in place

- **WHEN** `catalogEdits` includes `{ name: "zod", targetVersion: "^3.24.1" }` with no `catalogSource`
- **THEN** the skill rewrites the `zod` key under the top-level `catalog:` block in `pnpm-workspace.yaml` to `3.24.1` (exact, prefix stripped)
- **AND** does NOT invoke `npm-check-updates` for the catalog file

#### Scenario: pnpm named catalog pinned

- **WHEN** `catalogEdits` includes `{ name: "react", targetVersion: "18.3.1", catalogSource: { sourceFile: "pnpm-workspace.yaml", manager: "pnpm", field: { kind: "named", name: "react17" } } }`
- **THEN** the skill rewrites the `react` key under `catalogs.react17` in `pnpm-workspace.yaml` to `18.3.1` in place, preserving formatting and key order
- **AND** does NOT modify the `react` key under any other catalog block

#### Scenario: pnpm non-unique catalog token scoped to resolved block

- **WHEN** `catalogEdits` targets `{ name: "react", catalogSource.field: { kind: "named", name: "react17" } }` and the same `react:` token also appears under the top-level `catalog:` block
- **THEN** the `Edit` match includes surrounding context so only the `catalogs.react17.react` value is rewritten

#### Scenario: Bun default catalog pinned in package.json

- **WHEN** `catalogEdits` includes `{ name: "eslint-plugin-storybook", targetVersion: "10.1.11", catalogSource: { sourceFile: "package.json", manager: "bun", field: { kind: "default" }, underWorkspaces: false } }`
- **THEN** the skill rewrites `package.json#catalog["eslint-plugin-storybook"]` to `10.1.11` in place, preserving formatting and key order
- **AND** does NOT invoke `npm-check-updates` for the catalog source

#### Scenario: Bun named catalog pinned

- **WHEN** `catalogEdits` includes `{ name: "jest", targetVersion: "30.0.1", catalogSource: { sourceFile: "package.json", manager: "bun", field: { kind: "named", name: "testing" }, underWorkspaces: true } }`
- **THEN** the skill rewrites `package.json#workspaces.catalogs.testing.jest` to `30.0.1` in place

#### Scenario: Consumer catalog reference untouched

- **WHEN** a consumer `package.json` declares `"zod": "catalog:"` / `"react": "catalog:react17"` (pnpm) or `"eslint-plugin-storybook": "catalog:default"` (Bun)
- **THEN** the skill does NOT modify that consumer `package.json`
