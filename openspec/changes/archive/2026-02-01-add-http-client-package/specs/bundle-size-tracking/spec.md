## MODIFIED Requirements

### Requirement: Bundle sizes MUST be tracked per published package

Each package published to JSR MUST have its bundle size tracked separately using Codecov Bundle Analysis.

#### Scenario: Track bundle size for library packages

**Given** the monorepo contains published packages (react-hooks, react-clean, is-even, is-odd, ts-configs, http-client)
**When** bundle stats are generated and uploaded
**Then** each package has its own bundle stats reported to Codecov
**And** each package is tracked as a separate bundle in Codecov dashboard
**And** package names are used as bundle identifiers

#### Scenario: Exclude demo app from bundle tracking

**Given** the monorepo contains a demo application
**When** bundle stats are generated
**Then** the demo app is excluded from Bundle Analysis configuration
**And** only published packages are tracked
**And** internal applications do not pollute bundle size metrics

### Requirement: Bundle size script MUST prevent baseline loss on pull requests

On pull requests, the bundle size upload MUST only upload affected packages to prevent Codecov from losing baseline data for non-affected packages, which causes false "100% increase" warnings.

#### Scenario: PR uploads only affected bundle stats

**Given** a pull request affects only react-clean
**When** the bundle size upload script runs
**Then** the script uploads bundle stats for react-clean
**And** skips upload for react-hooks, is-even, is-odd, ts-configs, and http-client
**And** Codecov maintains baseline bundle sizes for the 5 non-uploaded packages
**And** future PRs do not show "100% increase" for those packages

#### Scenario: Codecov compares affected bundles against baseline

**Given** react-hooks was uploaded on main with 5.74kB size
**And** a pull request affects react-hooks and uploads new stats at 5.80kB
**When** Codecov generates the PR comment
**Then** the comment shows "react-hooks: +60 B (+1.0%)"
**And** does not show "react-hooks: 5.80kB (+100%)" (false positive)

#### Scenario: Non-affected package maintains baseline in Codecov

**Given** is-even baseline is 670 bytes on main
**And** a pull request affects only react-hooks (not is-even)
**When** bundle stats are uploaded (only react-hooks)
**Then** Codecov retains is-even's 670 byte baseline
**And** subsequent PRs affecting is-even compare against 670 bytes
**And** there is no data loss or reset to 0

### Requirement: Bundle size upload MUST use consolidated loop pattern

The bundle size upload MUST refactor from implicit dist-directory-check skipping to explicit affected-based conditional logic matching coverage and test results patterns.

#### Scenario: Script loops through all packages with conditional logic

**Given** the detection step has run or is skipped (for push events)
**When** the bundle size upload script executes
**Then** the script loops through all 6 packages: react-hooks, react-clean, is-even, is-odd, ts-configs, http-client
**And** for each package, evaluates whether to upload based on PR vs push and affected status
**And** logs clear skip reasons: "not affected by PR" or "dist directory not found"

#### Scenario: Script uses same bash associative array pattern

**Given** affected status outputs are available as environment variables
**When** the bundle size script initializes
**Then** the script creates an associative array mapping package names to affected status
**And** uses the same pattern as coverage and test results scripts
**And** maintains code consistency across all three upload scripts
