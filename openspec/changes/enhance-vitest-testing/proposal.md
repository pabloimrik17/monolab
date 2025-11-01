# Enhance Vitest Testing Capabilities

## Why

The project currently uses Vitest for unit testing with basic configuration (coverage, JUnit reporters, workspace setup). However, several advanced Vitest features remain unused that would significantly improve developer experience, test organization, and CI performance:

1. **No test type separation**: Unit and integration tests share the same patterns and configurations, making it hard to run them independently
2. **Limited developer tooling**: No interactive UI mode for debugging tests visually
3. **No type safety validation**: TypeScript type regressions can slip through without compile-time type testing
4. **Missing browser testing**: React components tested in jsdom instead of real browsers, missing browser-specific behaviors
5. **Sequential CI execution**: Tests run sequentially without sharding, leading to longer CI times
6. **Inconsistent naming**: Current test scripts lack clear naming conventions for different test types

## What Changes

- **Test project organization**: Define separate Vitest projects (unit, integration, browser) with distinct file patterns, coverage thresholds, and configurations
- **Standardized naming**: Rename test scripts from generic names to explicit `test:unit`, `test:integration`, `test:types`, etc.
- **UI Mode**: Enable @vitest/ui for interactive visual test debugging
- **Type Testing**: Add @vitest/expect-type for compile-time type validation
- **Browser Mode**: Implement real browser testing with Playwright for React packages
- **Concurrent Testing**: Configure maxConcurrency for parallel test execution within files
- **CI Sharding**: Distribute tests across multiple CI jobs to reduce total execution time
- **Automatic Cleanup**: Enable clearMocks, restoreMocks, unstubEnvs, unstubGlobals flags in workspace config
- **Shared Configuration**: Centralize common settings in vitest.workspace.ts with extends inheritance

## Impact

- **Affected specs**: New `vitest-testing` capability
- **Affected code**:
  - Root: `vitest.workspace.ts`, `package.json` (scripts)
  - Each package: `vitest.config.ts` (migrate from defineConfig to defineProject), `package.json` (scripts)
  - React packages: Add browser test support with @vitest/browser and vitest-browser-react
  - CI: `.github/workflows/ci.yml` (add sharding strategy, update script names)
- **Dependencies**: @vitest/expect-type, @vitest/browser, vitest-browser-react, playwright
- **File conventions**:
  - `*.test.ts` → Unit tests
  - `*.integration.ts` → Integration tests
  - `*.test-d.ts` → Type tests
  - `*.browser.test.tsx` → Browser tests (React packages only)
- **Coverage**: Separate coverage reports per test type (unit, integration, browser)
- **Performance**: CI sharding expected to reduce test time by ~3x with 3 parallel jobs
