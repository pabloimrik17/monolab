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

- **Vitest v4 Migration**: Migrate from deprecated vitest.workspace.ts to vitest.config.ts with projects auto-discovery
- **Standardized naming**: Rename test scripts from generic names to explicit `test:unit`, `test:integration`, `test:types`, `test:browser`
- **UI Mode**: Enable @vitest/ui for interactive visual test debugging
- **Type Testing**: Use Vitest's built-in expectTypeOf for compile-time type validation
- **Browser Mode**: Implement real browser testing with @vitest/browser-playwright for React packages
- **React JSX Support**: Add @vitejs/plugin-react for proper JSX transform without explicit React imports
- **Concurrent Testing**: Configure maxConcurrency for parallel test execution within files
- **CI Optimization**: Continue using Nx Cloud distribution (already configured with 3 agents)
- **Automatic Cleanup**: Enable clearMocks, restoreMocks, unstubEnvs, unstubGlobals flags in root config
- **Shared Configuration**: Centralize common settings in root vitest.config.ts, inherited by package configs

## Impact

- **Affected specs**: New `vitest-testing` capability
- **Affected code**:
  - Root: `vitest.config.ts` (replaces vitest.workspace.ts), `pnpm-workspace.yaml` (vitest 4.0.6), `package.json` (add @vitejs/plugin-react)
  - Each package: `vitest.config.ts` (add @vitejs/plugin-react, browser config), `package.json` (updated test:browser scripts)
  - React packages: Add browser test support with @vitest/browser-playwright
  - Browser test files: Remove explicit React imports (handled by @vitejs/plugin-react)
- **Dependencies**:
  - Updated: vitest 4.0.3 → 4.0.6, @vitest/coverage-v8, @vitest/ui
  - Added: @vitest/browser-playwright, @vitejs/plugin-react, playwright (with chromium browser)
- **File conventions**:
  - `*.{test,spec}.{ts,tsx}` → Unit tests (jsdom)
  - `*.integration.ts` → Integration tests (jsdom)
  - `*.test-d.ts` → Type tests
  - `*.browser.test.tsx` → Browser tests (Playwright chromium, React packages only)
- **Browser tests**: Enabled via CLI flag `--browser.enabled=true` for browser-specific tests
- **Performance**: Continue leveraging existing Nx Cloud distribution across 3 agents
