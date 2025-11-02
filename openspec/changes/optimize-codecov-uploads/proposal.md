# Optimize Codecov Uploads for Affected Packages

## Why

Current CI workflow uploads Codecov data (coverage, test results, bundle analysis) for all 5 packages on every PR, even when only 1-2 packages are affected by changes. This wastes 60-80% of upload time (~75-150 seconds per PR) and causes false "100% bundle size increase" warnings when non-affected packages skip uploads but later upload baselines.

Nx already calculates affected packages for test execution (`nx affected -t test:unit`), but this intelligence is not leveraged for Codecov uploads. The workflow runs 10 individual upload steps unconditionally, plus a bundle size loop that implicitly skips based on missing `dist/` directories.

## What Changes

- Add detection step that queries `nx show projects --affected` once and generates boolean outputs for each package (react-hooks, react-clean, is-even, is-odd, ts-configs)
- Replace 5 individual coverage upload steps with 1 consolidated script that loops packages and uploads only affected ones in PRs
- Replace 5 individual test results upload steps with 1 consolidated script with same conditional logic
- Refactor bundle size upload to use same affected detection, preventing baseline loss and false positives
- Maintain behavior on main/develop/pre branches: always upload all packages to establish complete baselines
- Use Codecov's `carryforward` feature (already configured) to fill in non-affected package data in PR comments

## Impact

**Performance**:
- Reduced CI time: 75-150 seconds per PR (60-80% reduction in uploads)
- Reduced API calls to Codecov: 60-80% per PR
- Added overhead: ~2 seconds (single Nx affected query)

**Behavior Changes**:
- PRs: Only affected packages upload Codecov data
- Main/develop/pre: All packages always upload (no change from current)
- Bundle size: No more "100% increase" false positives
- Codecov PR comments: Show affected packages with deltas, non-affected with "no change" (via carryforward)

**Affected Files**:
- `.github/workflows/ci.yml` - Complete refactor of Codecov upload section (lines 114-240)

**Breaking Changes**: None - this is a pure CI optimization with no user-facing changes

**Dependencies**: None - uses existing Nx and Codecov CLI

**Rollback Plan**: Revert workflow file to previous version, no data loss (Codecov data is append-only)
