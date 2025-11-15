# Proposal: Fix Workspace Protocol Dependencies in Published Packages

## Why

The current release-please workflow has two critical issues preventing packages from being usable after publication:

### Problem 1: npm Publishing - Invalid workspace:* Dependencies

**Current State:**
- Packages are published to npm with literal `workspace:*` protocol in dependencies
- Example: `@m0n0lab/react-clean` depends on `"@m0n0lab/react-hooks": "workspace:*"` in published package
- npm cannot resolve `workspace:*` - it's a pnpm-specific protocol
- Consumers cannot install packages: `npm install @m0n0lab/react-clean` fails

**Root Cause:**
- Workflow uses `npm publish` which doesn't transform workspace protocols
- When migrating from Nx Release to release-please, we lost the `preserveLocalDependencyProtocols` functionality

### Problem 2: JSR Publishing - Manual Dependency Version Constraints

**Current State:**
- JSR packages use `jsr.json` with hardcoded dependency versions in `imports` field
- Example: `"imports": { "@m0n0lab/is-odd": "jsr:@m0n0lab/is-odd@^5.0.0" }`
- When `is-odd` releases a breaking change (v5 → v6), `is-even` still references `^5.0.0`
- Must manually update these constraints - easy to forget, causes version mismatches

**Root Cause:**
- release-please only updates the `version` field in jsr.json, not the `imports` constraints
- No automated synchronization between released versions and dependency constraints

### Why This Matters

- **Broken User Experience**: Published packages are unusable by consumers
- **Registry Policy Violation**: Invalid dependency references may be flagged
- **Lost Trust**: Users encounter immediate installation failures
- **Maintenance Burden**: Manual intervention defeats the purpose of automation
- **Version Drift**: JSR dependencies can become outdated without notification

## What Changes

Implement automated workspace protocol replacement for both npm and JSR publishing using native package manager capabilities.

### Solution Approach

**Two-Part Solution:**

**Part 1: npm Publishing - Use pnpm publish**
- Replace `npm publish` with `pnpm publish` in workflow
- pnpm natively transforms `workspace:*` → actual version numbers (e.g., `^3.0.2`)
- Zero configuration needed, battle-tested

**Part 2: JSR Publishing - Use Deno Workspaces**
- Replace `npx jsr publish` with `deno publish`
- Replace `jsr.json` files with `deno.json` files
- Deno workspaces automatically resolve workspace dependencies to JSR registry references
- Eliminates need for manual `imports` field management

**Why This Combination:**
- ✅ Both solutions use native capabilities (pnpm for npm, Deno for JSR)
- ✅ No custom code to maintain
- ✅ Fully automated - zero manual intervention
- ✅ Battle-tested by thousands of projects
- ✅ Future-proof - maintained by package manager teams

### Implementation Details

**Change 1: npm Publishing - Switch to pnpm publish**
```yaml
# Before:
npm publish --access public --provenance

# After:
pnpm publish --access public --no-git-checks
```
- `--no-git-checks`: Skips pnpm's git validation (release-please manages git state)
- pnpm automatically converts workspace protocols:
  - `workspace:*` → `^3.0.2` (caret range)
  - `workspace:~` → `~3.0.2` (tilde range)
  - `workspace:^` → `^3.0.2` (caret range)

**Change 2: JSR Publishing - Migrate to Deno Workspaces**

Add Deno v2.5.6 to CI:
```yaml
- uses: denoland/setup-deno@v2
  with:
    deno-version: v2.5.6
```

Replace jsr.json with deno.json per package:
```json
// packages/is-even/deno.json
{
  "name": "@m0n0lab/is-even",
  "version": "2.0.5",
  "license": "MIT",
  "exports": "./src/index.ts"
}
```

Create workspace configuration in root:
```json
// deno.json (root)
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

Update publish command:
```yaml
# Before:
npx jsr publish

# After:
deno publish --allow-dirty
```

**Change 3: Update release-please configuration**
```json
// release-please-config.json
{
  "packages/is-even": {
    "extra-files": ["deno.json"]  // Changed from jsr.json
  }
}
```

**Change 4: Document Deno requirement**
```json
// package.json (root)
{
  "engines": {
    "node": "24.11.0",
    "pnpm": "10.19.0",
    "deno": "2.5.6"  // Documented (not enforced by npm)
  }
}
```

### Benefits

**npm Publishing (pnpm):**
- ✅ **Automatic Transformation**: No manual intervention or custom scripts
- ✅ **Battle-Tested**: pnpm's transformation logic is proven and maintained
- ✅ **Zero Config**: No additional configuration files or plugins
- ✅ **Provenance Support**: pnpm publish supports `--provenance` flag (via config)
- ✅ **Alignment**: pnpm is already the project's package manager

**JSR Publishing (Deno):**
- ✅ **Eliminates Manual Sync**: No more maintaining `imports` field manually
- ✅ **Automatic Version Resolution**: Deno reads actual workspace versions
- ✅ **Breaking Change Safe**: Major bumps automatically reflected in published packages
- ✅ **Official Approach**: Deno workspaces are the official JSR publishing method
- ✅ **Simplifies Config**: deno.json replaces jsr.json (fewer files)

## Impact

### Affected Specs

- **MODIFIED**: `package-release` - Add requirements for:
  - Workspace protocol transformation during npm publishing (pnpm)
  - Automatic dependency resolution during JSR publishing (Deno workspaces)

### Affected Code

**CI/CD Workflow:**
- `.github/workflows/release-please.yml`:
  - Add Deno v2.5.6 setup step
  - Change npm publish → `pnpm publish --access public --no-git-checks`
  - Change JSR publish → `deno publish --allow-dirty`

**Configuration Files:**
- `release-please-config.json`: Change `extra-files` from `jsr.json` to `deno.json`
- `package.json` (root): Add `"deno": "2.5.6"` to engines field
- `deno.json` (NEW, root): Create workspace configuration

**Per-Package Files:**
- Rename `jsr.json` → `deno.json` in all 6 packages
- Remove `imports` field from deno.json (Deno resolves automatically)
- Keep minimal config: name, version, license, exports

### Affected Packages

**npm Publishing (workspace:* issue):**
- `@m0n0lab/is-even` - Depends on `@m0n0lab/is-odd` via `workspace:*`
- `@m0n0lab/react-clean` - Depends on `@m0n0lab/react-hooks` via `workspace:*`

**JSR Publishing (all packages migrating to Deno):**
- `@m0n0lab/is-even`
- `@m0n0lab/is-odd`
- `@m0n0lab/react-clean`
- `@m0n0lab/react-hooks`
- `@m0n0lab/ts-configs`
- `@m0n0lab/ts-types`

### Breaking Changes

None. This fixes broken functionality without changing APIs or behavior. External consumers see no changes.

### Migration Requirements

**One-Time Actions**:

1. **Install Deno locally (for testing)**:
   ```bash
   curl -fsSL https://deno.land/install.sh | sh
   # Or: brew install deno
   ```

2. **Migrate jsr.json → deno.json** (all 6 packages):
   - Rename files
   - Remove `imports` field
   - Keep: name, version, license, exports

3. **Create deno.json in root** with workspace configuration

4. **Update release-please-config.json**:
   - Change `extra-files: ["jsr.json"]` to `extra-files: ["deno.json"]`

5. **Republish broken packages**:
   - `@m0n0lab/is-even` (currently has invalid `workspace:*` on npm)
   - `@m0n0lab/react-clean` (currently has invalid `workspace:*` on npm)

**Validation**:

**npm Publishing:**
1. After publish, check npm registry: dependencies should show `^X.Y.Z`, not `workspace:*`
2. Test installation: `npm install @m0n0lab/react-clean` should work
3. Verify dependency resolution: correct versions of workspace deps installed

**JSR Publishing:**
1. After publish with `deno publish`, check JSR package page
2. Verify imports reference correct JSR registry URLs
3. Test installation: `deno add @m0n0lab/react-clean` should work
4. Confirm breaking changes properly reflected in dependencies

### Key Learnings & Gotchas

**pnpm Publishing:**
1. **pnpm vs npm**:
   - pnpm publish understands and transforms `workspace:*`
   - npm publish does NOT transform (publishes literally)
   - Must use pnpm for monorepos with workspace dependencies

2. **--no-git-checks flag**:
   - Skips pnpm's git validation (clean tree, branch checks)
   - Safe because release-please manages all git state
   - Prevents errors about uncommitted release-please changes

3. **Transformation rules**:
   - `workspace:*` → `^X.Y.Z` (caret range)
   - `workspace:~` → `~X.Y.Z` (tilde range)
   - `workspace:^` → `^X.Y.Z` (caret range)

**Deno Publishing:**
1. **Deno workspaces automatic resolution**:
   - Reads actual versions from workspace packages
   - Transforms bare imports to JSR registry URLs
   - No manual version constraint management needed

2. **deno.json vs jsr.json**:
   - Functionally equivalent for JSR publishing
   - deno.json is official Deno config format
   - Removes need for `imports` field (Deno resolves automatically)

3. **Deno only needed for CI**:
   - Local development continues using pnpm
   - Developers don't need Deno installed locally
   - Only CI workflow uses Deno for JSR publishing

4. **Version pinning**:
   - Deno pinned to v2.5.6 (latest stable as of 2025-10-30)
   - Prevents unexpected breaking changes in Deno runtime
   - Update Deno version explicitly when needed

## Open Questions

### Q1: Does pnpm publish support OIDC provenance?
**Status**: ✅ Resolved - YES
**Answer**: pnpm v9.0.0+ supports provenance via `publishConfig.provenance: true` in package.json

### Q2: Can we use Deno workspaces while keeping pnpm?
**Status**: ✅ Resolved - YES
**Answer**: Deno workspaces coexist with pnpm. Use pnpm for dev/build, Deno only for JSR publishing

### Q3: Does Deno automatically update dependency versions?
**Status**: ✅ Resolved - YES
**Answer**: Deno reads actual workspace versions and transforms imports to correct JSR registry URLs during publishing
