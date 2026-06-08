---
name: detect-toolchain-surfaces
description: Use when an engines-level update command (`/experiments:npm-update-engines`, `/experiments:npm-update-deep-engines`, or the `commander-update-orchestrator` at `level=engines`) needs to find every place a runtime or package-manager version is pinned in a project. Scans package.json (engines/packageManager/devEngines/volta), .nvmrc/.node-version, .tool-versions/mise, Dockerfiles, and CI configs (GitHub Actions, GitLab CI, CircleCI), classifies each locus as runtime/support/ambiguous, detects intra-repo misalignment, and returns a structured inventory. Read-only — never edits files, runs installs, runs ncu, or performs any VCS action. The engines-level analog of `scan-npm-updates`.
---

# detect-toolchain-surfaces

Scan a project for **every** place a runtime or package-manager version is declared, classify each locus, and return a structured inventory. This is the engines-level analog of `scan-npm-updates` (`npm-update-scanning`): the input is "where is each runtime/PM version pinned" (multi-file, multi-format), not "what npm deps have a newer version".

Engines covered: **Node**; the package managers **pnpm**, **npm**, **yarn**, **bun**; **Deno**; and **Bun-as-runtime**. Because bun and deno act as both runtime and package manager, the skill detects each role separately — a runtime-version locus and a `packageManager` locus — and associates both with the same engine.

> Authoritative spec: `openspec/changes/add-engines-update-cascade/specs/engine-surface-scanning/spec.md` (capability `engine-surface-scanning`).

## When to use

- `/experiments:npm-update-engines` (shallow single-project) — detect → caller resolves/confirms targets → caller gates → `apply-engine-bumps`.
- `/experiments:npm-update-deep-engines` (deep single-project) — detect → engine release-note research → gated apply.
- `commander-update-orchestrator` at `level=engines` — invoked once per project (replaces the per-project `scan-npm-updates` call).

The skill is meant for command-/skill-layer composition. It performs **no** writes.

## Read-only contract (hard)

Implemented entirely with `Read`, `Glob`, `Grep`, and (read-only) `Bash`. The skill SHALL NOT:

- edit, create, or delete any file;
- run any install (`pnpm install`, `npm install`, …);
- run `ncu` / `npm-check-updates`;
- perform any VCS action (`git commit`, `git push`, branch/worktree creation, `gh pr`).

Producing the inventory is its only output. Target resolution and rewriting are owned by `apply-engine-bumps`.

## Output contract

Return a JSON object with this exact shape:

```ts
interface EngineSurfaceInventory {
    engines: Array<{
        engine: "node" | "pnpm" | "npm" | "yarn" | "bun" | "deno";
        surfaces: Array<{
            file: string; // repo-root-relative path
            locus: string; // a precise pointer inside the file (see "Locus identifiers")
            currentVersion: string; // the version string as declared (range or exact, verbatim)
            kind: "runtime" | "support" | "ambiguous";
        }>;
        distinctRuntimeVersions: string[]; // distinct currentVersion values across this engine's `runtime` loci
    }>;
    ambiguities: Array<{
        file: string;
        engine: string;
        locus: string;
        currentVersion: string;
        reason: string;
    }>;
    unknownSurfaces: Array<{ file: string; reason: string }>;
    misalignments: Array<{
        engine: string;
        versions: string[];
        loci: Array<{ file: string; locus: string; currentVersion: string }>;
    }>;
}
```

- One `engines[]` entry per engine that has at least one detected surface, in the order node → pnpm → npm → yarn → bun → deno (omit engines with no surface).
- `ambiguities[]` re-lists every locus whose `kind === "ambiguous"` so the caller can prompt; the same locus also appears under its engine's `surfaces[]` with `kind: "ambiguous"`.
- `unknownSurfaces[]` lists version-bearing files the skill recognized as a known surface _type_ but could not parse with confidence — reported, never guessed.
- `misalignments[]` is populated per "Intra-repo misalignment".

**Do not** print an apply plan, a user-facing table, or any rewrite. The JSON inventory is the only output (the command renders user-facing copy).

## Surface-matcher table (the single extension point)

The skill enumerates **matchers**; each matcher knows how to read the current version for one (engine, file-kind) locus. Adding a CI provider or file format is one row + one matcher. v1 matcher set:

| Surface                                                           | Engines            | Read locus                                                                                                                                                              |
| ----------------------------------------------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json` `engines.{node,pnpm,npm,yarn,bun,deno}`            | all                | JSON value at `engines.<engine>`                                                                                                                                        |
| `package.json` `packageManager`                                   | pnpm/npm/yarn/bun  | the `name@version` token (version after `@`, before any `+sha…`)                                                                                                        |
| `package.json` `devEngines.runtime` / `devEngines.packageManager` | all                | object or array element `version` (each element keyed by its `name`)                                                                                                    |
| `package.json` `volta.{node,pnpm,yarn}`                           | node/pnpm/yarn     | JSON value at `volta.<engine>`                                                                                                                                          |
| `.nvmrc`, `.node-version`                                         | node               | the whole-file version token (trim whitespace, strip a leading `v`)                                                                                                     |
| `.tool-versions` (asdf)                                           | node/pnpm/deno/bun | the `<tool> <version>` line for a recognized tool                                                                                                                       |
| `mise.toml`, `.mise.toml`                                         | node/pnpm/deno/bun | the `[tools]` entry for a recognized tool                                                                                                                               |
| `Dockerfile*`                                                     | node/deno/bun      | `FROM <image>:<tag>` tag AND `ARG <NAME>_VERSION=<default>` defaults                                                                                                    |
| GitHub Actions (`.github/workflows/*.{yml,yaml}`)                 | all                | `actions/setup-node` → `with.node-version`; `pnpm/action-setup` → `with.version`; `denoland/setup-deno` → `with.deno-version`; `oven-sh/setup-bun` → `with.bun-version` |
| GitLab CI (`.gitlab-ci.yml`)                                      | all                | job `image:` tag; `variables: NODE_VERSION`                                                                                                                             |
| CircleCI (`.circleci/config.yml`)                                 | all                | `docker: - image:` tag; Node orb `node/install` `node-version` / `version` params                                                                                       |

### Engine-name recognition in version-manager files

For `.tool-versions` and `mise` `[tools]`, recognize tool names: `node`/`nodejs` → node; `pnpm` → pnpm; `deno` → deno; `bun` → bun. Unrecognized tool lines are ignored (not version surfaces for this skill). For Docker `FROM` images, recognize `node`/`*/node` → node, `denoland/deno` → deno, `oven/bun` → bun.

### Locus identifiers

`locus` is a precise pointer so `apply-engine-bumps` can re-find the exact token to rewrite:

- `package.json` → `engines.node`, `packageManager`, `devEngines.runtime[0].version`, `volta.node`, …
- `.nvmrc`/`.node-version` → `file` (whole file).
- `.tool-versions` → `tools.node` (the line for that tool); mise → `[tools].node`.
- Dockerfile → `FROM:<line-number>` for an image tag, `ARG:<NAME>_VERSION:<line-number>` for an ARG default.
- GitHub Actions → `<job>.<step-index>.with.node-version` (job id + step index + input key).
- GitLab CI → `<job>.image` or `variables.NODE_VERSION`.
- CircleCI → `jobs.<job>.docker[<i>].image` or `<job>.<step>.node-version`.

### Surgical, read-only parsing

- Parse JSON manifests with a real JSON read; parse YAML/TOML/Dockerfiles structurally where possible, defensively by line otherwise.
- A version-bearing file of a **known surface type** that cannot be parsed with confidence (malformed YAML, an unexpected `FROM` shape, a `packageManager` value not of the form `name@version`) → push `{ file, reason }` to `unknownSurfaces`. NEVER invent a version or a locus for it.
- A file the skill does not recognize as any surface type is simply not scanned (it is not an `unknownSurface` — only recognized-but-unparseable surfaces are).

## Workspaces

In a workspace, scan the root `package.json` and **every** workspace member `package.json` (enumerate the same way `scan-npm-updates` does — `package.json#workspaces` globs, `pnpm-workspace.yaml#packages`, `deno.json#workspace`). Non-`package.json` runtime files (`.nvmrc`, CI, Docker, version-manager files) are repo-level — scan each once at the path it lives.

## Runtime-vs-support classification (D3)

For each `engines.node`-bearing `package.json` (and, by the same logic, other `engines.<engine>` ranges in publishable manifests), classify the locus:

- **`runtime`** (bump + pin exact) when ANY of:
    - the manifest has `private: true`; OR
    - the manifest is non-publishable (no `publishConfig`, no `exports`, no library `main` dist surface); OR
    - it is the workspace root manifest.
- **`support`** (leave untouched — a consumer contract) when the manifest **is** publishable (not `private`, has `publishConfig`/`exports`/library `main`) AND its `engines.<engine>` value is a **range** (`>=`, `^`, `~`, `||`, `*`, `x`, or any comparator/union — i.e. not a single exact `x.y.z`).
- **`ambiguous`** otherwise — i.e. a publishable manifest pinning an **exact** `engines.<engine>` (e.g. `24.12.0`), or a `private` manifest declaring a **range**. Flag for the caller to resolve (with a conservative default of _leave_).

**All non-`package.json` runtime files** (`.nvmrc`, `.node-version`, `.tool-versions`, mise, CI, Docker) are classified **`runtime` unconditionally** — they describe the toolchain the project runs, never a published-package support contract.

`packageManager`, `devEngines`, and `volta` loci are always `runtime` (they describe the dev toolchain, not a consumer support range).

This is why monolab's libs (`engines.node: ">=22"`, publishable) are `support` and its apps (`24.12.0`, `private`) are `runtime` — different axes, not a misalignment to fix.

## Intra-repo misalignment detection

Per engine, collect `distinctRuntimeVersions` = the set of distinct `currentVersion` values across that engine's **`runtime`** loci only. When more than one distinct runtime version exists for the same engine, push a `misalignments[]` entry listing the engine, the distinct versions, and the contributing loci. `support` ranges SHALL NOT count toward runtime misalignment (different axis). Misalignment is surfaced, not resolved — the caller converges it to the resolved target.

## Procedure

1. Enumerate manifests (root + workspace members) and the repo-level runtime files via the matcher table.
2. For each matched locus, read the `currentVersion` verbatim and record `{ file, engine, currentVersion, locus, kind }` (classify per the rules above).
3. Group surfaces by engine (node → pnpm → npm → yarn → bun → deno); compute `distinctRuntimeVersions` per engine.
4. Collect `ambiguities[]`, `unknownSurfaces[]`, and `misalignments[]`.
5. Return the `EngineSurfaceInventory` JSON. Perform no write.

## Hard rules

- Read-only: no file edits, no installs, no `ncu`, no VCS action (see "Read-only contract").
- Report `unknownSurfaces` rather than guessing a version or locus.
- `support` and `ambiguous` loci are reported but NOT marked to bump (the caller resolves `ambiguous`; `apply-engine-bumps` never touches `support`).
- Emit only the JSON inventory — no user-facing tables, no apply plan.

## See also

- `apply-engine-bumps` — resolves targets and rewrites the `runtime` loci this skill reports.
- `scan-npm-updates` — the dependency-level analog (patch/minor/major); engines is deliberately a separate skill (design D1).
- `commander-update-orchestrator` — routes `level=engines` to this skill instead of `scan-npm-updates`.
