# Tasks: Remove Demo Packages

## Phase 1: Pre-Removal Validation

### Task 1.1: Document Current State
- [x] Create list of all files containing is-even/is-odd references
- [x] Verify current CI pipeline status
- [x] Confirm demo app current functionality
- **Validation**: Reference list created and saved

### Task 1.2: Verify No External Dependencies
- [x] Search for any external packages or projects depending on is-even/is-odd
- [x] Confirm packages are only used internally within monorepo
- **Validation**: No external dependencies found

## Phase 2: Update Demo Application

### Task 2.1: Remove Package Dependencies
- [x] Remove `@m0n0lab/is-even` from `apps/demo/package.json` dependencies
- [x] Remove `@m0n0lab/is-odd` from `apps/demo/package.json` dependencies
- **Validation**: package.json updated, no syntax errors

### Task 2.2: Update Demo App Code
- [x] Remove imports from `apps/demo/src/App.tsx`
- [x] Replace `isEven()` and `isOdd()` calls with inline logic or alternative demonstration
- [x] Update any comments or documentation in demo app
- **Validation**: Demo app code compiles without errors

### Task 2.3: Update Demo App Configuration
- [x] Update `apps/demo/tsconfig.json` to remove project references if present
- [x] Update `apps/demo/tsconfig.app.json` to remove project references if present
- **Validation**: TypeScript configuration valid

### Task 2.4: Test Demo Application
- [x] Run `pnpm install` to update dependencies
- [x] Run `nx build demo` to verify build succeeds
- [x] Run `nx dev demo` to verify app runs correctly
- **Validation**: Demo app builds and runs without errors

## Phase 3: Update Monorepo Configuration

### Task 3.1: Update Release Configuration
- [x] Remove `packages/is-even` entry from `.release-please-manifest.json`
- [x] Remove `packages/is-odd` entry from `.release-please-manifest.json`
- [x] Remove `packages/is-even` configuration from `release-please-config.json`
- [x] Remove `packages/is-odd` configuration from `release-please-config.json`
- **Validation**: JSON files valid, no syntax errors

### Task 3.2: Update Codecov Configuration
- [x] Remove `is-even` coverage status check from `codecov.yaml` (project section)
- [x] Remove `is-odd` coverage status check from `codecov.yaml` (project section)
- [x] Remove `is-even` patch coverage check from `codecov.yaml` (patch section)
- [x] Remove `is-odd` patch coverage check from `codecov.yaml` (patch section)
- [x] Remove `is-even` flag from `codecov.yaml` (flags section)
- [x] Remove `is-odd` flag from `codecov.yaml` (flags section)
- **Validation**: YAML file valid, no syntax errors

### Task 3.3: Update TypeScript Configuration
- [x] Remove `packages/is-even` reference from root `tsconfig.json` if present
- [x] Remove `packages/is-odd` reference from root `tsconfig.json` if present
- **Validation**: TypeScript configuration valid

### Task 3.4: Update Deno Configuration
- [x] Remove is-even/is-odd references from root `deno.json` if present
- **Validation**: Deno configuration valid

## Phase 4: Update Documentation

### Task 4.1: Update Project Documentation
- [x] Update `openspec/project.md` to remove is-even/is-odd from package listings
- [x] Update purpose section to remove references to utility packages examples
- [x] Update tech stack section if necessary
- [x] Update any other sections mentioning these packages
- **Validation**: Documentation consistent and accurate

### Task 4.2: Update README
- [x] Update root `README.md` to remove package references
- [x] Update package listings
- [x] Update any examples or usage sections
- **Validation**: README accurate and professional

### Task 4.3: Update OpenSpec Archived Proposals (Optional)
- [x] Add notes to archived proposals that reference is-even/is-odd (informational only)
- [x] No changes required to archived proposal content
- **Validation**: Context preserved for historical reference

## Phase 5: Remove Package Directories

### Task 5.1: Remove is-even Package
- [x] Remove entire `packages/is-even/` directory
- [x] Verify no dangling symlinks or references
- **Validation**: Directory removed, no file system errors

### Task 5.2: Remove is-odd Package
- [x] Remove entire `packages/is-odd/` directory
- [x] Verify no dangling symlinks or references
- **Validation**: Directory removed, no file system errors

## Phase 6: Clean Up Dependencies

### Task 6.1: Update Package Lock
- [x] Run `pnpm install` to regenerate lock file
- [x] Verify no errors or warnings
- **Validation**: pnpm-lock.yaml updated successfully

### Task 6.2: Verify is-even/is-odd Removed from Lock
- [x] Confirm is-even package completely removed from `pnpm-lock.yaml`
- [x] Confirm is-odd package completely removed from `pnpm-lock.yaml`
- **Validation**: No references in lock file

## Phase 7: Verification and Testing

### Task 7.1: Comprehensive Reference Search
- [x] Run `rg "is-even"` across entire codebase
- [x] Run `rg "is-odd"` across entire codebase
- [x] Verify only acceptable references remain (e.g., this proposal, git history)
- **Validation**: No unexpected references found

### Task 7.2: Build Verification
- [x] Run `nx run-many -t build` to build all projects
- [x] Verify all builds succeed
- [x] Check for any TypeScript errors
- **Validation**: All builds successful

### Task 7.3: Test Verification
- [x] Run `nx run-many -t test:unit` to run all tests
- [x] Verify all tests pass
- [x] Check coverage reports
- **Validation**: All tests passing

### Task 7.4: Lint Verification
- [x] Run `nx run-many -t lint:eslint` to lint all projects
- [x] Run `nx run-many -t lint:prettier` to check formatting
- [x] Fix any issues found
- **Validation**: Linting passes

### Task 7.5: CI Pipeline Dry Run
- [x] Push changes to a feature branch
- [x] Verify CI pipeline runs successfully
- [x] Check all CI jobs pass
- **Validation**: CI pipeline green

## Phase 8: Final Documentation

### Task 8.1: Update Nx Workspace Info
- [x] Run `nx graph` to verify dependency graph is clean
- [x] Verify no broken project references
- **Validation**: Nx graph valid

### Task 8.2: Create Commit
- [x] Stage all changes
- [x] Create conventional commit: `chore: remove is-even and is-odd demo packages`
- [x] Include detailed commit body explaining removal
- **Validation**: Commit created

### Task 8.3: Create PR
- [x] Push feature branch
- [x] Create pull request with detailed description
- [x] Link to this OpenSpec proposal
- [x] Request review if needed
- **Validation**: PR created

## Task Dependencies

```
Phase 1 (Validation)
  ↓
Phase 2 (Demo App) ← Must complete before Phase 5
  ↓
Phase 3 (Config) ← Can run parallel with Phase 4
  ↓
Phase 4 (Docs) ← Can run parallel with Phase 3
  ↓
Phase 5 (Package Removal) ← Must wait for Phase 2
  ↓
Phase 6 (Deps Cleanup)
  ↓
Phase 7 (Verification)
  ↓
Phase 8 (Finalization)
```

## Estimated Time

- Phase 1: 15 minutes
- Phase 2: 20 minutes
- Phase 3: 15 minutes
- Phase 4: 20 minutes
- Phase 5: 5 minutes
- Phase 6: 10 minutes
- Phase 7: 30 minutes
- Phase 8: 15 minutes

**Total: ~2 hours**

## Rollback Plan

If issues are discovered:

1. Revert the commit
2. Run `pnpm install` to restore dependencies
3. Investigate the issue
4. Update this proposal with learnings
5. Retry with fixes

The removal is non-destructive to published packages (they remain on npm/JSR) and can be fully reverted via git.
