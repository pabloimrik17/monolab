# Proposal: Automated Dual Publishing to npm and JSR

## Why

Currently, the project uses a fragmented release process:
- Nx Release is configured for versioning but not fully utilized
- Only 2 out of 4 packages have publish workflows (react-clean, react-hooks)
- Packages are published only to JSR, not npm
- Each package requires a separate GitHub Actions workflow
- The process is not fully automated and doesn't scale as packages grow

This limits package distribution and creates maintenance overhead. Users who prefer npm cannot access our packages, and adding new packages requires duplicating workflow files.

## What Changes

Implement a fully automated release system that:
- **Analyzes affected packages** using conventional commits to determine which packages need releasing
- **Calculates versions automatically** for each affected package independently
- **Generates changelogs** with all changes per package
- **Creates GitHub releases** with release notes for each package
- **Publishes to both npm and JSR** in a single automated workflow
- **Triggers automatically** when changes are merged to main branch

The solution will evaluate and implement the best tooling combination to achieve:
1. Independent versioning per package (strict requirement)
2. Dual publishing to npm + JSR (critical requirement)
3. Full automation with zero manual intervention (critical requirement)
4. Changelog and GitHub release generation (critical requirement)

## Impact

### Affected Specs
- **NEW**: `package-release` - Complete specification for the release automation capability

### Affected Code
- `.github/workflows/`: Replace individual package workflows with unified release workflow
- `nx.json`: Update or replace release configuration based on chosen tooling
- `package.json`: Add necessary tooling dependencies and release scripts
- `packages/*/package.json`: Configure npm publishing metadata (registry, access, etc.)
- New files: Release tooling configuration (e.g., `.releaserc.json`, `release-please-config.json`, or similar)

### Affected Packages
All current packages will be included in automated release:
- `packages/is-even`
- `packages/is-odd`
- `packages/react-clean`
- `packages/react-hooks`
- `packages/ts-configs` (currently not in release config, should be added)

### Breaking Changes
None. This enhances the existing process without breaking current functionality.
