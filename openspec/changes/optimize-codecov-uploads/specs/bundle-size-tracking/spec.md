# Spec: Bundle Size Tracking

## ADDED Requirements

### Requirement: CI workflow MUST use Nx affected detection for bundle size uploads

The GitHub Actions CI workflow MUST use the same Nx affected detection for bundle size uploads as coverage and test results uploads, preventing false "100% increase" warnings by maintaining consistent baselines.

#### Scenario: Bundle size upload uses shared detection step

**Given** the detection step has identified affected packages
**When** the bundle size upload script runs
**Then** the script references the same detection step outputs used by coverage and test results uploads
**And** uploads bundle stats only for packages marked as affected in PRs
**And** uploads all packages unconditionally on main/develop/pre branches

#### Scenario: Affected package uploads bundle stats

**Given** the detection step identified react-hooks as affected
**When** the bundle size upload script runs
**Then** the script analyzes and uploads bundle stats for react-hooks
**And** the upload uses bundle-analyzer CLI with `--bundle-name="react-hooks"`
**And** Codecov compares the bundle size against the baseline from main branch

#### Scenario: Non-affected package skips bundle upload

**Given** the detection step identified is-even as not affected
**When** the bundle size upload script runs
**Then** the script skips bundle analysis for is-even
**And** the workflow logs indicate "Skipping bundle analysis for is-even (not affected by PR)"
**And** Codecov retains the baseline bundle size for is-even (does not reset to 0)

#### Scenario: Protected branches establish complete bundle baselines

**Given** code is pushed to main, develop, or pre branch
**When** the build completes
**Then** the bundle size script uploads all 5 packages unconditionally
**And** Codecov stores complete baseline bundle sizes for future PR comparisons
**And** no package baselines are missing

---

### Requirement: Bundle size script MUST prevent baseline loss on pull requests

On pull requests, the bundle size upload MUST only upload affected packages to prevent Codecov from losing baseline data for non-affected packages, which causes false "100% increase" warnings.

#### Scenario: PR uploads only affected bundle stats

**Given** a pull request affects only react-clean
**When** the bundle size upload script runs
**Then** the script uploads bundle stats for react-clean
**And** skips upload for react-hooks, is-even, is-odd, and ts-configs
**And** Codecov maintains baseline bundle sizes for the 4 non-uploaded packages
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

---

### Requirement: Bundle size uploads MUST maintain same package selection as coverage uploads

The packages uploading bundle stats MUST be identical to the packages uploading coverage and test results to ensure consistency across all Codecov data types.

#### Scenario: Same affected packages upload all Codecov data types

**Given** react-hooks and react-clean are affected
**When** all Codecov upload scripts run
**Then** both packages upload coverage, test results, and bundle stats
**And** all three data types use the same package flags
**And** Codecov dashboard shows complete data for both packages

#### Scenario: Non-affected packages skip all Codecov uploads

**Given** is-odd, is-even, and ts-configs are not affected
**When** all Codecov upload scripts run
**Then** none of those packages upload coverage, test results, or bundle stats
**And** consistency is maintained across all data types
**And** no partial data causes confusion in Codecov dashboard

---

### Requirement: Bundle size upload MUST use consolidated loop pattern

The bundle size upload MUST refactor from implicit dist-directory-check skipping to explicit affected-based conditional logic matching coverage and test results patterns.

#### Scenario: Script loops through all packages with conditional logic

**Given** the detection step has run or is skipped (for push events)
**When** the bundle size upload script executes
**Then** the script loops through all 5 packages: react-hooks, react-clean, is-even, is-odd, ts-configs
**And** for each package, evaluates whether to upload based on PR vs push and affected status
**And** logs clear skip reasons: "not affected by PR" or "dist directory not found"

#### Scenario: Script uses same bash associative array pattern

**Given** affected status outputs are available as environment variables
**When** the bundle size script initializes
**Then** the script creates an associative array mapping package names to affected status
**And** uses the same pattern as coverage and test results scripts
**And** maintains code consistency across all three upload scripts

