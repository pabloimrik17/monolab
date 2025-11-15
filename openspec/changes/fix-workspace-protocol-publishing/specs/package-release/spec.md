# package-release Specification Delta

## ADDED Requirements

### Requirement: Workspace Protocol Transformation for npm
The system SHALL automatically transform workspace protocol dependencies to semantic version ranges when publishing packages to npm using pnpm publish.

#### Scenario: Workspace star protocol transformation
- **WHEN** a package with `workspace:*` dependency is published to npm
- **THEN** the dependency SHALL be transformed to a caret range of the actual version (e.g., `workspace:*` → `^3.0.2`)
- **AND** the repository package.json SHALL retain `workspace:*` (not modified)
- **AND** only the published tarball SHALL contain the transformed version

#### Scenario: Workspace tilde protocol transformation
- **WHEN** a package with `workspace:~` dependency is published to npm
- **THEN** the dependency SHALL be transformed to a tilde range of the actual version (e.g., `workspace:~` → `~3.0.2`)

#### Scenario: Workspace caret protocol transformation
- **WHEN** a package with `workspace:^` dependency is published to npm
- **THEN** the dependency SHALL be transformed to a caret range of the actual version (e.g., `workspace:^` → `^3.0.2`)

#### Scenario: Repository uses workspace protocol
- **WHEN** packages are developed in the monorepo
- **THEN** package.json files SHALL use `workspace:*` for internal dependencies
- **AND** pnpm workspace linking SHALL work correctly for local development
- **AND** workspace protocol SHALL be the source of truth for development

#### Scenario: Published packages use semver ranges
- **WHEN** packages are published to npm registry
- **THEN** published package.json SHALL contain semantic version ranges (e.g., `^3.0.2`)
- **AND** workspace protocol SHALL NOT appear in published packages
- **AND** consumers SHALL be able to install packages without pnpm workspace support

### Requirement: Automatic Dependency Resolution for JSR
The system SHALL automatically resolve workspace dependencies to JSR registry references when publishing using Deno workspaces.

#### Scenario: Deno workspace configuration
- **WHEN** JSR publishing is configured
- **THEN** a deno.json workspace configuration SHALL exist in repository root
- **AND** deno.json SHALL list all publishable package directories
- **AND** each package SHALL have a deno.json file with metadata

#### Scenario: Automatic workspace resolution
- **WHEN** a package imports another workspace package (e.g., `import { x } from "@m0n0lab/is-odd"`)
- **THEN** Deno SHALL automatically resolve to the workspace version during publishing
- **AND** published code SHALL reference JSR registry URL (e.g., `jsr:@m0n0lab/is-odd@5.0.4`)
- **AND** version SHALL be read from the actual workspace package
- **AND** no manual version constraint management SHALL be required

#### Scenario: Breaking changes automatically reflected
- **WHEN** a workspace dependency releases a breaking change (major version bump)
- **THEN** dependent packages SHALL automatically reference the new major version when published
- **AND** no manual update of dependency constraints SHALL be needed

#### Scenario: deno.json configuration
- **WHEN** a package is configured for JSR publishing
- **THEN** package SHALL have deno.json (not jsr.json)
- **AND** deno.json SHALL contain: name, version, license, exports
- **AND** deno.json SHALL NOT contain imports field (Deno resolves automatically)

### Requirement: Deno Runtime Dependency
The system SHALL use Deno runtime v2.5.6 for JSR publishing operations.

#### Scenario: Deno version pinning
- **WHEN** CI/CD workflow executes JSR publishing
- **THEN** Deno v2.5.6 SHALL be installed in the CI environment
- **AND** Deno version SHALL be pinned to prevent unexpected breaking changes
- **AND** Deno version SHALL be documented in package.json engines field

#### Scenario: Deno isolation to CI
- **WHEN** developers work on the project locally
- **THEN** Deno installation SHALL NOT be required for development
- **AND** Deno SHALL only be used in CI for JSR publishing
- **AND** local development SHALL continue using pnpm

## MODIFIED Requirements

### Requirement: Dual Registry Publishing (Modified)
The system SHALL publish packages to both npm and JSR registries automatically after release PR merge, using pnpm publish for npm and deno publish for JSR.

#### Scenario: npm publishing with pnpm (Modified)
- **WHEN** release PR is merged to main
- **THEN** each released package SHALL be published to npm using `pnpm publish` with:
  - Scoped package name (@m0n0lab/*)
  - Public access flag (--access public)
  - No git checks flag (--no-git-checks)
  - Automatic workspace protocol transformation

#### Scenario: JSR publishing with Deno (Modified)
- **WHEN** release PR is merged to main
- **THEN** each released package SHALL be published to JSR using `deno publish` with:
  - Allow dirty flag (--allow-dirty)
  - Automatic workspace dependency resolution
  - Dependency order preservation (dependencies published first)

#### Scenario: Git checks skipped during publish
- **WHEN** publishing to npm or JSR
- **THEN** git state checks SHALL be skipped (--no-git-checks for pnpm, --allow-dirty for Deno)
- **AND** release-please managed git state SHALL be trusted
- **AND** uncommitted files from release-please SHALL not cause publish failures

### Requirement: Package Configuration (Modified)
All publishable packages SHALL be properly configured for dual registry publishing with appropriate configuration files for each registry.

#### Scenario: npm configuration
- **WHEN** a package is configured for npm publishing
- **THEN** package.json SHALL contain:
  - Scoped name (@m0n0lab/package-name)
  - publishConfig with registry and access settings
  - workspace:* protocol for internal dependencies
  - Valid semver version

#### Scenario: JSR configuration (Modified)
- **WHEN** a package is configured for JSR
- **THEN** package SHALL have deno.json (replacing jsr.json)
- **AND** deno.json SHALL contain name, version, license, exports
- **AND** deno.json SHALL NOT contain imports field
- **AND** Deno workspace SHALL automatically resolve internal dependencies

#### Scenario: Version synchronization (Modified)
- **WHEN** release-please updates package versions
- **THEN** both package.json and deno.json SHALL be updated with the same version
- **AND** deno.json SHALL be listed in extra-files configuration
- **AND** version SHALL be consistent between both files in the release PR

### Requirement: Release Workflow Configuration (Modified)
The system SHALL be configured to update version fields in both package.json and deno.json files during releases.

#### Scenario: release-please extra-files configuration
- **WHEN** release-please is configured for a package
- **THEN** extra-files SHALL include "deno.json"
- **AND** release-please SHALL automatically update the version field in deno.json
- **AND** generic JSON updater SHALL be used for deno.json

## REMOVED Requirements

None. All existing requirements remain valid.

## Related Specs

This change affects the core publishing mechanism specified in `package-release`. It ensures that:

1. **npm Publishing**: Workspace protocol dependencies (used for development convenience) are properly transformed to standard semver ranges (required for npm registry compatibility) during publishing. The transformation is handled natively by `pnpm publish`.

2. **JSR Publishing**: Workspace dependencies are automatically resolved to correct JSR registry references with actual versions. The resolution is handled natively by Deno workspaces during `deno publish`.

Both solutions require zero custom code and leverage battle-tested native capabilities of pnpm and Deno package managers.
