# test-analytics Specification

## Purpose
TBD - created by archiving change add-codecov. Update Purpose after archive.
## Requirements
### Requirement: CI workflow MUST upload test results to Codecov Test Analytics

The GitHub Actions CI workflow MUST upload test results in JUnit XML format to Codecov Test Analytics to track test failures, flaky tests, and performance metrics.

#### Scenario: Test results uploaded on pull requests

**Given** a pull request triggers the CI workflow
**When** tests complete (whether passing or failing)
**Then** the workflow uploads JUnit XML test results to Codecov
**And** Codecov displays test results in the PR comment
**And** Failed tests show stack traces and error details
**And** Test Analytics data is available in Codecov dashboard

#### Scenario: Test results uploaded on main branch pushes

**Given** code is pushed to the main branch
**When** tests complete
**Then** the workflow uploads JUnit XML test results to Codecov
**And** Codecov establishes baseline test metrics for the main branch
**And** Test Analytics data is retained for 60 days

#### Scenario: Upload occurs even when tests fail

**Given** the CI workflow runs tests
**When** one or more tests fail
**Then** the workflow still uploads test results to Codecov
**And** the upload step uses `if: ${{ !cancelled() }}` condition
**And** failed test data is captured for analysis

---

### Requirement: Test results MUST be in JUnit XML format

Vitest MUST be configured to generate test results in JUnit XML format, which is the only format supported by Codecov Test Analytics.

#### Scenario: Vitest generates JUnit XML reports

**Given** Vitest is configured with the JUnit reporter
**When** tests run via `pnpm exec nx affected -t test:unit` or `pnpm exec nx run-many -t test:unit`
**Then** Vitest generates JUnit XML files in each package's test output directory
**And** the XML files include test names, classnames, and timing data
**And** the XML files match Codecov's expected JUnit schema

#### Scenario: JUnit reporter works alongside coverage reporters

**Given** Vitest is configured with both default and JUnit reporters
**When** tests run with coverage enabled
**Then** Vitest outputs both coverage reports (lcov) and test results (JUnit XML)
**And** both reporters work simultaneously without conflicts
**And** coverage uploads and test result uploads occur independently

#### Scenario: Multiple packages generate separate test result files

**Given** the monorepo contains multiple packages
**When** affected or all tests run
**Then** each package generates its own JUnit XML file in its test output directory
**And** the CI workflow uploads all JUnit files matching the pattern
**And** Codecov aggregates test results across all packages

---

### Requirement: Test Analytics MUST track per-package test results using flags

Test results MUST be uploaded with the same per-package flags used for coverage reporting to enable independent test tracking for each package.

#### Scenario: Each package flag associates test results with package

**Given** test results are uploaded with flags (react-hooks, react-clean, is-even, is-odd, ts-configs)
**When** a user views Test Analytics in Codecov dashboard
**Then** test results are organized by package flags
**And** each package's test metrics are displayed independently
**And** the global view shows aggregated test metrics across all packages

#### Scenario: Test failures are visible per-package

**Given** tests fail in a specific package (e.g., react-hooks)
**When** the user views Test Analytics for the react-hooks flag
**Then** only failures from the react-hooks package are displayed
**And** other package test results do not interfere with the view
**And** package-specific failure rates and metrics are accurate

---

### Requirement: Test Analytics MUST identify and track flaky tests

Codecov Test Analytics MUST detect tests that pass and fail inconsistently across runs and mark them as flaky.

#### Scenario: Flaky tests detected across multiple runs

**Given** a test passes on some CI runs and fails on others
**When** Codecov Test Analytics analyzes test history
**Then** the test is identified as flaky
**And** the flaky test is highlighted in the dashboard
**And** the flaky test rate is calculated and displayed

#### Scenario: Flaky tests displayed in PR comments

**Given** a pull request triggers tests that include known flaky tests
**When** Codecov generates a PR comment
**Then** the comment includes information about flaky tests
**And** flaky tests are distinguished from consistent failures
**And** developers can see which test failures may be unreliable

---

### Requirement: Test Analytics MUST display test performance metrics in Codecov dashboard

Codecov dashboard MUST display detailed test performance metrics including run duration, failure rates, and stack traces.

#### Scenario: Test run duration tracked over time

**Given** test results are uploaded on each commit
**When** a user views Test Analytics in Codecov dashboard
**Then** the dashboard displays average test run duration per test
**And** the dashboard shows trends in test execution time over commits
**And** slow tests are identifiable for optimization

#### Scenario: Failure rates displayed per test

**Given** a test has failed on some commits and passed on others
**When** a user views Test Analytics for that test
**Then** the dashboard displays the test's failure rate (percentage)
**And** the dashboard shows the number of commits where the test failed
**And** the failure history is visible across the retention period (60 days)

#### Scenario: Stack traces available for failed tests

**Given** a test fails in a CI run
**When** a user views the failed test in Test Analytics
**Then** the dashboard displays the stack trace from the failure
**And** the error message is clearly visible
**And** the stack trace helps developers diagnose the root cause

---

### Requirement: Test Analytics integration MUST NOT slow down CI significantly

Test result uploads MUST be efficient and not add significant overhead to CI runs.

#### Scenario: JUnit XML generation completes quickly

**Given** tests complete in the CI workflow
**When** Vitest generates JUnit XML reports
**Then** the XML generation adds less than 5 seconds to test execution time
**And** the overhead is negligible compared to test run time
**And** CI performance is not degraded

#### Scenario: Test result upload is non-blocking

**Given** JUnit XML files have been generated
**When** the upload to Codecov Test Analytics occurs
**Then** the upload completes within 10 seconds
**And** upload failures do not block the CI workflow
**And** the workflow continues successfully even if Codecov is unavailable

#### Scenario: Test result uploads occur on both PRs and main branch

**Given** a commit is pushed or a PR is created
**When** the CI workflow runs tests
**Then** test results are uploaded for both PR and main branch runs
**And** PR uploads provide immediate feedback on test failures
**And** main branch uploads establish baselines for comparison

### Requirement: CI workflow MUST use Nx affected detection for test results uploads

The GitHub Actions CI workflow MUST use the same Nx affected detection for test results uploads as coverage uploads, ensuring consistency across all Codecov data types.

#### Scenario: Test results upload uses shared detection step

**Given** the detection step has identified affected packages
**When** the test results upload script runs
**Then** the script references the same detection step outputs used by coverage uploads
**And** uploads test results only for packages marked as affected
**And** maintains the same affected vs non-affected logic as coverage uploads

#### Scenario: Affected package uploads test results

**Given** the detection step identified react-clean as affected
**When** the test results upload script runs
**Then** the script uploads test results for react-clean
**And** the upload uses the package-specific flag "react-clean"
**And** the upload includes the JUnit XML file from packages/react-clean/test-results.junit.xml

#### Scenario: Non-affected package skips test results upload

**Given** the detection step identified ts-configs as not affected
**When** the test results upload script runs
**Then** the script skips upload for ts-configs
**And** the workflow logs indicate "Skipping test results upload for ts-configs (not affected by PR)"

#### Scenario: Protected branches upload all test results

**Given** code is pushed to main, develop, or pre branch
**When** tests complete
**Then** the test results upload script uploads all 5 packages unconditionally
**And** this establishes a complete baseline for test analytics

---

### Requirement: Test results upload script MUST consolidate individual package steps

The test results upload MUST use a single bash script that loops through packages instead of individual GitHub Actions steps per package.

#### Scenario: Single script uploads multiple affected package test results

**Given** react-hooks and is-even are affected by a pull request
**When** the test results upload script runs
**Then** the script processes all 5 packages in a loop
**And** uploads test results for react-hooks and is-even
**And** skips test results for react-clean, is-odd, and ts-configs
**And** logs a summary: "Uploaded test results for 2 packages, skipped 3 packages"

#### Scenario: Script uses codecov test-results CLI

**Given** the test results upload script needs to upload a package
**When** the upload executes
**Then** the script uses `npx codecov@latest upload-test-results` command
**And** passes the test results file path with `--file` flag
**And** passes the package flag with `--flag` parameter
**And** uses `--fail-on-error=false` for non-blocking uploads
**And** authenticates with `CODECOV_TOKEN` environment variable

#### Scenario: Script runs even when tests fail

**Given** tests failed for react-hooks
**When** the test results upload script runs
**Then** the script still processes react-hooks
**And** uploads the test results including failure data
**And** Test Analytics captures the failures for flaky test detection
**And** the script uses `if: ${{ !cancelled() }}` to ensure execution

---

### Requirement: Test results uploads MUST maintain same package selection as coverage uploads

The packages uploading test results MUST be identical to the packages uploading coverage to ensure data consistency in Codecov.

#### Scenario: Same affected packages upload both coverage and test results

**Given** react-hooks is affected and uploaded coverage
**When** the test results upload script runs
**Then** react-hooks also uploads test results
**And** both uploads use the same "react-hooks" flag
**And** Codecov associates the test results with the coverage data

#### Scenario: Non-affected packages skip both uploads

**Given** is-odd is not affected and skipped coverage upload
**When** the test results upload script runs
**Then** is-odd also skips test results upload
**And** consistency is maintained across all Codecov data types

