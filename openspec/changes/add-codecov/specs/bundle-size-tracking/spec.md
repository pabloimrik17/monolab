# Spec: Bundle Size Tracking

## ADDED Requirements

### Requirement: CI workflow MUST report bundle sizes to Codecov

The GitHub Actions CI workflow MUST report package bundle sizes to Codecov for trend tracking.

#### Scenario: Bundle sizes reported on main branch push

**Given** code is pushed to the main branch
**When** the build completes successfully
**Then** the workflow calculates the size of each package's `dist/` output
**And** the workflow uploads bundle size data to Codecov
**And** Codecov records bundle sizes with commit metadata

#### Scenario: Bundle sizes are not reported on pull requests

**Given** a pull request triggers the CI workflow
**When** the build completes
**Then** bundle size reporting is skipped to reduce noise
**And** CI completes faster without bundle analysis overhead

---

### Requirement: Bundle sizes MUST be tracked per published package

Each package published to JSR MUST have its bundle size tracked separately.

#### Scenario: Track bundle size for library packages

**Given** the monorepo contains published packages (react-hooks, react-clean, is-even, is-odd, ts-configs)
**When** bundle sizes are calculated
**Then** each package's `dist/` directory size is measured
**And** each package is reported as a separate bundle to Codecov
**And** package names are used as bundle identifiers

#### Scenario: Exclude demo app from bundle tracking

**Given** the monorepo contains a demo application
**When** bundle sizes are calculated
**Then** the demo app is excluded from bundle tracking
**And** only published packages are measured
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

### Requirement: Bundle size calculation MUST include all distributable files

Bundle size MUST accurately reflect what consumers will download.

#### Scenario: Include all JavaScript and TypeScript declaration files

**Given** a package builds to the `dist/` directory
**When** bundle size is calculated
**Then** it includes all `.js` files in `dist/`
**And** it includes all `.d.ts` declaration files
**And** it includes all `.d.ts.map` declaration map files

#### Scenario: Exclude non-distributable files from calculation

**Given** a package's `dist/` directory may contain temporary or metadata files
**When** bundle size is calculated
**Then** it excludes files not listed in `package.json` exports
**And** it excludes source maps (`.js.map`) unless explicitly distributed
**And** the size reflects only what users download via package managers

---

### Requirement: Bundle size data MUST include compression estimates

Bundle size reports MUST indicate both raw and compressed sizes.

#### Scenario: Report gzipped bundle size

**Given** a package's bundle size is calculated
**When** the size is reported to Codecov
**Then** it includes the raw file size
**And** it includes an estimated gzip-compressed size
**And** both sizes are visible in the Codecov dashboard

#### Scenario: Gzip estimation is accurate

**Given** bundle files are compressed using gzip
**When** the gzipped size is estimated
**Then** the estimate is within 5% of actual gzip compression
**And** the compression ratio is consistent with JavaScript content
**And** the estimate provides realistic size expectations for users

---

### Requirement: Bundle size tracking MUST NOT slow down CI significantly

Bundle size calculation and reporting MUST be efficient.

#### Scenario: Bundle size calculation completes quickly

**Given** the CI workflow builds all packages
**When** bundle sizes are calculated
**Then** the calculation completes within 10 seconds for all packages
**And** the overhead is acceptable for main branch pushes
**And** CI latency does not increase noticeably

#### Scenario: Bundle size upload is non-blocking

**Given** bundle sizes have been calculated
**When** the upload to Codecov occurs
**Then** the upload completes within 5 seconds
**And** upload failures do not block the CI workflow
**And** the workflow continues even if Codecov is unavailable
