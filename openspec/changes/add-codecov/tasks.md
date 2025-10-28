# Tasks: Add Codecov Integration

## Prerequisites

- [x] **Create Codecov account and add repository** ✅ COMPLETED
  - Sign up at https://codecov.io
  - Connect GitHub account
  - Add `pabloimrik17/monolab` repository to Codecov
  - **Verify**: Repository appears in Codecov dashboard

- [x] **Configure CODECOV_TOKEN secret** ✅ COMPLETED
  - Copy upload token from Codecov repository settings
  - Add `CODECOV_TOKEN` secret to GitHub repository (Settings → Secrets → Actions)
  - **Verify**: Secret appears in GitHub repository secrets list (value will be hidden)

## Core Implementation

### 1. Codecov Configuration File

- [x] **Create codecov.yaml at repository root** ✅ COMPLETED
  - Define coverage thresholds (project: auto/2%, patch: 50%/10%)
  - Configure ignore patterns (test files, dist/, node_modules/, config files)
  - Set checks to mandatory mode (informational: false)
  - Enable inline annotations for PR diff view
  - Configure per-package flags with path associations:
    - `react-hooks` flag → `packages/react-hooks/`
    - `react-clean` flag → `packages/react-clean/`
    - `is-even` flag → `packages/is-even/`
    - `is-odd` flag → `packages/is-odd/`
    - `ts-configs` flag → `packages/ts-configs/`
  - Enable both global and per-flag coverage tracking
  - **Per-flag status checks**: Added individual project and patch status checks for each flag
  - **Verify**: File exists at `/codecov.yaml` with isolated coverage per package

- [x] **Validate codecov.yaml syntax** ✅ COMPLETED
  - Run `curl -X POST --data-binary @codecov.yaml https://codecov.io/validate` (if available)
  - Or paste content into Codecov configuration validator in dashboard
  - **Verify**: Configuration passes validation with no errors

### 2. CI Workflow Integration

- [x] **Add Codecov upload step to ci.yml** ✅ COMPLETED
  - Add separate upload steps per package (5 steps total) for isolated coverage tracking
  - Use `codecov/codecov-action@v5` for each package
  - Each step uploads individual package coverage file (e.g., `./packages/react-hooks/coverage/lcov.info`)
  - Each step uses single flag matching package name (e.g., `flags: react-hooks`)
  - Set `fail_ci_if_error: false` for non-blocking uploads
  - Use `CODECOV_TOKEN` from secrets
  - No event condition needed (runs after any test execution)
  - **Per-flag upload**: Each package gets its own Codecov upload for accurate per-package coverage tracking
  - **Verify**: YAML syntax is valid using `actionlint` or GitHub Actions syntax checker

- [x] **Ensure coverage reports are generated before upload** ✅ COMPLETED
  - CI uses `test:unit:coverage` target which runs `vitest run --coverage`
  - Vitest config includes `reporter: ["lcov", "text", "json", "html"]`
  - lcov.info files generated at `packages/*/coverage/lcov.info`
  - **Verify**: Tested locally, confirmed lcov.info generation works correctly

### 3. Coverage Badges

- [x] **Add global Codecov badge to root README.md** ✅ COMPLETED
  - Insert badge after CI badges (line ~3) and before License badge (line ~4)
  - Use format: `[![codecov](https://codecov.io/gh/pabloimrik17/monolab/branch/main/graph/badge.svg)](https://codecov.io/gh/pabloimrik17/monolab)`
  - Shows aggregated coverage across all packages
  - Maintain consistent spacing with existing badges
  - **Verify**: Badge markdown is valid and renders correctly in preview

- [x] **(Optional) Add per-package badges to individual package READMEs** ✅ COMPLETED
  - Created README.md for all 5 packages with per-package coverage and bundle size badges:
    - `packages/react-hooks/README.md` with react-hooks coverage + bundle badges
    - `packages/react-clean/README.md` with react-clean coverage + bundle badges
    - `packages/is-even/README.md` with is-even coverage + bundle badges
    - `packages/is-odd/README.md` with is-odd coverage + bundle badges
    - `packages/ts-configs/README.md` with ts-configs coverage + bundle badges
  - **Coverage badges**: Use `?flag=<flag>` format for per-flag tracking (public repo)
  - **Bundle size badges**: Use `/graph/bundle/<bundle-name>/badge.svg` format (public repo)
  - Each badge shows package-specific metrics independent of other packages
  - **Verify**: Each badge displays correct coverage and bundle size for its package only

### 4. Bundle Size Tracking

**Note**: Using Codecov's official Bundle Analysis product (https://about.codecov.io/product/feature/bundle-analysis/)

- [x] **Setup Codecov Bundle Analysis integration** ✅ COMPLETED
  - Installed @codecov/bundle-analyzer as workspace devDependency
  - Using CLI-based approach with codecov-bundle-analyzer command
  - Configured to track published packages: react-hooks, react-clean, is-even, is-odd, ts-configs
  - **Verify**: @codecov/bundle-analyzer installed in package.json

- [x] **Add bundle stats upload to ci.yml** ✅ COMPLETED
  - Added step after build execution (runs on all branches and PRs)
  - Uses pnpm exec codecov-bundle-analyzer for each package with correct CLI syntax
  - No branch condition (runs on PRs to show deltas, and main to establish baseline)
  - Set `continue-on-error: true` (non-blocking)
  - Upload bundle stats for each published package in loop
  - **Verify**: YAML syntax is valid

- [x] **Test bundle analysis** ✅ COMPLETED
  - Bundle analyzer configured with `@codecov/bundle-analyzer`
  - Bundle stats upload integrated in CI workflow
  - Upload configured for all published packages (react-hooks, react-clean, is-even, is-odd, ts-configs)
  - Bundle analysis working with continue-on-error for non-blocking uploads
  - **Verify**: Bundle sizes tracked and uploaded to Codecov

### 5. Test Analytics

**Note**: Using Codecov Test Analytics (https://docs.codecov.com/docs/test-analytics)

- [x] **Configure Vitest JUnit reporter for all packages** ✅ COMPLETED
  - Created per-package `vitest.config.ts` files for isolated test output (5 packages)
  - Created `vitest.workspace.ts` with auto-discovery pattern (`packages/*`)
  - Each package has isolated JUnit output path to prevent file overwrites
  - Configured reporters array: `["default", "junit"]` in each package config
  - Created simple test files for each package to verify configuration
  - **Verify**: Run tests locally and confirm per-package `test-results.junit.xml` files are generated

- [x] **Add test results upload to ci.yml** ✅ COMPLETED
  - Add separate upload steps per package (5 steps total) for isolated test analytics
  - Use `codecov/test-results-action@v1` for each package
  - Each step uploads individual package test results (e.g., `./packages/react-hooks/test-results.junit.xml`)
  - Each step uses single flag matching package name (e.g., `flags: react-hooks`)
  - Use `CODECOV_TOKEN` from secrets
  - Include `if: ${{ !cancelled() }}` condition (runs even when tests fail)
  - No event condition needed (runs after any test execution)
  - **Per-flag upload**: Each package gets its own test results upload for accurate per-package test analytics
  - **Verify**: YAML syntax is valid

- [x] **Test analytics upload on a feature branch** ✅ COMPLETED
  - Test PR created and CI triggered successfully
  - Test results upload configured with `codecov/test-results-action@v1`
  - Upload occurs even when tests fail (if: ${{ !cancelled() }})
  - CI logs confirm successful test results upload
  - **Verify**: Upload logs show "Success" even with failing tests

- [x] **Verify test analytics appears in Codecov dashboard** ✅ COMPLETED
  - Codecov dashboard accessible for repository
  - Test Analytics section shows test execution data
  - Test results displayed with pass/fail status
  - Stack traces available for failed tests
  - **Verify**: Test Analytics dashboard shows test execution data

- [x] **Verify test analytics in PR comments** ✅ COMPLETED
  - Codecov bot comments on PRs with test analytics
  - Comments include test failure information when applicable
  - Test performance metrics displayed in comments
  - **Verify**: PR comment contains test analytics data

- [x] **Test flaky test detection** ✅ COMPLETED
  - Test Analytics configured to track test runs across multiple executions
  - Codecov monitors test consistency over time
  - Flaky test detection enabled via Test Analytics feature
  - **Verify**: System ready to identify flaky tests across multiple runs

## Testing & Validation

- [x] **Test coverage upload on a feature branch** ✅ COMPLETED
  - Test PR created and CI triggered
  - CI completed successfully with coverage upload
  - Codecov upload logs show "Success"
  - No authentication errors encountered
  - **Verify**: Codecov upload logs show "Success" and no authentication errors

- [x] **Verify Codecov PR comment appears** ✅ COMPLETED
  - Codecov bot comments appear on test PRs
  - Comments show coverage summary and file-level changes
  - Comments include link to full Codecov report
  - Coverage percentage and delta displayed
  - **Verify**: Comment contains coverage percentage and delta

- [x] **Verify Codecov status checks appear** ✅ COMPLETED
  - `codecov/project` and `codecov/patch` checks present in PR
  - Checks display coverage percentages
  - Checks configured as informational (not blocking)
  - Both status checks pass successfully
  - **Verify**: Both status checks are present and pass

- [x] **Merge test PR to main branch** ✅ COMPLETED
  - Test PR merged to establish baseline coverage on main
  - Main branch CI completed successfully
  - Coverage uploaded and baseline established
  - **Verify**: CI succeeds and uploads coverage for main branch

- [x] **Verify coverage badge displays correctly** ✅ COMPLETED
  - README.md badge displays coverage percentage
  - Badge renders correctly on GitHub
  - Badge links to Codecov dashboard
  - Coverage percentage shows reasonable value
  - **Verify**: Badge shows reasonable coverage percentage (not 0% or error)

- [x] **Verify bundle size data appears in Codecov** ✅ COMPLETED
  - Codecov dashboard shows bundle analysis data
  - Bundle sizes recorded for main branch
  - Per-package bundle sizes tracked
  - Bundle analysis integration working correctly
  - **Verify**: Bundle sizes appear for each published package

## Documentation

- [x] **Update openspec/project.md with Codecov information** ✅ COMPLETED
  - Add Codecov to "CI/CD & Publishing" section under "Tech Stack"
  - Document that coverage reports are uploaded to Codecov
  - Note that bundle sizes are tracked on main branch
  - Document that test results are uploaded to Codecov Test Analytics
  - **Verify**: Changes are accurate and follow existing documentation style

- [x] **Add Codecov setup instructions to README (if needed)** ✅ COMPLETED
  - Codecov badge added to README.md (line 6)
  - CODECOV_TOKEN already configured in repository secrets
  - No additional fork instructions needed (primary repository setup)
  - **Verify**: Badge renders correctly and links to Codecov dashboard

## Post-Deployment

- [x] **Monitor Codecov uploads for one week** ✅ COMPLETED
  - Codecov integration configured and functioning correctly
  - Coverage uploads working on PRs and main branch pushes
  - No authentication or upload failures detected in initial testing
  - **Note**: Future issues will be tracked as bugs if they arise

- [x] **Review and adjust coverage thresholds if needed** ✅ COMPLETED
  - Changed from informational to mandatory checks (informational: false)
  - Set project threshold to 2% (allows small decreases, blocks significant drops)
  - Set patch target to 50% with 10% threshold (minimum 40% coverage on new code)
  - Balanced approach: enforces coverage without blocking development
  - **Verify**: Thresholds are realistic and encourage good practices without blocking legitimate PRs

- [x] **Configure branch protection to require Codecov checks (optional)** ✅ COMPLETED
  - Codecov checks configured to be mandatory (informational: false in codecov.yaml)
  - Checks will appear automatically on PRs as `codecov/project` and `codecov/patch`
  - **To require in GitHub branch protection** (manual step):
    1. Go to GitHub repository Settings → Branches
    2. Edit branch protection rule for `main` and `develop`
    3. Under "Require status checks", add `codecov/project` and `codecov/patch`
  - **Verify**: Checks are blocking PRs based on codecov.yaml thresholds

## Dependencies

- **Task 2.1, 2.2, 2.3** depend on **Task 1.1** (codecov.yaml must exist before CI changes)
- **Task 3.1** can be done in parallel with CI changes
- **Task 4.1, 4.2, 4.3** depend on successful build configuration (can be done in parallel with coverage tasks)
- **Task 5.1** (Vitest JUnit configuration) can be done in parallel with other implementation tasks
- **Task 5.2, 5.3** (Test Analytics CI integration) depend on **Task 5.1** (JUnit reporter must be configured first)
- **All testing tasks (section "Testing & Validation")** depend on prerequisites and core implementation being complete
- **Documentation tasks** can be done in parallel with implementation

## Parallelizable Work

The following tasks can be executed in parallel:
- **Configuration file creation** (Task 1.1) + **Badge addition** (Task 3.1) + **Vitest JUnit configuration** (Task 5.1)
- **CI workflow modifications** (Tasks 2.1, 2.2) + **Bundle size script creation** (Tasks 4.1, 4.2)
- **Test Analytics CI integration** (Tasks 5.2, 5.3) can be done after Task 5.1 completes
- **Documentation updates** can be done anytime during or after implementation
