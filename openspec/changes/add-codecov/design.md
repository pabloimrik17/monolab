# Design: Codecov Integration

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        GitHub Actions CI                        │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│  │  Run Tests   │───▶│   Generate   │───▶│   Upload to  │     │
│  │  (Vitest)    │    │   Coverage   │    │   Codecov    │     │
│  └──────────────┘    │  (lcov/json) │    └──────┬───────┘     │
│                      └──────────────┘           │              │
└──────────────────────────────────────────────────┼──────────────┘
                                                   │
                                                   ▼
                                    ┌──────────────────────────┐
                                    │   Codecov Platform       │
                                    │  ┌────────────────────┐  │
                                    │  │  Coverage Reports  │  │
                                    │  │  Bundle Analysis   │  │
                                    │  │  Trend Tracking    │  │
                                    │  └────────────────────┘  │
                                    └──────────┬───────────────┘
                                               │
                      ┌────────────────────────┼────────────────────────┐
                      ▼                        ▼                        ▼
              ┌───────────────┐      ┌──────────────┐        ┌──────────────┐
              │  PR Comments  │      │   Badges     │        │  Dashboard   │
              │  Status Check │      │  (README.md) │        │   Analytics  │
              └───────────────┘      └──────────────┘        └──────────────┘
```

## Key Design Decisions

### 1. Coverage Report Format

**Decision**: Use `lcov` format as primary coverage format for Codecov uploads

**Rationale**:
- Vitest already generates lcov reports (configured in project.json per package)
- Codecov has excellent lcov parser support
- lcov is industry standard for coverage reporting

**Alternatives Considered**:
- JSON format: Less portable, Codecov prefers lcov
- Cobertura XML: Additional conversion step needed

### 2. Monorepo Coverage Strategy

**Decision**: Upload all package coverage reports with Codecov flags for hybrid tracking (global + per-package)

**Rationale**:
- MonoLab packages are published independently to JSR with independent versioning
- Each package has its own consumers and quality requirements
- Codecov flags provide BOTH global monorepo view AND individual package views
- Single upload with automatic flag detection based on file paths
- Enables both global badge and per-package badges simultaneously

**Benefits of Flag Strategy**:
1. **Global View**: Overall monorepo coverage percentage and trends
2. **Package-Specific Views**: Individual coverage for react-hooks, react-clean, is-even, is-odd, ts-configs
3. **Flexible Badges**: One global badge in root README + optional per-package badges
4. **Smart PR Comments**: Codecov shows only flags affected by PR changes
5. **Independent Thresholds**: Can set different coverage targets per package if needed

**Implementation**:
```yaml
- uses: codecov/codecov-action@v5
  with:
    files: ./packages/*/coverage/lcov.info,./apps/*/coverage/lcov.info
    flags: react-hooks,react-clean,is-even,is-odd,ts-configs
    # Codecov automatically associates files with flags based on paths in config
```

**codecov.yaml configuration**:
```yaml
flags:
  react-hooks:
    paths:
      - packages/react-hooks/
  react-clean:
    paths:
      - packages/react-clean/
  is-even:
    paths:
      - packages/is-even/
  is-odd:
    paths:
      - packages/is-odd/
  ts-configs:
    paths:
      - packages/ts-configs/
```

**Alternatives Considered**:
- **Single consolidated report without flags**: Simpler but loses per-package visibility
- **Separate Codecov projects per package**: Maximum separation but higher overhead, no global view
- **Hybrid with flags** (chosen): Best of both worlds for independent packages in a monorepo

### 3. Upload Timing and Affected Strategy

**Decision**: Upload coverage only after all tests complete (both affected and full runs)

**Rationale**:
- Ensures complete coverage data before upload
- Avoids partial coverage uploads during test failures
- Aligns with existing CI workflow structure (test → build → deploy)

**Strategy**:
- **PR runs**: Upload affected package coverage only
- **Main/develop/pre runs**: Upload all package coverage

**How Affected Coverage Works with Codecov Baselines**:

When using Nx affected in PRs, only modified packages run tests and generate coverage. Codecov handles this intelligently:

1. **Baseline Establishment** (main/develop/pre branches):
   - Full coverage upload from all packages
   - Codecov stores complete baseline: `react-hooks: 85%, react-clean: 78%, is-even: 100%, is-odd: 100%`
   - This becomes the comparison reference for future PRs

2. **PR with Affected** (pull requests):
   - Only affected packages generate coverage (e.g., only react-hooks modified)
   - Codecov upload contains partial data (only react-hooks)
   - Codecov compares affected packages against their baseline
   - Non-affected packages maintain their baseline coverage in reports

3. **PR Comments and Status Checks**:
   - Show updated coverage for affected packages: `react-hooks: 85% → 87% (+2%)`
   - Non-affected packages reference baseline: `is-even: 100% (unchanged)`
   - Global coverage recalculated using: affected packages (new) + non-affected (baseline)

**Example Flow**:
```
Main baseline:
  react-hooks: 85%
  is-even: 100%
  Global: 92.5%

PR #42 (only modifies react-hooks):
  Upload: react-hooks at 87%

Codecov PR comment shows:
  react-hooks: 85% → 87% (+2%) ✅
  is-even: 100% (no change, uses baseline)
  Global: 92.5% → 93% (+0.5%)
```

**Important**: First PR for a new package without main baseline will show incomplete global coverage until merged to main. This is acceptable as it establishes the initial baseline.

### 4. Token Management

**Decision**: Use `CODECOV_TOKEN` repository secret

**Rationale**:
- Required for private repositories
- More secure than relying on GitHub App integration alone
- Explicit control over upload authorization

**Setup Required**:
1. Create Codecov account and add repository
2. Copy upload token from Codecov dashboard
3. Add as `CODECOV_TOKEN` in GitHub repository secrets

### 5. Failure Handling

**Decision**: Set `fail_ci_if_error: false` on Codecov upload action

**Rationale**:
- Codecov service outages should not block deployments
- Coverage reporting is valuable but not critical for build success
- Existing Vitest coverage thresholds already enforce quality gates

**Trade-off**: May miss coverage upload failures, but prevents false-negative CI runs

### 6. Bundle Size Tracking

**Decision**: Use Codecov's official Bundle Analysis product (https://about.codecov.io/product/feature/bundle-analysis/)

**Rationale**:
- Codecov provides dedicated Bundle Analysis as a separate product from coverage reporting
- Native integration with JavaScript/TypeScript build tools
- Automatically tracks bundle size changes over time
- Integrates with PR comments to show size deltas and regressions
- Provides detailed breakdown of what's in each bundle
- No need for custom scripts or manual size calculation

**Why Not Custom Script**:
- Codecov Bundle Analysis provides more features than manual calculation
- Automatic change detection and regression warnings
- Historical trending and visualization built-in
- Proper integration with Codecov dashboard
- Better maintainability (no custom code to maintain)

**Implementation Strategy**:
1. **Setup Phase**:
   - Follow Codecov Bundle Analysis documentation for JavaScript projects
   - Install and configure bundler plugin/integration for tsdown (MonoLab's bundler)
   - May require bundler-specific plugin or stats file generation

2. **CI Integration**:
   ```yaml
   # Run only on main branch to avoid noise
   - name: Upload bundle stats to Codecov
     if: github.ref == 'refs/heads/main'
     uses: codecov/codecov-action@v5
     with:
       # Configuration depends on Bundle Analysis setup
       # May use plugin parameter or separate bundle stats file
       fail_ci_if_error: false
   ```

3. **Per-Package Tracking**:
   - Track each published package separately: react-hooks, react-clean, is-even, is-odd, ts-configs
   - Each package has its own bundle stats file or plugin configuration
   - Exclude demo app (not published to JSR)

**Packages to Track**:
- `@monolab/react-hooks` - React lifecycle hooks
- `@monolab/react-clean` - MVVM library with Inversify
- `@monolab/is-even` - Even number utility
- `@monolab/is-odd` - Odd number utility
- `@monolab/ts-configs` - Shared TypeScript configurations

**Next Steps for Implementation**:
- Research tsdown compatibility with Codecov Bundle Analysis
- Determine if bundler plugin or stats file approach is better
- Configure per-package bundle tracking
- Test on main branch to verify upload works

### 7. Configuration File Location

**Decision**: Place `codecov.yaml` at repository root

**Rationale**:
- Codecov's default search location
- Single configuration file for entire monorepo
- Per-package flags can be used to customize behavior

### 8. Coverage Thresholds

**Decision**: Set informational thresholds initially, not blocking thresholds

**Rationale**:
- Existing packages have varying coverage levels
- Blocking thresholds could prevent legitimate PRs
- Start with visibility, tighten over time as coverage improves

**Initial Configuration**:
```yaml
coverage:
  status:
    project:
      default:
        target: auto
        threshold: 5%  # Allow 5% drop
    patch:
      default:
        target: 70%    # New code should be well-tested
        threshold: 5%
```

## Component Interactions

### Coverage Upload Flow

1. **Test Execution** (existing):
   ```bash
   pnpm exec nx affected -t test:unit -- --coverage
   ```
   Generates: `packages/*/coverage/lcov.info`

2. **Codecov Upload** (new):
   ```bash
   codecov --file "packages/*/coverage/lcov.info"
   ```
   Uploads all package coverage to Codecov

3. **Codecov Processing**:
   - Merges coverage reports
   - Generates coverage metrics
   - Creates PR comment with delta
   - Updates dashboard

### Badge Integration

1. **Badge URL** (provided by Codecov):
   ```
   https://codecov.io/gh/pabloimrik17/monolab/branch/main/graph/badge.svg
   ```

2. **README Update**:
   ```markdown
   [![codecov](https://codecov.io/gh/pabloimrik17/monolab/branch/main/graph/badge.svg)](https://codecov.io/gh/pabloimrik17/monolab)
   ```

3. **Badge Updates**: Automatic on every main branch push

## Security Considerations

- **Token Exposure**: `CODECOV_TOKEN` must be stored as GitHub secret, never committed
- **Upload Scope**: Token only allows uploading reports, not reading private data
- **Third-Party Access**: Codecov service has read access to repository for PR commenting (granted via GitHub App)

## Performance Impact

- **CI Time**: +10-20 seconds per workflow run (upload step)
- **Storage**: Codecov stores historical coverage data (no local impact)
- **Network**: Minimal, only uploads compressed coverage files (~100KB per package)

## Rollback Plan

If Codecov integration causes issues:

1. Remove codecov upload step from `.github/workflows/ci.yml`
2. Remove badges from README.md
3. Delete `codecov.yaml` configuration file
4. Revoke Codecov GitHub App access
5. Existing local coverage reporting via Vitest continues to work unchanged
