## MODIFIED Requirements

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
