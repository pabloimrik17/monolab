## MODIFIED Requirements

### Requirement: Configuration MUST define per-package flags

Codecov MUST support separate coverage tracking for each package in the monorepo using flags with path associations.

#### Scenario: Packages are tagged with flags

**Given** coverage reports are uploaded from multiple packages
**When** Codecov processes the reports
**Then** each package is tagged with a flag (e.g., `react-hooks`, `react-clean`, `is-even`, `is-odd`, `ts-configs`, `http-client`)
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
**And** files in `packages/http-client/` are assigned to the `http-client` flag

#### Scenario: Flags enable independent coverage views

**Given** flags are configured for each package
**When** a user views the Codecov dashboard
**Then** coverage can be viewed for all packages combined (global view)
**And** coverage can be viewed for each individual package by selecting its flag
**And** trends show both global and per-flag coverage over time
**And** badges can be generated for global coverage or specific flags
