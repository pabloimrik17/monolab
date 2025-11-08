# Spec: Test Analytics

## ADDED Requirements

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

