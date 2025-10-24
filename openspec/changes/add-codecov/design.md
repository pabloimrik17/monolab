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

**Decision**: Upload all package coverage reports in a single Codecov upload step

**Rationale**:
- Nx generates separate coverage reports per package in `{projectRoot}/coverage/`
- Codecov supports multiple coverage files via glob patterns
- Simpler CI configuration with single upload step
- Codecov automatically merges reports and provides per-package breakdown

**Implementation**:
```yaml
- uses: codecov/codecov-action@v5
  with:
    files: ./packages/*/coverage/lcov.info,./apps/*/coverage/lcov.info
```

### 3. Upload Timing

**Decision**: Upload coverage only after all tests complete (both affected and full runs)

**Rationale**:
- Ensures complete coverage data before upload
- Avoids partial coverage uploads during test failures
- Aligns with existing CI workflow structure (test → build → deploy)

**Strategy**:
- PR runs: Upload affected package coverage
- Main/develop/pre runs: Upload all package coverage

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

**Decision**: Use Codecov's native bundle analysis with webpack-plugin integration

**Rationale**:
- Codecov provides dedicated bundle analysis feature (separate from coverage)
- Automatically tracks size changes over time
- Integrates with PR comments to show size deltas
- No need for separate bundle analysis tools

**Implementation**:
```yaml
# Run only on main branch to avoid noise
- name: Upload bundle stats
  if: github.ref == 'refs/heads/main'
  uses: codecov/codecov-action@v5
  with:
    plugin: bundler
```

**Packages to Track**:
- All packages published to JSR (react-hooks, react-clean, is-even, is-odd, ts-configs)
- Exclude demo app (not published)

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
