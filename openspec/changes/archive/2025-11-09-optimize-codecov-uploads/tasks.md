# Implementation Tasks

## 1. Add Affected Detection Step

- [x] 1.1 Add detection step after test execution (after line ~111 in ci.yml)
- [x] 1.2 Configure step to only run on PRs (`if: ${{ github.event_name == 'pull_request' }}`)
- [x] 1.3 Call `pnpm exec nx show projects --affected` once and store in variable
- [x] 1.4 Loop through packages (react-hooks, react-clean, is-even, is-odd, ts-configs) and generate boolean outputs
- [x] 1.5 Use grep to check if `@monolab/<package>` is in affected list
- [x] 1.6 Export outputs to `$GITHUB_OUTPUT` with format `<package>=true|false`
- [x] 1.7 Assign step ID `affected-codecov` for later reference

## 2. Add Conditional Coverage Uploads

- [x] 2.1 Keep 5 individual `codecov/codecov-action@v5` steps (one per package)
- [x] 2.2 Add `if: ${{ !cancelled() && (github.event_name == 'push' || steps.affected-codecov.outputs.<package> == 'true') }}` to each step
- [x] 2.3 Condition evaluates to: always upload on push to main/develop/pre, only affected packages on PRs
- [x] 2.4 Reference step outputs from affected-codecov detection step
- [x] 2.5 Keep individual `flags` per package for Codecov tracking
- [x] 2.6 Keep `fail_ci_if_error: false` for non-blocking uploads
- [x] 2.7 Keep `token: ${{ secrets.CODECOV_TOKEN }}` for authentication
- [x] 2.8 Each step uploads its own lcov.info file from packages/<package>/coverage/

## 3. Add Conditional Test Results Uploads

- [x] 3.1 Keep 5 individual `codecov/test-results-action@v1` steps (one per package)
- [x] 3.2 Add `if: ${{ !cancelled() && (github.event_name == 'push' || steps.affected-codecov.outputs.<package> == 'true') }}` to each step
- [x] 3.3 Condition evaluates to: always upload on push to main/develop/pre, only affected packages on PRs
- [x] 3.4 `!cancelled()` is critical for capturing test failures in Test Analytics
- [x] 3.5 Reference step outputs from affected-codecov detection step
- [x] 3.6 Keep individual `flags` per package for Codecov tracking
- [x] 3.7 Keep `fail_ci_if_error: false` for non-blocking uploads
- [x] 3.8 Keep `token: ${{ secrets.CODECOV_TOKEN }}` for authentication
- [x] 3.9 Each step uploads its own test-results.junit.xml file from packages/<package>/

## 4. Simplify Bundle Size Upload

- [x] 4.1 Remove all conditional logic from bundle size step
- [x] 4.2 Always upload bundle analysis for all packages (both PRs and push to main/develop/pre)
- [x] 4.3 Change build step from `nx affected -t build` to `nx run-many -t build`
- [x] 4.4 This ensures all dist/ directories exist for bundle analysis
- [x] 4.5 Nx cache ensures only affected packages are actually rebuilt (+1s overhead)
- [x] 4.6 Prevents "-100% (removed)" false positives for non-affected packages
- [x] 4.7 Keep existing `dist` directory check for safety
- [x] 4.8 Keep `continue-on-error: true` for non-blocking behavior
- [x] 4.9 Add comment explaining Nx cache optimization

## 5. Add Nx Cache Artifact

- [x] 5.1 Add "Restore Nx cache" step after npm dependencies cache (after line ~80)
- [x] 5.2 Condition step with `if: ${{ env.NX_NO_CLOUD == 'true' }}`
- [x] 5.3 Use `actions/cache/restore@v4` to restore `.nx/cache` directory
- [x] 5.4 Create cache key: `nx-${{ runner.os }}-${{ github.ref_name }}-${{ hashFiles('pnpm-lock.yaml') }}-${{ hashFiles('nx.json') }}`
- [x] 5.5 Add restore-keys for fallback: ref_name → develop → OS
- [x] 5.6 Assign step ID `cache-nx-restore` for later reference
- [x] 5.7 Add "Cache Nx results" step at end of workflow (after bundle analysis)
- [x] 5.8 Condition with same `if: ${{ env.NX_NO_CLOUD == 'true' }}`
- [x] 5.9 Use `actions/cache/save@v4` with same path and primary key from restore step
- [x] 5.10 This optimizes CI performance when monthly Nx Cloud limit is reached

## 6. Align Cache Keys to Coherent Pattern

- [x] 6.1 Review all cache restore-keys across workflow (npm, Nx, Stryker)
- [x] 6.2 Remove `main-` from npm dependencies restore-keys (redundant when on main)
- [x] 6.3 Remove `main-` from Nx cache restore-keys
- [x] 6.4 Standardize all caches to 3-level pattern: `<prefix>-${{ runner.os }}-${{ github.ref_name }}-` → `<prefix>-${{ runner.os }}-develop-` → `<prefix>-${{ runner.os }}-`
- [x] 6.5 Keep Stryker cache pattern as reference (it already uses correct pattern)
- [x] 6.6 This ensures feature branches benefit from develop cache while avoiding redundant main fallback

## 7. Testing & Validation

- [ ] 7.1 Create test PR that modifies only one package (e.g., react-hooks)
- [ ] 7.2 Verify detection step outputs show only that package as affected
- [ ] 7.3 Verify coverage upload shows 1 step executed, 4 skipped (via GitHub Actions conditionals)
- [ ] 7.4 Verify test results upload shows 1 step executed, 4 skipped
- [ ] 7.5 Verify bundle size analysis uploads all 5 packages (no skips)
- [ ] 7.6 Check Codecov PR comment shows affected package delta + non-affected "no change"
- [ ] 7.7 Verify carryforward works for non-affected packages
- [ ] 7.8 Verify no "-100% (removed)" false positives for bundle sizes
- [ ] 7.9 Create test PR modifying shared dependency to verify multiple packages affected
- [ ] 7.10 Push to main and verify all 5 packages upload (baseline establishment)
- [ ] 7.11 Verify workflow completes ~110-120s faster on single-package PRs
- [ ] 7.12 Verify Nx cache restore/save works when NX_NO_CLOUD=true

## 8. Documentation

- [x] 8.1 Add inline comments to detection step explaining its purpose
- [x] 8.2 Add comment to bundle analysis explaining Nx cache optimization
- [x] 8.3 Add comment explaining coverage/test-results conditional upload strategy
- [x] 8.4 Update proposal.md to reflect final implementation (GitHub Actions vs bash scripts)
- [x] 8.5 Document bundle analysis simplification (always upload all)
- [x] 8.6 Document Nx cache artifact addition for NX_NO_CLOUD scenario
- [x] 8.7 Document cache keys alignment to 3-level pattern
- [x] 8.8 Add note about updating conditionals when adding new packages

## 9. Cleanup

- [x] 9.1 Verify no orphaned code from removed steps
- [x] 9.2 Ensure proper step ordering (detection → tests → coverage uploads → test-results uploads → build → bundle analysis)
- [x] 9.3 Verify all cache steps are properly positioned (restore early, save late)
- [x] 9.4 Run `openspec validate optimize-codecov-uploads --strict` and fix any issues
- [x] 9.5 Update tasks.md to reflect actual implementation approach
- [x] 9.6 Mark all implementation tasks complete before creating PR
