# Spec Delta

## MODIFIED Requirements

### Requirement: Package Configuration

All publishable packages SHALL be configured for publishing to the npm registry only.

#### Scenario: npm configuration

- **WHEN** a package is configured for publishing
- **THEN** package.json SHALL contain:
  - Scoped name (@monolab/package-name)
  - publishConfig with registry and access settings
  - Valid version following semver

#### Scenario: JSR configuration

- **WHEN** a package under `packages/` is configured for publishing
- **THEN** it SHALL NOT contain a `deno.json` or `jsr.json` file
- **AND** package SHALL have valid exports configuration in `package.json`
- **AND** package SHALL build to valid ESM format

#### Scenario: Version synchronization

- **WHEN** release-please updates package versions
- **THEN** `package.json` SHALL be the only per-package manifest whose version is bumped
- **AND** `release-please-config.json` SHALL NOT list `deno.json` or `jsr.json` in any package's `extra-files`

#### Scenario: Package inclusion

- **WHEN** determining which packages to release
- **THEN** all packages in packages/ directory SHALL be included (is-even, is-odd, react-clean, react-hooks, ts-configs, http-client)
- **AND** ts-configs SHALL be included in automated releases
- **AND** http-client SHALL be included in automated releases
- **AND** packages MAY be excluded via configuration if needed in the future

## ADDED Requirements

### Requirement: npm-only publish workflow

The release workflow SHALL publish released packages to npm only. It SHALL NOT install a Deno toolchain, invoke `deno publish`, or contact the JSR registry.

#### Scenario: Release merge publishes to npm only

- **WHEN** a release PR is merged to `main` (or the workflow is dispatched manually with a package list)
- **THEN** each released package is built (when it has a `build` target) and published with `pnpm publish`
- **AND** no workflow step references `deno`, `denoland/setup-deno`, `.dvmrc`, or `jsr.io`

#### Scenario: Already-published version is skipped

- **WHEN** the npm registry already has the package's `package.json` version
- **THEN** the workflow skips that package without failing

### Requirement: Release tooling has no Deno runtime

The workspace SHALL NOT pin or install a Deno runtime: root `package.json` SHALL NOT declare `deno` in `engines` or `devEngines.runtime`, the repo root SHALL NOT contain `.dvmrc` or `deno.json`, and `pnpm install` SHALL NOT fetch a `deno@runtime` package.

#### Scenario: Root manifest declares no Deno engine

- **WHEN** root `package.json` is inspected
- **THEN** `engines.deno` is absent
- **AND** `devEngines.runtime` contains no entry named `deno`

#### Scenario: Lockfile has no Deno runtime

- **WHEN** `pnpm-lock.yaml` is inspected after `pnpm install`
- **THEN** it contains no `deno@runtime:` package and the root importer has no `deno` dependency

#### Scenario: No Deno config files tracked

- **WHEN** `git ls-files` lists tracked files
- **THEN** no `deno.json` is tracked at the repo root or under `packages/`, and no root `.dvmrc` is tracked
- **AND** Deno files used as fixtures by the Claude plugins under `claude-plugins/` are unaffected
