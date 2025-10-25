# Tasks: Add Codecov Integration

## Prerequisites

- [ ] **Create Codecov account and add repository**
  - Sign up at https://codecov.io
  - Connect GitHub account
  - Add `pabloimrik17/monolab` repository to Codecov
  - **Verify**: Repository appears in Codecov dashboard

- [ ] **Configure CODECOV_TOKEN secret**
  - Copy upload token from Codecov repository settings
  - Add `CODECOV_TOKEN` secret to GitHub repository (Settings → Secrets → Actions)
  - **Verify**: Secret appears in GitHub repository secrets list (value will be hidden)

## Core Implementation

### 1. Codecov Configuration File

- [x] **Create codecov.yaml at repository root** ✅ COMPLETED
  - Define coverage thresholds (project: auto/5%, patch: 70%/5%)
  - Configure ignore patterns (test files, dist/, node_modules/, config files)
  - Set checks to informational mode initially
  - Enable inline annotations for PR diff view
  - Configure per-package flags with path associations:
    - `react-hooks` flag → `packages/react-hooks/`
    - `react-clean` flag → `packages/react-clean/`
    - `is-even` flag → `packages/is-even/`
    - `is-odd` flag → `packages/is-odd/`
    - `ts-configs` flag → `packages/ts-configs/`
  - Enable both global and per-flag coverage tracking
  - **Verify**: File exists at `/codecov.yaml`

- [x] **Validate codecov.yaml syntax** ✅ COMPLETED
  - Run `curl -X POST --data-binary @codecov.yaml https://codecov.io/validate` (if available)
  - Or paste content into Codecov configuration validator in dashboard
  - **Verify**: Configuration passes validation with no errors

### 2. CI Workflow Integration

- [x] **Add Codecov upload step to ci.yml (after PR tests)** ✅ COMPLETED
  - Add step after "Execute test checks for affected files (Affected)" (line ~96)
  - Use `codecov/codecov-action@v5`
  - Configure to upload files matching `./packages/*/coverage/lcov.info,./apps/*/coverage/lcov.info`
  - Add flags parameter: `flags: react-hooks,react-clean,is-even,is-odd,ts-configs`
  - Set `fail_ci_if_error: false` for non-blocking uploads
  - Use `CODECOV_TOKEN` from secrets
  - Include `if: ${{ github.event_name == 'pull_request' }}` condition
  - **Verify**: YAML syntax is valid using `actionlint` or GitHub Actions syntax checker

- [x] **Add Codecov upload step to ci.yml (after main branch tests)** ✅ COMPLETED
  - Add step after "Execute test checks for all files (All)" (line ~100)
  - Use same configuration as PR upload step (including flags)
  - Include `if: ${{ github.event_name == 'push' }}` condition
  - **Verify**: YAML syntax is valid

- [ ] **Ensure coverage reports are generated before upload**
  - Confirm test commands include `--coverage` flag (already configured in existing CI)
  - Confirm lcov.info files are generated in expected locations
  - **Verify**: Run `pnpm exec nx affected -t test:unit -- --coverage` locally and check for `coverage/lcov.info` files

### 3. Coverage Badges

- [x] **Add global Codecov badge to root README.md** ✅ COMPLETED
  - Insert badge after CI badges (line ~3) and before License badge (line ~4)
  - Use format: `[![codecov](https://codecov.io/gh/pabloimrik17/monolab/branch/main/graph/badge.svg)](https://codecov.io/gh/pabloimrik17/monolab)`
  - Shows aggregated coverage across all packages
  - Maintain consistent spacing with existing badges
  - **Verify**: Badge markdown is valid and renders correctly in preview

- [ ] **(Optional) Add per-package badges to individual package READMEs**
  - For each package with a README (e.g., `packages/react-hooks/README.md`):
    - Add flag-specific badge: `[![react-hooks coverage](https://codecov.io/gh/pabloimrik17/monolab/branch/main/graph/badge.svg?flag=react-hooks)](https://codecov.io/gh/pabloimrik17/monolab?flag=react-hooks)`
    - Replace `react-hooks` with appropriate package name in URL
  - Shows package-specific coverage independent of other packages
  - **Verify**: Each badge displays correct coverage for its package only

### 4. Bundle Size Tracking

**Note**: Using Codecov's official Bundle Analysis product (https://about.codecov.io/product/feature/bundle-analysis/)

- [x] **Setup Codecov Bundle Analysis integration** ✅ COMPLETED
  - Installed @codecov/bundle-analyzer as workspace devDependency
  - Using CLI-based approach with codecov-bundle-analyzer command
  - Configured to track published packages: react-hooks, react-clean, is-even, is-odd, ts-configs
  - **Verify**: @codecov/bundle-analyzer installed in package.json

- [x] **Add bundle stats upload to ci.yml** ✅ COMPLETED
  - Added step after "Execute build checks for all files (All)" (line ~130)
  - Uses pnpm exec codecov-bundle-analyzer for each package
  - Includes `if: ${{ github.ref == 'refs/heads/main' }}` condition (only on main branch)
  - Set `continue-on-error: true` (non-blocking)
  - Upload bundle stats for each published package in loop
  - **Verify**: YAML syntax is valid

- [ ] **Test bundle analysis** (Requires main branch push with CODECOV_TOKEN configured)
  - Trigger CI on main branch
  - Verify bundle stats are uploaded to Codecov
  - Check Codecov dashboard for bundle analysis data
  - **Verify**: Bundle sizes appear for each tracked package

### 5. Test Analytics

**Note**: Using Codecov Test Analytics (https://docs.codecov.com/docs/test-analytics)

- [ ] **Configure Vitest JUnit reporter for all packages**
  - Update each package's Vitest configuration to include JUnit reporter
  - For each package in `packages/*/project.json`:
    - Locate test target configuration
    - Add JUnit reporter to reporters array: `["default", "junit"]`
    - Configure outputFile to `test-results.junit.xml` in package root
  - Ensure JUnit reporter runs alongside default reporter (multiple reporters)
  - **Verify**: Run tests locally and confirm `test-results.junit.xml` files are generated

- [ ] **Add test results upload to ci.yml (after PR tests)**
  - Add step after "Upload coverage to Codecov (Affected)" (line ~107)
  - Use `codecov/test-results-action@v1`
  - Configure to upload files matching `./packages/*/test-results.junit.xml,./apps/*/test-results.junit.xml`
  - Add flags parameter: `flags: react-hooks,react-clean,is-even,is-odd,ts-configs`
  - Use `CODECOV_TOKEN` from secrets
  - Include `if: ${{ !cancelled() }}` condition (runs even when tests fail)
  - **Verify**: YAML syntax is valid

- [ ] **Add test results upload to ci.yml (after main branch tests)**
  - Add step after "Upload coverage to Codecov (All)" (line ~121)
  - Use same configuration as PR upload step (including flags)
  - Include `if: ${{ !cancelled() && github.event_name == 'push' }}` condition
  - **Verify**: YAML syntax is valid

- [ ] **Test analytics upload on a feature branch**
  - Create test PR from feature branch
  - Intentionally introduce a failing test to verify failure capture
  - Push commit to trigger CI
  - Wait for CI to complete (tests may fail, upload should still occur)
  - Check CI logs for successful test results upload
  - **Verify**: Upload logs show "Success" even with failing tests

- [ ] **Verify test analytics appears in Codecov dashboard**
  - View Codecov dashboard for the repository
  - Navigate to Test Analytics section
  - Confirm test results are displayed with pass/fail status
  - Verify stack traces are available for failed tests
  - **Verify**: Test Analytics dashboard shows test execution data

- [ ] **Verify test analytics in PR comments**
  - Check test PR for Codecov bot comment
  - Confirm comment includes test failure information (if tests failed)
  - Verify test performance metrics are displayed
  - **Verify**: PR comment contains test analytics data

- [ ] **Test flaky test detection** (Long-term verification)
  - Monitor test runs over multiple CI executions
  - Identify any tests that intermittently fail
  - Verify Codecov marks these tests as flaky in dashboard
  - **Verify**: Flaky test indicator appears in Test Analytics after multiple runs

## Testing & Validation

- [ ] **Test coverage upload on a feature branch**
  - Create test PR from feature branch
  - Push commit to trigger CI
  - Wait for CI to complete
  - Check CI logs for successful Codecov upload
  - **Verify**: Codecov upload logs show "Success" and no authentication errors

- [ ] **Verify Codecov PR comment appears**
  - Check test PR for Codecov bot comment
  - Confirm comment shows coverage summary and file-level changes
  - Confirm comment includes link to full report
  - **Verify**: Comment contains coverage percentage and delta

- [ ] **Verify Codecov status checks appear**
  - Check test PR checks section for `codecov/project` and `codecov/patch` checks
  - Confirm checks show coverage percentages
  - Confirm checks are informational (not blocking)
  - **Verify**: Both status checks are present and pass

- [ ] **Merge test PR to main branch**
  - Merge the test PR to establish baseline coverage on main
  - Wait for main branch CI to complete
  - **Verify**: CI succeeds and uploads coverage for main branch

- [ ] **Verify coverage badge displays correctly**
  - View README.md on GitHub main branch
  - Confirm Codecov badge displays coverage percentage
  - Click badge to verify it links to Codecov dashboard
  - **Verify**: Badge shows reasonable coverage percentage (not 0% or error)

- [ ] **Verify bundle size data appears in Codecov**
  - View Codecov dashboard for the repository
  - Navigate to bundle analysis section (if available in UI)
  - Confirm bundle sizes are recorded for main branch
  - **Verify**: Bundle sizes appear for each published package

## Documentation

- [ ] **Update openspec/project.md with Codecov information**
  - Add Codecov to "CI/CD & Publishing" section under "Tech Stack"
  - Document that coverage reports are uploaded to Codecov
  - Note that bundle sizes are tracked on main branch
  - Document that test results are uploaded to Codecov Test Analytics
  - **Verify**: Changes are accurate and follow existing documentation style

- [ ] **Add Codecov setup instructions to README (if needed)**
  - Document that `CODECOV_TOKEN` must be configured for forks
  - Explain how to view coverage reports on Codecov dashboard
  - **Verify**: Instructions are clear and actionable for contributors

## Post-Deployment

- [ ] **Monitor Codecov uploads for one week**
  - Check that coverage uploads succeed on every PR and main branch push
  - Monitor for any authentication or upload failures
  - **Verify**: No recurring errors in Codecov upload logs

- [ ] **Review and adjust coverage thresholds if needed**
  - Review actual coverage levels across packages
  - Adjust thresholds in codecov.yaml based on observed patterns
  - Consider enabling strict mode (remove informational flag) if coverage is stable
  - **Verify**: Thresholds are realistic and do not block legitimate PRs

- [ ] **Configure branch protection to require Codecov checks (optional)**
  - In GitHub repository settings, edit main branch protection
  - Add `codecov/project` and `codecov/patch` to required status checks
  - **Verify**: Branch protection settings show Codecov checks as required

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
