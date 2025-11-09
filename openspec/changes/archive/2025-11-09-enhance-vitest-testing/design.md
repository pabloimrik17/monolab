# Design: Enhanced Vitest Testing

## Context

MonoLab currently uses Vitest with basic workspace configuration across 5 packages (is-odd, is-even, react-hooks, react-clean, ts-configs). Each package has its own vitest.config.ts with coverage and JUnit reporting. Tests run via Nx targets, integrated with Codecov for coverage tracking and test analytics.

**Current state:**
- Vitest 4.0.6 with @vitest/coverage-v8 and @vitest/ui installed
- vitest.config.ts with projects feature auto-discovers package configs (migrated from deprecated vitest.workspace.ts)
- Tests use `*.spec.ts` and `*.test.ts` naming conventions
- Coverage reports per package with thresholds
- CI runs tests with `nx affected --target=test:unit`
- React packages use @vitejs/plugin-react for JSX transform

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

**Decision:** Use root vitest.config.ts with `projects: ["packages/*"]` for auto-discovery. Each package maintains its own simple config without nested projects.

**Rationale:**
- Vitest v4 deprecated vitest.workspace.ts in favor of projects in root config
- Single config file per package (simpler than multiple config files)
- File patterns include all test types: `**/*.{test,spec}.{ts,tsx}`, `**/*.browser.test.{ts,tsx}`, `**/*.integration.ts`
- Browser tests enabled via CLI flag `--browser.enabled=true` for specific runs
- Coverage and reporters configured per package

**Alternatives considered:**
- Nested projects within package configs: Too complex, conflicts with root projects discovery
- Multiple config files (vitest.unit.config.ts, vitest.browser.config.ts): More files to maintain

**Implementation:**
```typescript
// vitest.config.ts (root)
export default defineConfig({
  test: {
    projects: ["packages/*"],
    clearMocks: true,
    restoreMocks: true,
    // ... shared config
  },
});

// packages/*/vitest.config.ts
export default defineConfig({
  plugins: [react()],
  test: {
    include: ["**/*.{test,spec}.{ts,tsx}", "**/*.browser.test.{ts,tsx}", "**/*.integration.ts"],
    browser: { enabled: false, provider: playwright(...) },
  },
});
```

### 2. Shared Configuration Strategy

**Decision:** Centralize cleanup and concurrency settings in root vitest.config.ts. Package configs inherit these automatically.

**Rationale:**
- DRY: No repetition of clearMocks, restoreMocks across packages
- Consistency: All packages use same cleanup behavior
- Automatic inheritance: No need for explicit extends flag in Vitest v4

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

**Provider:** @vitest/browser-playwright with Chromium
- Most reliable for CI (headless mode)
- Official Vitest browser provider for Playwright
- Requires @vitejs/plugin-react-swc for proper JSX transform and decorator support
- Alternatives (WebdriverIO, preview) less mature or CI-unsuitable

**File convention:** `*.browser.test.tsx` for browser-specific tests

**React JSX Support:**
- Add @vitejs/plugin-react-swc to vitest.config.ts in React packages
- Enables new JSX transform (no explicit React import needed)
- Includes `tsDecorators: true` option for inversify decorator support
- Requires `experimentalDecorators` and `emitDecoratorMetadata` in tsconfig.json

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
  "test:unit": "vitest run",
  "test:unit:watch": "vitest",
  "test:types": "vitest --typecheck --run",
  "test:browser": "vitest run --browser.enabled=true src/**/*.browser.test.tsx",
  "test:browser:watch": "vitest --browser.enabled=true src/**/*.browser.test.tsx"
}
```

**Note:** Browser tests use `--browser.enabled=true` flag instead of `--project` to enable Playwright for specific test files.

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
1. Migrate vitest.workspace.ts to vitest.config.ts with projects discovery
2. Update Vitest to v4.0.6 across all packages
3. Add shared config (clearMocks, restoreMocks, etc.) to root config
4. Install Playwright browsers (`playwright install chromium`)

**Phase 2: React Package Setup**
1. Install @vitejs/plugin-react-swc and vitest-browser-react
2. Add plugin with tsDecorators support to vitest.config.ts in react-hooks and react-clean
3. Install @vitest/browser-playwright and playwright
4. Configure browser testing in React package configs
5. Add experimentalDecorators and emitDecoratorMetadata to tsconfig.json

**Phase 3: Script Standardization**
1. Update test:browser scripts to use --browser.enabled flag
2. Ensure test:unit, test:integration scripts are consistent
3. Update root package.json scripts if needed

**Phase 4: Browser Tests**
1. Create browser test examples (*.browser.test.tsx)
2. Verify tests run in Playwright (look for chromium tag in output)
3. Confirm no explicit React imports needed (JSX transform working)

**Phase 5: Type Testing**
1. Add type tests with expectTypeOf (*.test-d.ts)
2. Create utility type exports (e.g., StrictOmit)
3. Validate type tests catch type regressions

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
