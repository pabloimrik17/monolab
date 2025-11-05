# Optimize Codecov Uploads for Affected Packages

## Why

Current CI workflow uploads Codecov data (coverage, test results, bundle analysis) for all 5 packages on every PR, even when only 1-2 packages are affected by changes. This wastes 60-80% of upload time (~75-150 seconds per PR) and causes false "100% bundle size increase" warnings when non-affected packages skip uploads but later upload baselines.

Nx already calculates affected packages for test execution (`nx affected -t test:unit`), but this intelligence is not leveraged for Codecov uploads. The workflow runs 10 individual upload steps unconditionally, plus a bundle size loop that implicitly skips based on missing `dist/` directories.

## What Changes

- Add detection step that queries `nx show projects --affected` once and generates boolean outputs for each package (react-hooks, react-clean, is-even, is-odd, ts-configs)
- Add conditional logic to 5 individual coverage upload steps using GitHub Actions (codecov/codecov-action@v5) to skip non-affected packages in PRs
- Add conditional logic to 5 individual test results upload steps using GitHub Actions (codecov/test-results-action@v1) to skip non-affected packages in PRs
- Simplify bundle size upload to always upload all packages (Nx cache optimizes build time)
- Change build step from `nx affected` to `nx run-many` to ensure all dist/ directories exist for bundle analysis
- Add Nx cache artifact (restore/save .nx/cache) when NX_NO_CLOUD is true for faster local CI
- Align all cache restore-keys to coherent 3-level pattern (ref_name, develop, fallback)
- Maintain behavior on main/develop/pre branches: always upload all packages to establish complete baselines
- Use Codecov's `carryforward` feature (already configured) to fill in non-affected package data in PR comments

## Impact

**Performance**:
- Reduced CI time: ~110-120 seconds per PR (coverage + test results optimized)
- Reduced API calls to Codecov: 60-80% per PR (coverage + test results only)
- Build overhead: +1 second (nx run-many with cache vs nx affected)
- Nx cache: faster CI when NX_NO_CLOUD=true

**Behavior Changes**:
- PRs: Only affected packages upload coverage/test-results data (bundle always uploads all)
- Main/develop/pre: All packages always upload (no change from current)
- Bundle size: Always uploads all packages to prevent "removed" false positives
- Codecov PR comments: Show affected packages with deltas, non-affected with "no change" (via carryforward)
- Build: Uses `nx run-many` (Nx cache ensures only affected packages rebuild)

**Affected Files**:
- `.github/workflows/ci.yml` - Complete refactor of Codecov upload section, Nx cache additions, and build step consolidation (lines 82-307)

**Breaking Changes**: None - this is a pure CI optimization with no user-facing changes

**Dependencies**: None - uses existing Nx and Codecov GitHub Actions (codecov-action@v5, test-results-action@v1)

**Rollback Plan**: Revert workflow file to previous version, no data loss (Codecov data is append-only)
