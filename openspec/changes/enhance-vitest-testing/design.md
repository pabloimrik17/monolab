# Design: Enhanced Vitest Testing

## Context

MonoLab currently uses Vitest with basic workspace configuration across 5 packages (is-odd, is-even, react-hooks, react-clean, ts-configs). Each package has its own vitest.config.ts with coverage and JUnit reporting. Tests run via Nx targets, integrated with Codecov for coverage tracking and test analytics.

**Current state:**
- Vitest 4.0.3 with @vitest/coverage-v8 and @vitest/ui installed
- vitest.workspace.ts auto-discovers package configs
- Tests use `*.spec.ts` naming convention
- Coverage reports per package with thresholds
- CI runs tests with `nx affected --target=test:unit`

**Constraints:**
- Must maintain Codecov integration (flags, JUnit XML, coverage merge)
- Cannot break existing Nx affected workflow
- React packages need different testing than utilities
- CI performance is critical (affects feedback time)

## Goals / Non-Goals

**Goals:**
- Organize tests by type (unit, integration, browser) with independent execution
- Enable advanced Vitest features (UI, type testing, browser mode, sharding)
- Improve CI performance through parallelization
- Standardize test command naming across monorepo
- Maintain backward compatibility with existing tests

**Non-Goals:**
- In-source testing (complexity outweighs benefits for this codebase)
- Custom reporters (Codecov + default reporters sufficient)
- Benchmark testing (deferred, not requested)
- test:all / test:all:watch commands (deferred until individual types stabilized)

## Decisions

### 1. Test Project Architecture

**Decision:** Use Vitest's `test.projects` feature to define test types within each package config.

**Rationale:**
- Single config file per package (simpler than multiple config files)
- Different file patterns per type: `*.test.ts` (unit), `*.integration.ts`, `*.test-d.ts`
- Independent coverage thresholds per test type
- Run specific types with `--project` flag

**Alternatives considered:**
- Multiple config files (vitest.unit.config.ts, vitest.integration.config.ts): More files to maintain
- Global projects in workspace: Less flexibility per package

**Implementation:**
```typescript
// packages/*/vitest.config.ts
export default defineProject({
  test: {
    extends: true,
    projects: [
      { name: "unit", test: { include: ["**/*.test.ts"] } },
      { name: "integration", test: { include: ["**/*.integration.ts"] } },
    ],
  },
});
```

### 2. Shared Configuration Strategy

**Decision:** Centralize cleanup and concurrency settings in vitest.workspace.ts with `extends: true`.

**Rationale:**
- DRY: No repetition of clearMocks, restoreMocks across packages
- Consistency: All packages use same cleanup behavior
- Override possible: Packages can override if needed

**Configuration:**
- `clearMocks: true` - Clear mock history before each test
- `restoreMocks: true` - Restore spies to original implementations
- `unstubEnvs: true` - Clean up stubbed environment variables
- `unstubGlobals: true` - Clean up stubbed globals
- `maxConcurrency: 10` - Allow 10 concurrent tests (up from default 5)

**Alternatives considered:**
- Per-package configuration: Too much duplication
- test-setup.ts file: Unnecessary when config flags handle cleanup
- mockReset: true: Too aggressive, removes implementations

### 3. Browser Testing Scope

**Decision:** Implement browser mode only for React packages (react-hooks, react-clean), not utilities.

**Rationale:**
- React components benefit from real browser environment
- Utilities (is-odd, is-even) work identically in Node vs browser
- Browser tests slower, reserve for where value exists

**Provider:** Playwright with Chromium
- Most reliable for CI (headless mode)
- Good React support via vitest-browser-react
- Alternatives (WebdriverIO, preview) less mature or CI-unsuitable

**File convention:** `*.browser.test.tsx` for browser-specific tests

### 4. CI Distribution Strategy

**Decision:** Use Nx Cloud distribution (already configured with 3 agents).

**Rationale:**
- Already distributes tasks across 3 linux-medium-js agents
- Handles all Nx targets (build, test, lint) not just tests
- Automatic caching and task distribution
- No additional configuration needed

**Current setup:**
```yaml
- run: pnpm dlx nx-cloud start-ci-run --distribute-on="3 linux-medium-js" --stop-agents-after="build"
```

**Alternative: Vitest Sharding (documented for future use)**

If Nx Cloud is removed in the future, Vitest native sharding can be used:

```yaml
strategy:
  matrix:
    shard: [1, 2, 3]
steps:
  - run: nx affected --target=test:unit -- --shard=${{ matrix.shard }}/3
```

**Benefits of Vitest sharding:**
- Reduces CI time ~3x for test suite
- Codecov automatically merges coverage from all shards
- Easy to scale (adjust matrix size as test suite grows)

**Coverage handling with sharding:**
- Each shard uploads partial coverage with flag: `shard-${{ matrix.shard }}`
- Codecov merges all reports automatically
- No manual merge step needed

**Current approach:** Use Nx Cloud distribution (more comprehensive than Vitest-only sharding)

### 5. Test Command Naming

**Decision:** Adopt explicit naming: `test:unit`, `test:integration`, `test:types`, `test:browser`, `test:ui`.

**Rationale:**
- Self-documenting: Clear what each command does
- Scalable: Easy to add test:e2e, test:mutation later
- Consistent: All commands follow same pattern
- Supports variants: Each type has :watch variant

**Structure:**
```json
{
  "test:unit": "vitest run --project unit",
  "test:unit:watch": "vitest watch --project unit",
  "test:types": "vitest --typecheck --run",
  "test:browser": "vitest run --project browser"
}
```

### 6. Type Testing Strategy

**Decision:** Add type tests using @vitest/expect-type with `*.test-d.ts` files.

**Rationale:**
- Catch type regressions before runtime
- Validate complex generic types (React hooks, ViewModels)
- Separate from runtime tests (different concerns)

**Scope:**
- is-odd, is-even: Validate parameter/return types
- react-hooks: Validate hook signatures, callback types
- react-clean: Validate ViewModel interfaces

## Risks / Trade-offs

**Risk:** Browser tests add significant CI time
**Mitigation:** Only apply to React packages, use headless mode, consider separate CI job

**Risk:** Sharding complicates coverage reporting
**Mitigation:** Codecov handles merge automatically, no action needed

**Risk:** Breaking changes to existing test scripts
**Mitigation:** Update all scripts in single change, document in proposal

**Risk:** Type testing adds maintenance overhead
**Mitigation:** Start with critical utilities, expand gradually

**Risk:** Multiple test projects increase config complexity
**Mitigation:** Document patterns clearly, use consistent structure

## Migration Plan

**Phase 1: Core Infrastructure**
1. Update vitest.workspace.ts with shared config
2. Migrate all package configs from defineConfig to defineProject
3. Add extends: true to inherit shared settings

**Phase 2: Script Standardization**
1. Rename scripts in all package.json files
2. Update Nx project.json targets (if needed)
3. Update CI workflow with new script names
4. Update root package.json scripts

**Phase 3: Test Projects**
1. Add unit and integration projects to each package config
2. Keep existing tests as unit tests (no file rename needed yet)
3. Validate with --project unit flag

**Phase 4: Advanced Features**
1. Install type testing dependencies
2. Add type test examples to critical packages
3. Install browser testing dependencies (React packages only)
4. Add browser test examples

**Phase 5: CI Optimization**
1. Implement sharding in GitHub Actions
2. Validate coverage merge in Codecov
3. Monitor CI time improvements

**Rollback:** Each phase is independent. Can rollback by reverting specific commits.

## Open Questions

- ✅ **Resolved:** Coverage with sharding - Codecov merges automatically
- ✅ **Resolved:** Cleanup configuration - Use workspace config flags
- ✅ **Resolved:** test:all commands - Deferred until individual types stable
- ✅ **Resolved:** In-source testing - Not pursuing
- ✅ **Resolved:** Custom reporters - Not needed

## Success Metrics

- CI test execution time reduced by ~60% (from sharding)
- All packages have standardized test commands
- Type tests catch at least one type regression in first month
- Browser tests identify at least one jsdom limitation
- Zero test failures from migration
- Coverage percentages unchanged or improved
