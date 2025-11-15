# Design: Workspace Protocol Dependency Transformation

## Context

MonoLab uses pnpm workspaces with `workspace:*` protocol for internal package dependencies. This creates two publishing problems:

### Problem 1: npm Publishing
- Current workflow uses `npm publish`
- npm does NOT transform `workspace:*` → publishes literal protocol
- Published packages unusable: consumers cannot install them

### Problem 2: JSR Publishing
- Current workflow uses `npx jsr publish` with `jsr.json`
- jsr.json has `imports` field with hardcoded version constraints
- When dependency has breaking change, constraints become stale
- No automatic synchronization mechanism

### Current State
- **Versioning**: release-please creates release PRs with version bumps
- **npm Publishing**: GitHub Actions using `npm publish` (BROKEN)
- **JSR Publishing**: GitHub Actions using `npx jsr publish` (MANUAL SYNC NEEDED)
- **Repository**: Uses `workspace:*` for development (correct)
- **Published Packages**: Currently broken on npm, risky on JSR

### Constraints
- Must maintain release-please workflow (proven, reliable, good visibility)
- Must publish valid packages to npm that consumers can install
- Must keep `workspace:*` in repository (best practice for monorepos)
- Must work with dual publishing (npm + JSR)
- Must maintain provenance attestation for supply chain security
- Must minimize custom code and maintenance burden

## Goals / Non-Goals

### Goals
- Replace workspace protocol with actual versions in published npm packages
- Automatically resolve JSR dependency versions from workspace
- Zero manual intervention (fully automated)
- Minimal changes to existing workflow
- Maintain supply chain security (provenance)
- Keep repository using workspace protocol for development

### Non-Goals
- Rewriting entire release workflow (want minimal disruption)
- Supporting multiple package managers for publishing (standardize on pnpm + Deno)
- Custom version transformation logic (use existing tools)

## Solution Architecture

### Two-Part Automated Solution

**Part 1: npm Publishing → pnpm publish**
- Leverage pnpm's native workspace protocol transformation
- Simple command change in workflow
- Zero configuration needed

**Part 2: JSR Publishing → Deno Workspaces**
- Migrate from `jsr.json` to `deno.json`
- Use Deno's automatic workspace resolution
- Eliminates manual version constraint management

## Decision

**Use native package manager capabilities for both registries:**
1. **pnpm publish** for npm (transforms workspace:*)
2. **deno publish** with Deno workspaces for JSR (auto-resolves dependencies)

### Rationale

1. **No Custom Code**: Both solutions use native, maintained functionality
2. **Fully Automated**: No manual version synchronization needed
3. **Battle-Tested**: pnpm and Deno have thousands of users
4. **Official Approach**: Deno workspaces are the official JSR publishing method
5. **Future-Proof**: Maintained by package manager teams, not us
6. **Minimal Disruption**: Small changes to existing workflow

### Why Not Alternatives

**Manual Scripts (Option 2/3 from original analysis):**
- ❌ Custom code to maintain
- ❌ Error-prone
- ❌ Doesn't scale
- ❌ Reinvents the wheel

**release-it Migration:**
- ❌ Major workflow rewrite
- ❌ Loses release-please benefits (PR visibility, Google maintenance)
- ❌ Steeper learning curve

## Implementation Details

### Part 1: npm Publishing with pnpm

**Workflow Change:**
```yaml
# .github/workflows/release-please.yml

# BEFORE:
- name: Publish to npm
  env:
    NPM_CONFIG_PROVENANCE: true
  run: |
    cd $PKG_PATH
    npm publish --access public --provenance

# AFTER:
- name: Publish to npm
  run: |
    cd $PKG_PATH
    pnpm publish --access public --no-git-checks
```

**How pnpm Transforms:**
```
Repository (package.json):
{
  "dependencies": {
    "@m0n0lab/react-hooks": "workspace:*"
  }
}

↓ pnpm publish

Published to npm (in tarball):
{
  "dependencies": {
    "@m0n0lab/react-hooks": "^1.0.3"  // actual version
  }
}
```

**Transformation Rules:**
- `workspace:*` → `^X.Y.Z` (caret range of current version)
- `workspace:~` → `~X.Y.Z` (tilde range)
- `workspace:^` → `^X.Y.Z` (caret range)
- `workspace:X.Y.Z` → `X.Y.Z` (exact version)

**Key Points:**
- pnpm reads version from actual package in workspace
- Transformation happens during tarball creation
- Source files unchanged (workspace:* remains in repo)
- `--no-git-checks`: Safe because release-please manages git state

### Part 2: JSR Publishing with Deno Workspaces

**Setup Deno Workspace:**

```json
// deno.json (root - NEW FILE)
{
  "workspace": [
    "./packages/is-even",
    "./packages/is-odd",
    "./packages/react-clean",
    "./packages/react-hooks",
    "./packages/ts-configs",
    "./packages/ts-types"
  ]
}
```

**Migrate jsr.json → deno.json:**

```json
// BEFORE: packages/is-even/jsr.json
{
  "name": "@m0n0lab/is-even",
  "version": "2.0.5",
  "license": "MIT",
  "exports": "./src/index.ts",
  "imports": {
    "@m0n0lab/is-odd": "jsr:@m0n0lab/is-odd@^5.0.0"  // ❌ Manual sync
  }
}

// AFTER: packages/is-even/deno.json
{
  "name": "@m0n0lab/is-even",
  "version": "2.0.5",
  "license": "MIT",
  "exports": "./src/index.ts"
  // ✅ No imports field - Deno resolves automatically!
}
```

**Workflow Change:**
```yaml
# .github/workflows/release-please.yml

# ADD: Setup Deno
- name: Setup Deno
  uses: denoland/setup-deno@v2
  with:
    deno-version: v2.5.6  # Pinned version

# BEFORE:
- name: Publish to JSR
  run: |
    cd $PKG_PATH
    npx jsr publish

# AFTER:
- name: Publish to JSR
  run: |
    cd $PKG_PATH
    deno publish --allow-dirty
```

**How Deno Resolves:**
```
Source code (packages/is-even/src/index.ts):
import { isOdd } from "@m0n0lab/is-odd";

↓ deno publish

Published to JSR:
import { isOdd } from "jsr:@m0n0lab/is-odd@5.0.4";
// ✅ Deno reads actual version from workspace
```

**Release-Please Integration:**
```json
// release-please-config.json

// BEFORE:
{
  "packages/is-even": {
    "extra-files": ["jsr.json"]
  }
}

// AFTER:
{
  "packages/is-even": {
    "extra-files": ["deno.json"]  // Updated
  }
}
```

### Version Specification

**Pinned Versions:**
- **Deno**: v2.5.6 (latest stable as of 2025-10-30)
  - Pin in GitHub Actions workflow
  - Pin in package.json engines (documentation)
  - Update explicitly when needed

- **pnpm**: 10.19.0 (already pinned in project)
- **Node.js**: 24.11.0 (already pinned in project)

**Rationale for Pinning:**
- Prevents unexpected breaking changes
- Reproducible builds
- Explicit control over upgrades
- Documented in engines field for visibility

### File Structure Changes

**Root Directory:**
```diff
  .github/workflows/release-please.yml  # Modified
  release-please-config.json            # Modified (jsr.json → deno.json)
  package.json                          # Modified (add deno to engines)
+ deno.json                             # NEW (workspace config)
  pnpm-workspace.yaml                   # Unchanged
```

**Per Package:**
```diff
  packages/is-even/
    package.json       # Unchanged (keeps workspace:*)
-   jsr.json          # DELETED
+   deno.json         # NEW (no imports field)
    src/index.ts      # Unchanged
```

## Architecture Flow

### npm Publishing Flow

```
1. Developer commits code
   ↓
2. release-please creates PR with version bumps
   ↓
3. Human merges release PR
   ↓
4. Workflow triggers
   ↓
5. For each released package:
   a. Build package (nx run build)
   b. cd packages/X
   c. pnpm publish --access public --no-git-checks
      → pnpm creates tarball
      → pnpm transforms workspace:* to ^X.Y.Z
      → pnpm uploads to npm registry
   ↓
6. Published package has valid semver dependencies
```

### JSR Publishing Flow

```
1. Developer commits code
   ↓
2. release-please creates PR with version bumps
   - Updates deno.json version field
   ↓
3. Human merges release PR
   ↓
4. Workflow triggers
   ↓
5. For each released package (in dependency order):
   a. cd packages/X
   b. deno publish --allow-dirty
      → Deno reads workspace config
      → Deno finds referenced packages (@m0n0lab/is-odd)
      → Deno reads actual version from workspace (5.0.4)
      → Deno transforms imports to jsr:@m0n0lab/is-odd@5.0.4
      → Deno uploads to JSR registry
   ↓
6. Published package has correct JSR registry references
```

## Risks / Trade-offs

### Risk 1: Adding Deno as Dependency

**Description**: Introducing Deno runtime to project adds new dependency

**Mitigation**:
- Deno only used in CI for JSR publishing
- Developers don't need Deno locally for development
- Pin to specific version (v2.5.6)
- Deno is lightweight (~25MB download)
- Used by thousands of projects, well-maintained

**Impact**: Low - isolated to CI, doesn't affect development workflow

### Risk 2: Dual Configuration (pnpm + Deno)

**Description**: Maintaining both pnpm-workspace.yaml and deno.json

**Mitigation**:
- Both files are simple workspace member lists
- deno.json only needed for JSR publishing
- Can be generated/validated in CI if needed
- Small maintenance overhead (add new package → update both)

**Impact**: Low - minimal ongoing maintenance

### Risk 3: Breaking Changes in Deno

**Description**: Deno updates could break publishing

**Mitigation**:
- Pin to specific version (v2.5.6)
- Test new Deno versions before upgrading
- Deno has stable v2.x API
- Can rollback to previous version if needed

**Impact**: Low - version pinning prevents surprises

### Risk 4: pnpm publish flags differ from npm

**Description**: pnpm publish behavior might differ from npm publish

**Mitigation**:
- Both use same npm registry protocol
- pnpm is npm-compatible by design
- Provenance supported via publishConfig
- Can test publish with --dry-run first

**Impact**: Low - pnpm is battle-tested with npm registry

### Risk 5: Republishing Required

**Description**: Existing broken packages need republishing

**Mitigation**:
- Identified packages:
  - @m0n0lab/is-even
  - @m0n0lab/react-clean
- Trigger patch version bump to force republish
- Test republished packages before announcing

**Impact**: Medium - one-time effort, well-defined scope

## Implementation Strategy

### Phase 1: Setup & Configuration (1-2 hours)

1. Create `deno.json` in root with workspace members
2. Rename `jsr.json` → `deno.json` in all 6 packages
3. Remove `imports` field from all deno.json files
4. Update `release-please-config.json` extra-files
5. Add `"deno": "2.5.6"` to root package.json engines
6. Update `.github/workflows/release-please.yml`:
   - Add Deno setup step
   - Change npm publish → pnpm publish
   - Change npx jsr publish → deno publish

### Phase 2: Testing in Feature Branch (1 hour)

1. Install Deno locally: `brew install deno`
2. Test build still works: `pnpm nx run-many --target=build`
3. Test pnpm publish transformation:
   ```bash
   cd packages/is-even
   pnpm pack --dry-run
   # Inspect tarball for correct dependencies
   ```
4. Test deno publish:
   ```bash
   cd packages/is-even
   deno publish --dry-run
   # Verify it detects workspace and resolves versions
   ```

### Phase 3: CI Validation (30 min)

1. Push feature branch
2. Verify CI pipeline passes
3. Check Deno installation step works
4. Verify builds complete successfully
5. Inspect workflow logs for any errors

### Phase 4: Production Deployment (1 hour)

1. Merge feature branch to main
2. Wait for release-please PR
3. Review PR (should update deno.json versions)
4. Merge release PR
5. Monitor publish workflow
6. Verify packages published to npm correctly
7. Verify packages published to JSR correctly

### Phase 5: Validation & Cleanup (30 min)

1. Check npm registry:
   - `npm view @m0n0lab/is-even dependencies`
   - Should show `^X.Y.Z`, NOT `workspace:*`
2. Check JSR registry:
   - Visit jsr.io/@m0n0lab/is-even
   - Verify imports show correct jsr: URLs
3. Test installation:
   - `npm install @m0n0lab/react-clean` (fresh directory)
   - `deno add @m0n0lab/react-clean` (fresh directory)
4. Republish broken packages (trigger patch bumps)
5. Update documentation

**Total Estimated Time**: 4-5 hours

## Validation Plan

### Success Criteria

**npm Publishing:**
1. ✅ Published packages have semver dependencies (not workspace:*)
2. ✅ Consumers can install: `npm install @m0n0lab/react-clean`
3. ✅ Dependency resolution works correctly
4. ✅ Workflow runs without errors
5. ✅ Provenance attestation present (via publishConfig)

**JSR Publishing:**
1. ✅ Published packages have jsr: registry URLs
2. ✅ Consumers can install: `deno add @m0n0lab/react-clean`
3. ✅ Breaking changes automatically reflected
4. ✅ No manual version constraint updates needed
5. ✅ Workflow runs without errors

### Test Cases

**Test 1: npm workspace transformation**
```bash
# After publish, check npm registry:
npm view @m0n0lab/react-clean dependencies

# Expected:
{ "@m0n0lab/react-hooks": "^1.0.3", "tslib": "2.8.1" }

# NOT:
{ "@m0n0lab/react-hooks": "workspace:*", "tslib": "2.8.1" }
```

**Test 2: npm package installation**
```bash
# Fresh install in new directory:
mkdir test-npm && cd test-npm
npm init -y
npm install @m0n0lab/react-clean

# Should succeed
# Should install react-hooks as transitive dependency
ls node_modules/@m0n0lab/
# Expected: react-clean/ react-hooks/
```

**Test 3: JSR workspace resolution**
```bash
# After publish, check JSR package page:
# Visit: https://jsr.io/@m0n0lab/is-even

# Should show imports with jsr: URLs, not bare specifiers
# Should reference correct version of is-odd
```

**Test 4: JSR package installation**
```bash
# Fresh install:
mkdir test-jsr && cd test-jsr
deno init
deno add @m0n0lab/react-clean

# Should succeed
# deno.json should have correct imports
```

**Test 5: Breaking change propagation**
```bash
# Scenario: is-odd releases v6.0.0 (breaking)
# After publish, is-even should reference is-odd@6.0.0
# No manual update of imports field required
```

## Rollback Plan

If pnpm or Deno publishing fails:

1. **Immediate**: Revert workflow changes via git revert
2. **Manual publish**: Can always manually publish:
   ```bash
   cd packages/X
   # For npm: manually edit package.json deps, then npm publish
   # For JSR: manually update jsr.json imports, then npx jsr publish
   ```
3. **Investigation**: Debug with --dry-run flags
4. **Alternative**: Temporarily use manual sync (Option 3 from original analysis)

**Risk Level**: Low - can always revert to previous manual workflow

## Future Enhancements

1. **CI Validation**: Add check to ensure deno.json and pnpm-workspace.yaml stay in sync
2. **Automated Testing**: Test published packages in CI before release
3. **Provenance Verification**: Script to verify provenance badges on published packages
4. **Deno Version Management**: Consider using Deno version manager if needed
5. **Multi-Registry Support**: Could extend to other registries if needed
