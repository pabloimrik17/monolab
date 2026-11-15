# Spec Delta

## MODIFIED Requirements

### Requirement: Coverage uploads MUST maintain consistent affected detection with test execution

The affected packages detected for coverage upload MUST be identical to the packages tested by `nx affected -t test:coverage`.

#### Scenario: Coverage uploads align with test execution

**Given** `nx affected -t test:coverage` ran tests for react-hooks and react-clean
**When** the detection step runs `nx show projects --affected`
**Then** the affected list includes react-hooks and react-clean
**And** coverage exists for those packages (because tests ran)
**And** coverage upload succeeds for both packages
**And** no coverage files exist for non-tested packages

#### Scenario: Nx base SHA is consistent

**Given** the `nx-set-shas` action ran before tests
**When** tests execute with `nx affected`
**Then** Nx uses the determined base SHA
**And** when the detection step runs `nx show projects --affected`
**Then** it uses the same base SHA
**And** both commands return identical affected package lists

#### Scenario: Coverage includes every kind of test

**Given** a package has unit and integration tests
**When** `nx affected -t test:coverage` runs it
**Then** the uploaded lcov report covers the lines executed by both kinds
