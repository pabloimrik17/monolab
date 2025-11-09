# bundle-size-tracking Specification

## Purpose
TBD - created by archiving change add-codecov. Update Purpose after archive.
## Requirements
### Requirement: CI workflow MUST use Codecov Bundle Analysis for bundle size tracking

The GitHub Actions CI workflow MUST use Codecov's official Bundle Analysis product to track package bundle sizes and trends.

#### Scenario: Bundle stats uploaded on main branch push

**Given** code is pushed to the main branch
**When** the build completes successfully
**Then** the workflow generates bundle stats for each published package
**And** the workflow uploads bundle stats to Codecov Bundle Analysis
**And** Codecov records bundle sizes with commit metadata as baseline
**And** the upload uses Codecov Bundle Analysis integration (CLI)

#### Scenario: Bundle sizes are reported on pull requests

**Given** a pull request triggers the CI workflow
**When** the build completes
**Then** the workflow generates and uploads bundle stats for affected packages
**And** Codecov compares PR bundle sizes against main branch baseline
**And** Codecov posts PR comment showing bundle size deltas (e.g., "+800 B ⚠️")
**And** developers can review size impact before merging

---

### Requirement: Bundle sizes MUST be tracked per published package

Each package published to JSR MUST have its bundle size tracked separately using Codecov Bundle Analysis.

#### Scenario: Track bundle size for library packages

**Given** the monorepo contains published packages (react-hooks, react-clean, is-even, is-odd, ts-configs)
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

---

### Requirement: Bundle size changes MUST be visible in Codecov dashboard

Codecov dashboard MUST display bundle size trends over time.

#### Scenario: View bundle size history for a package

**Given** bundle sizes have been reported over multiple commits
**When** a user views the Codecov dashboard for a package
**Then** a graph shows bundle size changes over time
**And** each data point corresponds to a commit on the main branch
**And** size increases and decreases are clearly visible

#### Scenario: Compare bundle sizes across packages

**Given** multiple packages are tracked
**When** a user views the Codecov dashboard
**Then** bundle sizes for all packages can be compared side-by-side
**And** each package's trend line is separately identifiable
**And** relative sizes between packages are apparent

---

### Requirement: Bundle Analysis MUST track all distributable files

Codecov Bundle Analysis MUST be configured to track all files that consumers download from published packages.

#### Scenario: Bundle stats include all distributable files

**Given** a package builds to the `dist/` directory with `.js`, `.d.ts`, and `.d.ts.map` files
**When** bundle stats are generated via Bundle Analysis
**Then** the stats include all `.js` files in `dist/`
**And** the stats include all `.d.ts` declaration files
**And** the stats include all `.d.ts.map` declaration map files
**And** the bundle size accurately reflects what consumers download

#### Scenario: Bundle Analysis respects package exports

**Given** a package's `dist/` directory contains various files
**When** Bundle Analysis is configured
**Then** it tracks files matching the `package.json` exports configuration
**And** it accurately represents the actual package size as published
**And** the size reflects what users download via package managers (JSR)

---

### Requirement: Bundle Analysis data MUST include compression information

Codecov Bundle Analysis MUST provide both raw and compressed bundle sizes.

#### Scenario: Dashboard shows raw and compressed sizes

**Given** bundle stats are uploaded to Codecov Bundle Analysis
**When** a user views the bundle in Codecov dashboard
**Then** the dashboard displays the raw file size
**And** the dashboard displays the compressed (gzip) size
**And** both raw and compressed sizes are tracked over time
**And** size comparisons show both raw and compressed deltas

#### Scenario: Compression data reflects real-world downloads

**Given** Codecov Bundle Analysis tracks bundle sizes
**When** compression data is displayed
**Then** the compressed size represents what users actually download
**And** the compression ratio is realistic for JavaScript/TypeScript content
**And** the data provides accurate expectations for package consumers

---

### Requirement: Bundle Analysis integration MUST NOT slow down CI significantly

Codecov Bundle Analysis integration MUST be efficient and not add significant overhead to CI runs.

#### Scenario: Bundle stats generation completes quickly

**Given** the CI workflow builds all packages
**When** bundle stats are generated for Bundle Analysis
**Then** the generation completes within 10 seconds for all packages
**And** the overhead is acceptable for main branch pushes
**And** CI latency does not increase noticeably

#### Scenario: Bundle stats upload is non-blocking

**Given** bundle stats have been generated
**When** the upload to Codecov Bundle Analysis occurs
**Then** the upload completes within 10 seconds
**And** upload failures do not block the CI workflow (fail_ci_if_error: false)
**And** the workflow continues successfully even if Codecov is unavailable

#### Scenario: Bundle Analysis runs on all builds

**Given** a commit is pushed to any branch or a PR is created
**When** the CI workflow runs and build completes
**Then** Bundle Analysis executes after the build step
**And** PR builds upload bundle stats to show size deltas in comments
**And** Main branch uploads establish baselines for future comparisons
**And** Upload failures are non-blocking (continue-on-error: true)

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

