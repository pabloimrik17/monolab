# developer-toolchain Specification

## Purpose
Defines how the workspace pins, installs and updates its External tools, the command-line programs its checks run that are not npm packages, and keeps them apart from the Node toolchain.

## Requirements

### Requirement: External tools are pinned with checksums

The workspace SHALL pin every External tool to an exact version in `mise.toml`, and SHALL commit `mise.lock` with a checksum for that version on linux-x64, macos-arm64 and macos-x64.

#### Scenario: Install on a clean clone

- **WHEN** a developer with mise runs `mise install` in a fresh clone or worktree
- **THEN** mise installs osv-scanner at the version `mise.toml` pins
- **AND** it verifies the download against the checksum in `mise.lock`

#### Scenario: Lock out of date in CI

- **WHEN** `mise.toml` pins a version that `mise.lock` does not hold
- **THEN** the CI install fails instead of installing an unverified binary

### Requirement: Only External tools are managed by mise

`mise.toml` SHALL list only External tools. A command-line tool distributed as an npm package SHALL stay a dev dependency in `package.json`. Node and pnpm SHALL stay pinned by `.nvmrc`, `packageManager` and `engines`, and SHALL NOT appear in `mise.toml`.

#### Scenario: A tool published on npm

- **WHEN** a check needs a tool that is published as an npm package
- **THEN** it is added as a dev dependency, not to `mise.toml`

#### Scenario: Node toolchain untouched

- **WHEN** `mise.toml` is read
- **THEN** it declares neither `node` nor `pnpm`
- **AND** CI keeps reading the Node version from `.nvmrc`

### Requirement: A minimum mise version is enforced

`mise.toml` SHALL declare `min_version = "2026.10.0"` as a hard minimum, so a mise too old to read `mise.lock` stops instead of guessing.

#### Scenario: Old mise

- **WHEN** a developer with mise older than 2026.10.0 runs a command that reads `mise.toml`
- **THEN** mise exits with an error that names the minimum version

### Requirement: Renovate keeps External tools current

Renovate SHALL update `mise.toml` through its built-in mise manager and SHALL regenerate `mise.lock` in the same pull request. `renovate.json` SHALL NOT restrict `enabledManagers` and SHALL add no package rule for mise, so the existing `minimumReleaseAge` and update-type schedules apply.

#### Scenario: New osv-scanner release

- **WHEN** an osv-scanner release passes the repository's release age and its update type's schedule
- **THEN** Renovate opens one pull request that changes the version in `mise.toml` and the matching entries in `mise.lock`

#### Scenario: Dependency dashboard

- **WHEN** Renovate refreshes the dependency dashboard
- **THEN** osv-scanner appears under the mise manager

### Requirement: CI installs a pinned, verified mise

CI SHALL install mise at a version pinned in the workflow, through an action pinned by commit SHA, without a `sha256` input so the action keeps verifying mise's release signature. Renovate SHALL bump that pinned version.

#### Scenario: CI run

- **WHEN** a CI job installs External tools
- **THEN** it uses the pinned mise version and installs from `mise.lock` in locked mode

#### Scenario: New mise release

- **WHEN** a mise release passes the repository's release age
- **THEN** Renovate opens a pull request that changes the pinned mise version in the workflow

### Requirement: Git hooks run External tools through mise

A git hook SHALL run an External tool as `mise x -- <tool>` at the version `mise.toml` pins, installing it on first use. It SHALL fail with a one-line hint to install mise when mise is missing. Developers SHALL need no setup step beyond installing mise: no `prepare` script and no trust step.

#### Scenario: First push after cloning

- **WHEN** a developer who has mise but never ran `mise install` pushes
- **THEN** the hook installs the pinned osv-scanner and runs it

#### Scenario: Same-named binary on PATH

- **WHEN** a different osv-scanner version is on the developer's PATH
- **THEN** the hook still runs the version `mise.toml` pins

#### Scenario: mise missing

- **WHEN** a developer without mise pushes
- **THEN** the hook fails with a single line telling them to install mise

### Requirement: External tools are documented

`README.md` SHALL describe External tools under Development Setup: how to install mise, that versions are pinned in `mise.toml` with checksums in `mise.lock`, that hooks install the tools on first use, and how to run osv-scanner by hand.

#### Scenario: New contributor

- **WHEN** a contributor follows Development Setup
- **THEN** they learn to install mise and that no further setup is needed for the hooks
