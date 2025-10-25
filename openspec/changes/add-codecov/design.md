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
- **PR runs**: Run affected tests, then upload whatever coverage was generated
- **Main/develop/pre runs**: Run all tests, then upload all package coverage
- **Upload implementation**: Single upload step after tests (no need to duplicate for affected vs all)

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
- ✅ Researched tsdown compatibility with Codecov Bundle Analysis
- ✅ Determined CLI approach is best for tsdown (Rolldown-based bundler)
- ✅ Configured per-package bundle tracking using @codecov/bundle-analyzer
- ⏳ Test on main branch to verify upload works

### 6.1. Bundle Analysis: Alternative Plugin-Based Approaches

**Note**: This section documents alternative approaches for future reference if the project's bundler stack changes.

**Available Codecov Bundler Plugins** (as of 2025):
- `@codecov/vite-plugin` - Native Vite integration
- `@codecov/rollup-plugin` - Rollup bundler integration
- `@codecov/webpack-plugin` - Webpack 5 integration
- `@codecov/remix-vite-plugin` - Remix with Vite integration
- No esbuild plugin available (esbuild typically used for transpilation, not bundling)

**When to Use Bundler Plugins vs CLI**:

| Approach | Use Case | Pros | Cons |
|----------|----------|------|------|
| **CLI (`@codecov/bundle-analyzer`)** | Post-build analysis, any bundler | ✅ Works with any bundler<br>✅ Analyzes actual output<br>✅ Simple CI integration<br>✅ No config changes needed | ❌ Post-build only<br>❌ Less integrated |
| **Plugin (`@codecov/vite-plugin`)** | Vite projects | ✅ Native integration<br>✅ Build-time analysis<br>✅ More accurate tree-shaking data | ❌ Vite-specific<br>❌ Requires config changes |
| **Plugin (`@codecov/rollup-plugin`)** | Rollup projects | ✅ Native integration<br>✅ Build-time analysis | ❌ Rollup-specific<br>❌ Uncertain with Rolldown |
| **Plugin (`@codecov/webpack-plugin`)** | Webpack 5 projects | ✅ Native integration<br>✅ Build-time analysis | ❌ Webpack-specific |

**Why CLI Approach Was Chosen for MonoLab**:

1. **Bundler Compatibility**:
   - MonoLab packages use **tsdown** (powered by Rolldown, not Rollup)
   - `@codecov/rollup-plugin` compatibility with Rolldown is uncertain
   - Demo app uses Vite, but is not published to JSR (lower priority for bundle tracking)

2. **Monorepo Simplicity**:
   - CLI approach works for both tsdown packages AND Vite demo app
   - Single method for all projects = easier to maintain
   - No need to modify 5+ tsdown.config.ts files

3. **Focus on Published Artifacts**:
   - CLI analyzes the actual `dist/` output = what JSR consumers download
   - Post-build analysis is sufficient for tracking size regressions

**Future Scenarios Where Plugin Approach May Be Preferred**:

**Scenario A: Migration from tsdown to Native Rollup**
```typescript
// If MonoLab migrates to native Rollup in the future:
// rollup.config.js
import { codecovRollupPlugin } from "@codecov/rollup-plugin";

export default {
  plugins: [
    codecovRollupPlugin({
      enableBundleAnalysis: process.env.CODECOV_TOKEN !== undefined,
      bundleName: "react-hooks",
      uploadToken: process.env.CODECOV_TOKEN,
    }),
  ],
};
```

**Scenario B: Adding Bundle Analysis to Demo App**
```typescript
// If demo app bundle size becomes important:
// apps/demo/vite.config.ts
import { codecovVitePlugin } from "@codecov/vite-plugin";

export default defineConfig({
  plugins: [
    codecovVitePlugin({
      enableBundleAnalysis: process.env.CODECOV_TOKEN !== undefined,
      bundleName: "demo-app",
      uploadToken: process.env.CODECOV_TOKEN,
    }),
  ],
});
```

**Scenario C: Hybrid Approach (Mixed Bundlers)**
- Use `@codecov/vite-plugin` for Vite-based packages
- Use `@codecov/rollup-plugin` for Rollup-based packages
- Use CLI for others (tsdown, custom bundlers)
- Trade-off: More complex but optimally integrated per bundler

**Migration Path from CLI to Plugin**:
1. Install bundler-specific plugin: `pnpm add -D @codecov/<bundler>-plugin`
2. Add plugin to bundler config (e.g., `vite.config.ts`, `rollup.config.js`)
3. Remove CLI step from CI workflow
4. Test that bundle stats still upload to Codecov
5. Update documentation

**References**:
- [Codecov Bundler Plugins GitHub](https://github.com/codecov/codecov-javascript-bundler-plugins)
- [Codecov Bundler Plugins Docs](https://codecov.github.io/codecov-javascript-bundler-plugins/)
- [Vite Quick Start Guide](https://docs.codecov.com/docs/vite-quick-start)

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

### 9. Test Analytics: Test Result Format

**Decision**: Use JUnit XML format for test result uploads to Codecov Test Analytics

**Rationale**:
- JUnit XML is the **only format currently supported** by Codecov Test Analytics
- Vitest has native JUnit reporter support (no additional dependencies needed)
- JUnit XML is industry-standard for test result reporting
- Contains all required data: test names, classnames, timing, stack traces

**Alternatives Considered**:
- TAP format: Not supported by Codecov Test Analytics
- JSON format: Not supported by Codecov Test Analytics
- Custom format: Would require additional parsing layer

### 10. Test Analytics: Vitest Reporter Configuration

**Decision**: Configure Vitest with multiple reporters (default + JUnit) to output both human-readable console output and JUnit XML files

**Rationale**:
- Multiple reporters can run simultaneously without conflicts
- Default reporter provides immediate feedback during development
- JUnit reporter generates XML files for Codecov upload
- Both coverage and test result reporting can coexist

**Implementation**:
```typescript
// vitest.config.ts or project.json test configuration
{
  "reporters": ["default", "junit"],
  "outputFile": {
    "junit": "./test-results.junit.xml"
  }
}
```

**Alternatives Considered**:
- CLI flags only: Would require modifying all test commands, less maintainable
- JUnit reporter only: Would lose human-readable console output during development

### 11. Test Analytics: Upload Timing

**Decision**: Upload test results after both PR and main branch test runs, using `if: ${{ !cancelled() }}` condition

**Rationale**:
- Test Analytics is most valuable when capturing **failed test data**
- Using `!cancelled()` ensures uploads occur even when tests fail
- Both PR and main branch uploads needed for flaky test detection
- Failed tests must be captured to provide value (unlike coverage which is optional)

**Strategy**:
- **PR runs**: Run affected tests, then upload whatever test results were generated
- **Main/develop/pre runs**: Run all tests, then upload all test results
- **Upload implementation**: Single upload step after tests with `!cancelled()` condition
- **Failure handling**: Non-blocking upload (`fail_ci_if_error: false`)

**Implementation**:
```yaml
# After test execution (affected or all)
- name: 📊 Upload test results to Codecov
  uses: codecov/test-results-action@v1
  if: ${{ !cancelled() }}
  with:
    token: ${{ secrets.CODECOV_TOKEN }}
    flags: react-hooks,react-clean,is-even,is-odd,ts-configs
    fail_ci_if_error: false
```

**Why `!cancelled()` instead of `always()`**:
- `!cancelled()` runs on success, failure, and skipped
- `always()` would also run if workflow is manually cancelled
- Test results from cancelled runs are not useful for analytics

### 12. Test Analytics: Per-Package Flags

**Decision**: Use the same flags for Test Analytics as coverage reporting (react-hooks, react-clean, is-even, is-odd, ts-configs)

**Rationale**:
- Consistent flag strategy across coverage and test analytics
- Enables per-package test failure tracking
- Simplifies dashboard filtering (same flags for coverage and tests)
- Aligns with MonoLab's independent package versioning philosophy

**Benefits**:
- View test failures isolated to specific packages
- Track flaky tests at the package level
- Correlate test failures with coverage changes per package
- Independent test quality metrics for each published package

### 13. Test Analytics: Data Retention

**Decision**: Accept Codecov's default 60-day retention period for test analytics data

**Rationale**:
- 60 days provides sufficient history for detecting flaky tests
- Covers typical development cycle timeframes
- No additional configuration or cost required
- Historical trends beyond 60 days have diminishing value for active development

**Trade-off**: Long-term historical analysis not available, but test analytics focused on recent trends is more actionable

## Component Interactions

### Coverage Upload Flow

1. **Test Execution** (existing):
   ```bash
   # PR: affected packages only
   pnpm exec nx affected -t test:unit -- --coverage.thresholds.0

   # Main: all packages
   pnpm exec nx run-many -t test:unit
   ```
   Generates: `packages/*/coverage/lcov.info` for affected or all packages

2. **Codecov Upload** (new - single step for both scenarios):
   ```yaml
   - name: 📊 Upload coverage to Codecov
     uses: codecov/codecov-action@v5
     with:
       files: ./packages/*/coverage/lcov.info,./apps/*/coverage/lcov.info
       flags: react-hooks,react-clean,is-even,is-odd,ts-configs
       token: ${{ secrets.CODECOV_TOKEN }}
       fail_ci_if_error: false
   ```
   Uploads whatever coverage files exist (affected or all)

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

### Test Analytics Upload Flow

1. **Test Execution with JUnit Reporter** (configured in `vitest.workspace.ts`):
   ```bash
   # PR: affected packages only
   pnpm exec nx affected -t test:unit -- --coverage.thresholds.0

   # Main: all packages
   pnpm exec nx run-many -t test:unit
   ```
   Generates: `packages/*/test-results.junit.xml` for affected or all packages

2. **Test Results Upload** (new - single step for both scenarios):
   ```yaml
   - name: 📊 Upload test results to Codecov
     uses: codecov/test-results-action@v1
     if: ${{ !cancelled() }}
     with:
       token: ${{ secrets.CODECOV_TOKEN }}
       flags: react-hooks,react-clean,is-even,is-odd,ts-configs
       fail_ci_if_error: false
   ```
   Uploads whatever test result files exist (affected or all), even if tests failed

3. **Codecov Processing**:
   - Associates test results with package flags
   - Detects flaky tests across runs
   - Calculates failure rates and performance metrics
   - Generates test analytics dashboard views
   - Adds test failure information to PR comments

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
