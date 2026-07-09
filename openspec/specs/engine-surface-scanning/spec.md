# engine-surface-scanning Specification

## Purpose

This capability provides a read-only `detect-toolchain-surfaces` skill that scans a project for every place a runtime or package-manager version is declared (Node, pnpm, npm, yarn, bun, Deno, and Bun-as-runtime), classifies each locus, and returns a structured inventory. It is the engines-level analog of `scan-npm-updates`: it detects surfaces across manifests, runtime files, Docker, and CI, classifies each as runtime/support/ambiguous, flags intra-repo misalignment, and never edits files or runs installs.

## Requirements

### Requirement: Skill location and read-only contract

The `experiments` plugin SHALL include a skill at `claude-plugins/experiments/skills/detect-toolchain-surfaces/SKILL.md` with frontmatter declaring a non-empty `description`. The skill scans a project for every place a runtime or package-manager version is declared, classifies each, and returns a structured result. The skill SHALL be read-only: it SHALL NOT edit files, run installs, run `ncu`, or perform any VCS action. It is the engines-level analog of `scan-npm-updates` (`npm-update-scanning`).

#### Scenario: Skill file exists with frontmatter

- **WHEN** examining `claude-plugins/experiments/skills/`
- **THEN** the directory `detect-toolchain-surfaces/` with `SKILL.md` SHALL exist with a non-empty `description`

#### Scenario: Read-only — no writes or installs

- **WHEN** the skill runs to completion on any project
- **THEN** no file is modified, no install runs, and no `ncu`/VCS command is executed

### Requirement: Engine coverage

The skill SHALL detect versions for these engines: Node; the package managers pnpm, npm, yarn, and bun; Deno; and Bun-as-runtime. Because bun and deno can act as both runtime and package manager, the skill SHALL detect each role separately (a runtime-version locus and a `packageManager` locus) and associate both with the same engine.

#### Scenario: Node and package manager detected separately

- **WHEN** a repo declares `engines.node` and `packageManager: "pnpm@10.27.0"`
- **THEN** the result contains a `node` engine and a `pnpm` engine, each with its own surfaces

#### Scenario: Bun dual role

- **WHEN** a repo uses `packageManager: "bun@1.x"` and also runs Bun as its runtime
- **THEN** the result records bun's package-manager locus and bun's runtime locus under the same `bun` engine

### Requirement: Comprehensive surface-matcher coverage

The skill SHALL detect runtime/PM version loci across, at minimum: `package.json` (`engines.{node,pnpm,npm,yarn,bun,deno}`, `packageManager`, `devEngines`, `volta`); `.nvmrc` and `.node-version` (Node); a root `.dvmrc` (Deno's canonical version file, the `.nvmrc` analog); `.tool-versions` (asdf) and `mise.toml`/`.mise.toml`; `Dockerfile*` (`FROM <image>:<tag>` and `ARG *_VERSION=` defaults); GitHub Actions workflows (`actions/setup-node` `node-version`, `pnpm/action-setup` `version`, `denoland/setup-deno` `deno-version`, `oven-sh/setup-bun` `bun-version`); GitLab CI (`.gitlab-ci.yml` `image:` tag and `NODE_VERSION` variable); CircleCI (`.circleci/config.yml` Docker image tag and Node orb params). A root `.dvmrc` SHALL be read as a Deno whole-file version token (trim whitespace, strip a leading `v`) with locus `file` and classified `runtime` — normalized the same way `.nvmrc` is, so a `v`-prefixed pin does not read as a distinct runtime version (any leading `v` is re-applied on rewrite by `apply-engine-bumps`). When a `denoland/setup-deno` step declares `with.deno-version-file`, the skill SHALL treat that input as a pointer to the referenced version file (whose version is surfaced through that file, e.g. `.dvmrc`) and SHALL NOT record the step itself as an inline version surface nor as an `unknownSurface`. For each match it SHALL record `{ file, engine, currentVersion, locus, kind }`. Surfaces it cannot parse with confidence SHALL be reported as `unknownSurfaces` rather than silently skipped or guessed.

#### Scenario: package.json and runtime files detected

- **WHEN** a repo has `.nvmrc`, root `engines.node`, and a CI `actions/setup-node` step
- **THEN** all three loci appear in the result with their current Node versions and file paths

#### Scenario: Root .dvmrc detected as Deno runtime surface

- **WHEN** a repo has a root `.dvmrc` containing `2.9.0`
- **THEN** the result records a `deno` surface with `file` `.dvmrc`, `locus` `file`, `currentVersion` `2.9.0`, and `kind` `runtime`

#### Scenario: deno-version-file treated as a pointer, not a surface

- **WHEN** a `denoland/setup-deno` step declares `with.deno-version-file: .dvmrc` and no `with.deno-version`
- **THEN** the step is NOT recorded as its own version surface nor as an `unknownSurface`, and the Deno runtime version is surfaced through the `.dvmrc` file it points to

#### Scenario: Unknown surface reported, not guessed

- **WHEN** a version-bearing file is present in an unrecognized or unparseable shape
- **THEN** the skill lists it under `unknownSurfaces` and does not invent a version or locus for it

### Requirement: Runtime-vs-support classification

For each `engines.node`-bearing `package.json`, the skill SHALL classify the locus as `runtime` when the manifest is `private: true`, or non-publishable (no `publishConfig`/`exports`/library `main`), or the workspace root; as `support` when the manifest is publishable AND its `engines.node` is a range (`>=`, `^`, `~`, `||`); and as `ambiguous` otherwise (e.g. a publishable manifest with an exact `engines.node`, or a private manifest with a range). All non-`package.json` runtime files (`.nvmrc`, CI, Docker, tool-version files) SHALL be classified `runtime` unconditionally. `support` loci SHALL be reported but flagged as not-to-bump; `ambiguous` loci SHALL be flagged for the caller to resolve.

#### Scenario: Publishable library range classified as support

- **WHEN** a publishable package declares `engines.node: ">=22"`
- **THEN** that locus is classified `support` and flagged not-to-bump

#### Scenario: App / root pin classified as runtime

- **WHEN** a `private: true` app declares `engines.node: "24.12.0"`
- **THEN** that locus is classified `runtime`

#### Scenario: Ambiguous flagged for resolution

- **WHEN** a publishable package declares an exact `engines.node` (e.g. `24.12.0`)
- **THEN** that locus is classified `ambiguous` and surfaced for the caller's prompt

### Requirement: Current-version and intra-repo misalignment detection

The skill SHALL report, per engine, the distinct current versions found across all `runtime` loci, and SHALL flag a misalignment when more than one distinct runtime version exists for the same engine. `support` ranges SHALL NOT count toward runtime misalignment (they are a different axis).

#### Scenario: Misalignment flagged across runtime surfaces

- **WHEN** `.nvmrc` says `24.10.0` but the CI `node-version` says `24.12.0`
- **THEN** the result flags a Node runtime misalignment listing both loci

#### Scenario: Support range does not trigger misalignment

- **WHEN** apps pin Node `24.12.0` and a publishable lib declares `engines.node: ">=22"`
- **THEN** no misalignment is reported (the range is a `support` locus, not a runtime one)

### Requirement: Structured result

The skill SHALL return a structured result of the shape `{ engines: [{ engine, surfaces: [{ file, locus, currentVersion, kind }], distinctRuntimeVersions }], ambiguities: [...], unknownSurfaces: [...] }`. It SHALL NOT print an apply plan or perform writes — producing the inventory is its only output.

#### Scenario: Result enumerates engines and surfaces

- **WHEN** the skill completes on a repo with Node + pnpm pins in several files
- **THEN** it returns one entry per engine, each listing its surfaces (file, locus, current version, kind) and the set of distinct runtime versions
