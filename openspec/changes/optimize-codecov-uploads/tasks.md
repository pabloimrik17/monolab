# Implementation Tasks

## 1. Add Affected Detection Step

- [x] 1.1 Add detection step after test execution (after line ~111 in ci.yml)
- [x] 1.2 Configure step to only run on PRs (`if: ${{ github.event_name == 'pull_request' }}`)
- [x] 1.3 Call `pnpm exec nx show projects --affected` once and store in variable
- [x] 1.4 Loop through packages (react-hooks, react-clean, is-even, is-odd, ts-configs) and generate boolean outputs
- [x] 1.5 Use grep to check if `@monolab/<package>` is in affected list
- [x] 1.6 Export outputs to `$GITHUB_OUTPUT` with format `<package>=true|false`
- [x] 1.7 Assign step ID `affected-codecov` for later reference

## 2. Consolidate Coverage Uploads

- [x] 2.1 Remove 5 individual `codecov/codecov-action` steps (lines 114-152)
- [x] 2.2 Create single upload script step with name "📊 Upload coverage to Codecov (affected packages)"
- [x] 2.3 Add `if: ${{ !cancelled() }}` condition to run even if tests fail
- [x] 2.4 Pass affected detection outputs as environment variables (AFFECTED_REACT_HOOKS, etc.)
- [x] 2.5 Create bash associative array mapping package names to affected status
- [x] 2.6 Loop through all 5 packages
- [x] 2.7 Add conditional logic: skip if PR and not affected, always upload if push to main/develop/pre
- [x] 2.8 Check if coverage file exists before upload attempt
- [x] 2.9 Use codecov CLI (`npx codecov@latest upload-process`) instead of GitHub Action
- [x] 2.10 Add clear logging with emoji indicators (📊 for upload, ⏭️ for skip, ⚠️ for warnings)
- [x] 2.11 Count uploads vs skips and log summary at end
- [x] 2.12 Use `--fail-on-error=false` for non-blocking uploads

## 3. Consolidate Test Results Uploads

- [x] 3.1 Remove 5 individual `codecov/test-results-action` steps (lines 155-193)
- [x] 3.2 Create single upload script step with name "📊 Upload test results to Codecov (affected packages)"
- [x] 3.3 Add `if: ${{ !cancelled() }}` condition (critical for capturing test failures)
- [x] 3.4 Pass same affected detection outputs as environment variables
- [x] 3.5 Create bash associative array (same pattern as coverage)
- [x] 3.6 Loop through all 5 packages with same conditional logic
- [x] 3.7 Check if test results file exists (`test-results.junit.xml`)
- [x] 3.8 Use codecov test-results CLI (`npx codecov@latest upload-test-results`)
- [x] 3.9 Add same logging pattern as coverage script
- [x] 3.10 Count and log summary

## 4. Refactor Bundle Size Upload

- [x] 4.1 Update existing bundle size step (lines 225-240) to use affected detection
- [x] 4.2 Add same environment variables for affected outputs
- [x] 4.3 Create associative array in existing bash script
- [x] 4.4 Add conditional check before each package analysis: skip if PR and not affected
- [x] 4.5 Keep existing `dist` directory check
- [x] 4.6 Add skip logging for non-affected packages
- [x] 4.7 Maintain push-to-main behavior (always upload all)
- [x] 4.8 Keep `continue-on-error: true` for non-blocking behavior

## 5. Testing & Validation

- [ ] 5.1 Create test PR that modifies only one package (e.g., react-hooks)
- [ ] 5.2 Verify detection step outputs show only that package as affected
- [ ] 5.3 Verify coverage upload logs show 1 upload, 4 skips
- [ ] 5.4 Verify test results upload logs show 1 upload, 4 skips
- [ ] 5.5 Verify bundle size logs show 1 upload, 4 skips
- [ ] 5.6 Check Codecov PR comment shows affected package delta + non-affected "no change"
- [ ] 5.7 Verify carryforward works for non-affected packages
- [ ] 5.8 Verify no "100% increase" false positives for bundle sizes
- [ ] 5.9 Create test PR modifying shared dependency to verify multiple packages affected
- [ ] 5.10 Push to main and verify all 5 packages upload (baseline establishment)
- [ ] 5.11 Verify workflow completes 75-150s faster on single-package PRs

## 6. Documentation

- [x] 6.1 Add inline comments to detection step explaining its purpose
- [x] 6.2 Add comment to consolidated scripts explaining conditional logic
- [x] 6.3 Update openspec/project.md to document new upload strategy
- [x] 6.4 Add note about updating scripts when adding new packages

## 7. Cleanup

- [x] 7.1 Verify no orphaned code from removed steps
- [x] 7.2 Ensure proper step ordering (detection → tests → uploads → build)
- [x] 7.3 Run `openspec validate optimize-codecov-uploads --strict` and fix any issues
- [x] 7.4 Mark all tasks complete before archiving change
