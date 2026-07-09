---
name: scan-npm-updates
description: Scan a JavaScript/TypeScript project for available npm dependency updates filtered by level (patch/minor/major). Use when a command or the user needs a structured list of upgrade candidates before applying them — for example `/experiments:npm-update-patch`, or any flow that asks "what patches are available?" or "which deps have a new minor?". Handles pnpm/npm/yarn/bun/deno, single-repo and workspace, pnpm and Bun `catalog:` entries, and `minimumReleaseAge`. Returns JSON; does NOT edit files or run installs — that's the caller's job. (`engines` is NOT a level here — the runtime/toolchain bump is handled by `detect-toolchain-surfaces`.)
---

# scan-npm-updates

Scan the current working directory's JS/TS project and return a structured list of dependency updates at a given level. Pure read-only scan; all mutation (bumping manifests, running installs) is the caller's responsibility.

> **Skill scope vs. `data/` folder.** This skill does NOT read anything under `skills/scan-npm-updates/data/`. The `data/` subdirectory hosts command-side registries (e.g. `pkg-upgrade-overrides.yaml`) consumed by `/experiments:npm-update-patch` and siblings. The registries are co-located with the skill because they are semantically paired with the scan output, but they are intentionally out of scope for the scan itself — the skill stays read-only and registry-agnostic. Future contributors should add command-side data here; skill-side inputs live elsewhere (or in `references/`).

## Inputs

- **`level`** (required): `patch` | `minor` | `major`. The caller passes this; do not infer from arguments. `engines` is **not** a valid level here — the toolchain bump (runtime / package manager) is resolved by `detect-toolchain-surfaces` (capability `engine-surface-scanning`), not by the dependency scan.

## Output contract

Return a JSON object with this exact shape:

```ts
interface ScanResult {
    packageManager: "pnpm" | "npm" | "yarn" | "bun" | "deno";
    repoType: "single" | "workspace";
    updates: Array<{
        name: string; // npm package name
        currentVersion: string; // semver declared in the manifest (with any leading ^/~ preserved)
        targetVersion: string; // semver proposed by the tool (same prefix convention as current)
        location: "root" | `workspace:${string}` | "catalog:default" | `catalog:${string}`;
        sourceFile: string; // repo-root-relative path of the manifest to edit
        skippedByReleaseAge?: boolean; // true if a newer version was filtered by minimumReleaseAge and this is the fallback
        catalogSource?: {
            // present on every catalog:* record (catalog:default / catalog:<name>), absent on root/workspace:* records
            sourceFile: string; // catalog source to edit: "pnpm-workspace.yaml" (pnpm) or the root "package.json" (bun)
            manager: "pnpm" | "bun";
            field: { kind: "default" } | { kind: "named"; name: string };
            underWorkspaces?: boolean; // bun only: true when the catalog block lives under `workspaces`
        };
    }>;
    warnings: string[]; // non-fatal: tool stderr, ambiguous-default notes, npm view failures, parse notes
}
```

**Do not** output prose or tables. The caller renders user-facing output. The only output of this skill is the JSON block (fenced or raw, caller decides) plus warnings embedded inside it.

## Hard preconditions — abort with clear message

Perform these in order. Any failure aborts the skill:

1. **`level` is one of the three accepted values** (`patch` / `minor` / `major`). Otherwise — including `engines`, which is no longer a dependency-scan level — abort: `Error: invalid level "<value>". Expected patch|minor|major.` (`level=engines` aborts here; the toolchain bump is handled by `detect-toolchain-surfaces`.)
2. **A package manager can be determined** (see Detection below). Otherwise: `Error: could not detect a package manager. Need one of: pnpm-lock.yaml, yarn.lock, bun.lock(b), deno.lock, package-lock.json in the repo root.`
3. **The detected PM has a `minimumReleaseAge` lookup entry in this skill** (see table below). PMs without one abort: `Error: minimumReleaseAge lookup not yet documented for <pm>. Refusing to run until documented.`
4. **The runner for the detected PM is on `PATH`** (see Runner Resolution). Otherwise: `Error: <runner> not found on PATH. Install <pm> to proceed.`

## Detection

### Package manager

Check in this order (first match wins):

| Priority | File in repo root         | Package manager |
| -------- | ------------------------- | --------------- |
| 1        | `pnpm-lock.yaml`          | `pnpm`          |
| 2        | `yarn.lock`               | `yarn`          |
| 3        | `bun.lock` or `bun.lockb` | `bun`           |
| 4        | `deno.lock`               | `deno`          |
| 5        | `package-lock.json`       | `npm`           |

If none found, check `package.json#packageManager` (e.g. `pnpm@10.27.0`) and derive from the name before the `@`. If still ambiguous → abort (precondition 2).

### Repo type

`workspace` if any of:

- `pnpm-workspace.yaml` exists.
- `package.json#workspaces` is a non-empty array or an object with a non-empty `packages` array.
- `deno.json#workspace` exists.

Otherwise `single`.

## Runner resolution

| Package manager | Runner invocation prefix                 |
| --------------- | ---------------------------------------- |
| `pnpm`          | `pnpm dlx`                               |
| `npm`           | `npx -y`                                 |
| `yarn`          | `yarn dlx`                               |
| `bun`           | `bunx`                                   |
| `deno`          | `deno run --allow-read --allow-net npm:` |

Before the first invocation: `command -v <runner_binary>`. For deno the binary is `deno`; for npm check `npx`. Abort (precondition 4) if missing.

## Tool invocation

Pinned tool: **`npm-check-updates@21.0.2`** (ncu).

Build the command:

- `<runner-prefix> npm-check-updates@21.0.2 -p <pm> --target <ncu-target> --jsonUpgraded --packageFile <manifest-path>`
- `<pm>` is the package manager resolved in precondition 2 (one of `pnpm`|`npm`|`yarn`|`bun`|`deno`). Passing `-p` is MANDATORY: ncu 21.0.2 auto-detects `packageManager: 'deno'` when `--packageFile` points to a directory with a sibling `deno.json`, which collapses `--dep` to `['imports']` and drops real bumps in `dependencies`/`devDependencies` (see change `fix-scan-npm-updates-pm-detection`).
- Add `--cooldown <period>` only when the detected PM is **not** `pnpm` (pnpm's `minimumReleaseAge` is read natively by ncu; verified in the spike). The value comes from the lookup below; omit the flag if the resolved period is `0` or unset.

### `level` → `--target` mapping

| `level` | ncu `--target` | Notes                                                                                                                                                                         |
| ------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `patch` | `patch`        | Cap semantic: only reports packages with a patch available inside the current minor band.                                                                                     |
| `minor` | `minor`        | Cap semantic: only reports packages with a minor available inside the current major band.                                                                                     |
| `major` | `latest`       | ncu has no native `major` target. The skill passes `--target latest`, then post-filters results to keep only packages whose target major > current major (see Parsing below). |

### Which manifests to scan

- `single` → one invocation against `./package.json`.
- `workspace` → one invocation per workspace sub-package manifest. Enumerate with:
    - pnpm: `pnpm -r exec node -e "console.log(process.cwd())"` (or read `pnpm-workspace.yaml#packages` globs and expand with `ls`).
    - npm/yarn/bun: read `package.json#workspaces` globs and expand.
    - deno: read `deno.json#workspace`.
    - (regardless of PM) also scan the root `package.json` once (many repos keep dev-only deps there).

Running ncu once per manifest keeps the `--jsonUpgraded` shape predictable (`{ name: targetVersion }`). The `-ws` flag has different output shapes across ncu versions and is avoided.

## Parsing ncu output

ncu writes a non-JSON banner before the JSON payload when `minimumReleaseAge` is read from `pnpm-workspace.yaml` (example: `Using minimumReleaseAge from pnpm-workspace.yaml: 1 day`). Parse defensively:

1. Capture full stdout.
2. Find the first line that begins with `{` (trim leading whitespace). Drop everything before it.
3. `JSON.parse(remaining)`. On failure → push the raw stdout (first 500 chars) into `warnings` and continue with `{}` for that manifest.
4. Capture stderr into `warnings` unchanged (one warning per non-empty line).

The parsed object maps `name → targetVersion`. Look up the `currentVersion` from the same manifest's `dependencies`/`devDependencies`/`peerDependencies`/`optionalDependencies` to fill `currentVersion` and preserve any `^`/`~`/`=` prefix.

When `level=major`, after parsing ncu's output, drop entries whose parsed target-major is not strictly greater than the parsed current-major. This enforces the `major` cap semantic that ncu itself does not provide (its `latest` target returns whatever is tagged `latest`, which may be the same major).

## `minimumReleaseAge` lookup table

This table is authoritative. Any PM not listed here SHALL abort (precondition 3).

| PM   | Config resolution order                                                                                        | Native-read by ncu? | Skill action                                                 |
| ---- | -------------------------------------------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------ |
| pnpm | `pnpm-workspace.yaml#minimumReleaseAge` → `.npmrc#minimum-release-age` → `package.json#pnpm.minimumReleaseAge` | Yes (v21+)          | Do NOT pass `--cooldown`; ncu auto-reads and prints banner.  |
| npm  | `.npmrc#minimum-release-age` (npm 11+) → `npm config get minimum-release-age`                                  | No                  | Resolve value (minutes) → pass `--cooldown <value>m` to ncu. |
| yarn | No native setting. Accept `.npmrc#minimum-release-age` as convention if present, else `0`.                     | No                  | Same as npm row.                                             |
| bun  | No native setting. Accept `.npmrc#minimum-release-age` as convention if present, else `0`.                     | No                  | Same as npm row.                                             |
| deno | No native setting. Accept `.npmrc#minimum-release-age` as convention if present, else `0`.                     | No                  | Same as npm row.                                             |

ncu's `--cooldown` accepts ISO-8601-ish durations such as `1d`, `12h`, `1440m`. Convert pnpm's minute value (`minimumReleaseAge: 1440`) to `1440m` when passing explicitly.

## Catalog post-processing

After running ncu on every manifest, the raw updates set misses any dep declared as a `catalog:` reference in a consumer `package.json` (`"<pkg>": "catalog:"` for pnpm; `"<pkg>": "catalog:"` or `"catalog:<name>"` for bun). ncu skips those entries syntactically because they carry no version (verified for both PMs — see `research/ncu-bun-catalog-spike.md`). The scan therefore reads the catalog **source** directly, branching on the detected package manager. Both branches reuse the same `npm view` + `level` + `minimumReleaseAge` candidate resolution; only the source location and record shape differ.

Each candidate is resolved once via:

- `npm view <name> versions time --json` (single spawn per package; cache in-memory for the scan).
- Filter by the current `level` (patch = max version within the current minor band; minor = max within major band; major = max version whose major > current's major) and the resolved `minimumReleaseAge` threshold (a version is acceptable iff `now - publishTime >= threshold`).
- `skippedByReleaseAge: true` when a higher version was filtered by the age threshold.

### pnpm — `pnpm-workspace.yaml` `catalog` / `catalogs`

When `packageManager === "pnpm"`, pnpm declares catalogs in `pnpm-workspace.yaml`: a top-level `catalog:` map (the **default** catalog) plus a `catalogs:` map whose blocks (`catalogs.<name>`, referenced as `catalog:<name>`) are **named** catalogs.

1. Read `pnpm-workspace.yaml` and parse the top-level `catalog:` map and every block under the `catalogs:` map. If none are present, skip this branch.
2. For each `(name, version)` entry, resolve the candidate exactly as above (same `npm view` + `level` + `minimumReleaseAge` logic) and emit an update record with:
    - `name`: the catalog key.
    - `currentVersion`: the value from the catalog block.
    - `targetVersion`: the resolved candidate.
    - `location`: `"catalog:default"` for the top-level `catalog:` map; `"catalog:<name>"` for a `catalogs.<name>` block.
    - `sourceFile`: `"pnpm-workspace.yaml"`.
    - `catalogSource`: `{ sourceFile: "pnpm-workspace.yaml", manager: "pnpm", field }`, where `field = { kind: "default" }` for the top-level `catalog:` map and `field = { kind: "named", name: "<name>" }` for a `catalogs.<name>` block. pnpm has no `underWorkspaces` concept, so `underWorkspaces` SHALL be **absent** on pnpm records.
    - `skippedByReleaseAge` as resolved above.
3. **pnpm named catalogs ARE supported (Full scope)** — emit records for `catalogs.<name>` entries and push **NO** `named catalog … not yet supported` warning.
4. **Ambiguous default:** if the repo declares both a top-level `catalog:` map AND a `catalogs.default` block, push the warning `ambiguous default catalog: both 'catalog' and 'catalogs.default' present; treating as distinct sources` and emit both as distinct records. They share `location: "catalog:default"` but stay unambiguous downstream via `catalogSource.field` (the top-level `catalog:` entries are `{ kind: "default" }`; the `catalogs.default` entries are `{ kind: "named", name: "default" }`).
5. If a consumer `package.json` has `"<pkg>": "catalog:"` / `"catalog:<name>"` AND ncu separately reported `<pkg>` from that manifest (shouldn't happen because a `catalog:` specifier carries no version, but defensive), drop the manifest-level record and keep the catalog record.

### bun — root `package.json` `catalog` / `catalogs`

When `packageManager === "bun"`, bun declares catalogs in the root `package.json`, each placeable top-level **or** nested under `workspaces`:

1. Read the catalog maps from the root `package.json`. Prefer the native readers `bun pm pkg get catalog` and `bun pm pkg get catalogs` (clean JSON, no hand-parsing — see `research/bun-cli-spike.md`); also inspect `workspaces.catalog` and `workspaces.catalogs`. If none are present, skip this branch.
2. Parse all four placements:
    - `catalog` (top-level) and `workspaces.catalog` → the **default** catalog: `field = { kind: "default" }`.
    - `catalogs.<name>` (top-level) and `workspaces.catalogs.<name>` → a **named** catalog: `field = { kind: "named", name: "<name>" }`.
    - Set `underWorkspaces` to `true` for blocks read from under `workspaces`, else `false`.
3. For each `(name, version)` entry, resolve the candidate exactly as above (same `npm view` + `level` + `minimumReleaseAge` logic) and emit an update record with:
    - `name`: the catalog key.
    - `currentVersion`: the value from the catalog block.
    - `targetVersion`: the resolved candidate.
    - `location`: `"catalog:default"` for the default catalog; `"catalog:<name>"` for a named catalog.
    - `sourceFile`: the repo-root-relative path of the root `package.json` (e.g. `"package.json"`).
    - `catalogSource`: `{ sourceFile, manager: "bun", field, underWorkspaces }`.
    - `skippedByReleaseAge` as resolved above.
4. **Bun named catalogs ARE supported (Full scope)** — emit records for them and push **NO** `named catalog … not yet supported` warning.
5. **Ambiguous default:** if the repo declares both a bare `catalog` (top-level or `workspaces.catalog`) AND a `catalogs.default`, push the warning `ambiguous default catalog: both 'catalog' and 'catalogs.default' present; treating as distinct sources` and emit both as distinct records. They share `location: "catalog:default"` but stay unambiguous downstream via `catalogSource.field` (the bare default is `{ kind: "default" }`; the named one is `{ kind: "named", name: "default" }`).

## Assembling the result

For each manifest in the repo:

- `location`:
    - root `package.json` in `single` → `"root"`.
    - root `package.json` in `workspace` → `"root"` (still valid; it's the workspace root manifest).
    - non-root workspace `package.json` → `workspace:<package-name>` where `<package-name>` is that manifest's `name` field.
    - default catalog (pnpm top-level `catalog:` or bun `catalog`) → `"catalog:default"`; pnpm or bun named catalog (`catalogs.<name>`) → `"catalog:<name>"`.
- `sourceFile`: repo-root-relative path (e.g. `apps/wealth-react/package.json`, `pnpm-workspace.yaml`, or the root `package.json` for bun catalogs).
- `catalogSource`: present on every `catalog:*` record (describing the exact edit target so apply is unambiguous); absent on `root`/`workspace:*` records.

Preserve the version prefix from the current manifest when emitting `targetVersion`:

- current `"^19.0.0"` + ncu target `19.0.14` → emit `^19.0.14`.
- current `"19.2.4"` (exact) + ncu target `19.2.5` → emit `19.2.5`.
- current `"~5.4.0"` + ncu target `5.4.1` → emit `~5.4.1`.

Concatenate all `warnings` from:

- ncu stderr per invocation.
- JSON parse failures.
- The pnpm / bun ambiguous-default note.
- Any `npm view` failures during catalog processing.

Dedupe warnings (same string appearing twice → keep one).

## Return

Emit the `ScanResult` JSON object. That's it. Do not print tables, do not ask questions, do not apply anything.

## Error paths summary

| Scenario                                               | Behaviour                                                                                                                   |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Unknown `level`                                        | Abort with precondition-1 error.                                                                                            |
| No lockfile and no `packageManager` hint               | Abort with precondition-2 error.                                                                                            |
| PM lacks `minimumReleaseAge` lookup row                | Abort with precondition-3 error.                                                                                            |
| PM runner missing                                      | Abort with precondition-4 error.                                                                                            |
| ncu exits non-zero on a manifest                       | Push stderr (or a synthesized `ncu failed on <manifest>`) into `warnings` and continue. `updates` for that manifest = `[]`. |
| ncu output cannot be parsed as JSON                    | Push raw stdout (truncated) into `warnings`; `updates` for that manifest = `[]`.                                            |
| `npm view <pkg>` fails during catalog post-process     | Push a warning naming the package; omit catalog record for that entry.                                                      |
| pnpm named catalog present                             | Supported — emit records, no warning.                                                                                       |
| pnpm ambiguous default (`catalog` + `catalogs.default`) | Push ambiguous-default warning; emit both as distinct records (differentiated by `catalogSource.field`).                   |
| bun named catalog present                              | Supported — emit records, no warning.                                                                                       |
| bun ambiguous default (`catalog` + `catalogs.default`) | Push ambiguous-default warning; emit both as distinct records (differentiated by `catalogSource.field`).                    |

The only abort paths are the four preconditions. Everything after is resilient: degrade to warnings and keep going.

## Example output

```json
{
    "packageManager": "pnpm",
    "repoType": "workspace",
    "updates": [
        {
            "name": "@types/react",
            "currentVersion": "^19.0.0",
            "targetVersion": "^19.0.14",
            "location": "workspace:@m0n0lab/wealth-react",
            "sourceFile": "apps/wealth-react/package.json"
        },
        {
            "name": "vitest",
            "currentVersion": "4.0.18",
            "targetVersion": "4.0.24",
            "location": "catalog:default",
            "sourceFile": "pnpm-workspace.yaml",
            "catalogSource": {
                "sourceFile": "pnpm-workspace.yaml",
                "manager": "pnpm",
                "field": { "kind": "default" }
            }
        },
        {
            "name": "react",
            "currentVersion": "18.2.0",
            "targetVersion": "18.3.1",
            "location": "catalog:react17",
            "sourceFile": "pnpm-workspace.yaml",
            "catalogSource": {
                "sourceFile": "pnpm-workspace.yaml",
                "manager": "pnpm",
                "field": { "kind": "named", "name": "react17" }
            }
        }
    ],
    "warnings": []
}
```

A bun catalog record (named catalog under `workspaces`) looks like:

```json
{
    "name": "jest",
    "currentVersion": "30.0.0",
    "targetVersion": "30.0.1",
    "location": "catalog:testing",
    "sourceFile": "package.json",
    "catalogSource": {
        "sourceFile": "package.json",
        "manager": "bun",
        "field": { "kind": "named", "name": "testing" },
        "underWorkspaces": true
    }
}
```
