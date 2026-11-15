# Spec Delta

## MODIFIED Requirements

### Requirement: Configuration MUST define per-package flags

Codecov MUST support separate coverage tracking for each project in the monorepo that has tests, using flags with path associations. Projects exempt from testing MUST NOT have a flag.

#### Scenario: Packages are tagged with flags

**Given** coverage reports are uploaded from multiple projects
**When** Codecov processes the reports
**Then** each project with tests is tagged with a flag named after it (e.g., `react-hooks`, `investlab-portfolio`, `plugin-experiments`)
**And** coverage can be filtered by project flag in the Codecov dashboard
**And** per-project coverage trends are visible

#### Scenario: Flags are associated with package paths

**Given** the codecov.yaml defines flags with path associations
**When** coverage files are uploaded
**Then** Codecov automatically assigns coverage to flags based on file paths
**And** files in `packages/react-hooks/` are assigned to the `react-hooks` flag
**And** files in `apps/investlab-api/` are assigned to the `investlab-api` flag
**And** files in `claude-plugins/experiments/` are assigned to the `plugin-experiments` flag

#### Scenario: Exempt projects have no flag

**Given** a project carries no tests under the test policy, such as `ts-configs`
**When** codecov.yaml is read
**Then** it defines no flag, project status or patch status for that project

#### Scenario: Flags enable independent coverage views

**Given** flags are configured for each project with tests
**When** a user views the Codecov dashboard
**Then** coverage can be viewed for all projects combined (global view)
**And** coverage can be viewed for each individual project by selecting its flag
**And** trends show both global and per-flag coverage over time
**And** badges can be generated for global coverage or specific flags
