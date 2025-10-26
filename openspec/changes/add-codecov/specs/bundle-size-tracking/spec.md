# Spec: Bundle Size Tracking

## ADDED Requirements

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
