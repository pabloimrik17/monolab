# Design: Conditional Codecov Uploads for Affected Packages

## Context

MonoLab's CI workflow currently uploads Codecov data (coverage, test results, bundle analysis) for all 5 packages on every workflow run, regardless of which packages were actually affected by changes. While Nx efficiently runs tests only for affected packages in PRs, this optimization doesn't extend to Codecov uploads, resulting in wasted CI time and API calls.

Additionally, the current bundle size upload strategy causes false "100% increase" warnings. When a PR doesn't affect a package, no bundle is uploaded (missing `dist/`), causing Codecov to lose the baseline. The next PR that does affect the package compares against missing data (0 bytes → actual size = 100% increase).

**Stakeholders**: CI/CD pipeline efficiency, developer experience (faster PR feedback), Codecov data accuracy

**Constraints**:
- Must maintain complete baselines on main/develop/pre branches (all packages always upload)
- Must work with existing Codecov `carryforward` configuration
- Must not break existing PR comment functionality
- Must be easy to rollback

## Goals / Non-Goals

**Goals**:
- Reduce PR CI time by 75-150 seconds (60-80% upload reduction)
- Eliminate false "100% bundle size increase" warnings
- Use Nx affected as single source of truth for all Codecov uploads
- Consolidate 11 individual steps into 4 cohesive steps
- Maintain baseline integrity on protected branches

**Non-Goals**:
- Changing how tests are executed (already optimized with `nx affected`)
- Modifying Codecov configuration (`codecov.yaml`)
- Optimizing main branch workflow (already uploads all packages correctly)
- Adding new Codecov features beyond optimization

## Decisions

### Decision 1: Shared Detection Step vs Individual Detection

**Chosen**: Single detection step that all upload scripts consume

**Rationale**:
- One call to `nx show projects --affected` (~2s) vs multiple calls (~6s)
- Guaranteed consistency across coverage, test results, and bundle uploads
- Easier to maintain (single place to update package list)
- Outputs reusable by multiple steps via `$GITHUB_OUTPUT`

**Alternatives Considered**:
- **Each script does own detection**: Would waste 4s with redundant Nx calls, risk inconsistency
- **hardFiles() to check if coverage exists**: Indirect, doesn't leverage Nx intelligence, misses dependency graph changes

**Trade-off**: Coupling between steps, but acceptable because detection step is critical infrastructure

### Decision 2: Consolidate Individual Steps into Scripts

**Chosen**: Replace 10 individual upload steps with 3 consolidated bash scripts (coverage, test results, bundle size)

**Rationale**:
- DRY: Package list in one place per script instead of 5 duplicated steps
- Consistent pattern across all Codecov uploads
- Easier to add new packages (one place to update per script)
- Clear logging with summary output (N uploaded, M skipped)
- Flexibility to use codecov CLI directly instead of GitHub Actions

**Alternatives Considered**:
- **Keep individual steps with conditionals**: 10 steps with `if:` conditions, harder to maintain, less DRY
- **Matrix strategy**: Complex JSON manipulation, harder to debug, overkill for 5 packages
- **Single script for all Codecov uploads**: Too much coupling, harder to debug failures

**Trade-off**: Lose per-package granularity in GitHub UI (3 steps vs 10), but gain maintainability and clarity in logs

### Decision 3: Conditional Logic - PR vs Push

**Chosen**: Scripts evaluate `github.event_name` to determine upload strategy

```bash
if [[ "$IS_PR" != "true" ]]; then
  # Push to main/develop/pre: always upload all packages
  should_upload=true
elif [[ "${affected[$package]}" == "true" ]]; then
  # PR with affected package: upload
  should_upload=true
else
  # PR with non-affected package: skip
  should_upload=false
fi
```

**Rationale**:
- Explicit and readable (if/elif/else structure)
- Guarantees baseline establishment on protected branches
- Leverages Nx affected intelligence for PRs
- Easy to understand and debug

**Alternatives Considered**:
- **Always use affected logic**: Would skip non-affected packages on main, breaking baselines
- **Separate steps for PR vs push**: Duplicates entire workflow, harder to maintain
- **Complex bash one-liner**: Less readable, harder to debug

### Decision 4: Associative Arrays for Package Mapping

**Chosen**: Use bash associative arrays to map package names to affected status

```bash
declare -A affected=(
  ["react-hooks"]="$AFFECTED_REACT_HOOKS"
  ["react-clean"]="$AFFECTED_REACT_CLEAN"
  # ...
)
```

**Rationale**:
- Clean syntax for looking up affected status per package
- Avoids repetitive if/elif chains
- Supported on Ubuntu runners (bash 5.x)
- Familiar pattern for developers

**Alternatives Considered**:
- **Individual if statements**: `if [[ "$AFFECTED_REACT_HOOKS" == "true" ]]` - more verbose, repetitive
- **JSON parsing**: Overkill for simple boolean lookup
- **Case statement**: Doesn't match use case well

**Risk**: Bash version <4.0 doesn't support associative arrays, but GitHub Actions uses Ubuntu with bash 5.x

### Decision 5: Use Codecov CLI Instead of GitHub Actions

**Chosen**: Use `npx codecov@latest upload-process` and `upload-test-results` in scripts

**Rationale**:
- Direct CLI control for flexibility in scripts
- Consistent with bundle-analyzer usage (also CLI)
- Easier to customize flags and options
- Always uses latest codecov CLI

**Alternatives Considered**:
- **Keep using GitHub Actions**: Less flexible in bash loops, requires one step per package
- **Mixed approach**: Actions for coverage, CLI for bundle - inconsistent

**Trade-off**: Extra `npx` overhead (~500ms per upload), but flexibility worth it

### Decision 6: Error Handling Strategy

**Chosen**: Non-blocking uploads with clear logging

- `fail-on-error=false` on codecov CLI calls
- `continue-on-error: true` on bundle size step
- `if: ${{ !cancelled() }}` on coverage/test results to capture failures
- Log warnings (`⚠️`) when files missing or uploads fail
- Summary output (count of uploads/skips)

**Rationale**:
- Codecov service outages shouldn't block CI
- Test failures should still upload results (valuable for Test Analytics)
- Missing files are non-fatal (might be expected in some scenarios)
- Clear logging helps debugging

**Alternatives Considered**:
- **Strict error handling**: Would cause false CI failures when Codecov has issues
- **Silent failures**: Would hide real problems

## Risks / Trade-offs

### Risk: Detection Step Failure

**Scenario**: `nx show projects --affected` command fails

**Impact**: All Codecov uploads skip on PRs (outputs undefined)

**Mitigation**:
- Fallback: Pushes to main still upload all packages (baseline protected)
- Nx failure is rare and indicates bigger infrastructure issues
- Easy to detect (no Codecov data in PR comments)

### Risk: Associative Array Incompatibility

**Scenario**: GitHub runner uses bash <4.0

**Impact**: Scripts fail with syntax error

**Mitigation**:
- GitHub Actions Ubuntu images use bash 5.x (verified)
- Can fallback to individual if statements if needed
- Test in CI before merging

### Risk: Package Addition Forgotten

**Scenario**: Developer adds new package but forgets to update scripts

**Impact**: New package never uploads Codecov data

**Mitigation**:
- Documentation: Clearly note in CONTRIBUTING.md and inline comments
- Code review: Reviewer checks for script updates
- Future enhancement: Auto-discover packages from Nx workspace

### Risk: Codecov Carryforward Misconfiguration

**Scenario**: `codecov.yaml` missing `carryforward: true` for a package

**Impact**: Non-affected packages show as 0% coverage in PR comments

**Mitigation**:
- Verify existing codecov.yaml has carryforward enabled (already done)
- Test with PR affecting only one package
- Documented in design for future reference

### Trade-off: GitHub UI Granularity

**What we lose**: Per-package visibility in GitHub Actions UI (10 steps → 3 steps)

**What we gain**: Maintainability, DRY, consistent logging, easier debugging

**Verdict**: Worth it. Logs provide same information with better context.

## Migration Plan

### Phase 1: Add Detection Step
1. Add detection step to workflow after test execution
2. Deploy to CI and verify outputs in logs
3. No functional change yet (uploads still run independently)

### Phase 2: Consolidate Coverage Uploads
1. Replace 5 coverage steps with single script
2. Test in PR with 1 affected package
3. Verify Codecov receives data and carryforward works

### Phase 3: Consolidate Test Results Uploads
1. Replace 5 test results steps with single script
2. Test with failing tests to ensure data captured

### Phase 4: Refactor Bundle Size Upload
1. Add affected detection to bundle script
2. Test for false positive prevention

### Phase 5: End-to-End Validation
1. Merge to main and verify baselines
2. Create test PRs for each package
3. Measure CI time savings

### Rollback Strategy
1. Revert `.github/workflows/ci.yml` to previous commit
2. Re-run CI on affected PRs
3. No data loss (Codecov is append-only)

## Open Questions

None - design is complete and validated through exploration phase.

## Performance Characteristics

### Time Complexity
- Detection step: O(1) - single Nx call
- Upload loops: O(n) where n = number of packages (5)
- Per-package upload: ~10-20s each
- Total overhead: ~2s (detection step)

### Savings Profile
**Typical PR (1-2 packages affected)**:
- Before: 10 uploads × 15s avg = 150s
- After: 2 uploads × 15s + 2s overhead = 32s
- Savings: 118s (79% reduction)

**PR affecting all packages**:
- Before: 10 uploads × 15s = 150s
- After: 10 uploads × 15s + 2s = 152s
- Overhead: 2s (1% increase, acceptable)

**Push to main**:
- Before: 10 uploads × 15s = 150s
- After: 10 uploads × 15s + 0s (detection skipped) = 150s
- No change

## Implementation Notes

### Package List Maintenance
Single source of truth for package list in each script:
```bash
for package in react-hooks react-clean is-even is-odd ts-configs; do
```

When adding new package:
1. Add to detection step loop
2. Add to coverage upload script loop
3. Add to test results upload script loop
4. Add to bundle size script loop
5. Add environment variable declaration for affected output

### Logging Standards
- 📊 = Uploading data
- 📦 = Analyzing bundle
- ⏭️ = Skipping package
- ⚠️ = Warning (file not found, upload failed)
- ✅ = Summary success

### Debugging Tips
- Check detection step output to see affected status per package
- Review script logs to see upload vs skip decisions
- Verify Codecov PR comment shows expected deltas
- Check `codecov.yaml` if carryforward not working

## Future Enhancements

### Auto-Discovery of Packages
Replace hardcoded lists with dynamic Nx query:
```bash
PACKAGES=$(pnpm exec nx show projects --json | jq -r '.[] | select(startswith("@monolab/")) | sub("@monolab/"; "")')
for package in $PACKAGES; do
  # ...
done
```

**Benefit**: Automatically handles new packages
**Trade-off**: Slower (JSON parsing), harder to debug

### Parallel Uploads
Upload packages concurrently:
```bash
for package in ...; do
  upload_package "$package" &
done
wait
```

**Benefit**: Faster total upload time
**Trade-off**: Harder to debug failures, may hit rate limits

### Centralized Upload Function
Extract common logic:
```bash
upload_to_codecov() {
  local package=$1
  local data_type=$2
  # ... reusable logic
}
```

**Benefit**: Even more DRY
**Trade-off**: Bash function complexity, harder to understand flow

## References

- Nx Affected: https://nx.dev/concepts/affected
- Codecov Carryforward: https://docs.codecov.com/docs/carryforward-flags
- GitHub Actions Outputs: https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/passing-information-between-jobs
- Codecov CLI: https://docs.codecov.com/docs/codecov-uploader
