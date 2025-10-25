# Spec: Coverage Badges

## MODIFIED Requirements

### Requirement: README MUST display project status badges

README.md MUST display status badges including CI status, code coverage, license, monorepo information, Node.js version, pnpm version, CodeRabbit, and maintenance status.

**Previous**: README.md displays CI status, license, monorepo, Node.js, pnpm, CodeRabbit, and maintenance badges (no coverage badge).

**New**: README.md displays CI status, **code coverage**, license, monorepo, Node.js, pnpm, CodeRabbit, and maintenance badges.

#### Scenario: Coverage badge shows current main branch coverage

**Given** the README.md file is viewed on GitHub
**When** Codecov has processed coverage for the main branch
**Then** the coverage badge displays the current coverage percentage
**And** the badge links to the Codecov dashboard when clicked
**And** the badge updates automatically when coverage changes

#### Scenario: Coverage badge placement in badge row

**Given** the README.md contains existing badges
**When** the coverage badge is added
**Then** it appears after the CI badges (Dev and Main)
**And** it appears before the License badge
**And** it maintains consistent visual styling with other badges

---

## ADDED Requirements

### Requirement: Coverage badge MUST use Codecov's official badge URL

The coverage badge MUST use Codecov's generated badge URL for the MonoLab repository.

#### Scenario: Badge URL references correct repository

**Given** the MonoLab repository is at `github.com/pabloimrik17/monolab`
**When** the coverage badge is rendered
**Then** it uses the URL pattern `https://codecov.io/gh/pabloimrik17/monolab/branch/main/graph/badge.svg`
**And** it links to `https://codecov.io/gh/pabloimrik17/monolab`

#### Scenario: Badge displays for main branch coverage

**Given** coverage reports are uploaded for multiple branches
**When** the README is viewed
**Then** the badge displays coverage for the `main` branch by default
**And** the badge reflects the latest coverage data from main branch

---

### Requirement: Badge MUST be accessible and have descriptive alt text

The coverage badge MUST be accessible to screen readers and provide meaningful information.

#### Scenario: Badge has descriptive alt text

**Given** a user accesses the README with a screen reader
**When** the screen reader encounters the coverage badge
**Then** it announces "codecov" as the badge description
**And** the badge link is identified as linking to the Codecov dashboard

---

### Requirement: Per-package badges MUST be available using flag parameter

Individual packages MUST be able to display their specific coverage using flag-filtered badges.

#### Scenario: Badge URL supports flag filtering

**Given** coverage is uploaded with flags for each package
**When** a flag parameter is added to the badge URL
**Then** the badge displays coverage for only that specific flag
**And** the URL format is `https://codecov.io/gh/pabloimrik17/monolab/branch/main/graph/badge.svg?flag={package-name}`
**And** the link URL includes the flag parameter for filtering

#### Scenario: Per-package badges show independent coverage

**Given** react-hooks has 85% coverage and is-even has 100% coverage
**When** their respective flag badges are rendered
**Then** the react-hooks badge shows 85%
**And** the is-even badge shows 100%
**And** each badge is independent of other packages' coverage

#### Scenario: Package READMEs can include their specific badge

**Given** a package has its own README file (e.g., `packages/react-hooks/README.md`)
**When** a flag-specific badge is added to that README
**Then** the badge displays only that package's coverage
**And** contributors see package-specific coverage without monorepo noise
**And** the badge links to the filtered Codecov dashboard view
