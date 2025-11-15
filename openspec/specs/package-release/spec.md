# package-release Specification

## Purpose
TBD - created by archiving change add-automated-dual-publishing. Update Purpose after archive.
## Requirements
### Requirement: Automated Version Management
The system SHALL automatically determine version bumps for affected packages based on conventional commit messages following semantic versioning rules.

#### Scenario: Patch version bump
- **WHEN** commits contain only fix-type changes (e.g., `fix: resolve login bug`)
- **THEN** affected packages SHALL have patch version incremented (e.g., 1.0.0 → 1.0.1)

#### Scenario: Minor version bump
- **WHEN** commits contain feat-type changes (e.g., `feat: add user profile`)
- **THEN** affected packages SHALL have minor version incremented (e.g., 1.0.0 → 1.1.0)

#### Scenario: Major version bump
- **WHEN** commits contain breaking changes (e.g., `feat!: redesign API` or `BREAKING CHANGE:` in footer)
- **THEN** affected packages SHALL have major version incremented (e.g., 1.0.0 → 2.0.0)

#### Scenario: Independent versioning
- **WHEN** multiple packages are affected by different commits
- **THEN** each package SHALL receive its own version bump independent of other packages

#### Scenario: No version bump for non-release changes
- **WHEN** commits only contain chore, docs, style, or test changes
- **THEN** no version bump SHALL occur for any package

### Requirement: Release Pull Request Creation
The system SHALL automatically create and update pull requests containing version bumps, changelog updates, and release metadata.

#### Scenario: Initial release PR creation
- **WHEN** releasable commits are pushed to main branch
- **THEN** a pull request SHALL be created with:
  - Version bumps in affected package.json files
  - CHANGELOG.md updates with commit summaries
  - Label "autorelease: pending"
  - Title indicating packages to be released

#### Scenario: Release PR updates
- **WHEN** additional releasable commits are pushed before release PR is merged
- **THEN** the existing release PR SHALL be updated with:
  - Additional version bumps if needed
  - Updated changelog entries
  - Updated PR description

#### Scenario: Multiple packages in single PR
- **WHEN** multiple packages are affected
- **THEN** one release PR SHALL contain version bumps for all affected packages

### Requirement: Dual Registry Publishing

The system SHALL publish packages to both npm and JSR registries automatically after release PR merge with proper dependency resolution.

#### Scenario: npm publishing with workspace protocol transformation (Modified)
- **WHEN** release PR is merged to main
- **THEN** each released package SHALL be published to npm with:
  - Scoped package name (@m0n0lab/*)
  - Public access
  - Provenance attestation
  - **Workspace protocol dependencies transformed to semver ranges** (e.g., `workspace:*` → `^1.2.3`)
- **AND** publishing SHALL use `pnpm publish` to ensure workspace protocol transformation

#### Scenario: JSR publishing with Deno workspaces (Modified)
- **WHEN** release PR is merged to main
- **THEN** each released package SHALL be published to JSR with:
  - @m0n0lab scope
  - Current version from deno.json
  - **Automatic workspace dependency resolution via Deno workspaces**
  - **Internal dependencies resolved to JSR registry URLs**
- **AND** publishing SHALL use `deno publish` with workspace configuration

#### Scenario: Publishing order optimization (New)
- **WHEN** packages need to be published to both registries
- **THEN** JSR publishing SHALL occur before npm publishing
- **AND** working directory SHALL remain clean during JSR publish
- **AND** npm build artifacts SHALL not interfere with JSR publish

#### Scenario: Dependency order publishing (Modified)
- **WHEN** multiple packages with internal dependencies are released
- **THEN** packages SHALL be published in dependency order (using Nx project graph)
- **AND** packages with no internal dependencies SHALL publish first
- **AND** packages with internal dependencies SHALL publish after their dependencies
- **AND** publishing SHALL stop on first failure

#### Scenario: Build before npm publish (Modified)
- **WHEN** a package needs to be published to npm
- **THEN** the package SHALL be built using Nx before npm publishing
- **AND** npm publishing SHALL only proceed if build succeeds
- **AND** JSR publishing SHALL occur before build (source-only)

#### Scenario: Git validation enabled (New)
- **WHEN** publishing packages to either registry
- **THEN** both `pnpm publish` and `deno publish` SHALL run with full git validation enabled
- **AND** no `--allow-dirty` or `--no-git-checks` flags SHALL be used
- **AND** publish SHALL fail if working directory is not clean when expected

### Requirement: Changelog Generation
The system SHALL automatically generate and maintain CHANGELOG.md files for each package.

#### Scenario: Changelog structure
- **WHEN** a release occurs
- **THEN** the CHANGELOG.md SHALL contain:
  - Version number and release date
  - Grouped changes by type (Features, Bug Fixes, Breaking Changes, etc.)
  - Commit summaries with links to commits
  - Links to GitHub compare view

#### Scenario: Changelog accumulation
- **WHEN** multiple releases occur over time
- **THEN** CHANGELOG.md SHALL accumulate entries with newest at the top
- **AND** previous release entries SHALL remain unchanged

### Requirement: GitHub Release Creation
The system SHALL automatically create GitHub releases with release notes for each published package.

#### Scenario: Release creation
- **WHEN** version tags are pushed to repository
- **THEN** GitHub releases SHALL be created with:
  - Release title with package name and version
  - Release notes from changelog
  - Tag pointing to release commit

#### Scenario: Multiple package releases
- **WHEN** multiple packages are released in single PR
- **THEN** separate GitHub releases SHALL be created for each package

### Requirement: Release Workflow Permissions
The system SHALL have appropriate permissions to perform all release operations.

#### Scenario: GitHub token permissions
- **WHEN** release workflows execute
- **THEN** GITHUB_TOKEN SHALL have permissions to:
  - Read repository contents
  - Write pull requests
  - Create and push tags
  - Create releases

#### Scenario: npm authentication configuration
- **WHEN** publishing to npm
- **THEN** GitHub repository SHALL be configured as npm Trusted Publisher
- **AND** workflow SHALL authenticate using OIDC id-token
- **AND** no token secrets SHALL be required

#### Scenario: JSR authentication
- **WHEN** publishing to JSR
- **THEN** workflow SHALL authenticate using GitHub OIDC token
- **AND** @monolab scope SHALL be linked to GitHub repository

### Requirement: Release Failure Handling
The system SHALL handle publish failures gracefully and provide clear error reporting.

#### Scenario: npm publish failure
- **WHEN** npm publish fails for any reason
- **THEN** workflow SHALL fail immediately
- **AND** error message SHALL be displayed in workflow logs
- **AND** JSR publishing SHALL NOT proceed

#### Scenario: JSR publish failure
- **WHEN** JSR publish fails after successful npm publish
- **THEN** workflow SHALL fail and report error
- **AND** manual recovery documentation SHALL be available

#### Scenario: Idempotent publishing
- **WHEN** publish workflow is manually re-run
- **THEN** previously published packages SHALL not error
- **AND** only unpublished packages SHALL be published

### Requirement: Package Configuration
All publishable packages SHALL be properly configured for dual registry publishing.

#### Scenario: npm configuration
- **WHEN** a package is configured for publishing
- **THEN** package.json SHALL contain:
  - Scoped name (@monolab/package-name)
  - publishConfig with registry and access settings
  - Valid version following semver

#### Scenario: JSR configuration
- **WHEN** a package is configured for JSR
- **THEN** package SHALL have jsr.json with version field
- **AND** package SHALL have valid exports configuration
- **AND** package SHALL build to valid ESM format

#### Scenario: Version synchronization
- **WHEN** release-please updates package versions
- **THEN** both package.json and jsr.json SHALL be updated with the same version
- **AND** version SHALL be consistent between both files in the release PR

#### Scenario: Package inclusion
- **WHEN** determining which packages to release
- **THEN** all packages in packages/ directory SHALL be included (is-even, is-odd, react-clean, react-hooks, ts-configs)
- **AND** ts-configs SHALL be included in automated releases
- **AND** packages MAY be excluded via configuration if needed in the future

### Requirement: Version Manifest Tracking
The system SHALL maintain a manifest file tracking current versions of all packages.

#### Scenario: Manifest initialization
- **WHEN** release system is first set up
- **THEN** .release-please-manifest.json SHALL be created with version 0.1.0 for all packages
- **AND** all package.json files SHALL be reset to 0.1.0
- **AND** existing Git tags and releases SHALL be deleted for clean slate

#### Scenario: Manifest updates
- **WHEN** release PR is created
- **THEN** manifest file SHALL be updated with new versions
- **AND** manifest SHALL be committed as part of release PR

#### Scenario: Manifest as source of truth
- **WHEN** publish workflow runs
- **THEN** manifest changes SHALL determine which packages were released
- **AND** only packages with version changes SHALL be published

