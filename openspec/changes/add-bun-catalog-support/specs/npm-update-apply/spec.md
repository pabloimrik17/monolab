## RENAMED Requirements

- FROM: `### Requirement: pnpm-workspace.yaml catalog edits`
- TO: `### Requirement: Catalog source edits`

## MODIFIED Requirements

### Requirement: Mechanical apply input contract

The skill SHALL accept a fully-resolved, single-project apply spec with exactly these inputs (the caller resolves conflict policy, override decisions, and `--filter` membership before invoking):

- `packageManager` (required) — one of `pnpm`, `npm`, `yarn`, `bun`, `deno`.
- `cwd` (required) — absolute path of the project whose manifests are bumped. Every `Bash` invocation SHALL run with this working directory (or use absolute `--packageFile` paths); the skill SHALL NOT mutate the caller's shell state across invocations.
- `target` (required) — one of `patch`, `minor`, `major`, `engines`. Passed verbatim to `ncu --target`.
- `cooldown` (optional) — release-age period to pass as `ncu --cooldown`; omitted for `pnpm` (ncu reads `pnpm-workspace.yaml` natively).
- `manifestBumps` (optional) — array of `{ sourceFile, names: string[], includeFilter: boolean }`; one `package.json` manifest per element.
- `catalogEdits` (optional) — array of `{ name, targetVersion, catalogSource? }`. `catalogSource` identifies the exact source to edit: `{ sourceFile, manager: "pnpm"|"bun", field: { kind: "default" } | { kind: "named"; name: string }, underWorkspaces?: boolean }`. When `catalogSource` is omitted the skill SHALL assume the legacy pnpm default — `{ sourceFile: "pnpm-workspace.yaml", manager: "pnpm", field: { kind: "default" } }` — preserving byte-identical behavior for existing pnpm callers.
- `overrideCommands` (optional) — array of `{ id, command }`, the already-interpolated override commands in declaration order.
- `skipInstall` (optional, default `false`) — when `true`, the final install is skipped (every accepted package was handled by an override that runs its own install).

The skill SHALL reject an unknown `packageManager` or `target` before any side effect.

#### Scenario: Unknown target rejected before side effects

- **WHEN** the caller invokes the skill with `target: "junk"`
- **THEN** the skill aborts with an invalid-target error and performs no `ncu`, catalog edit, override command, or install

#### Scenario: Resolved spec is consumed as-is

- **WHEN** the caller passes `manifestBumps`, `catalogEdits`, and `overrideCommands` already partitioned
- **THEN** the skill applies exactly those, performing no override matching, no conflict resolution, and no `pick-subset` parsing of its own

#### Scenario: catalogEdits without catalogSource defaults to pnpm

- **WHEN** a `catalogEdits` element omits `catalogSource`
- **THEN** the skill targets `pnpm-workspace.yaml` under the top-level `catalog:` block (legacy behavior, byte-identical)

### Requirement: Generic package.json bumps via npm-check-updates

For each `manifestBumps` element (a `package.json` `sourceFile`), the skill SHALL invoke `npm-check-updates@21.0.2` exactly once via the package-manager runner prefix (`pnpm dlx`, `npx -y`, `yarn dlx`, `bunx`, `deno run --allow-read --allow-net npm:`):

```bash
<runner-prefix> npm-check-updates@21.0.2 -p <packageManager> --target <ncuTarget> --upgrade --removeRange --packageFile <sourceFile> [--cooldown <period>] [--filter "<names>"]
```

The skill SHALL resolve `<ncuTarget>` from the `target` input via the same table `scan-npm-updates` uses (NOT passing `target` verbatim):

| `target` (= level) | `<ncuTarget>` | extra flag |
| --- | --- | --- |
| `patch` | `patch` | — |
| `minor` | `minor` | — |
| `major` | `latest` | — |

`-p <packageManager>` SHALL always be passed (mirror scan semantics, prevent ncu auto-detect drift). `--cooldown` SHALL be included when `cooldown` is set and omitted for `pnpm`.

**`--removeRange` SHALL always be passed**, at every level and every bump type: each bumped dependency is written as an **exact version** (no `^`/`~`/range operator) — e.g. `"react": "19.0.2"`, not `"^19.0.2"`. This is a deliberate, family-wide behavior change (the whole update cascade pins exact); it is NOT byte-equivalent to the pre-change patch/minor output, which preserved the existing range operator. Override-managed families (run via `overrideCommands`) pin according to their own upgrade tool and are out of scope of this rule.

`--filter "<names>"` (the element's `names`, space-separated, double-quoted) SHALL be included when `includeFilter` is `true`. Additionally, when `<ncuTarget>` resolves to `latest` (i.e. `target` is `major`), the skill SHALL ALWAYS include `--filter "<names>"` regardless of the element's `includeFilter` value — the caller's `names` list is authoritative. This is required because `scan-npm-updates` produces the `latest`-level candidate set by running `ncu --target latest` and then post-filtering (e.g. major-only); running `ncu --target latest` without `--filter` would bump every dependency with any newer version, exceeding the accepted set. For `patch`/`minor` targets `--filter` is omitted when `includeFilter` is `false`.

**Catalog-reference guard (package-manager-agnostic, defense-in-depth).** The skill SHALL NOT include in `--filter` any package name whose declared value in `<sourceFile>` matches `/^catalog:/`, and SHALL NOT write a pinned version over any consumer value matching `/^catalog:/`. A `catalog:*` specifier is a reference, not a version, and its source is bumped via `catalogEdits` (see "Catalog source edits"). At the pinned `ncu@21.0.2` this is a no-op (ncu already skips `catalog:*` specifiers, verified for both pnpm and bun); the guard prevents a silent regression should a future ncu stop skipping them.

The skill SHALL stream `ncu` stdout/stderr to the user verbatim.

If `ncu` exits non-zero for a manifest, the skill SHALL stop immediately and return a structured failure `{ step: "ncu", sourceFile, exitCode, appliedSoFar }` without printing any consumer-specific abort message.

#### Scenario: One ncu invocation per manifest

- **WHEN** the spec has two distinct `package.json` source files
- **THEN** the skill invokes `npm-check-updates@21.0.2` exactly once per file, with `-p <pm> --target <ncuTarget> --upgrade --removeRange --packageFile <sourceFile>`

#### Scenario: Exact pin at all levels via --removeRange

- **WHEN** the skill bumps `react` to `19.0.2` (any level)
- **THEN** the written `package.json` value is `"react": "19.0.2"` with no `^`/`~` prefix
- **AND** the same exact-pin rule applies to `patch`, `minor`, and `major` bumps

#### Scenario: Major maps to latest and always filters

- **WHEN** the skill is invoked with `target: "major"` and a `manifestBumps` element `{ names: ["react", "react-dom"], includeFilter: false }`
- **THEN** the ncu invocation uses `--target latest --removeRange` and includes `--filter "react react-dom"` despite `includeFilter` being `false`
- **AND** no dependency outside `["react", "react-dom"]` is bumped

#### Scenario: Patch/minor pin exact (intentional change, not byte-equivalent)

- **WHEN** the skill is invoked with `target: "minor"` and an element with `includeFilter: false`
- **THEN** the ncu invocation uses `--target minor --removeRange` and omits `--filter`
- **AND** the bumped deps are written as exact versions (a deliberate change from the pre-change `^`-preserving output)

#### Scenario: ncu failure returns structured failure, not consumer copy

- **WHEN** `ncu` exits non-zero on a manifest
- **THEN** the skill stops, returns `{ step: "ncu", sourceFile, exitCode, appliedSoFar }`, and does NOT run the install or any override command
- **AND** the skill does NOT print a `Re-run /experiments:...` or `Stopping the run...` line (the caller owns that copy)

#### Scenario: Consumer catalog reference excluded from generic bumps

- **WHEN** a `manifestBumps` `sourceFile` declares `"eslint-plugin-storybook": "catalog:default"` (Bun) or `"vitest": "catalog:"` (pnpm)
- **THEN** the skill does NOT add that name to `--filter` and does NOT write a pinned version over the `catalog:*` value
- **AND** the consumer `package.json` reference is left untouched

### Requirement: Catalog source edits

For each `catalogEdits` element, the skill SHALL bump the entry **in its catalog source** (resolved from `catalogSource`, defaulting to `pnpm-workspace.yaml` when absent) by replacing its value with the **exact** version — `targetVersion` with any leading range operator (`^`/`~`/`=`) stripped — preserving surrounding whitespace, comments, and the order of other keys. This is an in-place `Edit`, never an `npm-check-updates` invocation (ncu does not rewrite catalog sources for pnpm or bun). The skill SHALL NOT touch any consumer `package.json` entry that is a `catalog:` reference.

- **pnpm** (`catalogSource.manager === "pnpm"` or omitted): locate the key under the top-level `catalog:` block of `pnpm-workspace.yaml` and replace its value.
- **bun** (`catalogSource.manager === "bun"`): in the root `package.json` identified by `catalogSource.sourceFile`, locate the catalog block from `catalogSource.field` — `{ kind: "default" }` → the `catalog` map; `{ kind: "named", name }` → `catalogs.<name>` — nested under `workspaces` when `underWorkspaces` is `true`. Replace the matched `"name": "<version>"` token with the exact target via a targeted `Edit` (NOT a `JSON.parse`→`JSON.stringify`, which would reformat the file). If the version token is non-unique within the file, the `Edit` match SHALL include enough surrounding context to scope it to the resolved block.

If a catalog key (or its resolved block) is unexpectedly missing, the skill SHALL stop and return `{ step: "catalog", name, exitCode: null, appliedSoFar }`.

#### Scenario: pnpm catalog value pinned exact in place

- **WHEN** `catalogEdits` includes `{ name: "zod", targetVersion: "^3.24.1" }` with no `catalogSource`
- **THEN** the skill rewrites the `zod` key under `catalog:` in `pnpm-workspace.yaml` to `3.24.1` (exact, prefix stripped)
- **AND** does NOT invoke `npm-check-updates` for the catalog file

#### Scenario: Bun default catalog pinned in package.json

- **WHEN** `catalogEdits` includes `{ name: "eslint-plugin-storybook", targetVersion: "10.1.11", catalogSource: { sourceFile: "package.json", manager: "bun", field: { kind: "default" }, underWorkspaces: false } }`
- **THEN** the skill rewrites `package.json#catalog["eslint-plugin-storybook"]` to `10.1.11` in place, preserving formatting and key order
- **AND** does NOT invoke `npm-check-updates` for the catalog source

#### Scenario: Bun named catalog pinned

- **WHEN** `catalogEdits` includes `{ name: "jest", targetVersion: "30.0.1", catalogSource: { sourceFile: "package.json", manager: "bun", field: { kind: "named", name: "testing" }, underWorkspaces: true } }`
- **THEN** the skill rewrites `package.json#workspaces.catalogs.testing.jest` to `30.0.1` in place

#### Scenario: Consumer catalog reference untouched

- **WHEN** a consumer `package.json` declares `"zod": "catalog:"` (pnpm) or `"eslint-plugin-storybook": "catalog:default"` (Bun)
- **THEN** the skill does NOT modify that consumer `package.json`

### Requirement: Hard rules

The skill SHALL preserve the family hard rules:

- SHALL NOT run tests, lint, or build.
- SHALL NOT create git commits, branches, or pull requests.
- SHALL NOT mutate any consumer `package.json` entry that is a `catalog:` reference — only the catalog **source** file is edited (`pnpm-workspace.yaml` for pnpm, the root `package.json` `catalog`/`catalogs.<name>` map for Bun).
- SHALL NOT run `ncu --upgrade` as a fallback after an override command fails.
- SHALL NOT read or write the override registry data file except via the read-only resolution procedure.

#### Scenario: No verification steps executed

- **WHEN** an apply completes
- **THEN** no `vitest`, `nx test`, lint, build, or git commit command has been invoked by the skill

#### Scenario: No ncu fallback after override failure

- **WHEN** an override command fails
- **THEN** the skill SHALL NOT invoke `ncu --upgrade` for the matched packages

#### Scenario: Catalog source edited, consumer reference preserved (both PMs)

- **WHEN** the skill applies a catalog bump for a pnpm or bun catalog
- **THEN** only the catalog source file is edited and every consumer `catalog:*` reference is left untouched
