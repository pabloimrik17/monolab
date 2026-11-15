# Spec Delta

## MODIFIED Requirements

### Requirement: Test results MUST be in JUnit XML format

Vitest MUST be configured to generate test results in JUnit XML format, which is the only format supported by Codecov Test Analytics.

#### Scenario: Vitest generates JUnit XML reports

**Given** Vitest is configured with the JUnit reporter
**When** tests run via `pnpm exec nx affected -t test:coverage` or `pnpm exec nx run-many -t test:coverage`
**Then** Vitest generates JUnit XML files in each package's test output directory
**And** the XML files include the results of every kind of test the package runs
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
