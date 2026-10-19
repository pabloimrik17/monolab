# Spec Delta

## MODIFIED Requirements

### Requirement: Pull requests MUST receive coverage status checks

Codecov MUST create GitHub status checks that appear in the PR checks section. The patch check MUST require 80% coverage on the lines a pull request adds or changes, the test policy's coverage target.

#### Scenario: Status check passes when coverage is maintained

**Given** a pull request maintains or improves coverage
**When** Codecov evaluates the coverage report
**Then** the `codecov/project` status check is marked as "success"
**And** the status check message shows the coverage percentage
**And** the pull request can be merged (assuming other checks pass)

#### Scenario: Status check is informational when coverage decreases slightly

**Given** a pull request decreases coverage by less than 5%
**When** Codecov evaluates the coverage report
**And** coverage checks are configured as informational
**Then** the `codecov/project` status check is marked as "success" with a note
**And** the status check message indicates coverage decrease
**And** the pull request can still be merged

#### Scenario: Status check fails when patch coverage is too low

**Given** a pull request adds code with less than 80% test coverage
**When** Codecov evaluates the patch coverage
**And** patch coverage threshold is enforced
**Then** the `codecov/patch` status check is marked as "failure"
**And** the status check message shows the patch coverage percentage
**And** the status check blocks PR merge if branch protection is enabled
