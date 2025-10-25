# Proposal: Add Codecov Integration

## Summary

Integrate Codecov to provide comprehensive code coverage reporting, visualization, and quality gates for the MonoLab monorepo. This will enable:

- Automated coverage reporting from CI/CD pipeline with Codecov flags
- Global coverage view + per-package coverage tracking (react-hooks, react-clean, is-even, is-odd, ts-configs)
- Visual coverage badges: one global badge + optional per-package badges
- Pull request coverage checks and comments (showing only affected packages)
- Coverage trend tracking over time (global and per-package)
- Bundle size monitoring for published packages (per-package tracking)

## Motivation

Currently, the project generates coverage reports locally via Vitest, but lacks:

1. **Historical tracking**: No way to see coverage trends over time (global or per-package)
2. **Per-package visibility**: Cannot track coverage independently for react-hooks, react-clean, is-even, is-odd, and ts-configs
3. **Public visibility**: Coverage metrics are not visible to contributors or users via badges
4. **PR automation**: No automated coverage feedback on pull requests
5. **Centralized reporting**: Coverage data is scattered across local builds and CI runs
6. **Bundle monitoring**: No tracking of package size changes that could affect consumers

Adding Codecov with flags addresses these gaps by providing:
- **Hybrid tracking**: Global monorepo view + individual package views
- **Smart PR comments**: Shows only affected packages when using Nx affected
- **Flexible badges**: One global badge for the monorepo + optional per-package badges
- **Baseline comparison**: Codecov maintains baselines so affected PRs can be compared against full coverage

## Scope

This change introduces five main capabilities:

1. **Coverage Reporting** (`coverage-reporting`): Upload coverage reports from GitHub Actions to Codecov with flags for per-package tracking
2. **Coverage Badges** (`coverage-badges`): Display global coverage badge in root README + optional per-package badges using flag parameters
3. **Codecov Configuration** (`codecov-config`): Configure coverage thresholds, ignore patterns, flags with path associations, and reporting behavior
4. **PR Coverage Checks** (`pr-coverage-checks`): Automated coverage analysis and status checks on pull requests (showing only affected packages)
5. **Bundle Size Tracking** (`bundle-size-tracking`): Monitor and report individual package bundle sizes using Codecov's bundle analysis

### Flag-Based Strategy

Each package (react-hooks, react-clean, is-even, is-odd, ts-configs) will be tracked as a separate Codecov flag:
- **Global view**: Aggregate coverage across all packages
- **Per-package view**: Individual coverage metrics, trends, and badges per flag
- **Smart PR comments**: Codecov shows only flags affected by PR changes
- **Baseline maintenance**: Main branch uploads maintain full baseline, PRs with affected packages provide complete per-package coverage (Nx affected runs ALL tests for affected projects, not individual test files)

## Dependencies

- GitHub repository must be connected to Codecov (via codecov.io)
- `CODECOV_TOKEN` secret must be configured in GitHub repository settings
- Existing CI workflow must continue to generate coverage reports (already configured)

## Risks & Mitigations

**Risk**: Codecov service outage blocks CI pipeline
**Mitigation**: Configure Codecov upload step with `fail_ci_if_error: false` to prevent blocking

**Risk**: Coverage thresholds too strict, blocking legitimate PRs
**Mitigation**: Start with informational-only mode, refine thresholds based on actual coverage patterns

**Risk**: Bundle size tracking adds CI overhead
**Mitigation**: Only run bundle analysis on main branch pushes, not on every PR commit

## Success Criteria

- [ ] Coverage reports successfully upload to Codecov from CI with flags (react-hooks, react-clean, is-even, is-odd, ts-configs)
- [ ] Root README displays accurate global coverage badge
- [ ] Per-package badges available using flag parameter (optional for package READMEs)
- [ ] PRs receive automated coverage comments from Codecov bot showing affected packages only
- [ ] Coverage trends visible on Codecov dashboard (global and per-flag views)
- [ ] Codecov dashboard allows filtering by individual package flags
- [ ] Bundle size changes tracked for each published package independently
- [ ] Affected PRs show complete per-package coverage (not partial file coverage)
