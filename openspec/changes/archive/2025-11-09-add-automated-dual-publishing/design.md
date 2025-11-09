# Design: Automated Dual Publishing System

## Context

MonoLab is an Nx monorepo with multiple independently versioned packages that need to be published to both npm and JSR registries. The project uses conventional commits and requires full release automation.

### Current State
- **Versioning**: Proof-of-concept with Nx Release (can be completely removed)
- **Publishing**: Proof-of-concept per-package GitHub Actions workflows (can be completely removed)
- **Status**: Ready for fresh implementation without backward compatibility constraints

### Constraints
- Must maintain independent versioning per package
- Must support dual publishing (npm + JSR)
- Must be fully automated on merge to main
- Must generate changelogs and GitHub releases
- Must work with Nx monorepo structure
- JSR has limited tooling support (no native semantic-release or release-please plugins)
- **Important**: No need to maintain existing setup - clean slate implementation

## Goals / Non-Goals

### Goals
- Automate version bumping based on conventional commits
- Publish all affected packages to npm and JSR automatically
- Generate changelogs and GitHub releases for each package
- Support independent versioning per package
- Require zero manual intervention for standard releases
- Work seamlessly with existing Nx infrastructure

### Non-Goals
- Support for manual version overrides (can be added later if needed)
- Pre-release channels (alpha, beta, rc) in initial implementation
- Publishing to registries other than npm and JSR
- Monorepo-wide unified versioning

## Tool Evaluation

### Option 1: Nx Release

**Pros:**
- Native Nx integration with affected detection
- Independent versioning built-in
- Conventional commits support
- GitHub releases support
- Already familiar with Nx tooling

**Cons:**
- No native npm publishing (focused on JSR, local registries)
- Would require custom workflow for npm + JSR dual publishing
- Less community adoption for publishing workflows
- More coupled to Nx infrastructure

**Verdict:** ⚠️ Possible but requires significant custom code

### Option 2: semantic-release with semantic-release-monorepo

**Pros:**
- Industry standard for automated releases
- Rich plugin ecosystem for npm publishing
- Strong conventional commits support
- Highly customizable with plugins
- Mature monorepo support via `semantic-release-monorepo`
- Can create custom plugin for JSR

**Cons:**
- No JSR plugin available (need to create custom)
- More complex setup for monorepos
- Relies on Lerna/Yarn workspaces detection (works with pnpm)
- Heavier dependency footprint

**Verdict:** ✅ **Strong candidate** - Battle-tested, extensible, good monorepo support

### Option 3: release-please

**Pros:**
- Google-maintained, reliable
- Excellent monorepo support (native manifest mode)
- Creates PRs for releases (good for visibility and control)
- Conventional commits support
- Manifest-based configuration (single source of truth)
- Separate concerns: versioning PR, then publish on merge

**Cons:**
- No JSR plugin available (need workflow extension)
- PR-based workflow requires merge step (not single-step automation)
- Slightly delayed releases (PR creation → merge → publish)

**Verdict:** ✅ **Strong candidate** - Clean separation, good visibility, reliable

### Option 4: changesets

**Pros:**
- Purpose-built for monorepos
- Manual changeset files provide explicit control
- Good monorepo support with independent versions
- Used by many major projects (Remix, Chakra UI)
- Can integrate with custom publishing

**Cons:**
- Requires manual changeset creation (not fully automated from commits)
- No JSR plugin available
- Doesn't use conventional commits (different workflow)

**Verdict:** ❌ Not suitable - Requires manual changeset creation, doesn't meet full automation requirement

## Decisions

### Decision 1: Use release-please for Version Management

**Rationale:**
- Clean separation between versioning (PR creation) and publishing (on merge)
- Excellent monorepo support with manifest-based configuration
- Google-maintained, reliable, battle-tested
- Creates human-reviewable release PRs (visibility and control)
- Handles changelogs and version bumps automatically
- GitHub releases creation built-in
- Less custom code to maintain than Nx Release + custom publish

**Why not semantic-release:**
- More complex setup for monorepos
- Tighter coupling (version + publish in single step makes dual-registry harder)
- Would need custom plugin for JSR anyway

**Why not Nx Release:**
- Less mature for publishing workflows
- Would require significant custom code for dual publishing
- release-please is purpose-built for this use case

**Implementation:**
- Configure release-please with manifest mode for monorepo
- Create `.release-please-manifest.json` for version tracking
- Setup `release-please-config.json` for package configuration with `extra-files` for jsr.json
- Use generic JSON updater to sync jsr.json versions automatically
- Workflow: release-please bot creates PR → human merges → publish workflow triggers

### Decision 2: Two-Workflow Approach (Release PR + Publish)

**Rationale:**
- **Workflow 1 (release-please.yml)**: Creates/updates release PR automatically
- **Workflow 2 (publish.yml)**: Triggers on release PR merge, publishes to npm + JSR
- Clear separation of concerns
- Human oversight via PR review before publishing
- Matches release-please best practices

**Why not single workflow:**
- release-please needs to create commits (version bumps)
- Publishing should happen after version bump commits are merged
- Two-step allows review and prevents accidental releases

**Implementation:**
- `release-please.yml`: Runs on push to main, creates/updates release PR
- `publish.yml`: Runs on release PR merge (detected via labels), publishes packages
- Determine affected packages from release PR labels or manifest changes

### Decision 3: Publish Strategy - Sequential Package Publishing

**Rationale:**
- Ensures each package publishes successfully before moving to next
- Prevents partial releases if one package fails
- Easier to debug and track failures

**Implementation:**
- Loop through affected packages sequentially
- Publish to npm first, then JSR for each package
- Fail fast on first error

### Decision 4: Use Scoped npm Packages

**Decision:** Publish as `@monolab/package-name`

**Rationale:**
- Namespace protection (prevents name squatting)
- Professional appearance
- Consistency with JSR scope pattern (`@monolab/package` on JSR)
- Easier to identify package origin

**Implementation:**
- Update all package.json files with scoped names
- Configure npm organization (create @monolab org on npm if not exists)
- Add `publishConfig` with public access to each package.json
- Configure npm Trusted Publishers to link GitHub repository
- No token secrets needed - uses OIDC authentication

## Architecture

### Workflow Sequence

```
1. Feature code merged to main
   ↓
2. release-please workflow runs
   - Analyzes conventional commits since last release
   - Determines affected packages
   - Creates/updates release PR with:
     * Version bumps in package.json
     * CHANGELOG.md updates
     * Git tags
   ↓
3. Human reviews and merges release PR
   ↓
4. Publish workflow triggers (on PR merge with label)
   - Detects released packages from manifest changes
   - For each released package:
     a. Build package (nx run build)
     b. Publish to npm (npm publish)
     c. Publish to JSR (npx jsr publish)
   ↓
5. GitHub releases created automatically
   - release-please creates releases on tag
   - Release notes from changelog
```

### File Structure

```
.github/workflows/
  ├── release-please.yml             # Creates/updates release PR
  └── publish.yml                    # Publishes packages after PR merge

packages/*/
  └── package.json                   # Add scoped name & npm publishConfig

.release-please-manifest.json        # Tracks current versions
release-please-config.json           # Configuration for packages

# Files to remove:
.github/workflows/react-clean-publish.yml
.github/workflows/react-hooks-publish.yml
nx.json (remove release section)
```

### Publish Workflow Pseudocode

```yaml
# .github/workflows/publish.yml
name: Publish Packages

on:
  pull_request:
    types: [closed]
    branches: [main]

jobs:
  publish:
    if: github.event.pull_request.merged == true && contains(github.event.pull_request.labels.*.name, 'autorelease: pending')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Detect changed packages from release PR
      - name: Get released packages
        id: released
        run: |
          # Parse .release-please-manifest.json changes
          # Output list of packages that were released

      # For each package:
      - name: Build and publish packages
        run: |
          for pkg in ${{ steps.released.outputs.packages }}; do
            # Build
            pnpm nx run ${pkg}:build

            # Publish to npm (uses OIDC, no token needed)
            cd packages/${pkg}
            npm publish --access public --provenance

            # Publish to JSR
            npx jsr publish --allow-dirty
            cd ../..
          done
```

## Risks / Trade-offs

### Risk 1: JSR and npm Version Synchronization
**Description:** If npm publish succeeds but JSR fails, versions become out of sync

**Mitigation:**
- Publish to npm first (more restrictive registry)
- Retry JSR publish on failure
- Document manual recovery procedure
- Consider future: idempotent publishing with version checking

### Risk 1b: jsr.json Version Synchronization
**Description:** JSR reads version from `jsr.json` (not `package.json`), so release-please needs to update both files

**Current State:**
- Some packages have `jsr.json` with separate version field (react-hooks, react-clean, ts-configs)
- Other packages only have `package.json` (is-even, is-odd)

**Mitigation:**
- Configure release-please to update both package.json and jsr.json using `extra-files` option
- Use release-please's generic JSON updater for jsr.json files
- Alternative: Add post-version script to sync versions automatically
- Validate sync in CI before publishing

### Risk 2: Release PR Not Fully Automatic
**Description:** Human needs to merge release PR, adding manual step

**Mitigation:**
- This is actually a feature - provides oversight before releases
- PR merge can be automated later if desired (auto-merge bot)
- Allows catching issues before publishing (failed tests, etc.)
- Consider this "controlled automation" rather than "full automation"

### Risk 3: npm Authentication Security
**Description:** Need secure authentication method for npm publishing

**Mitigation:**
- Use npm Trusted Publishers (OIDC-based, no tokens needed)
- Configure GitHub as trusted publisher in npm organization settings
- Workflow authenticates using GitHub OIDC token (id-token: write permission)
- No secrets to manage, rotate, or potentially leak
- See: https://docs.npmjs.com/trusted-publishers

### Risk 4: Clean Slate Version Reset
**Description:** Current POC has mixed versions and potentially inconsistent Git tags/releases

**Mitigation:**
- Reset all packages to version 0.1.0 (initial development version)
- Delete existing Git tags for old releases
- Delete existing GitHub releases
- Create fresh `.release-please-manifest.json` with all packages at 0.1.0
- This provides clean starting point without falsifying history
- Future versions will be automatically managed from this baseline

## Migration Plan

### Phase 1: Configuration
1. Remove POC release configuration from nx.json
2. Delete old publish workflow files
3. Reset all package versions to 0.1.0 in both package.json and jsr.json files
4. Add scoped names to all package.json files (@monolab/*)
5. Add npm publishConfig to all package.json files
6. Ensure all packages have jsr.json with version field (create for is-even, is-odd if needed)
7. Delete existing Git tags (git tag -d <tag> && git push --delete origin <tag>)
8. Delete existing GitHub releases via UI or API
9. Create `.release-please-manifest.json` with all packages at 0.1.0
10. Create `release-please-config.json` with extra-files configuration to sync jsr.json
11. Configure npm Trusted Publishers in npm organization settings (link GitHub repo)

### Phase 2: Workflow Creation
1. Create `.github/workflows/release-please.yml`
2. Create `.github/workflows/publish.yml`
3. Test release-please PR creation in feature branch
4. Verify PR format and content

### Phase 3: Validation
1. Merge feature branch to main
2. Wait for release-please to create first release PR
3. Review release PR content (versions, changelogs)
4. Merge release PR
5. Monitor publish workflow execution
6. Verify packages published to npm and JSR
7. Verify GitHub releases created

### Phase 4: Documentation & Cleanup
1. Document release process for team
2. Update CONTRIBUTING.md with conventional commit guidelines
3. Archive this change proposal

### Rollback Plan
If release-please doesn't work:
1. Revert workflow files
2. Publish manually if needed: `cd packages/X && npm publish && npx jsr publish`
3. Can always fall back to manual releases while debugging

## Open Questions

### Q1: Should we use npm organizations/scopes?
**Status:** ✅ Decided - Yes, use scoped packages
**Decision:** Publish as `@monolab/package-name`

**Rationale:**
- Namespace protection
- Professional appearance
- Consistency with JSR scope pattern
- Required for npm Trusted Publishers

### Q2: Should ts-configs be published?
**Status:** ✅ Decided - Yes, include in releases
**Decision:** Include ts-configs in automated releases

**Rationale:**
- TypeScript configs are useful for external projects
- Allows community to use same strict settings
- Completes the package ecosystem

### Q6: Should all packages have jsr.json?
**Status:** ✅ Decided - Yes, standardize on jsr.json
**Decision:** All packages should have jsr.json with version field

**Rationale:**
- JSR reads version from jsr.json, not package.json
- Standardizing makes release-please configuration simpler
- Allows consistent version synchronization across all packages
- Packages without jsr.json (is-even, is-odd) should have them added

### Q5: Should release PR merge be automated?
**Status:** ✅ Decided - Manual merge
**Decision:** Human must manually merge release PR

**Rationale:**
- Provides human oversight before publishing
- Allows catching unexpected changes or issues
- Gives control over release timing
- Can be automated later if desired, but start conservative

### Q3: Should we add provenance attestation?
**Status:** ✅ Decided - Yes, include provenance
**Decision:** Use `--provenance` flag in npm publish

**Rationale:**
- Supply chain security best practice
- Single flag, no additional complexity
- Builds trust with package consumers
- GitHub Actions natively supports it

### Q4: How to handle publish failures?
**Status:** ✅ Decided - Fail fast with manual recovery
**Decision:** Workflow fails on first error, manual republish required

**Rationale:**
- Simpler initial implementation
- Publishing is idempotent (can retry same version)
- Failures should be rare with proper CI validation
- Can add automatic retries in future if needed
- GitHub Actions UI shows clear error messages for debugging
