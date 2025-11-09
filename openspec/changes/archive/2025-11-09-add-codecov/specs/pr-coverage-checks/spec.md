# Spec: PR Coverage Checks

## ADDED Requirements

### Requirement: Pull requests MUST receive automated coverage comments

Codecov MUST post comments on pull requests with coverage analysis.

#### Scenario: PR comment shows coverage summary

**Given** a pull request triggers the CI workflow
**When** Codecov processes the coverage report
**Then** Codecov bot posts a comment on the pull request
**And** the comment shows overall coverage percentage
**And** the comment shows coverage change compared to base branch
**And** the comment includes a link to detailed coverage report

#### Scenario: PR comment shows per-file coverage changes

**Given** a pull request modifies multiple files
**When** Codecov processes the coverage report
**Then** the PR comment lists files with changed coverage
**And** each file shows coverage delta (increase/decrease)
**And** files with decreased coverage are highlighted
**And** files with no coverage data are indicated

#### Scenario: PR comment updates on new commits

**Given** a pull request already has a Codecov comment
**When** a new commit is pushed to the PR
**Then** the existing Codecov comment is updated with new coverage data
**And** the comment reflects the latest commit's coverage
**And** only one Codecov comment exists per PR (no duplicate comments)

---

### Requirement: Pull requests MUST receive coverage status checks

Codecov MUST create GitHub status checks that appear in the PR checks section.

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

**Given** a pull request adds code with less than 65% test coverage
**When** Codecov evaluates the patch coverage
**And** patch coverage threshold is enforced
**Then** the `codecov/patch` status check is marked as "failure"
**And** the status check message shows the patch coverage percentage
**And** the status check blocks PR merge if branch protection is enabled

---

### Requirement: Coverage checks MUST integrate with GitHub branch protection

Codecov status checks MUST be compatible with GitHub branch protection rules.

#### Scenario: Branch protection requires passing coverage checks

**Given** the main branch has protection rules enabled
**When** a pull request targets the main branch
**Then** the `codecov/project` status check is listed in required checks
**And** the `codecov/patch` status check is listed in required checks
**And** the PR cannot be merged until both checks pass

---

### Requirement: Coverage analysis MUST compare against correct base branch

Codecov MUST compare PR coverage against the appropriate base branch.

#### Scenario: PR targeting main compares against main branch

**Given** a pull request targets the main branch
**When** Codecov analyzes coverage
**Then** it compares coverage against the latest main branch coverage
**And** the coverage delta reflects changes from main
**And** the base coverage is clearly indicated in the PR comment

#### Scenario: PR targeting develop compares against develop branch

**Given** a pull request targets the develop branch
**When** Codecov analyzes coverage
**Then** it compares coverage against the latest develop branch coverage
**And** the coverage delta reflects changes from develop
**And** the comparison is accurate even if develop has diverged from main

---

### Requirement: Coverage checks MUST handle first-time PR scenarios

Codecov MUST gracefully handle pull requests when no baseline coverage exists.

#### Scenario: First coverage report on a new branch

**Given** a pull request is created before any coverage baseline exists
**When** Codecov processes the first coverage report
**Then** it reports absolute coverage percentage
**And** it does not show a coverage delta (no comparison possible)
**And** status checks use absolute thresholds instead of comparative thresholds

#### Scenario: First coverage report on main branch

**Given** Codecov integration is newly added to the repository
**When** the first coverage report is uploaded to main branch
**Then** it establishes the baseline coverage
**And** subsequent PRs will compare against this baseline
**And** the coverage is visible in the Codecov dashboard
