# Spec: Codecov Configuration

## ADDED Requirements

### Requirement: Codecov configuration file MUST define coverage thresholds

A `codecov.yaml` file at the repository root MUST configure coverage quality gates.

#### Scenario: Project coverage threshold allows gradual improvement

**Given** the monorepo has packages with varying coverage levels
**When** Codecov evaluates overall project coverage
**Then** it uses `target: auto` to maintain current coverage level
**And** it allows up to 5% coverage decrease without failing
**And** it does not block pull requests for small coverage drops

#### Scenario: Patch coverage threshold enforces testing for new code

**Given** a pull request adds or modifies code
**When** Codecov evaluates coverage of changed lines (patch coverage)
**Then** it requires at least 70% of new/changed lines to be covered by tests
**And** it allows up to 5% below the target threshold
**And** it fails the status check if patch coverage is below 65%

#### Scenario: Configuration allows informational status instead of blocking

**Given** the project is starting to track coverage
**When** Codecov is configured
**Then** coverage checks are set to `informational: true` initially
**And** status checks do not block pull request merges
**And** coverage information is still displayed in PR comments

---

### Requirement: Configuration MUST ignore non-production files

Codecov MUST exclude certain files and directories from coverage calculations.

#### Scenario: Ignore test files

**Given** the repository contains test files with `.spec.ts` or `.test.ts` extensions
**When** Codecov processes coverage reports
**Then** test files are excluded from coverage metrics
**And** test files do not affect coverage percentage calculations

#### Scenario: Ignore build artifacts and dependencies

**Given** the repository contains build output and dependencies
**When** Codecov processes coverage reports
**Then** it ignores files in `dist/`, `node_modules/`, `coverage/`, and `.nx/` directories
**And** these directories do not appear in coverage reports

#### Scenario: Ignore configuration files

**Given** the repository contains configuration files for tooling
**When** Codecov processes coverage reports
**Then** it ignores files matching patterns like `*.config.ts`, `*.config.js`, `*.config.cjs`, `*.config.mjs`
**And** configuration files do not affect coverage percentage

---

### Requirement: Configuration MUST define per-package flags

Codecov MUST support separate coverage tracking for each package in the monorepo using flags with path associations.

#### Scenario: Packages are tagged with flags

**Given** coverage reports are uploaded from multiple packages
**When** Codecov processes the reports
**Then** each package is tagged with a flag (e.g., `react-hooks`, `react-clean`, `is-even`, `is-odd`, `ts-configs`)
**And** coverage can be filtered by package flag in the Codecov dashboard
**And** per-package coverage trends are visible

#### Scenario: Flags are associated with package paths

**Given** the codecov.yaml defines flags with path associations
**When** coverage files are uploaded
**Then** Codecov automatically assigns coverage to flags based on file paths
**And** files in `packages/react-hooks/` are assigned to the `react-hooks` flag
**And** files in `packages/react-clean/` are assigned to the `react-clean` flag
**And** files in `packages/is-even/` are assigned to the `is-even` flag
**And** files in `packages/is-odd/` are assigned to the `is-odd` flag
**And** files in `packages/ts-configs/` are assigned to the `ts-configs` flag

#### Scenario: Flags enable independent coverage views

**Given** flags are configured for each package
**When** a user views the Codecov dashboard
**Then** coverage can be viewed for all packages combined (global view)
**And** coverage can be viewed for each individual package by selecting its flag
**And** trends show both global and per-flag coverage over time
**And** badges can be generated for global coverage or specific flags

---

### Requirement: Configuration MUST enable coverage annotations

Codecov MUST provide inline code annotations on pull requests.

#### Scenario: PR shows uncovered lines in diff view

**Given** a pull request has code changes with incomplete test coverage
**When** Codecov processes the coverage report
**Then** uncovered lines are annotated directly in the GitHub diff view
**And** annotations indicate which lines lack coverage
**And** annotations help developers identify testing gaps

---

### Requirement: Configuration MUST be validated by Codecov

The `codecov.yaml` configuration file MUST be syntactically correct and semantically valid.

#### Scenario: Configuration syntax is valid YAML

**Given** the `codecov.yaml` file exists
**When** it is parsed by Codecov
**Then** it is valid YAML syntax
**And** all required fields are present
**And** no deprecated fields are used

#### Scenario: Configuration references valid options

**Given** the `codecov.yaml` file contains configuration options
**When** Codecov validates the configuration
**Then** all options are supported by the Codecov platform
**And** all threshold values are within valid ranges (0-100)
**And** all boolean flags are properly formatted
