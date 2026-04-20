---
name: scan-npm-updates
description: Scan a JavaScript/TypeScript project for available npm dependency updates filtered by level (patch/minor/major/engines). Use when a command or the user needs a structured list of upgrade candidates before applying them — for example `/experiments:npm-update-patch`, or any flow that asks "what patches are available?" or "which deps have a new minor?". Handles pnpm/npm/yarn/bun/deno, single-repo and workspace, pnpm `catalog:` entries, and `minimumReleaseAge`. Returns JSON; does NOT edit files or run installs — that's the caller's job.
---

# scan-npm-updates

Scan the current working directory's JS/TS project and return a structured list of dependency updates at a given level. Pure read-only scan; all mutation (bumping manifests, running installs) is the caller's responsibility.

> **Skill scope vs. `data/` folder.** This skill does NOT read anything under `skills/scan-npm-updates/data/`. The `data/` subdirectory hosts command-side registries (e.g. `pkg-upgrade-overrides.yaml`) consumed by `/experiments:npm-update-patch` and siblings. The registries are co-located with the skill because they are semantically paired with the scan output, but they are intentionally out of scope for the scan itself — the skill stays read-only and registry-agnostic. Future contributors should add command-side data here; skill-side inputs live elsewhere (or in `references/`).

## Inputs

- **`level`** (required): `patch` | `minor` | `major` | `engines`. The caller passes this; do not infer from arguments.

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
    }>;
    warnings: string[]; // non-fatal: tool stderr, unsupported-catalog notes, parse notes
}
```

**Do not** output prose or tables. The caller renders user-facing output. The only output of this skill is the JSON block (fenced or raw, caller decides) plus warnings embedded inside it.

## Hard preconditions — abort with clear message

Perform these in order. Any failure aborts the skill:

1. **`level` is one of the four accepted values.** Otherwise: `Error: invalid level "<value>". Expected patch|minor|major|engines.`
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

- `<runner-prefix> npm-check-updates@21.0.2 --target <ncu-target> --jsonUpgraded --packageFile <manifest-path>`
- Add `--cooldown <period>` only when the detected PM is **not** `pnpm` (pnpm's `minimumReleaseAge` is read natively by ncu; verified in the spike). The value comes from the lookup below; omit the flag if the resolved period is `0` or unset.

### `level` → `--target` mapping

| `level`   | ncu `--target`             | Notes                                                                                                                                                                                                         |
| --------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `patch`   | `patch`                    | Cap semantic: only reports packages with a patch available inside the current minor band.                                                                                                                     |
| `minor`   | `minor`                    | Cap semantic: only reports packages with a minor available inside the current major band.                                                                                                                     |
| `major`   | `latest`                   | ncu has no native `major` target. The skill passes `--target latest`, then post-filters results to keep only packages whose target major > current major (see Parsing below).                                 |
| `engines` | `latest` + `--enginesNode` | `@engines` is not a valid ncu target. Pass `--target latest --enginesNode`; ncu filters candidates to versions whose `engines.node` satisfies the project's own `engines.node`. Most repos return empty here. |

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

## Catalog post-processing (pnpm only)

After running ncu on every manifest, the raw updates set misses any dep declared as `"<pkg>": "catalog:"` in a consumer `package.json`. ncu skips those entries because they carry no version.

For pnpm workspaces with a `pnpm-workspace.yaml#catalog` block:

1. Read `pnpm-workspace.yaml` and parse the top-level `catalog:` map.
2. If `catalog:` is absent, skip this section.
3. For each `(name, version)` pair under `catalog:`, query `npm view <name> versions time --json` once (single spawn per package; cache in-memory for the scan).
4. Filter candidate versions by:
    - the current `level` (patch = max version within the current minor band; minor = max within major band; major = max version whose major > current's major).
    - the resolved `minimumReleaseAge` threshold (a version is acceptable iff `now - publishTime >= threshold`).
5. Emit an update record with:
    - `name`: the catalog key.
    - `currentVersion`: the value from `pnpm-workspace.yaml#catalog`.
    - `targetVersion`: the resolved candidate.
    - `location`: `"catalog:default"`.
    - `sourceFile`: `"pnpm-workspace.yaml"`.
    - `skippedByReleaseAge`: `true` if a higher version was filtered by the age threshold.
6. If a consumer `package.json` has `"<pkg>": "catalog:"` AND ncu separately reported `<pkg>` from that manifest (shouldn't happen because catalog: is not a version, but defensive), drop the manifest-level record and keep the catalog record.

**Named catalogs (`catalog:test`, etc.):** detect by scanning `pnpm-workspace.yaml` for top-level keys matching `/^catalogs?\./` or a `catalogs:` map. For each named catalog found, push one warning: `named catalog "<name>" detected but not yet supported in this iteration`. Do not emit update records for named-catalog entries.

## Assembling the result

For each manifest in the repo:

- `location`:
    - root `package.json` in `single` → `"root"`.
    - root `package.json` in `workspace` → `"root"` (still valid; it's the workspace root manifest).
    - non-root workspace `package.json` → `workspace:<package-name>` where `<package-name>` is that manifest's `name` field.
- `sourceFile`: repo-root-relative path (e.g. `apps/wealth-react/package.json`).

Preserve the version prefix from the current manifest when emitting `targetVersion`:

- current `"^19.0.0"` + ncu target `19.0.14` → emit `^19.0.14`.
- current `"19.2.4"` (exact) + ncu target `19.2.5` → emit `19.2.5`.
- current `"~5.4.0"` + ncu target `5.4.1` → emit `~5.4.1`.

Concatenate all `warnings` from:

- ncu stderr per invocation.
- JSON parse failures.
- Named-catalog notes.
- Any `npm view` failures during catalog processing.

Dedupe warnings (same string appearing twice → keep one).

## Return

Emit the `ScanResult` JSON object. That's it. Do not print tables, do not ask questions, do not apply anything.

## Error paths summary

| Scenario                                           | Behaviour                                                                                                                   |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Unknown `level`                                    | Abort with precondition-1 error.                                                                                            |
| No lockfile and no `packageManager` hint           | Abort with precondition-2 error.                                                                                            |
| PM lacks `minimumReleaseAge` lookup row            | Abort with precondition-3 error.                                                                                            |
| PM runner missing                                  | Abort with precondition-4 error.                                                                                            |
| ncu exits non-zero on a manifest                   | Push stderr (or a synthesized `ncu failed on <manifest>`) into `warnings` and continue. `updates` for that manifest = `[]`. |
| ncu output cannot be parsed as JSON                | Push raw stdout (truncated) into `warnings`; `updates` for that manifest = `[]`.                                            |
| `npm view <pkg>` fails during catalog post-process | Push a warning naming the package; omit catalog record for that entry.                                                      |
| Named catalog present                              | Push warning; skip those entries.                                                                                           |

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
            "sourceFile": "pnpm-workspace.yaml"
        }
    ],
    "warnings": ["named catalog \"test\" detected but not yet supported in this iteration"]
}
```
