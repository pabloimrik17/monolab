# Implementation Tasks

## 📊 Status: Phases 1-2 Complete, Ready for Production Deployment

**Last Updated:** 2025-11-15

**Current Status:**
- ✅ **Phase 1 (Setup & Configuration):** All changes were already implemented in prior work
- ✅ **Phase 2 (Local Testing & Validation):** All tests passed successfully
- ⏭️ **Phase 3-7:** Ready to proceed when deployment is needed

**Key Findings:**
- All configuration files already updated (deno.json, release-please-config.json, workflow)
- pnpm workspace transformation verified working (`workspace:*` → `5.0.4`)
- Deno workspace resolution tested and working
- All builds and tests passing
- No changes needed to repository files (working tree clean)

**⚠️ Critical Issue Confirmed:**
- ✅ Verified: `@m0n0lab/is-even@2.0.5` on npm has `workspace:*` dependency (BROKEN)
- ✅ Verified: `@m0n0lab/react-clean@3.0.2` on npm has `workspace:*` dependency (BROKEN)
- **Action Required:** These packages MUST be republished after workflow is deployed to main

## Phase 1: Setup & Configuration (1-2 hours) ✅ COMPLETED

### 1.1 Deno Installation & Configuration
- [x] 1.1.1 Install Deno locally for testing: `brew install deno` or `curl -fsSL https://deno.land/install.sh | sh`
- [x] 1.1.2 Verify Deno installation: `deno --version` (should show v2.5.6 or compatible)
- [x] 1.1.3 Add Deno v2.5.6 to root package.json engines field
  ```json
  "engines": {
    "node": "24.11.0",
    "pnpm": "10.19.0",
    "deno": "2.5.6"
  }
  ```

### 1.2 Create Root Deno Workspace Configuration
- [x] 1.2.1 Create `/Users/etherless/WebstormProjects/monolab/deno.json` with workspace members:
  ```json
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
- [x] 1.2.2 Verify workspace configuration is valid: `deno task` (should list workspace)

### 1.3 Migrate jsr.json → deno.json (All 6 Packages)
- [x] 1.3.1 **@m0n0lab/is-even**: Rename `packages/is-even/jsr.json` → `deno.json`
  - Remove `imports` field
  - Keep: name, version, license, exports
- [x] 1.3.2 **@m0n0lab/is-odd**: Rename `packages/is-odd/jsr.json` → `deno.json`
  - Remove `imports` field
  - Keep: name, version, license, exports
- [x] 1.3.3 **@m0n0lab/react-clean**: Rename `packages/react-clean/jsr.json` → `deno.json`
  - Remove `imports` field
  - Keep: name, version, license, exports
- [x] 1.3.4 **@m0n0lab/react-hooks**: Rename `packages/react-hooks/jsr.json` → `deno.json`
  - Remove `imports` field
  - Keep: name, version, license, exports
- [x] 1.3.5 **@m0n0lab/ts-configs**: Rename `packages/ts-configs/jsr.json` → `deno.json`
  - Remove `imports` field
  - Keep: name, version, license, exports
- [x] 1.3.6 **@m0n0lab/ts-types**: Rename `packages/ts-types/jsr.json` → `deno.json`
  - Remove `imports` field
  - Keep: name, version, license, exports

### 1.4 Update release-please Configuration
- [x] 1.4.1 Update `release-please-config.json` - change all `extra-files` from `jsr.json` to `deno.json`:
  ```json
  {
    "packages": {
      "packages/is-even": {
        "extra-files": ["deno.json"]  // Changed from jsr.json
      },
      "packages/is-odd": {
        "extra-files": ["deno.json"]  // Changed from jsr.json
      },
      "packages/react-clean": {
        "extra-files": ["deno.json"]  // Changed from jsr.json
      },
      "packages/react-hooks": {
        "extra-files": ["deno.json"]  // Changed from jsr.json
      },
      "packages/ts-configs": {
        "extra-files": ["deno.json"]  // Changed from jsr.json
      },
      "packages/ts-types": {
        "extra-files": ["deno.json"]  // Changed from jsr.json
      }
    }
  }
  ```

### 1.5 Update GitHub Workflow
- [x] 1.5.1 Update `.github/workflows/release-please.yml`:
  - Add Deno setup step:
    ```yaml
    - name: Setup Deno
      uses: denoland/setup-deno@v2
      with:
        deno-version: v2.5.6
    ```
  - Change npm publish to pnpm publish:
    ```yaml
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
  - Change JSR publish command:
    ```yaml
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
- [x] 1.5.2 Add provenance configuration to package.json files if needed:
  ```json
  "publishConfig": {
    "access": "public",
    "provenance": true
  }
  ```

## Phase 2: Local Testing & Validation (1 hour) ✅ COMPLETED

### 2.1 Test pnpm Workspace Transformation
- [x] 2.1.1 Navigate to a package with dependencies: `cd packages/react-clean`
- [x] 2.1.2 Run dry-run publish: `pnpm pack --dry-run` (used `pnpm pack` instead)
- [x] 2.1.3 Inspect tarball contents for transformed dependencies
- [x] 2.1.4 Verify `workspace:*` → `^X.Y.Z` transformation occurs (verified: workspace:* → 5.0.4)
- [x] 2.1.5 Confirm repository package.json still has `workspace:*` (unchanged)

### 2.2 Test Deno Workspace Resolution
- [x] 2.2.1 Navigate to a package with workspace dependencies: `cd packages/is-even`
- [x] 2.2.2 Run dry-run publish: `deno publish --dry-run` (with --allow-dirty)
- [x] 2.2.3 Verify Deno detects workspace and resolves `@m0n0lab/is-odd` version
- [x] 2.2.4 Check output shows correct jsr: URL transformations
- [x] 2.2.5 Confirm no errors about missing `imports` field

### 2.3 Test Build Workflow Still Works
- [x] 2.3.1 Run full build: `pnpm nx run-many --target=build --all`
- [x] 2.3.2 Verify all packages build successfully (7 projects built successfully)
- [x] 2.3.3 Run tests: `pnpm nx run-many --target=test --all` (used test:unit)
- [x] 2.3.4 Verify no regressions introduced by configuration changes (all tests passed)

### 2.4 Verify Package Configurations
- [x] 2.4.1 Check all packages use `workspace:*` for internal dependencies (verified is-even, react-clean)
- [x] 2.4.2 Verify package.json publishConfig is correct (access: "public", provenance: true)
- [x] 2.4.3 Confirm deno.json files have: name, version, license, exports (all 6 packages verified)
- [x] 2.4.4 Verify NO deno.json files have `imports` field (removed) (all return false)

## Phase 3: CI Validation (30 minutes) ✅ SKIPPED

**Note:** All changes were already in main branch, so no feature branch was needed.
- [x] 3.1.1-3.1.3 Skipped - changes already in develop, merged to main
- [x] 3.2.1-3.2.5 Release-please PR created automatically after merge

## Phase 4: Production Deployment (1 hour) 🔄 IN PROGRESS

### 4.1 Merge to Main
- [x] 4.1.1 Create PR from feature branch to main (skipped - merged develop to main)
- [x] 4.1.2 Review all changes (workflow, configs, deno.json migrations)
- [x] 4.1.3 Get team approval if required
- [x] 4.1.4 Merge PR to main branch

### 4.2 Initial Manual Publication (First Time Only - ts-types)
**Note:** ts-types was never published to npm before, requires manual first publication
- [x] 4.2.1 Publish ts-types: `pnpm --filter @m0n0lab/ts-types publish --access public --no-git-checks --no-provenance`

### 4.3 Review Release-Please PR ✅ COMPLETED
- [x] 4.3.1 Review release PR - verify deno.json versions are updated (VERIFIED - synchronized)
- [x] 4.3.2 Verify changelog entries are correct
- [x] 4.3.3 Confirm all extra-files (deno.json) are updated properly (VERIFIED - package.json, deno.json, and manifest in sync)

### 4.3b Fix Deno Type-Checking Issues
**Note:** Deno requires explicit lib configuration for DOM APIs (console, etc.)
- [x] 4.3b.1 Add compilerOptions to react-hooks/deno.json (lib: ESNext, DOM)
- [x] 4.3b.2 Add compilerOptions to react-clean/deno.json (lib: ESNext, DOM)

### 4.4 Merge Release PR ✅ MERGED
**Note:** PR merged - automatic republishing triggered via GitHub Actions
- [x] 4.4.1 Merge release-please PR to trigger publishing (DONE)
- [x] 4.4.2 Monitor GitHub Actions publish workflow (DONE)
- [x] 4.4.3 Watch for successful npm publish steps (✅ SUCCESS - workspace:* transformed to semver)
- [x] 4.4.4 Watch for successful JSR publish steps (PARTIAL - ts-types failed, needs trusted publisher setup)
- [x] 4.4.5 Verify no errors in workflow execution (npm OK, JSR needs retry)

### 4.4b Retry ts-types Publication (After Trusted Publisher Setup) ✅ COMPLETED
**Note:** ts-types republished with trusted publisher configuration
- [x] 4.4b.1 Make trivial change to ts-types to trigger new release (added doc line to README)
- [x] 4.4b.2 Commit change: `docs(ts-types): add comprehensive documentation feature`
- [x] 4.4b.3 Push to main to trigger release-please
- [x] 4.4b.4 Configure trusted publisher in npm for @m0n0lab/ts-types
- [x] 4.4b.5 Merge new release-please PR
- [ ] 4.4b.6 Monitor workflow for successful ts-types publication

### 4.5 Verify Published Packages - npm
- [ ] 4.5.1 Check npm registry: `npm view @m0n0lab/is-even dependencies`
  - Should show: `{ "@m0n0lab/is-odd": "^X.Y.Z" }` (NOT `workspace:*`)
- [ ] 4.5.2 Check npm registry: `npm view @m0n0lab/react-clean dependencies`
  - Should show: `{ "@m0n0lab/react-hooks": "^X.Y.Z" }` (NOT `workspace:*`)
- [ ] 4.5.3 Visit npm package pages and verify dependency versions displayed
- [ ] 4.5.4 Check for provenance attestation badge (should be present from CI)

### 4.6 Verify Published Packages - JSR
- [ ] 4.5.1 Visit JSR package page: `https://jsr.io/@m0n0lab/is-even`
- [ ] 4.5.2 Verify imports show jsr: registry URLs (not bare specifiers)
- [ ] 4.5.3 Confirm dependency versions match actual workspace versions
- [ ] 4.5.4 Visit JSR package page: `https://jsr.io/@m0n0lab/react-clean`
- [ ] 4.5.5 Verify all 6 packages published successfully to JSR

## Phase 5: Package Installation Testing (30 minutes)

### 5.1 Test npm Installation
- [ ] 5.1.1 Create fresh test directory: `mkdir ~/test-npm-install && cd ~/test-npm-install`
- [ ] 5.1.2 Initialize project: `npm init -y`
- [ ] 5.1.3 Install package: `npm install @m0n0lab/react-clean`
- [ ] 5.1.4 Verify installation succeeds (no workspace:* errors)
- [ ] 5.1.5 Check dependency tree: `npm ls @m0n0lab/react-hooks`
  - Should show react-hooks installed as transitive dependency
- [ ] 5.1.6 Verify correct versions installed: `ls node_modules/@m0n0lab/`

### 5.2 Test JSR Installation
- [ ] 5.2.1 Create fresh test directory: `mkdir ~/test-jsr-install && cd ~/test-jsr-install`
- [ ] 5.2.2 Initialize Deno project: `deno init`
- [ ] 5.2.3 Install package: `deno add @m0n0lab/react-clean`
- [ ] 5.2.4 Verify installation succeeds
- [ ] 5.2.5 Check deno.json for correct jsr: imports
- [ ] 5.2.6 Test import works: `deno run test.ts` (with import statement)

### 5.3 Test Breaking Change Scenario (Future Validation)
- [ ] 5.3.1 Document test plan for when a workspace package releases breaking change
- [ ] 5.3.2 Expected behavior: Dependent packages should automatically reference new major version when published
- [ ] 5.3.3 No manual update of dependency constraints should be needed

## Phase 6: Republish Broken Packages (30 minutes)

### 6.1 Identify and Fix Broken Packages
- [ ] 6.1.1 Identify packages currently published with `workspace:*` on npm:
  - **@m0n0lab/is-even** (currently has invalid dependency on is-odd)
  - **@m0n0lab/react-clean** (currently has invalid dependency on react-hooks)

### 6.2 Trigger Patch Version Bumps
- [ ] 6.2.1 Create trivial change in is-even to trigger patch bump:
  - Update comment or documentation
  - Commit: `fix(@m0n0lab/is-even): republish with correct dependencies`
- [ ] 6.2.2 Create trivial change in react-clean to trigger patch bump:
  - Update comment or documentation
  - Commit: `fix(@m0n0lab/react-clean): republish with correct dependencies`

### 6.3 Wait for Republishing
- [ ] 6.3.1 Wait for release-please to create PR with patch bumps
- [ ] 6.3.2 Review PR to ensure versions incremented correctly
- [ ] 6.3.3 Merge PR to trigger republishing
- [ ] 6.3.4 Monitor workflow execution

### 6.4 Validate Republished Packages
- [ ] 6.4.1 Check npm: `npm view @m0n0lab/is-even@latest dependencies`
  - Should show: `{ "@m0n0lab/is-odd": "^X.Y.Z" }`
- [ ] 6.4.2 Check npm: `npm view @m0n0lab/react-clean@latest dependencies`
  - Should show: `{ "@m0n0lab/react-hooks": "^X.Y.Z" }`
- [ ] 6.4.3 Test installation of republished packages in fresh directory
- [ ] 6.4.4 Verify all dependencies resolve correctly

## Phase 7: Documentation & Cleanup (30 minutes)

### 7.1 Update Project Documentation
- [ ] 7.1.1 Update CONTRIBUTING.md with workspace protocol guidelines:
  - Use `workspace:*` for internal dependencies in development
  - pnpm automatically transforms to semver during publish
  - Deno workspaces auto-resolve for JSR publishing
- [ ] 7.1.2 Document Deno v2.5.6 requirement in README (only for CI, not dev)
- [ ] 7.1.3 Add troubleshooting section for publish issues
- [ ] 7.1.4 Document new workflow steps (pnpm publish, deno publish)

### 7.2 Validate OpenSpec Change
- [ ] 7.2.1 Run validation: `openspec validate fix-workspace-protocol-publishing --strict`
- [ ] 7.2.2 Fix any validation errors found
- [ ] 7.2.3 Ensure all specs, designs, proposals are consistent

### 7.3 Archive Change Proposal
- [ ] 7.3.1 Run: `openspec archive fix-workspace-protocol-publishing`
- [ ] 7.3.2 Verify change is properly archived
- [ ] 7.3.3 Update related Linear issues if any
- [ ] 7.3.4 Share learnings with team

### 7.4 Celebrate Success! 🎉
- [ ] 7.4.1 Confirm all packages publishable and installable
- [ ] 7.4.2 Verify no manual intervention needed for future releases
- [ ] 7.4.3 Document any edge cases discovered
- [ ] 7.4.4 Plan retrospective if needed

## Dependencies & Critical Path

**Task Dependencies:**
- Phase 1 must complete before Phase 2 (setup before testing)
- Phase 2 must complete before Phase 3 (local testing before CI)
- Phase 3 must complete before Phase 4 (CI validation before production)
- Phase 4 must complete before Phase 5 (deployment before installation testing)
- Phase 4 must complete before Phase 6 (working workflow before republishing)

**Critical Path:**
```
Phase 1 (Setup)
  → Phase 2 (Local Testing)
  → Phase 3 (CI Validation)
  → Phase 4 (Production Deploy)
  → Phase 5 (Installation Testing)
  → Phase 6 (Republish Broken)
  → Phase 7 (Documentation)
```

**Parallelizable Work:**
- 1.3.x (migrate jsr.json files) can be done concurrently for all packages
- 2.1.x and 2.2.x (testing) can be done in parallel
- 5.1.x and 5.2.x (npm and JSR testing) can be done in parallel
- 6.2.1 and 6.2.2 (patch bumps) can be done in same commit
- 7.1.x (documentation updates) can be done concurrently

**Total Estimated Time:** 4-5 hours

## Rollback Plan

**If pnpm publish fails:**
1. Revert workflow changes: `git revert [commit-hash]`
2. Can manually publish: `cd packages/X && npm publish` (after manually editing dependencies)
3. Investigate pnpm publish issue
4. Consider alternative solutions from design.md

**If Deno publish fails:**
1. Revert to `npx jsr publish` in workflow
2. Revert deno.json → jsr.json migrations
3. Can manually publish: `cd packages/X && npx jsr publish`
4. Investigate Deno workspace resolution issue
5. Temporarily use manual imports field synchronization

**Risk Level:** Low - can always revert to previous manual workflow

## Key Success Criteria

**npm Publishing:**
- ✅ Published packages have semver dependencies (not workspace:*)
- ✅ Consumers can install: `npm install @m0n0lab/react-clean`
- ✅ Dependency resolution works correctly
- ✅ Workflow runs without errors
- ✅ Provenance attestation present (if configured)

**JSR Publishing:**
- ✅ Published packages have jsr: registry URLs
- ✅ Consumers can install: `deno add @m0n0lab/react-clean`
- ✅ Breaking changes automatically reflected
- ✅ No manual version constraint updates needed
- ✅ Workflow runs without errors

**Overall:**
- ✅ Zero manual intervention required for future releases
- ✅ Both registries publish valid, installable packages
- ✅ Workspace protocol remains in repository for development
- ✅ Team understands new workflow
