# Tasks: Add Codecov Integration

## Prerequisites

- [ ] **Create Codecov account and add repository**
  - Sign up at https://codecov.io
  - Connect GitHub account
  - Add `pabloimrik17/monolab` repository to Codecov
  - **Verify**: Repository appears in Codecov dashboard

- [ ] **Configure CODECOV_TOKEN secret**
  - Copy upload token from Codecov repository settings
  - Add `CODECOV_TOKEN` secret to GitHub repository (Settings → Secrets → Actions)
  - **Verify**: Secret appears in GitHub repository secrets list (value will be hidden)

## Core Implementation

### 1. Codecov Configuration File

- [ ] **Create codecov.yaml at repository root**
  - Define coverage thresholds (project: auto/5%, patch: 70%/5%)
  - Configure ignore patterns (test files, dist/, node_modules/, config files)
  - Set checks to informational mode initially
  - Enable inline annotations for PR diff view
  - Configure per-package flags (react-hooks, react-clean, is-even, is-odd, ts-configs)
  - **Verify**: File exists at `/codecov.yaml`

- [ ] **Validate codecov.yaml syntax**
  - Run `curl -X POST --data-binary @codecov.yaml https://codecov.io/validate` (if available)
  - Or paste content into Codecov configuration validator in dashboard
  - **Verify**: Configuration passes validation with no errors

### 2. CI Workflow Integration

- [ ] **Add Codecov upload step to ci.yml (after PR tests)**
  - Add step after "Execute test checks for affected files (Affected)" (line ~96)
  - Use `codecov/codecov-action@v5`
  - Configure to upload files matching `./packages/*/coverage/lcov.info,./apps/*/coverage/lcov.info`
  - Set `fail_ci_if_error: false` for non-blocking uploads
  - Use `CODECOV_TOKEN` from secrets
  - Include `if: ${{ github.event_name == 'pull_request' }}` condition
  - **Verify**: YAML syntax is valid using `actionlint` or GitHub Actions syntax checker

- [ ] **Add Codecov upload step to ci.yml (after main branch tests)**
  - Add step after "Execute test checks for all files (All)" (line ~100)
  - Use same configuration as PR upload step
  - Include `if: ${{ github.event_name == 'push' }}` condition
  - **Verify**: YAML syntax is valid

- [ ] **Ensure coverage reports are generated before upload**
  - Confirm test commands include `--coverage` flag (already configured in existing CI)
  - Confirm lcov.info files are generated in expected locations
  - **Verify**: Run `pnpm exec nx affected -t test:unit -- --coverage` locally and check for `coverage/lcov.info` files

### 3. Coverage Badge

- [ ] **Add Codecov badge to README.md**
  - Insert badge after CI badges (line ~3) and before License badge (line ~4)
  - Use format: `[![codecov](https://codecov.io/gh/pabloimrik17/monolab/branch/main/graph/badge.svg)](https://codecov.io/gh/pabloimrik17/monolab)`
  - Maintain consistent spacing with existing badges
  - **Verify**: Badge markdown is valid and renders correctly in preview

### 4. Bundle Size Tracking

- [ ] **Create bundle size calculation script**
  - Create script at `tools/scripts/calculate-bundle-sizes.sh`
  - Script iterates over published packages (packages/react-hooks, packages/react-clean, packages/is-even, packages/is-odd, packages/ts-configs)
  - For each package, calculate size of `dist/` directory (all .js, .d.ts, .d.ts.map files)
  - Generate gzip-compressed size estimate
  - Output size data in format compatible with Codecov bundle analysis
  - **Verify**: Run script locally and confirm output contains size data for all packages

- [ ] **Make bundle size script executable**
  - Run `chmod +x tools/scripts/calculate-bundle-sizes.sh`
  - **Verify**: `ls -l tools/scripts/calculate-bundle-sizes.sh` shows execute permissions

- [ ] **Add bundle size reporting to ci.yml**
  - Add step after "Execute build checks for all files (All)" (line ~108)
  - Run bundle size calculation script
  - Upload bundle stats to Codecov using `codecov/codecov-action@v5` with `plugin: bundler` (if supported) or custom format
  - Include `if: ${{ github.ref == 'refs/heads/main' }}` condition (only on main branch)
  - Set `fail_ci_if_error: false`
  - **Verify**: YAML syntax is valid

## Testing & Validation

- [ ] **Test coverage upload on a feature branch**
  - Create test PR from feature branch
  - Push commit to trigger CI
  - Wait for CI to complete
  - Check CI logs for successful Codecov upload
  - **Verify**: Codecov upload logs show "Success" and no authentication errors

- [ ] **Verify Codecov PR comment appears**
  - Check test PR for Codecov bot comment
  - Confirm comment shows coverage summary and file-level changes
  - Confirm comment includes link to full report
  - **Verify**: Comment contains coverage percentage and delta

- [ ] **Verify Codecov status checks appear**
  - Check test PR checks section for `codecov/project` and `codecov/patch` checks
  - Confirm checks show coverage percentages
  - Confirm checks are informational (not blocking)
  - **Verify**: Both status checks are present and pass

- [ ] **Merge test PR to main branch**
  - Merge the test PR to establish baseline coverage on main
  - Wait for main branch CI to complete
  - **Verify**: CI succeeds and uploads coverage for main branch

- [ ] **Verify coverage badge displays correctly**
  - View README.md on GitHub main branch
  - Confirm Codecov badge displays coverage percentage
  - Click badge to verify it links to Codecov dashboard
  - **Verify**: Badge shows reasonable coverage percentage (not 0% or error)

- [ ] **Verify bundle size data appears in Codecov**
  - View Codecov dashboard for the repository
  - Navigate to bundle analysis section (if available in UI)
  - Confirm bundle sizes are recorded for main branch
  - **Verify**: Bundle sizes appear for each published package

## Documentation

- [ ] **Update openspec/project.md with Codecov information**
  - Add Codecov to "CI/CD & Publishing" section under "Tech Stack"
  - Document that coverage reports are uploaded to Codecov
  - Note that bundle sizes are tracked on main branch
  - **Verify**: Changes are accurate and follow existing documentation style

- [ ] **Add Codecov setup instructions to README (if needed)**
  - Document that `CODECOV_TOKEN` must be configured for forks
  - Explain how to view coverage reports on Codecov dashboard
  - **Verify**: Instructions are clear and actionable for contributors

## Post-Deployment

- [ ] **Monitor Codecov uploads for one week**
  - Check that coverage uploads succeed on every PR and main branch push
  - Monitor for any authentication or upload failures
  - **Verify**: No recurring errors in Codecov upload logs

- [ ] **Review and adjust coverage thresholds if needed**
  - Review actual coverage levels across packages
  - Adjust thresholds in codecov.yaml based on observed patterns
  - Consider enabling strict mode (remove informational flag) if coverage is stable
  - **Verify**: Thresholds are realistic and do not block legitimate PRs

- [ ] **Configure branch protection to require Codecov checks (optional)**
  - In GitHub repository settings, edit main branch protection
  - Add `codecov/project` and `codecov/patch` to required status checks
  - **Verify**: Branch protection settings show Codecov checks as required

## Dependencies

- **Task 2.1, 2.2, 2.3** depend on **Task 1.1** (codecov.yaml must exist before CI changes)
- **Task 3.1** can be done in parallel with CI changes
- **Task 4.1, 4.2, 4.3** depend on successful build configuration (can be done in parallel with coverage tasks)
- **All testing tasks (section 4)** depend on prerequisites and core implementation being complete
- **Documentation tasks** can be done in parallel with implementation

## Parallelizable Work

The following tasks can be executed in parallel:
- **Configuration file creation** (Task 1.1) + **Badge addition** (Task 3.1)
- **CI workflow modifications** (Tasks 2.1, 2.2) + **Bundle size script creation** (Tasks 4.1, 4.2)
- **Documentation updates** can be done anytime during or after implementation
