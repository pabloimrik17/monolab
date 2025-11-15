# package-release Specification Changes

## Modified Requirements

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

## Implementation Notes

### Workspace Protocol Transformation (npm)
- Uses `pnpm publish` instead of `npm publish`
- Automatically transforms `workspace:*` → semver in published packages
- Repository files keep `workspace:*` for development
- No manual dependency version updates needed

### Deno Workspaces (JSR)
- Root `deno.json` defines workspace members
- Package `deno.json` files replace `jsr.json` files
- No `imports` field needed (auto-resolved by Deno)
- Breaking changes automatically reflected in published packages

### Publishing Order Rationale
- JSR first: publishes source files directly (no build)
- npm second: generates `dist/` artifacts during build
- Keeps working directory clean for JSR validation
- Eliminates need for `--allow-dirty` flag

### Validation Improvements
- Both tools run full validation suites
- Early failure detection for real problems
- No disabled checks hiding issues
- Better CI hygiene and maintainability
