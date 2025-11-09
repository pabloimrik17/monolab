# Proposal: Automated Dual Publishing to npm and JSR

## Why

The project needs a robust, secure release process that:
- Publishes packages to both npm and JSR registries for maximum distribution
- Uses modern OIDC-based authentication (no long-lived tokens)
- Handles monorepo complexity with proper dependency ordering
- Generates changelogs and GitHub releases automatically
- Scales as new packages are added without workflow duplication

Previous state:
- Individual workflows per package (doesn't scale)
- No npm publishing (JSR only)
- Manual intervention required
- Token-based authentication (security risk)

## What Changes

Implemented release-please with dual publishing workflow:

### Core Architecture
- **release-please**: Manages versioning, changelogs, and release PRs
  - Analyzes conventional commits to determine version bumps
  - Creates/updates release PR with all changes
  - Generates CHANGELOG.md per package
  - Creates GitHub releases with tags

- **Single unified workflow** (`.github/workflows/release-please.yml`):
  - Job 1: release-please creates/updates release PR
  - Job 2: On PR merge, publishes to npm + JSR with proper ordering

### Security & Authentication
- **npm**: Trusted Publishers with OIDC (no tokens needed)
  - Requires `id-token: write` permission
  - Automatic provenance attestation
  - Node.js 24.11.0+ with npm 11.6.1+

- **JSR**: OIDC authentication (no tokens needed)
  - Uses same `id-token: write` permission
  - Requires `jsr.json` with proper dependency constraints

### Dependency Ordering
- **Nx graph-based ordering**: `nx graph --print | jq`
  - Dynamically determines publish order
  - Ensures dependencies published before dependents
  - Filters to library projects only (excludes demo apps)
  - No file generation (uses stdout to avoid uncommitted changes)

### Publishing Strategy
1. **npm first**: Publish all released packages to npm
2. **JSR second**: Publish in dependency order to JSR
3. Separate steps allow independent failure handling

## Impact

### Affected Specs
- **NEW**: `package-release` - Complete specification for the release automation capability

### Affected Code
- `.github/workflows/release-please.yml`: **NEW** - Unified release + publish workflow
- `.github/workflows/publish.yml`: **DELETED** - Replaced by release-please workflow
- `.github/workflows/ci.yml`: Updated Node.js version to 24.11.0
- `nx.json`: Changed `defaultBase` to `develop` (for feature branch workflow)
- `release-please-config.json`: **NEW** - Configure release-please for monorepo
- `.release-please-manifest.json`: **NEW** - Track current versions
- `.nvmrc`: Updated to 24.11.0
- `packages/*/package.json`:
  - Updated `engines.node` to 24.11.0
  - Added `repository` field for npm provenance
  - Updated `publishConfig` for npm registry
- `packages/*/jsr.json`:
  - Maintain JSR-specific configuration
  - Version constraints for workspace dependencies
  - Export paths and metadata

### Affected Packages
All packages now publish to both npm and JSR:
- `@m0n0lab/is-even` - Depends on is-odd
- `@m0n0lab/is-odd` - No dependencies
- `@m0n0lab/react-clean` - Depends on react-hooks
- `@m0n0lab/react-hooks` - No dependencies
- `@m0n0lab/ts-configs` - No dependencies

### Key Learnings & Gotchas

1. **jsr.json version constraints**: Must match actual published versions on JSR
   - Use major version constraints (`^5.0.0`) for flexibility
   - Update manually only when forcing minimum version for new features
   - One-time sync needed after org migration

2. **Nx graph filtering**:
   - Cannot use `--focus` with tag/directory filters
   - Use `nx graph --print | jq` to filter dynamically
   - Avoids creating uncommitted files (no `--allow-dirty` needed)

3. **Node.js version requirements**:
   - npm 11.5.1+ required for Trusted Publishers
   - Node.js 24.11.0 LTS includes npm 11.6.1
   - Update all package.json engines fields

4. **OIDC setup**:
   - Configure Trusted Publishers in npm/JSR web UI
   - No secrets needed in GitHub
   - Requires `id-token: write` permission only

5. **defaultBase in nx.json**:
   - Keep as `develop` for feature branch workflow
   - `nx affected` compares against develop by default
   - Workflows don't use `nx affected`, so no --base needed

### Breaking Changes
None. This enhances the existing process without breaking current functionality.

### Migration from @monolab to @m0n0lab
The org change required one-time updates:
- Scope change in all package.json files
- Version constraint updates in jsr.json files
- Re-publishing all packages to new org
- Configuring Trusted Publishers for new org
